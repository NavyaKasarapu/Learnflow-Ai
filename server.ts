/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { db } from './server/db.js';
import {
  User,
  Profile,
  Roadmap,
  RoadmapModule,
  CompactLesson,
  DetailedLesson,
  DetailedNotes,
  QuizQuestion,
  QuizAttempt,
  CodingProblem,
  CodingAttempt,
  Bookmark,
  Recommendation,
  Streak,
  StudySession,
  Notification,
  ActivityLog,
  AnalyticsData
} from './src/types.js';

// Load environment variables
dotenv.config();

// Initialize Gemini SDK with telemetry user-agent as per guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
const PORT = 3000;

app.use(express.json());

// JWT Sign and Verify helpers (written in native crypto for absolute runtime stability)
const JWT_SECRET = process.env.JWT_SECRET || 'learnflow_super_secret_key_2026';

function signToken(payload: { userId: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 7 })).toString('base64url'); // 7 days exp
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token required.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired authentication token.' });
    return;
  }

  req.user = payload;
  next();
}

// ==========================================
// API ROUTES
// ==========================================

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- AUTHENTICATION ---
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  try {
    const { user, profile } = db.createUser(email, password, name);
    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name }, profile });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.findUserByEmail(email);
  if (!user || db.hashPassword(password) !== user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const profile = db.getProfile(user.id);
  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name }, profile });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }
  const user = db.findUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'No account found with this email.' });
    return;
  }
  // Simulate sending reset instructions
  db.logActivity(user.id, 'forgot_password', 'Requested password reset.');
  res.json({ success: true, message: 'Password reset link has been simulated. Check your activity log!' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ error: 'Email and new password are required.' });
    return;
  }
  const user = db.findUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'No account found.' });
    return;
  }
  user.passwordHash = db.hashPassword(newPassword);
  db.logActivity(user.id, 'reset_password', 'Password reset successfully completed.');
  res.json({ success: true, message: 'Password reset successfully!' });
});

// --- PROFILE ---
app.get('/api/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  const profile = db.getProfile(req.user!.userId);
  const user = db.findUserById(req.user!.userId);
  if (!profile || !user) {
    res.status(404).json({ error: 'Profile not found.' });
    return;
  }
  res.json({ profile, user: { id: user.id, email: user.email, name: user.name } });
});

