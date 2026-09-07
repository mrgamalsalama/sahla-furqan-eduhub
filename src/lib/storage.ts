import type { SavedLesson, LessonSettings } from '@/types';

const LESSONS_KEY = 'eduhub_lessons';
const SETTINGS_KEY = 'eduhub_settings';

export function getSavedLessons(): SavedLesson[] {
  try {
    const raw = localStorage.getItem(LESSONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedLesson[];
  } catch {
    return [];
  }
}

export function saveLesson(lesson: SavedLesson): void {
  const lessons = getSavedLessons();
  const idx = lessons.findIndex((l) => l.id === lesson.id);
  if (idx >= 0) {
    lessons[idx] = lesson;
  } else {
    lessons.unshift(lesson);
  }
  localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons));
}

export function deleteLesson(id: string): void {
  const lessons = getSavedLessons().filter((l) => l.id !== id);
  localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons));
}

export function getLessonSettings(): LessonSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return JSON.parse(raw) as LessonSettings;
  } catch {
    return defaultSettings();
  }
}

export function saveLessonSettings(settings: LessonSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function defaultSettings(): LessonSettings {
  return {
    subject: '',
    grade: '',
    duration: '45 دقيقة',
    studentLevel: 'متوسط',
    teacherName: '',
    lessonTitle: '',
    contentLanguage: 'ar',
    institution: 'sahlah',
  };
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
