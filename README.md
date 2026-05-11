# 🎯 AI Interview Coach

A full-stack AI-powered interview practice app with voice confidence detection, real-time AI feedback, and MySQL database storage.

---

## ✨ Features

- 🤖 AI-generated interview questions (via Claude)
- 📊 AI scoring + detailed feedback per answer
- 🎤 Voice input with confidence detection (loud/steady = high confidence)
- 💾 Everything saved to MySQL database
- 📋 Interview history per user
- 🏆 Final grade + score breakdown

---

## 📁 Project Structure

```
interview-coach/
├── server.js          ← Express backend (all API routes)
├── package.json       ← Dependencies
├── .env.example       ← Environment variable template
├── schema.sql         ← MySQL database schema
└── public/
    └── index.html     ← Complete frontend (HTML + CSS + JS)
```

---

## 🛠️ Step-by-Step Setup Guide

### STEP 1 — Install Prerequisites

You need:
- **Node.js** (v18+): https://nodejs.org
- **MySQL** (v8+): https://dev.mysql.com/downloads/installer/

Verify they're installed:
```bash
node --version    # should show v18 or higher
mysql --version   # should show MySQL 8.x
```

---

### STEP 2 — Download / Clone the Project

```bash
# If you have it as a zip, extract it
# If using git:
git clone <your-repo-url>
cd interview-coach
```

---

### STEP 3 — Set Up the MySQL Database

Open MySQL terminal:
```bash
mysql -u root -p
# Enter your MySQL root password
```

Then run the schema:
```sql
source /path/to/interview-coach/schema.sql;
-- OR copy-paste the schema.sql contents directly
```

This creates:
- `interview_coach` database
- `users` table
- `interviews` table  
- `responses` table

Verify it worked:
```sql
USE interview_coach;
SHOW TABLES;
-- Should show: interviews, responses, users
```

Type `exit` to leave MySQL.

---

### STEP 4 — Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit it with your values
nano .env       # on Mac/Linux
notepad .env    # on Windows
```

Fill in:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password_here
DB_NAME=interview_coach

ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...

PORT=3000
```

**Getting your Anthropic API key:**
1. Go to https://console.anthropic.com
2. Click "API Keys" in the left sidebar
3. Click "Create Key"
4. Copy the key and paste it in `.env`

---

### STEP 5 — Install Node.js Dependencies

```bash
npm install
```

This installs: express, mysql2, cors, dotenv, node-fetch

---

### STEP 6 — Start the Server

```bash
node server.js
```

You should see:
```
✅ MySQL connected successfully
🚀 AI Interview Coach running at http://localhost:3000
📊 Health check: http://localhost:3000/api/health
```

---

### STEP 7 — Open the App

Open your browser and go to:
```
http://localhost:3000
```

---

## 🎮 How to Use the App

1. **Enter your name + email** → creates your account
2. **Select a job role** (e.g. Software Engineer, Product Manager)
3. **Answer 5 questions** — type or use the mic 🎤
4. After each answer, **AI gives you feedback + score**
5. After question 5, **see your final grade + breakdown**
6. Your history is saved — come back anytime!

---

## 🎤 How Voice Confidence Works

When you click the 🎤 mic button:
- Browser captures your microphone
- **Volume** is sampled continuously
- After you stop: volume, duration, speech length are analyzed

**Confidence Levels:**
| Level  | Meaning                                      |
|--------|----------------------------------------------|
| 🔴 Low    | Quiet/short response, hesitant delivery     |
| 🟡 Medium | Average volume, decent length               |
| 🟢 High   | Loud, steady, long answer — confident!      |

The confidence level is sent to AI and included in your feedback.

> **Note**: Voice works best in Chrome/Edge. Firefox has limited Web Speech API support.

---

## 🗄️ Database Tables Explained

### `users`
Stores everyone who logs in.
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-increment primary key |
| name | VARCHAR | User's full name |
| email | VARCHAR | Unique email (used to find returning users) |
| created_at | TIMESTAMP | When they registered |

### `interviews`
One row per interview session.
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-increment primary key |
| user_id | INT | Links to users table |
| job_role | VARCHAR | e.g. "Software Engineer" |
| status | ENUM | in_progress or completed |
| total_score | DECIMAL | Average score (set when completed) |
| started_at | TIMESTAMP | When interview began |
| completed_at | TIMESTAMP | When finished |

### `responses`
One row per answered question.
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto-increment primary key |
| interview_id | INT | Links to interviews table |
| question_number | INT | 1–5 |
| question_text | TEXT | The AI-generated question |
| user_answer | TEXT | What the user typed/said |
| ai_feedback | TEXT | Full feedback from AI |
| score | INT | 1–10 rating |
| confidence_level | ENUM | low, medium, or high |
| answered_at | TIMESTAMP | When they submitted |

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/users | Register/login user |
| POST | /api/interviews | Start new interview |
| POST | /api/questions | Get next AI question |
| POST | /api/responses | Submit answer, get feedback, save |
| POST | /api/interviews/:id/complete | Finish, calculate score |
| GET | /api/users/:id/history | Get past interviews |
| GET | /api/health | Check DB connection |

---

## 🐛 Troubleshooting

**"MySQL connection failed"**
- Is MySQL running? Start it: `mysql.server start` (Mac) or check Services (Windows)
- Check your `.env` password matches MySQL root password
- Try connecting manually: `mysql -u root -p`

**"Anthropic API error: 401"**
- Your API key is wrong or missing in `.env`
- Make sure there are no spaces around the key

**"Anthropic API error: 429"**  
- Rate limit hit. Wait 1 minute and try again.
- Check your Anthropic usage dashboard

**Voice not working**
- Use Chrome or Edge browser
- Allow microphone permission when prompted
- If on HTTP (not HTTPS), Chrome still allows mic on localhost

**Port already in use**
```bash
# Change port in .env
PORT=3001
# Or kill the process using port 3000
lsof -ti:3000 | xargs kill  # Mac/Linux
```

---

## 🚀 Going Further

- Add **authentication** (bcrypt + JWT) for secure login
- Deploy to **Railway** or **Render** (both support MySQL + Node.js free tier)
- Add **email reports** after each interview (nodemailer)
- Add **question categories** (behavioral, technical, HR)
- Add **video recording** with WebRTC