app.put('/api/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const updated = db.updateProfile(req.user!.userId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/profile/update', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { name, education, skillLevel, learningGoal, avatarUrl } = req.body;
    
    // Update user name if provided
    const user = db.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (name) {
      user.name = name;
    }
    
    // Update profile details
    const profile = db.updateProfile(userId, {
      education,
      skillLevel,
      learningGoal,
      avatarUrl
    });
    
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      profile
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- ROADMAPS & LESSONS (AI GENERATED) ---
app.get('/api/roadmaps', authenticateToken, (req: AuthenticatedRequest, res) => {
  const list = db.getRoadmaps(req.user!.userId);
  res.json(list);
});

app.post('/api/roadmaps/generate', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { topic, difficulty } = req.body;
  if (!topic) {
    res.status(400).json({ error: 'Learning topic is required.' });
    return;
  }

  const diffStr = difficulty || 'beginner';
  db.logActivity(req.user!.userId, 'roadmap_gen_start', `Started roadmap generation for ${topic} (${diffStr})`);

  try {
    const prompt = `Generate a highly structured learning syllabus/roadmap for the topic "${topic}" tailored for difficulty level: "${diffStr}".
    The roadmap must contain 4-5 core learning modules (with title, description), and each module must contain 3-4 structured lessons (with title) to guide a student sequentially from beginner to advanced.
    Ensure titles are educational, modern, and detailed. Provide estimated roadmap duration. Output strictly in JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            duration: { type: Type.STRING },
            modules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  lessons: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING }
                      },
                      required: ['title']
                    }
                  }
                },
                required: ['title', 'description', 'lessons']
              }
            }
          },
          required: ['title', 'description', 'duration', 'modules']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const newRoadmap = db.createRoadmap(
      req.user!.userId,
      topic,
      data.title || `Mastering ${topic}`,
      data.description || `Personalized roadmap for ${topic}`,
      diffStr,
      data.duration || '4 weeks',
      data.modules || []
    );

    res.json(newRoadmap);
  } catch (err: any) {
    console.error('Gemini error during roadmap generation:', err);
    res.status(500).json({ error: 'AI failed to generate your roadmap. Please try again.' });
  }
});

app.delete('/api/roadmaps/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const success = db.deleteRoadmap(req.params.id, req.user!.userId);
  if (success) {
    res.json({
      success: true,
      message: "Roadmap deleted successfully."
    });
  } else {
    res.status(404).json({ error: 'Roadmap not found or unauthorized.' });
  }
});

// Get detailed lesson content on-the-fly (AI-generated and cached)
app.get('/api/roadmaps/:id/lessons/:lessonId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id: roadmapId, lessonId } = req.params;
  const roadmap = db.getRoadmap(roadmapId);
  if (!roadmap || roadmap.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Roadmap not found.' });
    return;
  }

  // Find the basic lesson entry in the roadmap
  let compactLesson: any = null;
  let lessonModule: any = null;
  roadmap.modules.forEach(m => {
    const l = m.lessons.find(less => less.id === lessonId);
    if (l) {
      compactLesson = l;
      lessonModule = m;
    }
  });

  if (!compactLesson) {
    res.status(404).json({ error: 'Lesson entry not found in this roadmap.' });
    return;
  }

  // Check if detailed lesson already generated & saved
  const cached = db.getDetailedLesson(lessonId);
  if (cached) {
    res.json(cached);
    return;
  }

  // Otherwise, let's generate it using Gemini
  try {
    db.logActivity(req.user!.userId, 'lesson_gen_start', `Generating detailed lesson content for "${compactLesson.title}"`);

    const prompt = `You are a world-class AI learning assistant. Generate a highly detailed educational lesson for:
    Roadmap Topic: "${roadmap.topic}"
    Module Name: "${lessonModule.title}"
    Lesson Name: "${compactLesson.title}"
    Difficulty: "${roadmap.difficulty}"

    Provide:
    1. A clear, comprehensive markdown explanation of the topic.
    2. A list of 4-5 Key Concepts.
    3. A list of 4-5 Key Points.
    4. 2-3 Real-world Examples.
    5. 2-3 Code Examples (including language, code block, and step-by-step logic explanation). If the topic is non-technical, generate structured workflow logic or conceptual flowcharts.
    6. 3-4 Best Practices.
    7. 3-4 Common Mistakes.
    8. A concise summary.
    9. Revision Notes (punchy takeaways).
    10. 3-4 Interview Questions related to this lesson.

    Ensure content is rich, engaging, and directly applicable. Output strictly in JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            explanation: { type: Type.STRING },
            keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            realWorldExamples: { type: Type.ARRAY, items: { type: Type.STRING } },
            codeExamples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  language: { type: Type.STRING },
                  code: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ['language', 'code', 'explanation']
              }
            },
            bestPractices: { type: Type.ARRAY, items: { type: Type.STRING } },
            commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            revisionNotes: { type: Type.STRING },
            interviewQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            'title', 'explanation', 'keyConcepts', 'keyPoints', 'realWorldExamples',
            'codeExamples', 'bestPractices', 'commonMistakes', 'summary', 'revisionNotes', 'interviewQuestions'
          ]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const detailed: DetailedLesson = {
      id: lessonId,
      roadmapId,
      moduleId: lessonModule.id,
      title: data.title || compactLesson.title,
      explanation: data.explanation || 'No content generated.',
      keyConcepts: data.keyConcepts || [],
      keyPoints: data.keyPoints || [],
      realWorldExamples: data.realWorldExamples || [],
      codeExamples: data.codeExamples || [],
      bestPractices: data.bestPractices || [],
      commonMistakes: data.commonMistakes || [],
      summary: data.summary || '',
      revisionNotes: data.revisionNotes || '',
      interviewQuestions: data.interviewQuestions || []
    };

    db.saveDetailedLesson(detailed);
    res.json(detailed);
  } catch (err: any) {
    console.error('Gemini error during lesson generation:', err);
    res.status(500).json({ error: 'AI failed to generate lesson content.' });
  }
});

