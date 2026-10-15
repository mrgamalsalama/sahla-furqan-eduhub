import { supabase, isSupabaseConfigured } from './supabase';
import type {
  ShiftType,
  WeeklySubjectDailyPlan,
  WeeklyQuizItem,
  WeeklySubjectStatus,
  WeeklyStatementAuditLog,
} from '@/types';
import { loadWeeklyStatement, saveWeeklyStatement } from './weeklyStatementStorage';

export const SQL_SCHEMA_STATEMENTS_TABLE = `
-- 1. Create weekly_statements table
create table if not exists public.weekly_statements (
  id text primary key, -- e.g. "grade_11_w8_mena_english"
  grade text not null,
  week_number integer not null,
  shift text not null,
  subject_id text not null,
  subject_name text,
  teacher_name text,
  gender_cohort text default 'joint',
  native_cohort text default 'both',
  status text not null default 'draft', -- 'draft' | 'submitted'
  is_locked boolean not null default false,
  content_data jsonb default '{}'::jsonb,
  quizzes_data jsonb default '[]'::jsonb,
  submitted_at timestamptz,
  submitted_by text,
  locked_at timestamptz,
  unlocked_at timestamptz,
  unlock_reason text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Create weekly_statement_audit_logs table
create table if not exists public.weekly_statement_audit_logs (
  id text primary key,
  statement_id text not null,
  grade text not null,
  week_number integer not null,
  shift text not null,
  subject_id text not null,
  action text not null, -- 'submit_and_lock' | 'unlock_for_editing' | 'save_draft' | 'content_update'
  old_content jsonb,
  new_content jsonb,
  changed_by text not null,
  reason text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indices for performance
create index if not exists idx_weekly_statements_lookup on public.weekly_statements(grade, week_number, shift);
create index if not exists idx_weekly_audit_lookup on public.weekly_statement_audit_logs(statement_id, created_at desc);
`;

const LOCAL_AUDIT_PREFIX = 'sahlah_stmt_audit_logs_';
const LOCAL_STATUS_PREFIX = 'sahlah_stmt_status_';

export function getStatementKey(grade: string, weekNumber: number, shift: ShiftType, subjectId: string): string {
  const safeGrade = grade.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${safeGrade}_w${weekNumber}_${shift}_${subjectId.toLowerCase()}`;
}

export function getLocalAuditLogs(statementKey: string): WeeklyStatementAuditLog[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_AUDIT_PREFIX}${statementKey}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse local audit logs:', err);
  }
  return [];
}

export function appendLocalAuditLog(log: WeeklyStatementAuditLog): void {
  try {
    const key = `${LOCAL_AUDIT_PREFIX}${log.statement_id}`;
    const existing = getLocalAuditLogs(log.statement_id);
    const updated = [log, ...existing].slice(0, 50); // keep last 50
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to store local audit log:', err);
  }
}

export function getLocalSubjectStatus(
  grade: string,
  weekNumber: number,
  shift: ShiftType,
  subjectId: string
): WeeklySubjectStatus | null {
  try {
    const doc = loadWeeklyStatement(grade, weekNumber, shift);
    if (doc.subjectStatuses && doc.subjectStatuses[subjectId]) {
      return doc.subjectStatuses[subjectId];
    }
    const key = `${LOCAL_STATUS_PREFIX}${getStatementKey(grade, weekNumber, shift, subjectId)}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load local subject status:', err);
  }
  return null;
}

