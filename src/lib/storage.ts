import type { SavedLesson, LessonSettings } from '@/types';

const LESSONS_KEY = 'eduhub_lessons';
const SETTINGS_KEY = 'eduhub_settings';

export function getSavedLessons(): SavedLesson[] {
  try {
    const raw = localStorage.getItem(LESSONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map((item: any) => {
      const htmlContent = item.contentHtml || item.html || '';
      return {
        ...item,
        contentHtml: htmlContent,
        html: htmlContent,
      };
    });
  } catch {
    return [];
  }
}

export function saveLesson(lesson: SavedLesson): void {
  const htmlContent = lesson.contentHtml || lesson.html || '';
  const normalizedLesson: SavedLesson = {
    ...lesson,
    contentHtml: htmlContent,
    html: htmlContent,
  };
  const lessons = getSavedLessons();
  const idx = lessons.findIndex((l) => l.id === normalizedLesson.id);
  if (idx >= 0) {
    lessons[idx] = normalizedLesson;
  } else {
    lessons.unshift(normalizedLesson);
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

// -------------------------------------------------------------
// Teacher Resources Locker (حقيبتي ومصادري السحابية)
// -------------------------------------------------------------
const RESOURCES_KEY = 'eduhub_teacher_resources';

export function getTeacherResources(): import('@/types').TeacherResource[] {
  try {
    const raw = localStorage.getItem(RESOURCES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveTeacherResource(res: import('@/types').TeacherResource): void {
  const resources = getTeacherResources();
  const idx = resources.findIndex((r) => r.id === res.id);
  if (idx >= 0) {
    resources[idx] = { ...res, updatedAt: Date.now() };
  } else {
    resources.unshift({ ...res, createdAt: res.createdAt || Date.now(), updatedAt: Date.now() });
  }
  localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources));
}

export function deleteTeacherResource(id: string): void {
  const resources = getTeacherResources().filter((r) => r.id !== id);
  localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources));
}

export function toggleTeacherResourcePublic(id: string, isPublic: boolean): void {
  const resources = getTeacherResources();
  const target = resources.find((r) => r.id === id);
  if (target) {
    target.isPublic = isPublic;
    target.updatedAt = Date.now();
    localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources));
  }
}

export function autoSaveUploadedResource(
  file: import('@/types').UploadedFile,
  meta?: { subject?: string; grade?: string; user?: any; pageCount?: number }
): import('@/types').TeacherResource {
  const existingList = getTeacherResources();
  // Check if identical file already exists by name & size
  const found = existingList.find((r) => r.name === file.name && Math.abs(r.size - (file.size || 0)) < 100);
  if (found) {
    return found;
  }

  let resType: import('@/types').TeacherResource['type'] = 'other';
  if (file.type === 'pdf' || file.mimeType === 'application/pdf') resType = 'pdf';
  else if (file.type === 'word') resType = 'word';
  else if (file.type === 'powerpoint') resType = 'powerpoint';
  else if (file.type === 'image') resType = 'image';
  else if (file.type === 'text') resType = 'text';

  const newRes: import('@/types').TeacherResource = {
    id: file.id || uid(),
    name: file.name,
    title: file.name.replace(/\.[^/.]+$/, ''),
    type: resType,
    size: file.size || (file.base64 ? Math.round(file.base64.length * 0.75) : 1024),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    subject: meta?.subject,
    grade: meta?.grade,
    dataUrl: file.dataUrl,
    base64: file.base64,
    mimeType: file.mimeType,
    textContent: file.textContent,
    pageCount: meta?.pageCount,
    isPublic: false,
    source: 'upload',
    userId: meta?.user?.id,
    userName: meta?.user?.user_metadata?.full_name || meta?.user?.email?.split('@')[0],
    userEmail: meta?.user?.email,
  };

  saveTeacherResource(newRes);
  return newRes;
}
