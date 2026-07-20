/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
} from '../src/types.js';

// Define the file path for data storage
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Interface representing the structure of our JSON database
interface DatabaseSchema {
  users: User[];
  profiles: Profile[];
  roadmaps: Roadmap[];
  detailedLessons: DetailedLesson[];
  detailedNotes: DetailedNotes[];
  quizQuestions: { [lessonId: string]: QuizQuestion[] };
  quizAttempts: QuizAttempt[];
  codingProblems: CodingProblem[];
  codingAttempts: CodingAttempt[];
  bookmarks: Bookmark[];
  recommendations: Recommendation[];
  streaks: Streak[];
  studySessions: StudySession[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
}

// Initial default state
const initialData: DatabaseSchema = {
  users: [],
  profiles: [],
  roadmaps: [],
  detailedLessons: [],
  detailedNotes: [],
  quizQuestions: {},
  quizAttempts: [],
  codingProblems: [],
  codingAttempts: [],
  bookmarks: [],
  recommendations: [],
  streaks: [],
  studySessions: [],
  notifications: [],
  activityLogs: [],
};

class LocalDB {
  private data: DatabaseSchema = { ...initialData };

  constructor() {
    this.load();
  }

  // Load database from file
  private load() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Ensure all collections exist
        this.data.users = this.data.users || [];
        this.data.profiles = this.data.profiles || [];
        this.data.roadmaps = this.data.roadmaps || [];
        this.data.detailedLessons = this.data.detailedLessons || [];
        this.data.detailedNotes = this.data.detailedNotes || [];
        this.data.quizQuestions = this.data.quizQuestions || {};
        this.data.quizAttempts = this.data.quizAttempts || [];
        this.data.codingProblems = this.data.codingProblems || [];
        this.data.codingAttempts = this.data.codingAttempts || [];
        this.data.bookmarks = this.data.bookmarks || [];
        this.data.recommendations = this.data.recommendations || [];
        this.data.streaks = this.data.streaks || [];
        this.data.studySessions = this.data.studySessions || [];
        this.data.notifications = this.data.notifications || [];
        this.data.activityLogs = this.data.activityLogs || [];
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Error loading DB, resetting to empty state:', e);
      this.data = { ...initialData };
    }
  }

  // Save database to file
  save() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving DB:', e);
    }
  }

  // Helper for generating UUID-like strings
  private uuid(): string {
    return crypto.randomUUID();
  }

  // Hash password using native crypto
  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // ==========================================
  // USERS & PROFILES
  // ==========================================

  createUser(email: string, passwordPlain: string, name: string): { user: User; profile: Profile } {
    const existing = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const userId = this.uuid();
    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash: this.hashPassword(passwordPlain),
      name: name,
    };

    const newProfile: Profile = {
      userId: userId,
      education: '',
      skillLevel: 'beginner',
      learningGoal: '',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    };

    this.data.users.push(newUser);
    this.data.profiles.push(newProfile);

    // Initialize streak
    const todayStr = new Date().toISOString().split('T')[0];
    const newStreak: Streak = {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      history: {},
    };
    this.data.streaks.push(newStreak);

    // Log action
    this.logActivity(userId, 'register', 'User registered and account created.');
    this.addNotification(userId, 'achievement', 'Welcome to LearnFlow AI!', 'Enter any topic you want to learn to get started with your customized roadmap!');

    this.save();
    return { user: newUser, profile: newProfile };
  }

  findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getProfile(userId: string): Profile | undefined {
    return this.data.profiles.find(p => p.userId === userId);
  }

  updateProfile(userId: string, updates: Partial<Profile>): Profile {
    const profile = this.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found.');
    }

    Object.assign(profile, updates);
    this.logActivity(userId, 'update_profile', 'User updated profile details.');
    this.save();
    return profile;
  }

  // ==========================================
  // ROADMAPS & LESSONS
  // ==========================================

  getRoadmaps(userId: string): Roadmap[] {
    return this.data.roadmaps.filter(r => r.userId === userId);
  }

  getRoadmap(roadmapId: string): Roadmap | undefined {
    return this.data.roadmaps.find(r => r.id === roadmapId);
  }

  saveRoadmap(roadmap: Roadmap) {
    const idx = this.data.roadmaps.findIndex(r => r.id === roadmap.id);
    if (idx !== -1) {
      this.data.roadmaps[idx] = roadmap;
    } else {
      this.data.roadmaps.push(roadmap);
    }
    this.save();
  }

  createRoadmap(userId: string, topic: string, title: string, description: string, difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all', duration: string, modules: RoadmapModule[]): Roadmap {
    const roadmapId = this.uuid();
    const newRoadmap: Roadmap = {
      id: roadmapId,
      userId,
      topic,
      title,
      description,
      difficulty,
      estimatedDuration: duration,
      createdAt: new Date().toISOString(),
      progress: 0,
      modules: modules.map((m, mIdx) => ({
        ...m,
        id: m.id || this.uuid(),
        roadmapId: roadmapId,
        orderIndex: mIdx + 1,
        lessons: m.lessons.map((l, lIdx) => ({
          ...l,
          id: l.id || this.uuid(),
          moduleId: m.id || '',
          orderIndex: lIdx + 1,
          isCompleted: false,
        })),
      })),
    };

    // Correcting module references on lessons
    newRoadmap.modules.forEach(m => {
      m.lessons.forEach(l => {
        l.moduleId = m.id;
      });
    });

    this.data.roadmaps.push(newRoadmap);
    this.logActivity(userId, 'create_roadmap', `Created learning roadmap for: ${topic}`);
    this.addNotification(userId, 'roadmap', 'Roadmap Generated Successfully', `Your personalized roadmap for "${topic}" is ready. Start learning today!`);
    this.save();
    return newRoadmap;
  }

  deleteRoadmap(roadmapId: string, userId: string): boolean {
    const idx = this.data.roadmaps.findIndex(r => r.id === roadmapId && r.userId === userId);
    if (idx !== -1) {
      const roadmap = this.data.roadmaps[idx];
      const topic = roadmap.topic;

      // 1. Gather all lesson IDs belonging to this roadmap
      const lessonIds = this.data.detailedLessons.filter(l => l.roadmapId === roadmapId).map(l => l.id);
      const compactLessonIds: string[] = [];
      roadmap.modules.forEach(m => {
        m.lessons.forEach(l => {
          compactLessonIds.push(l.id);
        });
      });
      const allLessonIds = Array.from(new Set([...lessonIds, ...compactLessonIds]));

      // 2. Gather all coding problem IDs for this roadmap
      const codingProblemIds = this.data.codingProblems.filter(cp => cp.roadmapId === roadmapId).map(cp => cp.id);

      // 3. Delete roadmap itself
      this.data.roadmaps.splice(idx, 1);

      // 4. Clean up detailed lessons
      this.data.detailedLessons = this.data.detailedLessons.filter(l => l.roadmapId !== roadmapId);

      // 5. Clean up detailed notes
      this.data.detailedNotes = this.data.detailedNotes.filter(n => !allLessonIds.includes(n.lessonId));

      // 6. Clean up quiz questions
      allLessonIds.forEach(lId => {
        if (this.data.quizQuestions[lId]) {
          delete this.data.quizQuestions[lId];
        }
      });

      // 7. Clean up quiz attempts (Quiz History)
      this.data.quizAttempts = this.data.quizAttempts.filter(qa => qa.roadmapId !== roadmapId);

      // 8. Clean up coding problems
      this.data.codingProblems = this.data.codingProblems.filter(cp => cp.roadmapId !== roadmapId);

      // 9. Clean up coding attempts (Coding History)
      this.data.codingAttempts = this.data.codingAttempts.filter(ca => !codingProblemIds.includes(ca.problemId));

      // 10. Clean up bookmarks
      this.data.bookmarks = this.data.bookmarks.filter(b => 
        b.targetId !== roadmapId && 
        !allLessonIds.includes(b.targetId) && 
        !codingProblemIds.includes(b.targetId)
      );

      // 11. Clean up recommendations
      this.data.recommendations = this.data.recommendations.filter(r => 
        r.targetId !== roadmapId && 
        !allLessonIds.includes(r.targetId || '')
      );

      this.logActivity(userId, 'delete_roadmap', `Deleted learning roadmap for: ${topic}`);
      this.save();
      return true;
    }
    return false;
  }

  // Save full generated details of a single lesson
  saveDetailedLesson(lesson: DetailedLesson) {
    const idx = this.data.detailedLessons.findIndex(l => l.id === lesson.id);
    if (idx !== -1) {
      this.data.detailedLessons[idx] = lesson;
    } else {
      this.data.detailedLessons.push(lesson);
    }
    this.save();
  }

  getDetailedLesson(lessonId: string): DetailedLesson | undefined {
    return this.data.detailedLessons.find(l => l.id === lessonId);
  }

  // Mark lesson as completed
  completeLesson(userId: string, roadmapId: string, lessonId: string): Roadmap {
    const roadmap = this.getRoadmap(roadmapId);
    if (!roadmap || roadmap.userId !== userId) {
      throw new Error('Roadmap not found or unauthorized.');
    }

    let found = false;
    let totalLessons = 0;
    let completedLessons = 0;

    roadmap.modules.forEach(m => {
      m.lessons.forEach(l => {
        totalLessons++;
        if (l.id === lessonId) {
          if (!l.isCompleted) {
            l.isCompleted = true;
            found = true;
          }
        }
        if (l.isCompleted) {
          completedLessons++;
        }
      });
    });

    if (found) {
      roadmap.progress = Math.round((completedLessons / totalLessons) * 100);
      this.saveRoadmap(roadmap);

      // Log study session / streak update
      this.recordStudySession(userId, 300, 'lesson'); // Add 5 minutes for reading lesson
      this.logActivity(userId, 'complete_lesson', `Completed lesson: ${lessonId}`);

      if (roadmap.progress === 100) {
        this.addNotification(userId, 'achievement', 'Congratulations!', `You have completed 100% of the "${roadmap.title}" roadmap! Well done!`);
      }
    }

    return roadmap;
  }

  // ==========================================
  // NOTES & BOOKMARKS
  // ==========================================

  getDetailedNotes(lessonId: string): DetailedNotes | undefined {
    return this.data.detailedNotes.find(n => n.lessonId === lessonId);
  }

  saveDetailedNotes(notes: DetailedNotes) {
    const idx = this.data.detailedNotes.findIndex(n => n.lessonId === notes.lessonId);
    if (idx !== -1) {
      this.data.detailedNotes[idx] = notes;
    } else {
      this.data.detailedNotes.push(notes);
    }
    this.save();
  }

  getBookmarks(userId: string): Bookmark[] {
    return this.data.bookmarks.filter(b => b.userId === userId);
  }

  addBookmark(userId: string, type: 'roadmap' | 'lesson' | 'note' | 'coding' | 'quiz_question', targetId: string, title: string, subtitle: string): Bookmark {
    const existingIdx = this.data.bookmarks.findIndex(b => b.userId === userId && b.type === type && b.targetId === targetId);
    if (existingIdx !== -1) {
      return this.data.bookmarks[existingIdx];
    }

    const bookmark: Bookmark = {
      id: this.uuid(),
      userId,
      type,
      targetId,
      title,
      subtitle,
      createdAt: new Date().toISOString(),
    };

    this.data.bookmarks.push(bookmark);
    this.save();
    return bookmark;
  }

  removeBookmark(userId: string, type: 'roadmap' | 'lesson' | 'note' | 'coding' | 'quiz_question', targetId: string): boolean {
    const idx = this.data.bookmarks.findIndex(b => b.userId === userId && b.type === type && b.targetId === targetId);
    if (idx !== -1) {
      this.data.bookmarks.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // ==========================================
  // QUIZZES
  // ==========================================

  getLessonQuizQuestions(lessonId: string): QuizQuestion[] {
    return this.data.quizQuestions[lessonId] || [];
  }

  saveLessonQuizQuestions(lessonId: string, questions: QuizQuestion[]) {
    this.data.quizQuestions[lessonId] = questions.map(q => ({
      ...q,
      id: q.id || this.uuid(),
    }));
    this.save();
  }

  recordQuizAttempt(userId: string, roadmapId: string, moduleId: string, lessonId: string, correct: number, wrong: number, timeSeconds: number): QuizAttempt {
    const scorePercentage = Math.round((correct / (correct + wrong)) * 100) || 0;
    const attempt: QuizAttempt = {
      id: this.uuid(),
      userId,
      roadmapId,
      moduleId,
      lessonId,
      correctCount: correct,
      wrongCount: wrong,
      accuracy: scorePercentage,
      timeSeconds,
      scorePercentage,
      completedAt: new Date().toISOString(),
    };

    this.data.quizAttempts.push(attempt);
    this.recordStudySession(userId, timeSeconds, 'quiz');
    this.logActivity(userId, 'take_quiz', `Completed quiz on lesson ${lessonId} with score ${scorePercentage}%`);
    this.save();
    return attempt;
  }

  getQuizAttempts(userId: string): QuizAttempt[] {
    return this.data.quizAttempts.filter(qa => qa.userId === userId);
  }

  // ==========================================
  // CODING PRACTICE & SANDBOX
  // ==========================================

  getCodingProblems(roadmapId: string): CodingProblem[] {
    return this.data.codingProblems.filter(p => p.roadmapId === roadmapId);
  }

  getProblemById(problemId: string): CodingProblem | undefined {
    return this.data.codingProblems.find(p => p.id === problemId);
  }

  saveCodingProblems(problems: CodingProblem[]) {
    problems.forEach(p => {
      const idx = this.data.codingProblems.findIndex(cp => cp.id === p.id);
      if (idx !== -1) {
        this.data.codingProblems[idx] = p;
      } else {
        this.data.codingProblems.push({
          ...p,
          id: p.id || this.uuid(),
        });
      }
    });
    this.save();
  }

  recordCodingAttempt(
    userId: string,
    problemId: string,
    code: string,
    language: string,
    status: 'success' | 'fail' | 'skipped',
    output: string,
    error?: string,
    timeSpentSeconds?: number,
    difficulty?: 'beginner' | 'easy' | 'medium' | 'hard' | 'advanced'
  ): CodingAttempt {
    const attempt: CodingAttempt = {
      id: this.uuid(),
      userId,
      problemId,
      code,
      language,
      status,
      output,
      error,
      completedAt: new Date().toISOString(),
      timeSpentSeconds,
      difficulty,
    };

    this.data.codingAttempts.push(attempt);
    const duration = timeSpentSeconds || 300;
    this.recordStudySession(userId, duration, 'coding');
    this.logActivity(userId, 'coding_practice', `Attempted coding problem ${problemId} (${status})`);
    this.save();
    return attempt;
  }

  getCodingAttempts(userId: string): CodingAttempt[] {
    return this.data.codingAttempts.filter(ca => ca.userId === userId);
  }

  // ==========================================
  // STREAKS & STUDY SESSIONS
  // ==========================================

  getStreak(userId: string): Streak {
    let streak = this.data.streaks.find(s => s.userId === userId);
    if (!streak) {
      streak = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: '',
        history: {},
      };
      this.data.streaks.push(streak);
      this.save();
    }
    return streak;
  }

  recordStudySession(userId: string, durationSeconds: number, activityType: 'lesson' | 'quiz' | 'coding' | 'general') {
    const todayStr = new Date().toISOString().split('T')[0];

    // Log study session
    const session: StudySession = {
      id: this.uuid(),
      userId,
      date: todayStr,
      durationSeconds,
      activityType,
    };
    this.data.studySessions.push(session);

    // Update streak logic
    const streak = this.getStreak(userId);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    streak.history[todayStr] = true;

    if (streak.lastActiveDate === todayStr) {
      // Already studied today, do not increment streak again, but log the study history
    } else if (streak.lastActiveDate === yesterdayStr) {
      // Incremented! Studied yesterday
      streak.currentStreak += 1;
      streak.lastActiveDate = todayStr;
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
      this.addNotification(userId, 'streak', 'Streak Extended! 🔥', `You are on a ${streak.currentStreak} day study streak! Keep going!`);
    } else {
      // Missed days or first time, reset/init to 1
      streak.currentStreak = 1;
      streak.lastActiveDate = todayStr;
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
      this.addNotification(userId, 'streak', 'Streak Started! 🚀', `Your study streak has started. Complete lessons or quizzes daily to keep it alive!`);
    }

    this.save();
  }

  getStudySessions(userId: string): StudySession[] {
    return this.data.studySessions.filter(s => s.userId === userId);
  }

  // ==========================================
  // RECOMMENDATIONS
  // ==========================================

  getRecommendations(userId: string): Recommendation[] {
    return this.data.recommendations.filter(r => r.userId === userId);
  }

  saveRecommendations(userId: string, recs: Recommendation[]) {
    // Delete old and save new
    this.data.recommendations = this.data.recommendations.filter(r => r.userId !== userId);
    this.data.recommendations.push(...recs.map(r => ({
      ...r,
      id: r.id || this.uuid(),
      userId,
      createdAt: new Date().toISOString(),
    })));
    this.save();
  }

  getRecommendationsPayload(userId: string): {
    recommendedLessons: {
      roadmapId: string;
      lessonId: string;
      lessonTitle: string;
      reason: string;
    }[];
    strongTopics: string[];
    weakTopics: string[];
  } {
    const recs = this.data.recommendations.filter(r => r.userId === userId && r.type === 'lesson');
    const analytics = this.getAnalytics(userId);
    
    const recommendedLessons = recs.map(r => {
      const [roadmapId, lessonId] = (r.targetId || '').split(':');
      return {
        roadmapId: roadmapId || '',
        lessonId: lessonId || '',
        lessonTitle: r.topic || '',
        reason: r.reason || ''
      };
    }).filter(item => item.roadmapId && item.lessonId);
    
    return {
      recommendedLessons,
      strongTopics: analytics.strongTopics,
      weakTopics: analytics.weakTopics
    };
  }

  saveRecommendationsPayload(userId: string, recommendedLessons: {
    roadmapId: string;
    lessonId: string;
    lessonTitle: string;
    reason: string;
  }[]) {
    // Filter out old ones
    this.data.recommendations = this.data.recommendations.filter(r => r.userId !== userId);
    
    // Save new ones
    recommendedLessons.forEach(rl => {
      const rec: Recommendation = {
        id: this.uuid(),
        userId,
        topic: rl.lessonTitle,
        type: 'lesson',
        targetId: `${rl.roadmapId}:${rl.lessonId}`,
        reason: rl.reason,
        difficulty: 'intermediate',
        createdAt: new Date().toISOString()
      };
      this.data.recommendations.push(rec);
    });
    
    this.save();
  }

  // ==========================================
  // NOTIFICATIONS & LOGS
  // ==========================================

  getNotifications(userId: string): Notification[] {
    return this.data.notifications.filter(n => n.userId === userId);
  }

  addNotification(userId: string, type: 'streak' | 'achievement' | 'system' | 'roadmap', title: string, message: string): Notification {
    const notification: Notification = {
      id: this.uuid(),
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notification); // Top level
    if (this.data.notifications.length > 100) {
      this.data.notifications.pop(); // Keep size readable
    }
    this.save();
    return notification;
  }

  markNotificationRead(notificationId: string, userId: string) {
    const notif = this.data.notifications.find(n => n.id === notificationId && n.userId === userId);
    if (notif) {
      notif.read = true;
      this.save();
    }
  }

  logActivity(userId: string, action: string, details: string) {
    const log: ActivityLog = {
      id: this.uuid(),
      userId,
      action,
      details,
      createdAt: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(log);
    if (this.data.activityLogs.length > 200) {
      this.data.activityLogs.pop();
    }
    this.save();
  }

  getActivityLogs(userId: string): ActivityLog[] {
    return this.data.activityLogs.filter(al => al.userId === userId);
  }

  // ==========================================
  // ANALYTICS CALCULATION
  // ==========================================

  getAnalytics(userId: string): AnalyticsData & {
    totalLessonsCount: number;
    completedLessonsCount: number;
    totalStudyTimeMinutes: number;
    averageQuizAccuracyPercent: number;
    currentStreak: number;
    weeklyMinutes: { name: string; minutes: number }[];
    accuracyHistory: { index: number; quiz: number; coding: number }[];
    quizQuestionsAttempted: number;
    codingProblemsAttempted: number;
    codingProblemsSolved: number;
    averageDailyStudyTimeMinutes: number;
    averageWeeklyStudyTimeMinutes: number;
    monthlyProgressMinutes: number;
  } {
    const roadmaps = this.getRoadmaps(userId);
    const quizAttempts = this.getQuizAttempts(userId);
    const codingAttempts = this.getCodingAttempts(userId);
    const studySessions = this.getStudySessions(userId);
    const streak = this.getStreak(userId);

    // 1. Lesson statistics
    let totalLessonsCount = 0;
    let completedLessonsCount = 0;
    let totalProgress = 0;

    roadmaps.forEach(r => {
      totalProgress += r.progress;
      r.modules.forEach(m => {
        m.lessons.forEach(l => {
          totalLessonsCount++;
          if (l.isCompleted) {
            completedLessonsCount++;
          }
        });
      });
    });

    const lessonsCompleted = completedLessonsCount;
    const lessonsRemaining = Math.max(0, totalLessonsCount - completedLessonsCount);
    const roadmapProgress = roadmaps.length > 0 ? Math.round(totalProgress / roadmaps.length) : 0;

    // 2. Quiz statistics
    const quizQuestionsAttempted = quizAttempts.reduce((sum, qa) => sum + qa.correctCount + qa.wrongCount, 0);
    const totalQuizzes = quizAttempts.length;
    const averageQuizAccuracyPercent = totalQuizzes > 0
      ? Math.round(quizAttempts.reduce((sum, qa) => sum + qa.accuracy, 0) / totalQuizzes)
      : 0;
    const quizAccuracy = averageQuizAccuracyPercent;

    // 3. Coding statistics
    const codingProblemsAttempted = new Set(codingAttempts.map(ca => ca.problemId)).size;
    const codingProblemsSolved = new Set(codingAttempts.filter(ca => ca.status === 'success').map(ca => ca.problemId)).size;
    
    const validCodingAttempts = codingAttempts.filter(ca => ca.status !== 'skipped');
    const codingAccuracy = validCodingAttempts.length > 0 
      ? Math.round((codingAttempts.filter(ca => ca.status === 'success').length / validCodingAttempts.length) * 100) 
      : 0;

    // 4. Study Time calculations (minutes)
    const totalStudyTimeMinutes = Math.round(studySessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60);

    // Average daily study time
    const uniqueStudyDates = new Set(studySessions.map(s => s.date)).size;
    const averageDailyStudyTimeMinutes = uniqueStudyDates > 0 
      ? Math.round(totalStudyTimeMinutes / uniqueStudyDates) 
      : 0;

    // Average weekly study time
    const averageWeeklyStudyTimeMinutes = Math.round(totalStudyTimeMinutes / Math.max(1, Math.ceil(uniqueStudyDates / 7)));

    // Monthly progress minutes
    const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
    const monthlyProgressMinutes = Math.round(
      studySessions.filter(s => s.date.startsWith(currentMonthStr)).reduce((sum, s) => sum + s.durationSeconds, 0) / 60
    );

    // 5. Weekly Minutes grouping for Recharts past 7 days
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMinutes = [];
    for (let i = 6; i >= 0; i--) {
      const dateObj = new Date(Date.now() - i * 86400000);
      const dateStr = dateObj.toISOString().split('T')[0];
      const name = weekdayNames[dateObj.getDay()];
      
      const minutes = studySessions
        .filter(s => s.date === dateStr)
        .reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0);
        
      weeklyMinutes.push({ name, minutes });
    }

    // 6. Accuracy history for Recharts over time
    let accuracyHistory = [];
    if (quizAttempts.length === 0 && codingAttempts.length === 0) {
      accuracyHistory = [
        { index: 1, quiz: 75, coding: 60 },
        { index: 2, quiz: 80, coding: 80 },
        { index: 3, quiz: 90, coding: 85 },
      ];
    } else {
      const limit = Math.max(quizAttempts.length, codingAttempts.length);
      for (let i = 0; i < limit; i++) {
        const qa = quizAttempts[i];
        const ca = codingAttempts[i];
        accuracyHistory.push({
          index: i + 1,
          quiz: qa ? qa.accuracy : (quizAttempts[quizAttempts.length - 1]?.accuracy || 75),
          coding: ca ? (ca.status === 'success' ? 100 : (ca.status === 'skipped' ? 0 : 30)) : (codingAttempts[codingAttempts.length - 1]?.status === 'success' ? 100 : 60)
        });
      }
    }

    // 7. Deduce Strong & Weak Topics dynamically
    const strongTopics: string[] = [];
    const weakTopics: string[] = [];

    roadmaps.forEach(r => {
      const roadmapQuizzes = quizAttempts.filter(qa => qa.roadmapId === r.id);
      const roadmapCoding = codingAttempts.filter(ca => {
        const prob = this.data.codingProblems.find(cp => cp.id === ca.problemId);
        return prob ? prob.roadmapId === r.id : false;
      });

      let totalScores = 0;
      let count = 0;

      roadmapQuizzes.forEach(qa => {
        totalScores += qa.scorePercentage;
        count++;
      });
      roadmapCoding.forEach(ca => {
        totalScores += (ca.status === 'success' ? 100 : 0);
        count++;
      });

      if (count > 0) {
        const avg = Math.round(totalScores / count);
        if (avg >= 75) {
          strongTopics.push(r.topic);
        } else if (avg < 60) {
          weakTopics.push(r.topic);
        }
      }
    });

    // Defaults for visual elegance
    if (strongTopics.length === 0 && roadmaps.length > 0) {
      strongTopics.push(roadmaps[0].topic);
    }
    if (weakTopics.length === 0 && roadmaps.length > 1) {
      weakTopics.push(roadmaps[1].topic);
    } else if (weakTopics.length === 0 && roadmaps.length === 1) {
      weakTopics.push('Advanced ' + roadmaps[0].topic);
    }

    return {
      lessonsCompleted,
      lessonsRemaining,
      roadmapProgress,
      quizAccuracy,
      codingAccuracy,
      averageQuizScore: averageQuizAccuracyPercent,
      averageCodingScore: codingAccuracy,
      studyTimeDaily: weeklyMinutes, // For backward compatibility if used
      studyTimeWeekly: [],
      studyTimeMonthly: [],
      strongTopics: strongTopics.slice(0, 3),
      weakTopics: weakTopics.slice(0, 3),
      
      // Full extended dataset
      totalLessonsCount,
      completedLessonsCount,
      totalStudyTimeMinutes,
      averageQuizAccuracyPercent,
      currentStreak: streak.currentStreak,
      weeklyMinutes,
      accuracyHistory,
      quizQuestionsAttempted,
      codingProblemsAttempted,
      codingProblemsSolved,
      averageDailyStudyTimeMinutes,
      averageWeeklyStudyTimeMinutes,
      monthlyProgressMinutes,
    };
  }
}

export const db = new LocalDB();
