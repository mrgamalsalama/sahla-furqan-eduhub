import type { WeeklyStatementDocument, WeeklySubjectDailyPlan, WeeklyQuizItem, ShiftType, GenderCohort, NativeCohort } from '@/types';
import { STANDARD_SUBJECTS, createOfficialSampleDocument, createEmptyDocument, getTimetableSessionStatus } from './weeklyStatementDefaults';
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

function getStorageKey(grade: string, weekNumber: number, shift: ShiftType): string {
  const safeGrade = grade.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${STATEMENT_STORAGE_PREFIX}${safeGrade}_w${weekNumber}_${shift}`;
}

/**
 * Loads a statement document for a given grade, weekNumber, and shift.
 * If not present in localStorage:
 * - If Grade 1 / 11 and Week 8, loads the official verified sample.
 * - Otherwise creates a calibrated empty document according to the timetable schedule rules.
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

  // If Grade 1 or Grade 11 and Week 8, use the official verified sample
  if ((grade === 'Grade 1' || grade === 'Grade 11') && weekNumber === 8) {
    const doc = createOfficialSampleDocument(grade, shift);
    doc.weekDateHeader = week.headerDate;
    doc.weekRangeText = week.rangeText;
    doc.term = week.term;
    doc.schoolYear = ACADEMIC_YEAR;
    saveWeeklyStatement(doc, weekNumber);
    return doc;
  }

  // Otherwise create a fresh template populated with timetable No-Session rules
  const emptyDoc = createEmptyDocument(grade, shift);
  emptyDoc.weekDateHeader = week.headerDate;
  emptyDoc.weekRangeText = week.rangeText;
  emptyDoc.term = week.term;
  emptyDoc.schoolYear = ACADEMIC_YEAR;
  saveWeeklyStatement(emptyDoc, weekNumber);
  return emptyDoc;
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