// Complete Lesson
app.post('/api/roadmaps/:id/lessons/:lessonId/complete', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const updatedRoadmap = db.completeLesson(req.user!.userId, req.params.id, req.params.lessonId);
    // Log a study session of 15 minutes (900s) to update active streak
    db.recordStudySession(req.user!.userId, 900, 'lesson');
    res.json(updatedRoadmap);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- NOTES (AI GENERATED) ---
app.get('/api/roadmaps/:id/lessons/:lessonId/notes', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id: roadmapId, lessonId } = req.params;
  const roadmap = db.getRoadmap(roadmapId);
  if (!roadmap || roadmap.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Roadmap not found.' });
    return;
  }

  // Check if notes already generated
  const cached = db.getDetailedNotes(lessonId);
  if (cached) {
    res.json(cached);
    return;
  }

  // Find detailed lesson context
  const lesson = db.getDetailedLesson(lessonId);
  const lessonTitle = lesson ? lesson.title : 'Selected Lesson';
  const explanationContext = lesson ? lesson.explanation : '';

  try {
    db.logActivity(req.user!.userId, 'notes_gen_start', `Generating detailed notes for lesson: ${lessonTitle}`);

    const prompt = `Generate comprehensive studying notes for the lesson "${lessonTitle}" in "${roadmap.topic}".
    Explanation Context: ${explanationContext}

    Provide:
    1. 4-5 core Definitions (with term and definition strings).
    2. Detailed Explanation (deep dive into the logic, structures, or concepts).
    3. 2-3 additional detailed examples.
    4. 4-5 Important study points.
    5. Quick Revision Notes.
    6. 3-4 Interview Questions with ideal answers.
    7. 3-4 Frequently Asked Questions (FAQ) with answers.

    Output strictly in JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            definitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING }
                },
                required: ['term', 'definition']
              }
            },
            detailedExplanation: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            importantPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            revisionNotes: { type: Type.STRING },
            interviewQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            faq: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                },
                required: ['question', 'answer']
              }
            }
          },
          required: ['title', 'definitions', 'detailedExplanation', 'examples', 'importantPoints', 'revisionNotes', 'interviewQuestions', 'faq']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const notes: DetailedNotes = {
      id: crypto.randomUUID(),
      lessonId,
      title: data.title || `Study Notes: ${lessonTitle}`,
      definitions: data.definitions || [],
      detailedExplanation: data.detailedExplanation || '',
      examples: data.examples || [],
      importantPoints: data.importantPoints || [],
      revisionNotes: data.revisionNotes || '',
      interviewQuestions: data.interviewQuestions || [],
      faq: data.faq || []
    };

    db.saveDetailedNotes(notes);
    res.json(notes);
  } catch (err: any) {
    console.error('Notes generation error:', err);
    res.status(500).json({ error: 'AI failed to generate notes.' });
  }
});

// --- QUIZ (AI GENERATED) ---
app.get('/api/roadmaps/:id/lessons/:lessonId/quiz', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id: roadmapId, lessonId } = req.params;
  const roadmap = db.getRoadmap(roadmapId);
  if (!roadmap) {
    res.status(404).json({ error: 'Roadmap not found.' });
    return;
  }

  // Return cached quiz questions if available
  const cached = db.getLessonQuizQuestions(lessonId);
  if (cached && cached.length > 0) {
    res.json(cached);
    return;
  }

  // Get detailed lesson context for quiz alignment
  const lesson = db.getDetailedLesson(lessonId);
  const lessonTitle = lesson ? lesson.title : 'Lesson';
  const lessonContent = lesson ? lesson.explanation : '';

  try {
    db.logActivity(req.user!.userId, 'quiz_gen_start', `Generating adaptive quiz questions for lesson: ${lessonTitle}`);

    const prompt = `Generate 5 multiple-choice questions for a quiz based on the lesson "${lessonTitle}".
    Lesson Context: ${lessonContent}
    Ensure questions are highly educational, have adaptive difficulties (from easy to hard), and offer 4 options with exactly one correct option.
    Each question must also provide a detailed explanation explaining why the correct option is right and the others are incorrect.
    Output strictly in JSON format as an array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctOptionIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ['question', 'options', 'correctOptionIndex', 'explanation']
          }
        }
      }
    });

    const data = JSON.parse(response.text || '[]');
    const questions: QuizQuestion[] = data.map((q: any) => ({
      ...q,
      id: crypto.randomUUID(),
    }));

    db.saveLessonQuizQuestions(lessonId, questions);
    res.json(questions);
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: 'AI failed to generate quiz questions.' });
  }
});