export function setLocalSubjectStatus(
  grade: string,
  weekNumber: number,
  shift: ShiftType,
  status: WeeklySubjectStatus
): void {
  try {
    const doc = loadWeeklyStatement(grade, weekNumber, shift);
    const updatedStatuses = {
      ...(doc.subjectStatuses || {}),
      [status.subjectId]: status,
    };
    const updatedDoc = {
      ...doc,
      subjectStatuses: updatedStatuses,
      updatedAt: Date.now(),
    };
    saveWeeklyStatement(updatedDoc, weekNumber);

    const key = `${LOCAL_STATUS_PREFIX}${getStatementKey(grade, weekNumber, shift, status.subjectId)}`;
    localStorage.setItem(key, JSON.stringify(status));

    // Notify other components/tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('weekly-statement-status-changed', {
          detail: {
            grade,
            weekNumber,
            shift,
            subjectId: status.subjectId,
            status,
          },
        })
      );
    }
  } catch (err) {
    console.warn('Failed to save local subject status:', err);
  }
}

/**
 * Fetches the subject status from Supabase (if configured) with local fallback
 */
export async function fetchSubjectStatus(
  grade: string,
  weekNumber: number,
  shift: ShiftType,
  subjectId: string
): Promise<WeeklySubjectStatus> {
  const local = getLocalSubjectStatus(grade, weekNumber, shift, subjectId);
  const fallback: WeeklySubjectStatus = local || {
    subjectId,
    is_locked: false,
    status: 'draft',
  };

  if (!isSupabaseConfigured()) {
    return fallback;
  }

  try {
    const statementKey = getStatementKey(grade, weekNumber, shift, subjectId);
    const { data, error } = await supabase
      .from('weekly_statements')
      .select('subject_id, is_locked, status, submitted_at, submitted_by, locked_at, unlocked_at, unlock_reason')
      .eq('id', statementKey)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch status warning:', error.message);
      return fallback;
    }

    if (data) {
      const remoteStatus: WeeklySubjectStatus = {
        subjectId: data.subject_id,
        is_locked: Boolean(data.is_locked),
        status: data.status === 'submitted' ? 'submitted' : 'draft',
        submitted_at: data.submitted_at,
        submitted_by: data.submitted_by,
        locked_at: data.locked_at,
        unlocked_at: data.unlocked_at,
        unlock_reason: data.unlock_reason,
      };
      setLocalSubjectStatus(grade, weekNumber, shift, remoteStatus);
      return remoteStatus;
    }
  } catch (err) {
    console.warn('Failed to fetch statement status from Supabase:', err);
  }

  return fallback;
}

/**
 * Fetches all subject statuses for a specific grade, week, and shift.
 * Used by the Master Stage Overview and Missing Submissions Tracker.
 */
