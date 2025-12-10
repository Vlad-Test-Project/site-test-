const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

mongoose.connect('mongodb://localhost:27017/testdb', { useNewUrlParser: true, useUnifiedTopology: true });

const QuestionSchema = new mongoose.Schema({ text: String, options: [String], correct: String });
const ResultSchema = new mongoose.Schema({ name: String, class: String, answers: [String], score: Number, sessionId: Number });
const SettingsSchema = new mongoose.Schema({ mode: Number });
const CheatSchema = new mongoose.Schema({ sessionId: Number, type: String, timestamp: { type: Date, default: Date.now } });

const Question = mongoose.model('Question', QuestionSchema);
const Result = mongoose.model('Result', ResultSchema);
const Settings = mongoose.model('Settings', SettingsSchema);
const Cheat = mongoose.model('Cheat', CheatSchema);

// Ініціалізація налаштувань, якщо немає
async function initSettings() {
  const existing = await Settings.findOne();
  if (!existing) await new Settings({ mode: 1 }).save();
}
initSettings();

// Головна сторінка
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/style.css', (req, res) => res.sendFile(__dirname + '/style.css'));
app.get('/script.js', (req, res) => res.sendFile(__dirname + '/script.js'));

// API для питань
app.get('/api/questions', async (req, res) => {
  const questions = await Question.find();
  res.json(questions);
});

// API для налаштувань
app.get('/api/settings', async (req, res) => {
  const settings = await Settings.findOne();
  res.json(settings);
});

// Подання результатів
app.post('/api/submit', async (req, res) => {
  const { name, class: cls, answers, sessionId } = req.body;
  const questions = await Question.find();

  let score = 0;
  const results = questions.map((q, i) => {
    if (answers[i] === q.correct) score++;
    return { correct: q.correct };
  });

  score = Math.round((score / questions.length) * 12); // 12-бальна

  await new Result({ name, class: cls, answers, score, sessionId }).save();
  res.json({ score, results });
});

// Лог порушення
app.post('/api/cheat', async (req, res) => {
  const { sessionId, type } = req.body;
  await new Cheat({ sessionId, type }).save();
  res.sendStatus(200);
});

app.listen(3000, () => console.log('Server running on port 3000'));