app.post('/api/roadmaps/:id/lessons/:lessonId/quiz/submit', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { id: roadmapId, lessonId } = req.params;
  const { correct, wrong, timeSeconds } = req.body;

  if (correct === undefined || wrong === undefined) {
    res.status(400).json({ error: 'Correct and wrong counts are required.' });
    return;
  }

  const roadmap = db.getRoadmap(roadmapId);
  if (!roadmap) {
    res.status(404).json({ error: 'Roadmap not found.' });
    return;
  }

  // Determine current module
  let moduleId = '';
  roadmap.modules.forEach(m => {
    if (m.lessons.some(l => l.id === lessonId)) {
      moduleId = m.id;
    }
  });

  const attempt = db.recordQuizAttempt(
    req.user!.userId,
    roadmapId,
    moduleId,
    lessonId,
    correct,
    wrong,
    timeSeconds || 60
  );

  // Record a study session for the quiz attempt to advance study streak
  db.recordStudySession(req.user!.userId, timeSeconds || 120, 'quiz');

  res.json(attempt);
});

// --- CODING PRACTICE & SANDBOX (AI GENERATED) ---
app.get('/api/roadmaps/:id/coding/problems', authenticateToken, (req: AuthenticatedRequest, res) => {
  const roadmapId = req.params.id;
  const roadmap = db.getRoadmap(roadmapId);
  if (!roadmap) {
    res.status(404).json({ error: 'Roadmap not found.' });
    return;
  }

  const existing = db.getCodingProblems(roadmapId);
  res.json(existing);
});

// GET stats for coding practice
app.get('/api/roadmaps/:id/coding/stats', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const roadmapId = req.params.id;

  const roadmap = db.getRoadmap(roadmapId);
  if (!roadmap) {
    res.status(404).json({ error: 'Roadmap not found.' });
    return;
  }

  const problems = db.getCodingProblems(roadmapId);
  const problemIds = problems.map(p => p.id);

  const allAttempts = db.getCodingAttempts(userId);
  const roadmapAttempts = allAttempts.filter(a => problemIds.includes(a.problemId));

  const uniqueAttemptedIds = new Set(roadmapAttempts.map(a => a.problemId));
  const problemsAttemptedCount = uniqueAttemptedIds.size;

  const solvedProblemIds = new Set(
    roadmapAttempts.filter(a => a.status === 'success').map(a => a.problemId)
  );
  const problemsSolvedCount = solvedProblemIds.size;

  const incorrectAttemptsCount = roadmapAttempts.filter(a => a.status === 'fail').length;

  const totalTimeSpent = roadmapAttempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0);

  const nonSkippedAttempts = roadmapAttempts.filter(a => a.status !== 'skipped');
  const totalAttemptsCount = nonSkippedAttempts.length;
  const successfulAttemptsCount = nonSkippedAttempts.filter(a => a.status === 'success').length;
  const accuracy = totalAttemptsCount > 0 ? Math.round((successfulAttemptsCount / totalAttemptsCount) * 100) : 0;

  let currentDifficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'advanced' = 'beginner';
  if (problemsSolvedCount === 1) currentDifficulty = 'easy';
  else if (problemsSolvedCount === 2) currentDifficulty = 'medium';
  else if (problemsSolvedCount === 3) currentDifficulty = 'hard';
  else if (problemsSolvedCount >= 4) currentDifficulty = 'advanced';

  res.json({
    problemsAttempted: problemsAttemptedCount,
    problemsSolved: problemsSolvedCount,
    incorrectAttempts: incorrectAttemptsCount,
    accuracy,
    timeSpent: totalTimeSpent,
    currentDifficultyLevel: currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)
  });
});

