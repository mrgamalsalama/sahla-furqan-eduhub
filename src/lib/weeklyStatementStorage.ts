import type { WeeklyStatementDocument, WeeklySubjectDailyPlan, WeeklyQuizItem, ShiftType, GenderCohort, NativeCohort } from '@/types';
import { STANDARD_SUBJECTS, createEmptyDocument, getTimetableSessionStatus } from './weeklyStatementDefaults';
import { getAcademicWeekByNumber, ACADEMIC_YEAR } from './academicCalendar';

const STATEMENT_STORAGE_PREFIX = 'sahlah_weekly_stmt_';
const TEACHER_PROFILE_KEY = 'sahlah_teacher_profile';

export interface TeacherProfile {
  teacherName: string;
  grade: string;
  shift: ShiftType;
  subjectId: string;
  genderCohort: GenderCohort;
  nativeCohort?: NativeCohort;
  lastSelectedWeek: number;
}

export function getStoredTeacherProfile(): TeacherProfile {
  try {
    const raw = localStorage.getItem(TEACHER_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse teacher profile:', e);
  }

  return {
    teacherName: '',
    grade: 'Grade 11',
    shift: 'mena',
    subjectId: 'english',
    genderCohort: 'joint',
    nativeCohort: 'both',
    lastSelectedWeek: 8,
  };
}

export function saveTeacherProfile(profile: Partial<TeacherProfile>): void {
  try {
    const current = getStoredTeacherProfile();
    const updated = { ...current, ...profile };
    localStorage.setItem(TEACHER_PROFILE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save teacher profile:', e);
  }
}

function getStorageKey(grade: string | unknown, weekNumber: number, shift: ShiftType): string {
  const safeGrade = String(grade || 'Grade 11').toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${STATEMENT_STORAGE_PREFIX}${safeGrade}_w${weekNumber}_${shift}`;
}

export const RESET_WEEKLY_CONTENT_PIN = 'Sahlah2027';

/**
 * Loads a statement document for a given grade, weekNumber, and shift.
 * Default is always an empty template populated with timetable No-Session rules
 * so the teacher fills in their topics and assignments from scratch.
 */
export function loadWeeklyStatement(grade: string, weekNumber: number, shift: ShiftType): WeeklyStatementDocument {
  const key = getStorageKey(grade, weekNumber, shift);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as WeeklyStatementDocument;
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load weekly statement from storage:', e);
  }

  const week = getAcademicWeekByNumber(weekNumber);

  // Default is clean calibrated empty document with proper timetable No-Session rules
  const emptyDoc = createEmptyDocument(grade, shift);
  emptyDoc.weekDateHeader = week.headerDate;
  emptyDoc.weekRangeText = week.rangeText;
  emptyDoc.term = week.term;
  emptyDoc.schoolYear = ACADEMIC_YEAR;
  saveWeeklyStatement(emptyDoc, weekNumber);
  return emptyDoc;
}

/**
 * Completely empties content of all days and quizzes for all subjects in a week,
 * while preserving timetable No-Session rules.
 */
export function clearAllWeeklyContent(doc: WeeklyStatementDocument): WeeklyStatementDocument {
  const clearedDays: { [day: number]: WeeklySubjectDailyPlan[] } = {};

  for (const dayNum of [1, 2, 3, 4, 5]) {
    const dayPlans = doc.days[dayNum] || [];
    clearedDays[dayNum] = dayPlans.map((plan) => {
      if (plan.isNoSession) {
        return {
          ...plan,
          contentTopic: plan.noSessionNote || 'لا توجد حصة (No Session)',
          homework: '',
          optionalEnrichment: '',
        };
      }
      return {
        ...plan,
        contentTopic: '',
        homework: '',
        optionalEnrichment: '',
      };
    });
  }

  return {
    ...doc,
    days: clearedDays,
    quizzes: [],
    subjectStatuses: {},
    updatedAt: Date.now(),
  };
}

/**
 * Saves a weekly statement document into storage and dispatches sync event
 */
export function saveWeeklyStatement(doc: WeeklyStatementDocument, weekNumber?: number): void {
  const weekNum = weekNumber || 8;
  const key = getStorageKey(doc.grade, weekNum, doc.shift);
  const updatedDoc: WeeklyStatementDocument = {
    ...doc,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(updatedDoc));
    // Dispatch event so other components or tabs stay in sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('weekly-statement-changed', {
          detail: { grade: doc.grade, weekNumber: weekNum, shift: doc.shift },
        })
      );
    }
  } catch (e) {
    console.error('Failed to save statement to localStorage:', e);
  }
}

/**
 * Updates a single day's plan for a subject in an existing document object
 */
export function commitTeacherDayPlan(
  doc: WeeklyStatementDocument,
  day: number,
  plan: WeeklySubjectDailyPlan
): WeeklyStatementDocument {
  const currentDayPlans = [...(doc.days[day] || [])];
  const targetIdx = currentDayPlans.findIndex((p) => p.subjectId === plan.subjectId);

  if (targetIdx >= 0) {
    currentDayPlans[targetIdx] = {
      ...currentDayPlans[targetIdx],
      ...plan,
    };
  } else {
    currentDayPlans.push(plan);
  }

  return {
    ...doc,
    days: {
      ...doc.days,
      [day]: currentDayPlans,
    },
    updatedAt: Date.now(),
  };
}

/**
 * Merge a single teacher's plan for a subject across the week into the shared statement document.
 */
export function commitTeacherSubjectPlan(
  grade: string,
  weekNumber: number,
  shift: ShiftType,
  subjectId: string,
  subjectPlansByDay: Record<number, Partial<WeeklySubjectDailyPlan>>,
  quizzesForSubject?: WeeklyQuizItem[]
): WeeklyStatementDocument {
  const currentDoc = loadWeeklyStatement(grade, weekNumber, shift);
  const updatedDays: typeof currentDoc.days = { ...currentDoc.days };

  for (let d = 1; d <= 5; d++) {
    const dayPlans = [...(updatedDays[d] || [])];
    const targetIdx = dayPlans.findIndex((p) => p.subjectId === subjectId);
    const updates = subjectPlansByDay[d] || {};

    if (targetIdx >= 0) {
      dayPlans[targetIdx] = {
        ...dayPlans[targetIdx],
        ...updates,
      };
    } else {
      // Find subject definition
      const subDef = STANDARD_SUBJECTS.find((s) => s.id === subjectId);
      const { hasSession, autoNote } = getTimetableSessionStatus(shift, grade, d, subjectId);

      dayPlans.push({
        id: `d${d}-${subjectId}-${Date.now()}`,
        day: d,
        subjectId,
        subjectName: subDef ? subDef.nameEn : subjectId,
        teacherName: updates.teacherName || '',
        genderCohort: updates.genderCohort || 'joint',
        nativeCohort: updates.nativeCohort || 'both',
        isNoSession: updates.isNoSession ?? !hasSession,
        noSessionNote: updates.noSessionNote || autoNote,
        contentTopic: updates.contentTopic ?? (!hasSession ? autoNote : ''),
        homework: updates.homework || '',
        optionalEnrichment: updates.optionalEnrichment || '',
        zoomUrl: updates.zoomUrl || '',
      });
    }

    updatedDays[d] = dayPlans;
  }

  let updatedQuizzes = [...(currentDoc.quizzes || [])];
  if (quizzesForSubject) {
    // Keep quizzes of other subjects, replace/append for this subject
    const subjectName = STANDARD_SUBJECTS.find((s) => s.id === subjectId)?.nameAr || subjectId;
    updatedQuizzes = updatedQuizzes.filter(
      (q) => !q.subject.toLowerCase().includes(subjectId.toLowerCase()) && !q.subject.includes(subjectName)
    );
    updatedQuizzes.push(...quizzesForSubject);
  }

  const updatedDoc: WeeklyStatementDocument = {
    ...currentDoc,
    days: updatedDays,
    quizzes: updatedQuizzes,
    updatedAt: Date.now(),
  };

  saveWeeklyStatement(updatedDoc, weekNumber);
  return updatedDoc;
}
