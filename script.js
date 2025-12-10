let questions = [];
let currentQuestion = 0;
let answers = [];
let violationCount = 0;
let mode = 1; // За замовчуванням, завантажимо з сервера
let sessionId = Date.now(); // Унікальна сесія

// Валідація імені
function validateName(name) {
  const words = name.trim().split(/\s+/);
  if (words.length !== 2) return false;
  const ukrRegex = /^[А-ЯҐЄІЇа-яґєії]+$/;
  return words.every(word => 
    word.length >= 4 && 
    word[0] === word[0].toUpperCase() && 
    ukrRegex.test(word)
  );
}

// Завантаження режиму та питань
async function loadTest() {
  const res = await fetch('/api/settings');
  const settings = await res.json();
  mode = settings.mode;

  const quesRes = await fetch('/api/questions');
  questions = await quesRes.json();
}

// Початок тесту
document.getElementById('start-btn').addEventListener('click', async () => {
  const name = document.getElementById('name').value;
  const cls = document.getElementById('class').value;
  const error = document.getElementById('error');

  if (!validateName(name) || !cls) {
    error.textContent = 'Неправильний формат Прізвища Ім\'я або Клас не заповнено';
    return;
  }

  await loadTest();
  sessionStorage.setItem('student', JSON.stringify({ name, class: cls }));

  document.getElementById('login-container').style.display = 'none';
  document.getElementById('test-container').style.display = 'block';
  enterFullscreen();
  showQuestion();
});

// Показ питання
function showQuestion() {
  if (currentQuestion >= questions.length) {
    submitTest();
    return;
  }

  document.getElementById('question-text').textContent = questions[currentQuestion].text;
  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';
  questions[currentQuestion].options.forEach((opt, i) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'answer';
    input.value = opt;
    label.appendChild(input);
    label.appendChild(document.createTextNode(opt));
    optionsDiv.appendChild(label);
  });

  document.getElementById('next-btn').textContent = currentQuestion === questions.length - 1 ? 'Здати Тест' : 'Наступне питання';
}

// Наступне
document.getElementById('next-btn').addEventListener('click', () => {
  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected) return alert('Оберіть відповідь');
  answers[currentQuestion] = selected.value;
  currentQuestion++;
  showQuestion();
});

// Подання тесту
async function submitTest() {
  const student = JSON.parse(sessionStorage.getItem('student'));
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...student, answers, sessionId })
  });
  const { score, results } = await res.json();

  document.getElementById('test-container').style.display = 'none';
  document.getElementById('results-container').style.display = 'block';

  const list = document.getElementById('results-list');
  results.forEach((res, i) => {
    const p = document.createElement('p');
    p.textContent = `\( {questions[i].text} | Ваша: \){answers[i]} | Правильна: ${res.correct}`;
    list.appendChild(p);
  });
  document.getElementById('score').textContent = `Оцінка: ${score}/12`;
}

// Безпека
function handleViolation(type) {
  fetch('/api/cheat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, type })
  });

  violationCount++;
  const modal = document.getElementById('warning-modal');
  const text = document.getElementById('warning-text');

  if (mode === 1) {
    text.textContent = 'Попередження: Спроба списування виявлена!';
    modal.style.display = 'block';
  } else if (mode === 2 && violationCount >= 2) {
    endTest('Тест завершено через порушення!');
  } else if (mode === 3) {
    endTest('Тест завершено через порушення!');
  } else if (mode === 2) {
    text.textContent = `Попередження: Спроба ${violationCount}/2`;
    modal.style.display = 'block';
  }
}

document.getElementById('continue-btn').addEventListener('click', () => {
  document.getElementById('warning-modal').style.display = 'none';
});

function endTest(message) {
  alert(message);
  window.close(); // Закриття вікна
  submitTest(); // Зберегти, що є
}

// Моніторинг
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') handleViolation('tab_switch');
});

window.addEventListener('blur', () => handleViolation('window_blur'));

document.addEventListener('copy', e => {
  e.preventDefault();
  handleViolation('copy');
});

document.addEventListener('contextmenu', e => {
  e.preventDefault();
  handleViolation('right_click');
});

document.addEventListener('keydown', e => {
  if (e.key === 'PrintScreen' || (e.ctrlKey && e.shiftKey && e.key === 'I') || e.key === 'F12') {
    e.preventDefault();
    handleViolation('devtools_or_screenshot');
  }
});

// Повноекранний режим
function enterFullscreen() {
  document.documentElement.requestFullscreen();
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) handleViolation('exit_fullscreen');
});