// POST to generate the next unique coding problem using Gemini 2.5 Flash
app.post('/api/roadmaps/:id/coding/next', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const roadmapId = req.params.id;
  const roadmap = db.getRoadmap(roadmapId);
  if (!roadmap) {
    res.status(404).json({ error: 'Roadmap not found.' });
    return;
  }

  const userId = req.user!.userId;

  // 1. Calculate difficulty level based on unique solved count
  const problems = db.getCodingProblems(roadmapId);
  const problemIds = problems.map(p => p.id);
  const allAttempts = db.getCodingAttempts(userId);
  const roadmapAttempts = allAttempts.filter(a => problemIds.includes(a.problemId));
  const solvedProblemIds = new Set(
    roadmapAttempts.filter(a => a.status === 'success').map(a => a.problemId)
  );
  const problemsSolvedCount = solvedProblemIds.size;

  let currentDifficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'advanced' = 'beginner';
  if (problemsSolvedCount === 1) currentDifficulty = 'easy';
  else if (problemsSolvedCount === 2) currentDifficulty = 'medium';
  else if (problemsSolvedCount === 3) currentDifficulty = 'hard';
  else if (problemsSolvedCount >= 4) currentDifficulty = 'advanced';

  // 2. Avoid repetition: get existing titles to prevent duplication
  const existingTitles = problems.map(p => p.title);
  const existingTitlesStr = existingTitles.length > 0 ? existingTitles.join(', ') : 'None';

  try {
    db.logActivity(userId, 'coding_gen_start', `Generating next coding problem at level ${currentDifficulty} for topic: ${roadmap.topic}`);

    const prompt = `You are an elite coding challenge designer. Create a single coding problem tailored STRICTLY to the roadmap topic: "${roadmap.topic}".
    
    The difficulty level for this problem MUST be: "${currentDifficulty}".
    
    To avoid repetition and guarantee variety, you MUST NOT duplicate or closely mimic any of the following existing challenge titles or concepts:
    [${existingTitlesStr}]
    
    CRITICAL: 
    - If the topic is a frontend, UI, or web concept like "React", "HTML/CSS", or similar, focus on writing a core utility function, custom hook manager, state/data reducer, nested tree router, or string/array manipulation associated with that topic in JavaScript/TypeScript (e.g., query parser, query param builder, virtual DOM element diffing, state change calculator, recursive list renderer helper).
    - If the topic is a standard programming language like Python, Java, C++, SQL, Go, etc., generate an algorithmic problem that can be written in Python, Java, C++, or JavaScript.

    Your response must contain:
    1. title: A concise, catchy name for the problem.
    2. problemStatement: A clear description of the problem, input constraints, and goals in Markdown format.
    3. difficulty: Set this exactly to "${currentDifficulty}".
    4. inputFormat: Describe the inputs clearly.
    5. outputFormat: Describe the expected output clearly.
    6. constraints: An array of strings representing problem constraints (e.g., "N <= 10^5", "All inputs are lowercase").
    7. sampleInput: A string showing a sample raw input.
    8. sampleOutput: A string showing a sample raw output corresponding to sampleInput.
    9. examples: An array of 1 or 2 examples with fields:
       - input: string
       - output: string
       - explanation: string (logical walkthrough)
    10. testCases: An array of exactly 3 test cases. Each test case must have:
        - input: string (the function argument or input representation)
        - expectedOutput: string (the expected return value or output)
        - isHidden: boolean (at least one test case must be hidden, i.e., isHidden = true)
    11. hints: An array of 1 or 2 helpful hints.
    12. explanation: A full, detailed logic explanation of the optimal solution.

    Output the response strictly as a JSON object matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            problemStatement: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            inputFormat: { type: Type.STRING },
            outputFormat: { type: Type.STRING },
            constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
            sampleInput: { type: Type.STRING },
            sampleOutput: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  output: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ['input', 'output']
              }
            },
            hints: { type: Type.ARRAY, items: { type: Type.STRING } },
            testCases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  expectedOutput: { type: Type.STRING },
                  isHidden: { type: Type.BOOLEAN }
                },
                required: ['input', 'expectedOutput', 'isHidden']
              }
            },
            explanation: { type: Type.STRING }
          },
          required: [
            'title', 'problemStatement', 'difficulty', 'inputFormat', 'outputFormat',
            'constraints', 'sampleInput', 'sampleOutput', 'examples', 'hints', 'testCases', 'explanation'
          ]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const newProblem: CodingProblem = {
      ...data,
      id: crypto.randomUUID(),
      roadmapId,
      difficulty: currentDifficulty
    };

    db.saveCodingProblems([newProblem]);
    res.json(newProblem);
  } catch (err: any) {
    console.error('Next coding problem generation error:', err);
    res.status(500).json({ error: 'AI failed to generate coding practice problems.' });
  }
});

// AI sandbox code compiler (handles Python, Java, C++, JavaScript simulation)
app.post('/api/sandbox/run', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { language, code, testCases } = req.body;
  if (!language || !code || !testCases) {
    res.status(400).json({ error: 'Language, code, and testCases are required.' });
    return;
  }

  try {
    const prompt = `You are an isolated, secure compiler sandbox. Execute the following code written in "${language}" against each input test case.
    Code:
    \`\`\`${language}
    ${code}
    \`\`\`

    Test Cases:
    ${JSON.stringify(testCases, null, 2)}

    Return a compiler output report. If there is a syntax error, compile error, or runtime error, report the precise compiler standard stderr traceback error.
    For each test case:
    - Capture output (stdout).
    - Determine if it matches the expected output.
    - Set passed: true/false.

    Output report strictly in JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING }, // 'success' or 'fail'
            error: { type: Type.STRING },  // Compilation error description or empty string
            testCaseResults: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  expectedOutput: { type: Type.STRING },
                  actualOutput: { type: Type.STRING },
                  passed: { type: Type.BOOLEAN },
                  stdout: { type: Type.STRING },
                  stderr: { type: Type.STRING }
                },
                required: ['input', 'expectedOutput', 'actualOutput', 'passed']
              }
            }
          },
          required: ['status', 'error', 'testCaseResults']
        }
      }
    });

    const report = JSON.parse(response.text || '{}');
    res.json(report);
  } catch (err: any) {
    console.error('Compiler run error:', err);
    res.status(500).json({ error: 'Sandbox compiler timeout or error. Please check syntax!' });
  }
});

app.post('/api/sandbox/submit', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { problemId, language, code, testCases, timeSpent, difficulty } = req.body;
  if (!problemId || !language || !code || !testCases) {
    res.status(400).json({ error: 'Problem ID, language, code, and testCases are required.' });
    return;
  }

  try {
    const prompt = `You are a competitive programming grading system. Compile and execute the following code in "${language}" and grade it against the test cases.
    Code:
    \`\`\`${language}
    ${code}
    \`\`\`

    Test Cases:
    ${JSON.stringify(testCases, null, 2)}

    Determine if all test cases pass. Output strictly in JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING }, // 'success' or 'fail'
            error: { type: Type.STRING },
            testCaseResults: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  expectedOutput: { type: Type.STRING },
                  actualOutput: { type: Type.STRING },
                  passed: { type: Type.BOOLEAN }
                },
                required: ['input', 'expectedOutput', 'actualOutput', 'passed']
              }
            }
          },
          required: ['status', 'error', 'testCaseResults']
        }
      }
    });

    const report = JSON.parse(response.text || '{}');
    const overallStatus = report.status === 'success' ? 'success' : 'fail';

    const attempt = db.recordCodingAttempt(
      req.user!.userId,
      problemId,
      code,
      language,
      overallStatus,
      report.testCaseResults?.[0]?.actualOutput || '',
      report.error,
      timeSpent,
      difficulty
    );

    // If successfully solved, record a study session to advance study streak
    if (overallStatus === 'success') {
      db.recordStudySession(req.user!.userId, timeSpent || 180, 'coding');
    }

    res.json({ attempt, report });
  } catch (err: any) {
    console.error('Compiler submit error:', err);
    res.status(500).json({ error: 'Compiler grading server error.' });
  }
});

app.post('/api/sandbox/skip', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { problemId, language, code, timeSpent, difficulty } = req.body;
  if (!problemId) {
    res.status(400).json({ error: 'Problem ID is required.' });
    return;
  }

  const attempt = db.recordCodingAttempt(
    req.user!.userId,
    problemId,
    code || '',
    language || 'python',
    'skipped',
    'Skipped problem',
    undefined,
    timeSpent,
    difficulty
  );

  res.json({ attempt });
});

// --- BOOKMARKS ---
app.get('/api/bookmarks', authenticateToken, (req: AuthenticatedRequest, res) => {
  const list = db.getBookmarks(req.user!.userId);
  res.json(list);
});

app.post('/api/bookmarks', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { type, targetId, title, subtitle } = req.body;
  if (!type || !targetId || !title) {
    res.status(400).json({ error: 'Bookmark type, targetId, and title are required.' });
    return;
  }
  const bookmark = db.addBookmark(req.user!.userId, type, targetId, title, subtitle || '');
  res.json(bookmark);
});

app.delete('/api/bookmarks', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { type, targetId } = req.body;
  if (!type || !targetId) {
    res.status(400).json({ error: 'Bookmark type and targetId are required.' });
    return;
  }
  const success = db.removeBookmark(req.user!.userId, type, targetId);
  res.json({ success });
});

// --- HELPER FOR AI RECOMMENDATIONS ---
async function generateUserRecommendations(userId: string) {
  const profile = db.getProfile(userId) || { skillLevel: 'beginner', learningGoal: '', education: '' };
  const analytics = db.getAnalytics(userId);
  const roadmaps = db.getRoadmaps(userId);

  if (roadmaps.length === 0) {
    return {
      recommendedLessons: [],
      strongTopics: analytics.strongTopics || [],
      weakTopics: analytics.weakTopics || []
    };
  }

  // Build lesson pool
  const lessonList: any[] = [];
  roadmaps.forEach(r => {
    r.modules.forEach(m => {
      m.lessons.forEach(l => {
        lessonList.push({
          roadmapId: r.id,
          roadmapTitle: r.title,
          moduleId: m.id,
          moduleTitle: m.title,
          lessonId: l.id,
          lessonTitle: l.title,
          isCompleted: l.isCompleted
        });
      });
    });
  });

  const prompt = `You are an elite pedagogical AI assistant. Analyze this student's profile, active courses, and history to generate EXACTLY 3 highly personalized study recommendations.

Student Profile:
- Learning Goal: ${profile.learningGoal || 'General Improvement'}
- Skill Level: ${profile.skillLevel}
- Education Background: ${profile.education || 'Self-Taught'}

Current Progress Summary:
- Completed Lessons Count: ${analytics.lessonsCompleted}
- Remaining Lessons Count: ${analytics.lessonsRemaining}
- Average Quiz Accuracy: ${analytics.quizAccuracy}%
- Average Coding Accuracy: ${analytics.codingAccuracy}%
- Strong Topics: ${JSON.stringify(analytics.strongTopics)}
- Weak Topics: ${JSON.stringify(analytics.weakTopics)}

Active Lessons Pool (Select from these actual lessons for your recommendations):
${JSON.stringify(lessonList.slice(0, 40))}

Your task:
Generate exactly 3 study recommendations. Each recommendation must point to an ACTUAL lesson in the Active Lessons Pool above.
Provide:
1. "roadmapId": The exact roadmapId of the recommended lesson.
2. "lessonId": The exact lessonId of the recommended lesson.
3. "lessonTitle": An engaging recommendation title (e.g., "Review Lesson: Loops in Python", "Next Milestone: JavaScript Functions").
4. "reason": A friendly, hyper-personalized, actionable explanation of why you recommend this. Refer to their learning goal ("${profile.learningGoal}"), skill level ("${profile.skillLevel}"), quiz scores, weak topics, or chronological study next-steps.

Ensure the output is strictly valid JSON matching the schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendedLessons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                roadmapId: { type: Type.STRING },
                lessonId: { type: Type.STRING },
                lessonTitle: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ['roadmapId', 'lessonId', 'lessonTitle', 'reason']
            }
          }
        },
        required: ['recommendedLessons']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{"recommendedLessons":[]}');
  const recommendedLessons = parsed.recommendedLessons || [];

  // Save using our new helper
  db.saveRecommendationsPayload(userId, recommendedLessons);

  // Re-save the checksum inside the recommendations to cache it
  const completedCount = lessonList.filter(l => l.isCompleted).length;
  const quizAttempts = db.getQuizAttempts(userId);
  const codingAttempts = db.getCodingAttempts(userId);
  const currentChecksum = `${completedCount}:${quizAttempts.length}:${codingAttempts.length}:${roadmaps.length}`;

  // Find and update metadata
  const allRecs = db.getRecommendations(userId);
  const metaRec = allRecs.find(r => r.topic === 'metadata');
  if (metaRec) {
    metaRec.targetId = currentChecksum;
    db.save();
  } else {
    // Save metadata
    db.saveRecommendations(userId, [
      ...db.getRecommendations(userId),
      {
        id: 'metadata-' + userId,
        userId,
        topic: 'metadata',
        type: 'metadata' as any,
        targetId: currentChecksum,
        reason: '',
        difficulty: 'intermediate',
        createdAt: new Date().toISOString()
      }
    ]);
  }

  return db.getRecommendationsPayload(userId);
}