export async function fetchGradeSubjectStatuses(
  grade: string,
  weekNumber: number,
  shift: ShiftType
): Promise<Record<string, WeeklySubjectStatus>> {
  const doc = loadWeeklyStatement(grade, weekNumber, shift);
  const map: Record<string, WeeklySubjectStatus> = { ...(doc.subjectStatuses || {}) };

  if (!isSupabaseConfigured()) {
    return map;
  }

  try {
    const { data, error } = await supabase
      .from('weekly_statements')
      .select('subject_id, is_locked, status, submitted_at, submitted_by, locked_at, unlocked_at, unlock_reason')
      .eq('grade', grade)
      .eq('week_number', weekNumber)
      .eq('shift', shift);

    if (error) {
      console.warn('Supabase fetch grade statuses warning:', error.message);
      return map;
    }

    if (data && Array.isArray(data)) {
      for (const row of data) {
        map[row.subject_id] = {
          subjectId: row.subject_id,
          is_locked: Boolean(row.is_locked),
          status: row.status === 'submitted' ? 'submitted' : 'draft',
          submitted_at: row.submitted_at,
          submitted_by: row.submitted_by,
          locked_at: row.locked_at,
          unlocked_at: row.unlocked_at,
          unlock_reason: row.unlock_reason,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to load grade statuses from Supabase:', err);
  }

  return map;
}

/**
 * Fetch all audit logs for a statement from Supabase and local cache
 */
export async function fetchAuditLogs(
  grade: string,
  weekNumber: number,
  shift: ShiftType,
  subjectId: string
): Promise<WeeklyStatementAuditLog[]> {
  const statementKey = getStatementKey(grade, weekNumber, shift, subjectId);
  const localLogs = getLocalAuditLogs(statementKey);

  if (!isSupabaseConfigured()) {
    return localLogs;
  }

  try {
    const { data, error } = await supabase
      .from('weekly_statement_audit_logs')
      .select('*')
      .eq('statement_id', statementKey)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Supabase audit logs fetch warning:', error.message);
      return localLogs;
    }

    if (data && Array.isArray(data) && data.length > 0) {
      // Merge unique logs
      const combined = [...data, ...localLogs];
      const seen = new Set<string>();
      const deduped: WeeklyStatementAuditLog[] = [];
      for (const item of combined) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deduped.push({
            id: item.id,
            statement_id: item.statement_id,
            grade: item.grade,
            week_number: item.week_number,
            shift: item.shift,
            subject_id: item.subject_id,
            action: item.action,
            old_content: item.old_content,
            new_content: item.new_content,
            changed_by: item.changed_by,
            reason: item.reason,
            created_at: item.created_at,
          });
        }
      }
      return deduped.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  } catch (err) {
    console.warn('Failed to fetch audit logs from Supabase:', err);
  }

  return localLogs;
}

/**
 * Submit and Lock subject statement (اعتماد وحفظ نهائي)
 * Changes is_locked to true, status to 'submitted', logs to audit log
 */
export async function submitAndLockSubjectPlan(params: {
  grade: string;
  weekNumber: number;
  shift: ShiftType;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  genderCohort: string;
  nativeCohort: string;
  dailyPlans: Record<number, WeeklySubjectDailyPlan>;
  quizzes?: WeeklyQuizItem[];
  oldPlans?: Record<number, WeeklySubjectDailyPlan>;
}): Promise<{ success: boolean; status: WeeklySubjectStatus; error?: string }> {
  const {
    grade,
    weekNumber,
    shift,
    subjectId,
    subjectName,
    teacherName,
    genderCohort,
    nativeCohort,
    dailyPlans,
    quizzes = [],
    oldPlans = {},
  } = params;

  const now = new Date().toISOString();
  const statementKey = getStatementKey(grade, weekNumber, shift, subjectId);

  const updatedStatus: WeeklySubjectStatus = {
    subjectId,
    is_locked: true,
    status: 'submitted',
    submitted_at: now,
    submitted_by: teacherName || 'المعلم',
    locked_at: now,
    unlocked_at: undefined,
    unlock_reason: undefined,
  };

  // 1. Update locally
  setLocalSubjectStatus(grade, weekNumber, shift, updatedStatus);

  // 2. Create Audit Log Entry
  const auditLog: WeeklyStatementAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    statement_id: statementKey,
    grade,
    week_number: weekNumber,
    shift,
    subject_id: subjectId,
    action: 'submit_and_lock',
    old_content: { status: 'draft', plans: oldPlans },
    new_content: { status: 'submitted', is_locked: true, plans: dailyPlans, quizzes },
    changed_by: teacherName || 'المعلم المعتمد',
    reason: 'اعتماد نهائي وإغلاق التقرير الأسبوعي للمادة',
    created_at: now,
  };

  appendLocalAuditLog(auditLog);

  // 3. Sync to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const payload = {
        id: statementKey,
        grade,
        week_number: weekNumber,
        shift,
        subject_id: subjectId,
        subject_name: subjectName,
        teacher_name: teacherName || '',
        gender_cohort: genderCohort,
        native_cohort: nativeCohort,
        status: 'submitted',
        is_locked: true,
        content_data: dailyPlans,
        quizzes_data: quizzes,
        submitted_at: now,
        submitted_by: teacherName || 'المعلم',
        locked_at: now,
        updated_at: now,
      };

      const { error: stmtError } = await supabase
        .from('weekly_statements')
        .upsert(payload, { onConflict: 'id' });

      if (stmtError) {
        console.warn('Supabase weekly_statements upsert error:', stmtError.message);
      }

      const { error: logError } = await supabase
        .from('weekly_statement_audit_logs')
        .insert({
          id: auditLog.id,
          statement_id: auditLog.statement_id,
          grade: auditLog.grade,
          week_number: auditLog.week_number,
          shift: auditLog.shift,
          subject_id: auditLog.subject_id,
          action: auditLog.action,
          old_content: auditLog.old_content,
          new_content: auditLog.new_content,
          changed_by: auditLog.changed_by,
          reason: auditLog.reason,
          created_at: auditLog.created_at,
        });

      if (logError) {
        console.warn('Supabase weekly_statement_audit_logs insert error:', logError.message);
      }
    } catch (err: unknown) {
      console.warn('Supabase sync error on submitAndLock:', err);
    }
  }

  return { success: true, status: updatedStatus };
}

