-- ============================================
-- AI Interview Coach - MySQL Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS interview_coach;
USE interview_coach;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_role VARCHAR(200) NOT NULL,
  status ENUM('in_progress', 'completed') DEFAULT 'in_progress',
  total_score DECIMAL(5,2) DEFAULT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  interview_id INT NOT NULL,
  question_number INT NOT NULL,
  question_text TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  ai_feedback TEXT NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 10),
  confidence_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
);

-- Sample user for testing
INSERT IGNORE INTO users (name, email) VALUES ('Test User', 'test@example.com');