// --- RECOMMENDATIONS (AI GENERATED) ---
app.get('/api/recommendations', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const roadmaps = db.getRoadmaps(userId);

  if (roadmaps.length === 0) {
    res.json({
      recommendedLessons: [],
      strongTopics: [],
      weakTopics: []
    });
    return;
  }

  // Calculate checksum of current student progress
  const quizAttempts = db.getQuizAttempts(userId);
  const codingAttempts = db.getCodingAttempts(userId);
  let completedCount = 0;
  roadmaps.forEach(r => {
    r.modules.forEach(m => {
      m.lessons.forEach(l => {
        if (l.isCompleted) completedCount++;
      });
    });
  });
  const currentChecksum = `${completedCount}:${quizAttempts.length}:${codingAttempts.length}:${roadmaps.length}`;

  // Check saved metadata checksum
  const recs = db.getRecommendations(userId);
  const meta = recs.find(r => r.topic === 'metadata');
  const savedChecksum = meta ? meta.targetId : '';

  const lessonsCount = recs.filter(r => r.type === 'lesson').length;

  if (savedChecksum === currentChecksum && lessonsCount > 0) {
    // Cache hit! Return saved payload instantly
    res.json(db.getRecommendationsPayload(userId));
  } else {
    // Cache miss! Auto-generate on-the-fly to keep recommendations completely dynamic!
    try {
      db.logActivity(userId, 'recs_auto_gen', 'Updating personalized recommendations with Gemini AI');
      const payload = await generateUserRecommendations(userId);
      res.json(payload);
    } catch (err) {
      console.error('Error generating on-the-fly recommendations:', err);
      // Fallback: return cached even if stale, or return defaults
      res.json(db.getRecommendationsPayload(userId));
    }
  }
});