/**
 * Request Unlock / Re-open statement for editing (طلب تعديل / فتح القفل)
 * Changes is_locked to false, status to 'draft', logs the reason and timestamp in audit log
 */
export async function unlockSubjectPlan(params: {
  grade: string;
  weekNumber: number;
  shift: ShiftType;
  subjectId: string;
  teacherName: string;
  reason: string;
  currentPlans: Record<number, WeeklySubjectDailyPlan>;
}): Promise<{ success: boolean; status: WeeklySubjectStatus; error?: string }> {
  const {
    grade,
    weekNumber,
    shift,
    subjectId,
    teacherName,
    reason,
    currentPlans,
  } = params;

  const now = new Date().toISOString();
  const statementKey = getStatementKey(grade, weekNumber, shift, subjectId);

  const updatedStatus: WeeklySubjectStatus = {
    subjectId,
    is_locked: false,
    status: 'draft',
    unlocked_at: now,
    unlock_reason: reason || 'طلب تعديل المحتوى بعد الاعتماد',
  };

  // 1. Update locally
  setLocalSubjectStatus(grade, weekNumber, shift, updatedStatus);

  // 2. Create Audit Log Entry
  const auditLog: WeeklyStatementAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    statement_id: statementKey,
    grade,
    week_number: weekNumber,
    shift,
    subject_id: subjectId,
    action: 'unlock_for_editing',
    old_content: { status: 'submitted', is_locked: true, plans: currentPlans },
    new_content: { status: 'draft', is_locked: false, unlock_reason: reason },
    changed_by: teacherName || 'المعلم / المشرف',
    reason: reason || 'طلب فك القفل لإجراء تعديل على بيانات التقرير',
    created_at: now,
  };

  appendLocalAuditLog(auditLog);

  // 3. Sync to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const payload = {
        id: statementKey,
        status: 'draft',
        is_locked: false,
        unlocked_at: now,
        unlock_reason: reason || 'طلب تعديل المحتوى',
        updated_at: now,
      };

      const { error: stmtError } = await supabase
        .from('weekly_statements')
        .update(payload)
        .eq('id', statementKey);

      if (stmtError) {
        console.warn('Supabase weekly_statements unlock error:', stmtError.message);
      }

      const { error: logError } = await supabase
        .from('weekly_statement_audit_logs')
        .insert({
          id: auditLog.id,
          statement_id: auditLog.statement_id,
          grade: auditLog.grade,
          week_number: auditLog.week_number,
          shift: auditLog.shift,
          subject_id: auditLog.subject_id,
          action: auditLog.action,
          old_content: auditLog.old_content,
          new_content: auditLog.new_content,
          changed_by: auditLog.changed_by,
          reason: auditLog.reason,
          created_at: auditLog.created_at,
        });

      if (logError) {
        console.warn('Supabase audit log insert on unlock error:', logError.message);
      }
    } catch (err: unknown) {
      console.warn('Supabase sync error on unlock:', err);
    }
  }

  return { success: true, status: updatedStatus };
}
