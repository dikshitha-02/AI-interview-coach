// ============================================
// AI Interview Coach - Backend Server
// ============================================

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Database Connection Pool ───────────────────────────────────────────────
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'interview_coach',
  waitForConnections: true,
  connectionLimit: 10,
});

// Test DB on startup
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ MySQL connected successfully');
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Make sure MySQL is running and .env is configured correctly.');
  }
})();

// ─── Gemini API Helper ───────────────────────────────────────────────────────
async function callGemini(systemPrompt, userMessage) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const response = await result.response;

  return response.text();
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/users - Create or get user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.json({ user: existing[0], message: 'Welcome back!' });
    }

    // Create new user
    const [result] = await db.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );
    const [newUser] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json({ user: newUser[0], message: 'Account created!' });
  } catch (err) {
    console.error('User error:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/interviews - Start a new interview
app.post('/api/interviews', async (req, res) => {
  try {
    const { user_id, job_role } = req.body;
    if (!user_id || !job_role) return res.status(400).json({ error: 'user_id and job_role required' });

    // Verify user exists
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const [result] = await db.query(
      'INSERT INTO interviews (user_id, job_role, status) VALUES (?, ?, "in_progress")',
      [user_id, job_role]
    );

    res.status(201).json({
      interview_id: result.insertId,
      message: `Interview started for ${job_role}`,
    });
  } catch (err) {
    console.error('Interview error:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/questions - Get next question from AI
app.post('/api/questions', async (req, res) => {
  try {
    const { interview_id, question_number, job_role, previous_qa } = req.body;
    if (!interview_id || !job_role) return res.status(400).json({ error: 'interview_id and job_role required' });

    const qNum = question_number || 1;
    const previousContext = previous_qa && previous_qa.length > 0
      ? '\n\nPrevious Q&A:\n' + previous_qa.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')
      : '';

    const systemPrompt = `You are an experienced technical interviewer conducting a job interview for a ${job_role} position. 
Ask ONE clear, specific interview question. 
- Questions 1-2: Introductory/background questions
- Questions 3-4: Technical or skill-based questions  
- Question 5: Behavioral/situational question (final)
Keep questions concise and professional. Only output the question, nothing else.`;

    const userMessage = `This is question ${qNum} of 5 for a ${job_role} interview.${previousContext}\n\nAsk question ${qNum} now.`;

    const question = await callGemini(systemPrompt, userMessage);
    res.json({ question: question.trim(), question_number: qNum });
  } catch (err) {
    console.error('Question error:', err);
    res.status(500).json({ error: 'Failed to generate question: ' + err.message });
  }
});

// POST /api/responses - Submit answer, get feedback & save
app.post('/api/responses', async (req, res) => {
  try {
    const { interview_id, question_number, question_text, user_answer, confidence_level } = req.body;

    if (!interview_id || !question_text || !user_answer) {
      return res.status(400).json({ error: 'interview_id, question_text, and user_answer are required' });
    }

    // Verify interview exists
    const [interviews] = await db.query('SELECT * FROM interviews WHERE id = ?', [interview_id]);
    if (interviews.length === 0) return res.status(404).json({ error: 'Interview not found' });

    const jobRole = interviews[0].job_role;

    // Get AI feedback + score
    const systemPrompt = `You are an expert interviewer evaluating a candidate for a ${jobRole} role.
Analyze the answer and respond ONLY in this exact JSON format (no extra text):
{
  "score": <number 1-10>,
  "feedback": "<2-3 sentences of specific, constructive feedback>",
  "strengths": "<one key strength in the answer>",
  "improvement": "<one specific area to improve>"
}`;

    const userMessage = `Interview Question: ${question_text}\n\nCandidate's Answer: ${user_answer}\n\nVoice Confidence Level Detected: ${confidence_level || 'medium'}\n\nEvaluate this answer.`;

    const rawFeedback = await callGemini(systemPrompt, userMessage);

    // Parse JSON safely
    let parsed;
    try {
      const cleaned = rawFeedback.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      // Fallback if JSON parsing fails
      parsed = {
        score: 6,
        feedback: rawFeedback.slice(0, 300),
        strengths: 'Answer provided',
        improvement: 'Practice more concise responses',
      };
    }

    const score = Math.min(10, Math.max(1, parseInt(parsed.score) || 6));
    const feedbackText = `${parsed.feedback} | Strength: ${parsed.strengths} | Improve: ${parsed.improvement}`;

    // Save to database
    const [result] = await db.query(
      `INSERT INTO responses 
       (interview_id, question_number, question_text, user_answer, ai_feedback, score, confidence_level) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        interview_id,
        question_number || 1,
        question_text,
        user_answer,
        feedbackText,
        score,
        confidence_level || 'medium',
      ]
    );

    res.status(201).json({
      response_id: result.insertId,
      score,
      feedback: parsed.feedback,
      strengths: parsed.strengths,
      improvement: parsed.improvement,
      confidence_level: confidence_level || 'medium',
    });
  } catch (err) {
    console.error('Response error:', err);
    res.status(500).json({ error: 'Failed to process response: ' + err.message });
  }
});

// POST /api/interviews/:id/complete - Finish interview, calculate final score
app.post('/api/interviews/:id/complete', async (req, res) => {
  try {
    const interviewId = req.params.id;

    const [responses] = await db.query(
      'SELECT score FROM responses WHERE interview_id = ?',
      [interviewId]
    );

    if (responses.length === 0) return res.status(400).json({ error: 'No responses found' });

    const avg = responses.reduce((sum, r) => sum + r.score, 0) / responses.length;
    const totalScore = parseFloat(avg.toFixed(2));

    await db.query(
      'UPDATE interviews SET status = "completed", total_score = ?, completed_at = NOW() WHERE id = ?',
      [totalScore, interviewId]
    );

    // Get summary
    const [allResponses] = await db.query(
      'SELECT question_number, score, ai_feedback, confidence_level FROM responses WHERE interview_id = ? ORDER BY question_number',
      [interviewId]
    );

    res.json({
      interview_id: interviewId,
      total_score: totalScore,
      grade: getGrade(totalScore),
      responses: allResponses,
      message: 'Interview completed and saved!',
    });
  } catch (err) {
    console.error('Complete error:', err);
    res.status(500).json({ error: 'Failed to complete interview: ' + err.message });
  }
});

// GET /api/users/:id/history - Get user's interview history
app.get('/api/users/:id/history', async (req, res) => {
  try {
    const [interviews] = await db.query(
      `SELECT i.id, i.job_role, i.status, i.total_score, i.started_at, i.completed_at,
              COUNT(r.id) as response_count
       FROM interviews i
       LEFT JOIN responses r ON r.interview_id = i.id
       WHERE i.user_id = ?
       GROUP BY i.id
       ORDER BY i.started_at DESC
       LIMIT 10`,
      [req.params.id]
    );
    res.json({ interviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health - Health check
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Grade Helper ─────────────────────────────────────────────────────────────
function getGrade(score) {
  if (score >= 9) return { letter: 'A+', label: 'Outstanding', emoji: '🏆' };
  if (score >= 8) return { letter: 'A', label: 'Excellent', emoji: '⭐' };
  if (score >= 7) return { letter: 'B', label: 'Good', emoji: '👍' };
  if (score >= 6) return { letter: 'C', label: 'Average', emoji: '📈' };
  if (score >= 5) return { letter: 'D', label: 'Needs Work', emoji: '💪' };
  return { letter: 'F', label: 'Keep Practicing', emoji: '📚' };
}

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 AI Interview Coach running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
});