app.post('/api/recommendations/generate', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  try {
    const payload = await generateUserRecommendations(userId);
    res.json(payload);
  } catch (err: any) {
    console.error('Recommendations generation error:', err);
    res.status(500).json({ error: 'AI failed to compute recommendations.' });
  }
});

// --- ANALYTICS ---
app.get('/api/analytics', authenticateToken, (req: AuthenticatedRequest, res) => {
  const stats = db.getAnalytics(req.user!.userId);
  res.json(stats);
});

// --- STREAKS ---
app.get(['/api/streak', '/api/streaks'], authenticateToken, (req: AuthenticatedRequest, res) => {
  const streak = db.getStreak(req.user!.userId);
  res.json(streak);
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', authenticateToken, (req: AuthenticatedRequest, res) => {
  const list = db.getNotifications(req.user!.userId);
  res.json(list);
});

app.post('/api/notifications/:id/read', authenticateToken, (req: AuthenticatedRequest, res) => {
  db.markNotificationRead(req.params.id, req.user!.userId);
  res.json({ success: true });
});

// --- ACTIVITY LOGS ---
app.get('/api/logs', authenticateToken, (req: AuthenticatedRequest, res) => {
  const list = db.getActivityLogs(req.user!.userId);
  res.json(list);
});

app.post('/api/logs', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { actionType, details } = req.body;
  if (!details) {
    res.status(400).json({ error: 'Details are required.' });
    return;
  }

  // Save activity log
  db.logActivity(req.user!.userId, actionType || 'self_study', details);

  // Parse minutes from details string e.g., "Self Study: Read docs (45 mins)"
  const match = details.match(/\((\d+)\s*mins?\)/);
  const minutes = match ? parseInt(match[1]) : 30;

  // Record a real study session in the database to increment the streak and update weekly/daily minutes!
  db.recordStudySession(req.user!.userId, minutes * 60, 'general');

  res.json({ success: true });
});

// ==========================================
// STATIC FRONTEND SERVING & VITE
// ==========================================

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    // Use Vite's dev server middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve built static frontend asset bundle in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind exclusively to port 3000 and host 0.0.0.0 as required by container infrastructure
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
