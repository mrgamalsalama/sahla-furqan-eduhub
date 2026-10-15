import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertTriangle, FileText, Download,
  Printer, Copy, Edit3, ExternalLink, Sparkles, RefreshCw, Trash2, Plus,
  Layers, School, Check, X, Info, User,
  ChevronRight, BookOpen, Eye, EyeOff, Lock, Unlock, History, ShieldCheck, Database,
  FolderArchive, KeyRound, ArrowRight, ArrowLeft
} from 'lucide-react';
import type {
  WeeklyStatementDocument, WeeklySubjectDailyPlan, WeeklyQuizItem,
  ShiftType, OutputType, GenerationResult, GenderCohort, NativeCohort,
  WeeklySubjectStatus, WeeklyStatementAuditLog
} from '@/types';
import type { UILang } from '@/lib/i18n';
import { GRADES_EN } from '@/types';
import {
  PRIMETIMETABLE_LINKS, STANDARD_SUBJECTS,
  createOfficialSampleDocument, createEmptyDocument,
  getTimetableSessionStatus
} from '@/lib/weeklyStatementDefaults';
import {
  ACADEMIC_CALENDAR_2026_2027, ACADEMIC_YEAR,
  isElementaryOrMiddleSchool, getDaysForGrade, getAcademicWeekForGrade
} from '@/lib/academicCalendar';
import {
  getStoredTeacherProfile, saveTeacherProfile,
  loadWeeklyStatement, saveWeeklyStatement, commitTeacherDayPlan,
  clearAllWeeklyContent, RESET_WEEKLY_CONTENT_PIN
} from '@/lib/weeklyStatementStorage';
import {
  getTeachersForShift,
  getTeacherAssignments,
  getExpectedTeachersForGrade,
  calculateMissingTeacherSubmissions,
  type TeacherAssignment,
} from '@/lib/timetableEngine';
import { exportWeeklyStatementToDocx } from '@/lib/weeklyStatementDocx';
import { generateWeeklyStatementHtml } from '@/lib/weeklyStatementHtml';
import {
  submitAndLockSubjectPlan,
  unlockSubjectPlan,
  fetchSubjectStatus,
  fetchGradeSubjectStatuses,
  fetchAuditLogs,
  getStatementKey,
} from '@/lib/weeklyStatementSupabase';
import { exportAllStagesBatchZip, type BatchExportProgress } from '@/lib/weeklyStatementBatchExport';
import { isSupabaseConfigured } from '@/lib/supabase';

interface WeeklyStatementStudioProps {
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
  onClose?: () => void;
}

export default function WeeklyStatementStudio({
  uiLang,
  onClose,
}: WeeklyStatementStudioProps) {
  const isAr = uiLang === 'ar';

  // ── Mode Switch: 'teacher' (Teacher quick entry) | 'master' (Full Grade Statement) ──
  const [viewMode, setViewMode] = useState<'teacher' | 'master'>('teacher');

  // ── Teacher Profile & Selectors ──
  const [teacherProfile] = useState(() => getStoredTeacherProfile());
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(teacherProfile.lastSelectedWeek || 1);
  const [selectedTermFilter, setSelectedTermFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>(teacherProfile.grade || 'Grade 11');
  const [selectedShift, setSelectedShift] = useState<ShiftType>(teacherProfile.shift || 'mena');
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>(teacherProfile.teacherName || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(teacherProfile.subjectId || 'english');
  const [selectedCohort, setSelectedCohort] = useState<GenderCohort>(teacherProfile.genderCohort || 'joint');
  const [selectedNativeCohort, setSelectedNativeCohort] = useState<NativeCohort>(teacherProfile.nativeCohort || 'both');

  // ── Current Shared Statement Document for (Grade, Week, Shift) ──
  const [docData, setDocData] = useState<WeeklyStatementDocument>(() =>
    loadWeeklyStatement(selectedGrade, selectedWeekNumber, selectedShift)
  );

  // ── Active Tabs in Master View ──
  const [activeMasterTab, setActiveMasterTab] = useState<'editor' | 'quizzes' | 'preview'>('preview');
  const [activeMasterDay, setActiveMasterDay] = useState<number>(1);

  // ── Feedback & State ──
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingBoth, setIsExportingBoth] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');

  // ── Dedicated Export Modal State (Shift-First Export) ──
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportShiftChoice, setExportShiftChoice] = useState<ShiftType>(selectedShift);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  // ── Supabase Audit Log & Lock on Submit State ──
  const [subjectStatus, setSubjectStatus] = useState<WeeklySubjectStatus>({
    subjectId: selectedSubjectId,
    is_locked: false,
    status: 'draft',
  });
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [isSubmittingUnlock, setIsSubmittingUnlock] = useState(false);
  const [isSubmittingLock, setIsSubmittingLock] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<WeeklyStatementAuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [gradeSubjectStatuses, setGradeSubjectStatuses] = useState<Record<string, WeeklySubjectStatus>>({});

  // ── Reset All Weekly Content (PIN Protected) State ──
  const [isResetWeekModalOpen, setIsResetWeekModalOpen] = useState(false);
  const [resetPinInput, setResetPinInput] = useState('');
  const [resetPinError, setResetPinError] = useState('');
  const [showResetPinText, setShowResetPinText] = useState(false);
  const [isResettingWeek, setIsResettingWeek] = useState(false);

  // ── Dedicated Batch Export All Stages (K to 12 ZIP Word & PDF) State ──
  const [isBatchK12ModalOpen, setIsBatchK12ModalOpen] = useState(false);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchExportProgress | null>(null);
  const [batchShiftChoice, setBatchShiftChoice] = useState<ShiftType | 'both'>('mena');


  // Sandboxed-safe Toast and Confirmation Modal states
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: 'emerald' | 'rose' | 'blue';
    onConfirm: () => void;
  } | null>(null);

  // In-app Modal for Zoom Link insertion (replaces browser prompt)
  const [zoomModalDay, setZoomModalDay] = useState<number | null>(null);
  const [zoomModalInput, setZoomModalInput] = useState('');

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }

  // ── Grade days configuration & current academic week (KG-G8: 4 days, G9-G12: 5 days) ──
  const isElementaryOrMiddle = useMemo(() => isElementaryOrMiddleSchool(selectedGrade), [selectedGrade]);
  const gradeDays = useMemo(() => getDaysForGrade(selectedGrade), [selectedGrade]);
  const currentWeek = useMemo(() => {
    return getAcademicWeekForGrade(selectedWeekNumber, selectedGrade);
  }, [selectedWeekNumber, selectedGrade]);

  // ── Load document whenever (grade, weekNumber, shift) changes ──
  const refreshCurrentDocument = useCallback(() => {
    const loaded = loadWeeklyStatement(selectedGrade, selectedWeekNumber, selectedShift);
    const weekInfo = getAcademicWeekForGrade(selectedWeekNumber, selectedGrade);
    const synchronizedDoc: WeeklyStatementDocument = {
      ...loaded,
      term: weekInfo.term,
      weekDateHeader: weekInfo.headerDate,
      weekRangeText: weekInfo.rangeText,
    };
    setDocData(synchronizedDoc);
  }, [selectedGrade, selectedWeekNumber, selectedShift]);

  useEffect(() => {
    refreshCurrentDocument();
  }, [refreshCurrentDocument]);

  // Clamp activeMasterDay if grade changes to 4-day schedule
  useEffect(() => {
    if (activeMasterDay > (isElementaryOrMiddle ? 4 : 5)) {
      setActiveMasterDay(1);
    }
  }, [isElementaryOrMiddle, activeMasterDay]);

  // Keep export shift choice in sync with selectedShift when opening modal
  useEffect(() => {
    setExportShiftChoice(selectedShift);
  }, [selectedShift]);

  // Listen to cross-window or inter-component updates
  useEffect(() => {
    function handleStorageSync(e: Event) {
      const customEvent = e as CustomEvent;
      if (
        customEvent.detail &&
        customEvent.detail.grade === selectedGrade &&
        customEvent.detail.weekNumber === selectedWeekNumber &&
        customEvent.detail.shift === selectedShift
      ) {
        refreshCurrentDocument();
      }
    }
    window.addEventListener('weekly-statement-changed', handleStorageSync);
    return () => window.removeEventListener('weekly-statement-changed', handleStorageSync);
  }, [selectedGrade, selectedWeekNumber, selectedShift, refreshCurrentDocument]);

  // Persist teacher profile preferences (including teacherName)
  useEffect(() => {
    saveTeacherProfile({
      teacherName: selectedTeacherName,
      grade: selectedGrade,
      shift: selectedShift,
      subjectId: selectedSubjectId,
      genderCohort: selectedCohort,
      nativeCohort: selectedNativeCohort,
      lastSelectedWeek: selectedWeekNumber,
    });
  }, [selectedTeacherName, selectedGrade, selectedShift, selectedSubjectId, selectedCohort, selectedNativeCohort, selectedWeekNumber]);

  const isSubjectLocked = Boolean(subjectStatus.is_locked && subjectStatus.status === 'submitted');

  // Keep subjectStatus in sync with docData.subjectStatuses & Supabase
  useEffect(() => {
    const fromDoc = docData.subjectStatuses?.[selectedSubjectId];
    if (fromDoc) {
      setSubjectStatus(fromDoc);
    } else {
      fetchSubjectStatus(selectedGrade, selectedWeekNumber, selectedShift, selectedSubjectId).then((st) => {
        setSubjectStatus(st);
      });
    }

    fetchGradeSubjectStatuses(selectedGrade, selectedWeekNumber, selectedShift).then((all) => {
      setGradeSubjectStatuses(all);
    });
  }, [docData, selectedSubjectId, selectedGrade, selectedWeekNumber, selectedShift]);

  // Listen to remote or window sync events for locks/submits
  useEffect(() => {
    function handleStatusChanged(e: Event) {
      const custom = e as CustomEvent;
      if (custom.detail) {
        const { grade, weekNumber, shift, subjectId, status } = custom.detail;
        if (
          grade === selectedGrade &&
          weekNumber === selectedWeekNumber &&
          shift === selectedShift
        ) {
          if (subjectId === selectedSubjectId) {
            setSubjectStatus(status);
          }
          setGradeSubjectStatuses((prev) => ({
            ...prev,
            [subjectId]: status,
          }));
        }
      }
    }

    window.addEventListener('weekly-statement-status-changed', handleStatusChanged);
    return () => {
      window.removeEventListener('weekly-statement-status-changed', handleStatusChanged);
    };
  }, [selectedGrade, selectedWeekNumber, selectedShift, selectedSubjectId]);

  // ── Timetable Engine Integration ──
  const shiftTeachers = useMemo(() => {
    return getTeachersForShift(selectedShift);
  }, [selectedShift]);


  const teacherAssignments = useMemo(() => {
    if (!selectedTeacherName) return [];
    return getTeacherAssignments(selectedShift, selectedTeacherName);
  }, [selectedShift, selectedTeacherName]);

  const missingTracker = useMemo(() => {
    return calculateMissingTeacherSubmissions(docData, selectedShift, selectedGrade);
  }, [docData, selectedShift, selectedGrade]);

  // Handler when teacher selects their name from dropdown
  function handleSelectTeacherName(teacherName: string) {
    setSelectedTeacherName(teacherName);
    if (!teacherName) return;

    const assignments = getTeacherAssignments(selectedShift, teacherName);
    if (assignments.length === 0) return;

    // Check if this teacher teaches the currently selected grade
    const matchThisGrade = assignments.find(
      (a) => a.grade.toLowerCase().replace(/\s+/g, '') === selectedGrade.toLowerCase().replace(/\s+/g, '')
    );

    if (matchThisGrade) {
      setSelectedSubjectId(matchThisGrade.subjectId);
      setSelectedCohort(matchThisGrade.cohort);
      setSelectedNativeCohort(matchThisGrade.nativeCohort);
      showToast(
        isAr
          ? `تم ربط جدول ${teacherName} لمادة (${matchThisGrade.subjectNameAr}) بنجاح`
          : `Linked timetable for ${teacherName} (${matchThisGrade.subjectNameEn})`,
        'success'
      );
    } else {
      // Teacher teaches another grade: switch to their first assigned grade
      const primary = assignments[0];
      setSelectedGrade(primary.grade);
      setSelectedSubjectId(primary.subjectId);
      setSelectedCohort(primary.cohort);
      setSelectedNativeCohort(primary.nativeCohort);
      showToast(
        isAr
          ? `تم الانتقال لصف (${primary.grade}) ومادة (${primary.subjectNameAr}) الخاصة بـ ${teacherName}`
          : `Switched to ${primary.grade} - ${primary.subjectNameEn} for ${teacherName}`,
        'info'
      );
    }
  }

  // Quick switch to a specific assignment
  function handleSelectTeacherAssignment(assignment: TeacherAssignment) {
    setSelectedGrade(assignment.grade);
    setSelectedSubjectId(assignment.subjectId);
    setSelectedCohort(assignment.cohort);
    setSelectedNativeCohort(assignment.nativeCohort);
    showToast(
      isAr
        ? `تم اختيار صف (${assignment.grade}) - (${assignment.subjectNameAr})`
        : `Selected ${assignment.grade} - ${assignment.subjectNameEn}`,
      'success'
    );
  }

  // Copy missing submissions reminder for coordinators/teachers
  function handleCopyMissingReminder() {
    if (missingTracker.missingList.length === 0) return;
    const shiftLabel = selectedShift === 'us' ? 'فترة أمريكا (US Shift)' : 'فترة الشرق الأوسط (MENA Shift)';
    const lines = [
      `📢 تذكير بإدخال التقرير الأسبوعي (${currentWeek.labelAr})`,
      `🏫 الصف: ${selectedGrade} - ${shiftLabel}`,
      `📌 نرجو من الأساتذة الكرام إكمال محتوى الحصص المتبقية:`,
      ...missingTracker.missingList.map((m) => {
        const daysText = m.missingDays
          .map((d) => gradeDays.find((gd) => gd.dayNumber === d)?.nameAr || `اليوم ${d}`)
          .join('، ');
        return `▫️ ${m.teacherName} (${m.subjectName}): متبقي ${daysText}`;
      }),
      `\nشاكرين ومقدرين حسن تعاونكم الدائم 🙏`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      showToast(isAr ? 'تم نسخ رسالة التذكير للحافظة بنجاح!' : 'Reminder message copied to clipboard!', 'success');
    });
  }

  // Filtered academic weeks based on Term filter
  const filteredWeeks = useMemo(() => {
    if (selectedTermFilter === 'all') return ACADEMIC_CALENDAR_2026_2027;
    return ACADEMIC_CALENDAR_2026_2027.filter((w) => w.term === selectedTermFilter);
  }, [selectedTermFilter]);

  // Current subject definition
  const currentSubjectDef = useMemo(() => {
    return STANDARD_SUBJECTS.find((s) => s.id === selectedSubjectId) || STANDARD_SUBJECTS[0];
  }, [selectedSubjectId]);

  const isArabicSub = currentSubjectDef.isArabicOrIslamic;

  // -------------------------------------------------------------
  // Teacher Mode: Extract subject plans for Grade-Specific Days
  // -------------------------------------------------------------
  const teacherDaysPlan = useMemo(() => {
    const map: Record<number, WeeklySubjectDailyPlan> = {};

    for (const dayItem of gradeDays) {
      const day = dayItem.dayNumber;
      const dayPlans = docData.days[day] || [];
      const existing = dayPlans.find((p) => p.subjectId === selectedSubjectId);

      // Determine schedule status from PrimeTimetable matrix for this shift and teacher
      const { hasSession, autoNote, matchedTeacher } = getTimetableSessionStatus(
        selectedShift,
        selectedGrade,
        day,
        selectedSubjectId,
        selectedCohort,
        selectedNativeCohort,
        selectedTeacherName
      );

      if (existing) {
        map[day] = {
          ...existing,
          teacherName: selectedTeacherName || existing.teacherName || matchedTeacher || '',
          // If no session by timetable and not manually overridden
          isNoSession: existing.isNoSession !== undefined ? existing.isNoSession : !hasSession,
          noSessionNote: existing.noSessionNote || autoNote,
          contentTopic: existing.contentTopic || (!hasSession ? autoNote : ''),
        };
      } else {
        map[day] = {
          id: `day${day}-${selectedSubjectId}`,
          day,
          subjectId: selectedSubjectId,
          subjectName: isArabicSub ? currentSubjectDef.nameAr : currentSubjectDef.nameEn,
          teacherName: selectedTeacherName || matchedTeacher || '',
          genderCohort: selectedCohort,
          nativeCohort: selectedNativeCohort,
          isNoSession: !hasSession,
          noSessionNote: autoNote,
          contentTopic: !hasSession ? autoNote : '',
          homework: '',
          optionalEnrichment: '',
        };
      }
    }
    return map;
  }, [docData, selectedSubjectId, selectedShift, selectedGrade, selectedCohort, selectedNativeCohort, selectedTeacherName, currentSubjectDef, isArabicSub, gradeDays]);

  // Save changes to current teacher subject
  function handleTeacherDayChange(day: number, updates: Partial<WeeklySubjectDailyPlan>) {
    if (isSubjectLocked) {
      showToast(isAr ? 'التقرير معتمد ومقفل نهائياً. يرجى طلب فك القفل لإجراء تعديل.' : 'Statement is locked. Request unlock first.', 'error');
      return;
    }

    setSaveStatus('saving');

    const current = teacherDaysPlan[day];
    const planToSave: WeeklySubjectDailyPlan = {
      ...current,
      ...updates,
      teacherName: selectedTeacherName || current.teacherName || '',
      subjectId: selectedSubjectId,
      subjectName: isArabicSub ? currentSubjectDef.nameAr : currentSubjectDef.nameEn,
      genderCohort: selectedCohort,
      nativeCohort: selectedNativeCohort,
      day,
    };

    const updatedDoc = commitTeacherDayPlan(docData, day, planToSave);
    saveWeeklyStatement(updatedDoc, selectedWeekNumber);
    setDocData(updatedDoc);

    setTimeout(() => {
      setSaveStatus('saved');
    }, 250);
  }

  // Toggle No-Session for teacher
  function handleToggleTeacherNoSession(day: number) {
    if (isSubjectLocked) {
      showToast(isAr ? 'التقرير معتمد ومقفل نهائياً. يرجى طلب فك القفل لإجراء تعديل.' : 'Statement is locked. Request unlock first.', 'error');
      return;
    }

    const current = teacherDaysPlan[day];
    const willBeNoSession = !current.isNoSession;

    const { autoNote } = getTimetableSessionStatus(
      selectedShift,
      selectedGrade,
      day,
      selectedSubjectId,
      selectedCohort,
      selectedNativeCohort
    );

    handleTeacherDayChange(day, {
      isNoSession: willBeNoSession,
      noSessionNote: willBeNoSession ? (current.noSessionNote || autoNote) : '',
      contentTopic: willBeNoSession ? (current.noSessionNote || autoNote) : '',
    });
  }

  // -------------------------------------------------------------
  // Quizzes for current subject
  // -------------------------------------------------------------
  const [newQuizDate, setNewQuizDate] = useState('22/10/2026');
  const [newQuizTopics, setNewQuizTopics] = useState('');
  const [newQuizMaterials, setNewQuizMaterials] = useState('');

  const subjectQuizzes = useMemo(() => {
    return (docData.quizzes || []).filter((q) => {
      const qSub = q.subject.toLowerCase();
      const sId = selectedSubjectId.toLowerCase();
      const sEn = currentSubjectDef.nameEn.toLowerCase();
      const sAr = currentSubjectDef.nameAr;
      return qSub.includes(sId) || qSub.includes(sEn) || q.subject.includes(sAr);
    });
  }, [docData.quizzes, selectedSubjectId, currentSubjectDef]);

  function handleAddTeacherQuiz() {
    if (isSubjectLocked) {
      showToast(isAr ? 'التقرير معتمد ومقفل نهائياً. يرجى طلب فك القفل لإضافة كويزات.' : 'Statement is locked. Request unlock first.', 'error');
      return;
    }

    if (!newQuizTopics.trim()) {
      showToast(isAr ? 'يرجى كتابة موضوع الكويز' : 'Please enter quiz topic', 'error');
      return;
    }

    const quizSubjectLabel = isArabicSub ? currentSubjectDef.nameAr : currentSubjectDef.nameEn;
    const newQuiz: WeeklyQuizItem = {
      id: `quiz-${Date.now()}`,
      date: newQuizDate,
      subject: quizSubjectLabel,
      topics: newQuizTopics,
      materials: newQuizMaterials,
    };

    const updatedQuizzes = [...(docData.quizzes || []), newQuiz];
    const updatedDoc = {
      ...docData,
      quizzes: updatedQuizzes,
    };

    saveWeeklyStatement(updatedDoc, selectedWeekNumber);
    setDocData(updatedDoc);
    setNewQuizTopics('');
    setNewQuizMaterials('');
    showToast(isAr ? 'تمت إضافة الكويز بنجاح وحفظه' : 'Quiz added and saved successfully', 'success');
  }

  function handleDeleteQuiz(quizId: string) {
    if (isSubjectLocked) {
      showToast(isAr ? 'التقرير معتمد ومقفل نهائياً. يرجى طلب فك القفل لحذف كويز.' : 'Statement is locked. Request unlock first.', 'error');
      return;
    }

    const updatedQuizzes = (docData.quizzes || []).filter((q) => q.id !== quizId);
    const updatedDoc = {
      ...docData,
      quizzes: updatedQuizzes,
    };
    saveWeeklyStatement(updatedDoc, selectedWeekNumber);
    setDocData(updatedDoc);
    showToast(isAr ? 'تم حذف الكويز' : 'Quiz removed', 'info');
  }

  // ── Format Date for Audit Logs ──
  function formatAuditTime(isoStr?: string): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('ar-SA', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return isoStr;
    }
  }

  // ── Submit & Lock (اعتماد وحفظ نهائي) ──
  async function handleSubmitAndLock() {
    setIsSubmittingLock(true);
    try {
      const teacherName = selectedTeacherName || (getStoredTeacherProfile().teacherName || 'معلم المادة');
      const result = await submitAndLockSubjectPlan({
        grade: selectedGrade,
        weekNumber: selectedWeekNumber,
        shift: selectedShift,
        subjectId: selectedSubjectId,
        subjectName: isArabicSub ? currentSubjectDef.nameAr : currentSubjectDef.nameEn,
        teacherName,
        genderCohort: selectedCohort,
        nativeCohort: selectedNativeCohort,
        dailyPlans: teacherDaysPlan,
        quizzes: docData.quizzes,
        oldPlans: teacherDaysPlan,
      });

      if (result.success) {
        setSubjectStatus(result.status);
        if (result.auditLog) {
          setAuditLogs((prev) => [result.auditLog!, ...prev.filter((l) => l.id !== result.auditLog!.id)]);
        }
        const updatedDoc: WeeklyStatementDocument = {
          ...docData,
          subjectStatuses: {
            ...(docData.subjectStatuses || {}),
            [selectedSubjectId]: result.status,
          },
          updatedAt: Date.now(),
        };
        setDocData(updatedDoc);
        saveWeeklyStatement(updatedDoc, selectedWeekNumber);

        showToast(
          isAr
            ? `🔒 تم اعتماد وحفظ خطة (${currentSubjectDef.nameAr}) وقفلها بنجاح وتوثيقها في سجل التدقيق و Supabase`
            : `🔒 Statement for ${currentSubjectDef.nameEn} submitted, locked, and recorded in Supabase Audit Log`,
          'success'
        );
      }
    } catch (err) {
      console.error('Error locking statement:', err);
      showToast(isAr ? 'حدث خطأ أثناء الاعتماد والقفل' : 'Error submitting plan', 'error');
    } finally {
      setIsSubmittingLock(false);
    }
  }

  // ── Open Unlock Modal ──
  function handleOpenUnlockModal() {
    setUnlockReason('');
    setIsUnlockModalOpen(true);
  }

  // ── Confirm Unlock (طلب تعديل / فتح القفل) ──
  async function handleConfirmUnlock() {
    if (!unlockReason.trim()) {
      showToast(isAr ? 'يرجى كتابة سبب طلب التعديل لتوثيقه في سجل التدقيق' : 'Please provide a reason for unlocking', 'error');
      return;
    }

    setIsSubmittingUnlock(true);
    try {
      const teacherName = selectedTeacherName || (getStoredTeacherProfile().teacherName || 'معلم المادة');
      const result = await unlockSubjectPlan({
        grade: selectedGrade,
        weekNumber: selectedWeekNumber,
        shift: selectedShift,
        subjectId: selectedSubjectId,
        teacherName,
        reason: unlockReason.trim(),
        currentPlans: teacherDaysPlan,
      });

      if (result.success) {
        setSubjectStatus(result.status);
        if (result.auditLog) {
          setAuditLogs((prev) => [result.auditLog!, ...prev.filter((l) => l.id !== result.auditLog!.id)]);
        }
        const updatedDoc: WeeklyStatementDocument = {
          ...docData,
          subjectStatuses: {
            ...(docData.subjectStatuses || {}),
            [selectedSubjectId]: result.status,
          },
          updatedAt: Date.now(),
        };
        setDocData(updatedDoc);
        saveWeeklyStatement(updatedDoc, selectedWeekNumber);

        setIsUnlockModalOpen(false);
        showToast(
          isAr
            ? `🔓 تم فتح قفل التقرير للتعديل بنجاح وتوثيق العملية في سجل التدقيق (Audit Log)`
            : `🔓 Plan unlocked for editing and logged in Audit Log`,
          'success'
        );
      }
    } catch (err) {
      console.error('Error unlocking statement:', err);
      showToast(isAr ? 'حدث خطأ أثناء فتح القفل' : 'Error unlocking plan', 'error');
    } finally {
      setIsSubmittingUnlock(false);
    }
  }

  // ── Open Audit Log Modal ──
  async function handleOpenAuditModal(targetSubjectId?: unknown) {
    const validSubjectId =
      typeof targetSubjectId === 'string' && targetSubjectId.trim()
        ? targetSubjectId.trim()
        : (typeof selectedSubjectId === 'string' && selectedSubjectId.trim() ? selectedSubjectId : 'english');

    if (typeof targetSubjectId === 'string' && targetSubjectId.trim() && targetSubjectId !== selectedSubjectId) {
      setSelectedSubjectId(targetSubjectId.trim());
    }
    setIsAuditModalOpen(true);
    setIsLoadingAudit(true);
    try {
      const logs = await fetchAuditLogs(selectedGrade, selectedWeekNumber, selectedShift, validSubjectId);
      setAuditLogs(logs);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }

  // ── Master View Supervisor Quick Lock ──
  async function handleMasterQuickLockSubject(subId: string, subName: string) {
    const plansForSub: Record<number, WeeklySubjectDailyPlan> = {};
    for (const dItem of gradeDays) {
      const d = dItem.dayNumber;
      const found = (docData.days[d] || []).find((p) => p.subjectId === subId);
      if (found) plansForSub[d] = found;
    }

    const result = await submitAndLockSubjectPlan({
      grade: selectedGrade,
      weekNumber: selectedWeekNumber,
      shift: selectedShift,
      subjectId: subId,
      subjectName: subName,
      teacherName: 'الإدارة / المشرف الأكاديمي',
      genderCohort: 'joint',
      nativeCohort: 'both',
      dailyPlans: plansForSub,
      quizzes: docData.quizzes,
    });

    if (result.success) {
      if (result.auditLog) {
        setAuditLogs((prev) => [result.auditLog!, ...prev.filter((l) => l.id !== result.auditLog!.id)]);
      }
      const updatedDoc: WeeklyStatementDocument = {
        ...docData,
        subjectStatuses: {
          ...(docData.subjectStatuses || {}),
          [subId]: result.status,
        },
        updatedAt: Date.now(),
      };
      setDocData(updatedDoc);
      saveWeeklyStatement(updatedDoc, selectedWeekNumber);
      setGradeSubjectStatuses((prev) => ({ ...prev, [subId]: result.status }));
      showToast(isAr ? `تم اعتماد وقفل مادة (${subName}) بنجاح` : `Locked ${subName}`, 'success');
    }
  }

  function handleMasterRequestUnlock(subId: string) {
    setSelectedSubjectId(subId);
    setUnlockReason('');
    setIsUnlockModalOpen(true);
  }

  // ── Reset All Weekly Content (PIN Protected: Sahlah2027) ──
  function handleOpenResetWeekModal() {
    setResetPinInput('');
    setResetPinError('');
    setShowResetPinText(false);
    setIsResetWeekModalOpen(true);
  }

  async function handleConfirmResetWeek() {
    if (resetPinInput.trim() !== RESET_WEEKLY_CONTENT_PIN) {
      setResetPinError(
        isAr
          ? 'الرقم السري غير صحيح! يرجى إدخال الرقم السري المعتمد لإدارة المدرسة.'
          : 'Incorrect PIN! Please enter the authorized administrator PIN.'
      );
      return;
    }

    setIsResettingWeek(true);
    setResetPinError('');
    try {
      const cleared = clearAllWeeklyContent(docData);
      setDocData(cleared);
      saveWeeklyStatement(cleared, selectedWeekNumber);

      // Reset subject status
      setSubjectStatus({
        subjectId: selectedSubjectId,
        is_locked: false,
        status: 'draft',
      });
      setGradeSubjectStatuses({});

      setIsResetWeekModalOpen(false);
      setResetPinInput('');
      showToast(
        isAr
          ? '🧹 تم تفريغ محتوى الأسبوع كامل لجميع المواد بنجاح (المحتوى أصبح فارغاً وجاهزاً لإدخال المعلمين).'
          : '🧹 All weekly content cleared for all subjects. Ready for teachers to input.',
        'success'
      );
    } catch (err) {
      console.error('Error clearing week content:', err);
      showToast(isAr ? 'حدث خطأ أثناء تفريغ محتوى الأسبوع' : 'Error clearing weekly content', 'error');
    } finally {
      setIsResettingWeek(false);
    }
  }

  // ── Batch Export All Stages as ZIP (Word & PDF in separate folders) ──
  async function handleBatchExportAllStages(shiftChoice: ShiftType | 'both') {
    setIsBatchExporting(true);
    setBatchProgress({
      current: 0,
      total: GRADES_EN.length,
      grade: 'بدء الحزمة',
      statusText: isAr ? 'جاري تهيئة حزمة كافة المراحل...' : 'Initializing batch export...',
    });

    try {
      await exportAllStagesBatchZip(selectedWeekNumber, shiftChoice, (p) => {
        setBatchProgress(p);
      });
      showToast(
        isAr
          ? `🎉 تم تحميل حزمة كافة المراحل (${GRADES_EN.length} مرحلة) في ملف ZIP بنجاح، وكل مرحلة داخل مجلد منفصل يحتوي على Word و PDF!`
          : `🎉 All stages ZIP downloaded successfully with separate Word & PDF per stage folder!`,
        'success'
      );
    } catch (err) {
      console.error('Error batch exporting all stages:', err);
      showToast(isAr ? 'حدث خطأ أثناء تصدير حزمة المراحل' : 'Error exporting stages batch', 'error');
    } finally {
      setIsBatchExporting(false);
      setBatchProgress(null);
    }
  }

  // -------------------------------------------------------------
  // Readiness & Tracker Analytics
  // -------------------------------------------------------------
  const readinessStats = useMemo(() => {
    let totalFields = 0;
    let filledFields = 0;
    const missingSubjects = new Set<string>();

    for (const dayItem of gradeDays) {
      const day = dayItem.dayNumber;
      const subjects = docData.days[day] || [];
      subjects.forEach((sub) => {
        totalFields++;
        const isLocked = Boolean(
          docData.subjectStatuses?.[sub.subjectId]?.is_locked &&
          docData.subjectStatuses?.[sub.subjectId]?.status === 'submitted'
        );
        const isFilled = isLocked || sub.isNoSession || (sub.contentTopic && sub.contentTopic.trim().length > 0);
        if (isFilled) {
          filledFields++;
        } else {
          missingSubjects.add(sub.subjectName);
        }
      });
    }

    const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    return {
      percentage,
      filledFields,
      totalFields,
      missingSubjects: Array.from(missingSubjects),
      isReady: percentage >= 95,
    };
  }, [docData, gradeDays]);

  // -------------------------------------------------------------
  // Master View Actions: Presets & Automation
  // -------------------------------------------------------------
  function handleResetWithSample() {
    setConfirmModal({
      isOpen: true,
      title: isAr ? 'تحميل النموذج الرسمي المعتمد' : 'Load Official Approved Sample',
      message: isAr
        ? 'هل تريد استبدال البيانات الحالية بالنموذج الرسمي المعتمد المطابق لملف PDF؟ سيتم تعبئة جميع الأيام والمواد بنموذج مدرسة سهلة المعتمد.'
        : 'Replace current entries with the official approved template matching the PDF? All days and subjects will be populated with verified sample content.',
      confirmText: isAr ? 'نعم، حمّل النموذج' : 'Yes, Load Sample',
      confirmColor: 'emerald',
      onConfirm: () => {
        const sampleDoc = createOfficialSampleDocument(selectedGrade, selectedShift);
        sampleDoc.weekDateHeader = currentWeek.headerDate;
        sampleDoc.weekRangeText = currentWeek.rangeText;
        sampleDoc.term = currentWeek.term;
        sampleDoc.schoolYear = ACADEMIC_YEAR;
        saveWeeklyStatement(sampleDoc, selectedWeekNumber);
        setDocData(sampleDoc);
        setConfirmModal(null);
        showToast(isAr ? 'تم تحميل النموذج المعتمد بنجاح وحفظه' : 'Official sample loaded and saved', 'success');
      },
    });
  }

  function handleResetEmpty() {
    setConfirmModal({
      isOpen: true,
      title: isAr ? 'تفريغ وتصفير بيانات الأسبوع' : 'Reset All Week Data',
      message: isAr
        ? 'هل تريد تفريغ جميع خانات الدروس والواجبات لبدء إدخال أسبوع دراسي جديد؟ سيتم الحفاظ على التوزيع الذكي للحصص وجدول الكويزات.'
        : 'Clear all lesson topics and homework entries to start fresh for a new week?',
      confirmText: isAr ? 'نعم، تفريغ البيانات' : 'Yes, Reset Data',
      confirmColor: 'rose',
      onConfirm: () => {
        const emptyDoc = createEmptyDocument(selectedGrade, selectedShift);
        emptyDoc.weekDateHeader = currentWeek.headerDate;
        emptyDoc.weekRangeText = currentWeek.rangeText;
        emptyDoc.term = currentWeek.term;
        emptyDoc.schoolYear = ACADEMIC_YEAR;
        saveWeeklyStatement(emptyDoc, selectedWeekNumber);
        setDocData(emptyDoc);
        setConfirmModal(null);
        showToast(isAr ? 'تم تفريغ البيانات بنجاح لبدء أسبوع جديد' : 'Week data reset successfully', 'info');
      },
    });
  }

  function handleApplyTimetableAutomation() {
    const updatedDays: typeof docData.days = {};

    for (const dayItem of gradeDays) {
      const d = dayItem.dayNumber;
      updatedDays[d] = (docData.days[d] || []).map((item) => {
        const { hasSession, autoNote } = getTimetableSessionStatus(
          selectedShift,
          selectedGrade,
          d,
          item.subjectId,
          item.genderCohort,
          item.nativeCohort
        );

        if (!hasSession) {
          return {
            ...item,
            isNoSession: true,
            noSessionNote: autoNote,
            contentTopic: item.contentTopic ? item.contentTopic : autoNote,
          };
        }
        return item;
      });
    }

    const updatedDoc: WeeklyStatementDocument = {
      ...docData,
      days: updatedDays,
    };

    saveWeeklyStatement(updatedDoc, selectedWeekNumber);
    setDocData(updatedDoc);
    showToast(isAr ? 'تم تطبيق جدول الحصص وتعبئة "لا توجد حصة" تلقائياً' : 'Timetable rules applied successfully', 'success');
  }

  // Update specific subject in master grid
  function handleUpdateMasterSubject(day: number, subjectIndex: number, updates: Partial<WeeklySubjectDailyPlan>) {
    const currentDayPlans = [...(docData.days[day] || [])];
    const target = currentDayPlans[subjectIndex];
    if (!target) return;

    currentDayPlans[subjectIndex] = {
      ...target,
      ...updates,
    };

    const updatedDoc: WeeklyStatementDocument = {
      ...docData,
      days: {
        ...docData.days,
        [day]: currentDayPlans,
      },
    };

    saveWeeklyStatement(updatedDoc, selectedWeekNumber);
    setDocData(updatedDoc);
  }

  // -------------------------------------------------------------
  // Dedicated Shift-First Export Handlers
  // -------------------------------------------------------------
  function handleOpenExportModal(initialShift?: ShiftType) {
    if (initialShift) {
      setExportShiftChoice(initialShift);
    } else {
      setExportShiftChoice(selectedShift);
    }
    setIsExportModalOpen(true);
  }

  // Export to Word (.docx) for specified shift
  async function handleExportDocxForShift(targetShift: ShiftType) {
    try {
      setIsExportingDocx(true);
      const targetDoc = loadWeeklyStatement(selectedGrade, selectedWeekNumber, targetShift);
      const weekInfo = getAcademicWeekForGrade(selectedWeekNumber, selectedGrade);
      targetDoc.term = weekInfo.term;
      targetDoc.weekDateHeader = weekInfo.headerDate;
      targetDoc.weekRangeText = weekInfo.rangeText;
      await exportWeeklyStatementToDocx(targetDoc);
      showToast(
        isAr
          ? `تم تنزيل ملف Word (.docx) لفترة (${targetShift === 'us' ? 'أمريكا US' : 'الشرق الأوسط MENA'}) بنجاح!`
          : `Word document for ${targetShift === 'us' ? 'US Shift' : 'MENA Shift'} exported successfully!`,
        'success'
      );
    } catch (err) {
      console.error('Error exporting DOCX:', err);
      showToast(isAr ? 'حدث خطأ أثناء تصدير ملف Word' : 'Failed to export Word file', 'error');
    } finally {
      setIsExportingDocx(false);
    }
  }

  // Print / PDF via hidden iframe for specified shift
  function handleExportPdfForShift(targetShift: ShiftType) {
    const targetDoc = loadWeeklyStatement(selectedGrade, selectedWeekNumber, targetShift);
    const weekInfo = getAcademicWeekForGrade(selectedWeekNumber, selectedGrade);
    targetDoc.term = weekInfo.term;
    targetDoc.weekDateHeader = weekInfo.headerDate;
    targetDoc.weekRangeText = weekInfo.rangeText;
    const html = generateWeeklyStatementHtml(targetDoc);
    try {
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(printIframe);

      const frameDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Weekly Statement - ${targetDoc.grade} - ${targetDoc.shift === 'us' ? 'US Shift' : 'MENA Shift'} - ${targetDoc.weekRangeText}</title>
              <style>
                @page { size: A4 portrait; margin: 10mm; }
                body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 10px; color: #111; }
                @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
              </style>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `);
        frameDoc.close();

        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print exec error:', e);
          }
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 4000);
        }, 400);
      }
    } catch (err) {
      console.warn('Print error fallback:', err);
      showToast(isAr ? 'جاري فتح شاشة الطباعة...' : 'Opening print preview...', 'info');
      window.print();
    }
  }

  // Copy HTML for specified shift
  function handleCopyHtmlForShift(targetShift: ShiftType) {
    const targetDoc = loadWeeklyStatement(selectedGrade, selectedWeekNumber, targetShift);
    const weekInfo = getAcademicWeekForGrade(selectedWeekNumber, selectedGrade);
    targetDoc.term = weekInfo.term;
    targetDoc.weekDateHeader = weekInfo.headerDate;
    targetDoc.weekRangeText = weekInfo.rangeText;
    const html = generateWeeklyStatementHtml(targetDoc);
    navigator.clipboard.writeText(html).then(() => {
      showToast(isAr ? 'تم نسخ كود HTML التقرير للحافظة' : 'HTML template copied to clipboard', 'success');
    });
  }

  // Batch Export Both Shifts (Mena + US in separate files)
  async function handleExportBothShifts() {
    try {
      setIsExportingBoth(true);
      const weekInfo = getAcademicWeekForGrade(selectedWeekNumber, selectedGrade);

      // Download MENA Shift file
      const menaDoc = loadWeeklyStatement(selectedGrade, selectedWeekNumber, 'mena');
      menaDoc.term = weekInfo.term;
      menaDoc.weekDateHeader = weekInfo.headerDate;
      menaDoc.weekRangeText = weekInfo.rangeText;
      await exportWeeklyStatementToDocx(menaDoc);

      // Brief delay so browser handles downloads sequentially
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Download US Shift file
      const usDoc = loadWeeklyStatement(selectedGrade, selectedWeekNumber, 'us');
      usDoc.term = weekInfo.term;
      usDoc.weekDateHeader = weekInfo.headerDate;
      usDoc.weekRangeText = weekInfo.rangeText;
      await exportWeeklyStatementToDocx(usDoc);

      showToast(
        isAr
          ? 'تم تنزيل ملفين منفصلين بنجاح (ملف فترة الشرق الأوسط + ملف فترة أمريكا)!'
          : 'Both shifts downloaded successfully as separate files!',
        'success'
      );
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Error exporting both shifts:', err);
      showToast(isAr ? 'حدث خطأ أثناء تنزيل الملفين' : 'Error exporting both files', 'error');
    } finally {
      setIsExportingBoth(false);
    }
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ------------------------------------------------------------- */}
      {/* Main Studio Banner & Mode Switcher */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-800/40 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{ACADEMIC_YEAR}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {isAr ? 'التقرير الأسبوعي المعتمد' : 'Weekly Statement Studio'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {isAr ? 'مطابق 100% للنموذج الرسمي' : '100% Official Template'}
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <BookOpen className="w-7 h-7 text-teal-400 shrink-0" />
              <span>{isAr ? 'نظام إعداد وتوليد التقارير الأسبوعية' : 'Academic Weekly Statement Studio'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAr
                ? 'نظام ذكي متكامل للمعلمين: إدخال خطة الأسبوع فقط للأيام المقررة، مع تعبئة تلقائية لـ "لا توجد حصة" وفق جدول PrimeTimetable، وتصدير ملف Word و PDF منفصل لكل فترة بنقرة زر.'
                : 'Smart planning system for teachers: input lesson topics for teaching days only, auto No-Session prefilling via PrimeTimetable, and export separate Word (.docx) & PDF files for each shift.'}
            </p>
          </div>

          {/* Action Center: K-12 Export, View Switcher & Close Page */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Direct K to 12 Batch Export Button */}
            <button
              type="button"
              onClick={() => setIsBatchK12ModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 border border-emerald-400/30"
              title={isAr ? 'تصدير كامل المراحل من الروضة حتى الصف 12 في ملفات Word و PDF منفصلة داخل مجلد مضغوط' : 'Export all stages K-12 in Word & PDF into separate folders'}
            >
              <FolderArchive className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{isAr ? '📦 تصدير كافة المراحل (K to 12)' : '📦 Export K to 12 (All)'}</span>
            </button>

            {/* Direct Single Grade Export Modal Opener Button */}
            <button
              type="button"
              onClick={() => handleOpenExportModal()}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>{isAr ? 'تصدير التقرير' : 'Export'}</span>
            </button>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('teacher')}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl transition text-xs font-extrabold ${
                  viewMode === 'teacher'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <User className="w-3.5 h-3.5 text-teal-300" />
                <span>{isAr ? 'المعلم' : 'Teacher'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('master')}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl transition text-xs font-extrabold ${
                  viewMode === 'master'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-300" />
                <span>{isAr ? 'المرحلة' : 'Master'}</span>
              </button>
            </div>

            {/* Close Page Button (Return to Main Dashboard) */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-rose-600 text-white font-extrabold text-xs sm:text-sm border border-white/20 hover:border-rose-400 shadow-md transition-all transform hover:-translate-y-0.5"
                title={isAr ? 'إغلاق الصفحة والعودة للشاشة الرئيسية' : 'Close Studio & Return Home'}
              >
                <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                <span>{isAr ? 'إغلاق الصفحة' : 'Close'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Global Academic Week, Calendar & Shift Selector Strip */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        
        {/* Term Quick Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'التقويم الدراسي المعتمد 2026-2027:' : 'Official Academic Calendar:'}</span>
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSelectedTermFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${selectedTermFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {isAr ? 'جميع الأسابيع (38 أسبوع)' : 'All (38 Weeks)'}
            </button>
            <button
              onClick={() => setSelectedTermFilter('1')}
              className={`px-3 py-1 rounded-lg transition ${selectedTermFilter === '1' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {isAr ? 'الفصل 1 (أسابيع 1-14)' : 'Term 1'}
            </button>
            <button
              onClick={() => setSelectedTermFilter('2')}
              className={`px-3 py-1 rounded-lg transition ${selectedTermFilter === '2' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {isAr ? 'الفصل 2 (أسابيع 15-26)' : 'Term 2'}
            </button>
            <button
              onClick={() => setSelectedTermFilter('3')}
              className={`px-3 py-1 rounded-lg transition ${selectedTermFilter === '3' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {isAr ? 'الفصل 3 (أسابيع 27-38)' : 'Term 3'}
            </button>
          </div>
        </div>

        {/* Primary Selection Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          
          {/* Week Selector */}
          <div className="lg:col-span-5">
            <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'الأسبوع الدراسي بالتاريخ الصريح:' : 'Academic Week & Date Range:'}</span>
              </span>
              <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                Term {currentWeek.term}
              </span>
            </label>
            <select
              value={selectedWeekNumber}
              onChange={(e) => setSelectedWeekNumber(Number(e.target.value))}
              className="w-full rounded-xl border border-teal-300 bg-teal-50/40 py-2.5 px-3 text-xs sm:text-sm font-bold text-teal-950 focus:ring-2 focus:ring-teal-500 transition"
            >
              {filteredWeeks.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  {isAr ? w.labelAr : w.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Selector */}
          <div className="lg:col-span-2">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <School className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'الصف والمرحلة:' : 'Grade:'}</span>
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 transition"
            >
              {GRADES_EN.map((g) => {
                const label = g === 'Kindergarten'
                  ? (isAr ? 'مرحلة الروضة (Kindergarten)' : 'Kindergarten')
                  : (isAr ? `${g.replace('Grade ', 'الصف ')} (${g})` : g);
                return <option key={g} value={g}>{label}</option>;
              })}
            </select>
          </div>

          {/* Shift Selector */}
          <div className="lg:col-span-3">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'الفترة الزمنية الحالية:' : 'Shift:'}</span>
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value as ShiftType)}
              className="w-full rounded-xl border border-teal-300 bg-white py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 transition shadow-2xs"
            >
              <option value="mena">🇸🇦 فترة الشرق الأوسط (Mena Shift)</option>
              <option value="us">🇺🇸 فترة أمريكا (US Shift)</option>
            </select>
          </div>

          {/* Export & Status Widget */}
          <div className="lg:col-span-2 flex flex-col justify-end">
            <button
              onClick={() => handleOpenExportModal(selectedShift)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>{isAr ? 'تصدير الفترة' : 'Export Shift'}</span>
            </button>
          </div>
        </div>

        {/* Selected Week Header Display Banner */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>{isAr ? 'تاريخ ونطاق الأسبوع المعتمد في التقرير:' : 'Official Date in Statement:'}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 font-bold border border-teal-200/80">
              {currentWeek.labelAr}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
              Date: {currentWeek.headerDate}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
              Week of {currentWeek.rangeText}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isAr
                ? 'محفوظ تلقائياً في قاعدة البيانات - متاح لأي معلم يدخل على الصف والأسبوع'
                : 'Auto-saved in shared database across teachers'}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Missing Submissions Tracker (لوحة متابعة النواقص والاعتمادات) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all">
        {/* Banner Header Strip */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-teal-50/40 to-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              missingTracker.missingList.length === 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {missingTracker.missingList.length === 0 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  {isAr ? 'لوحة متابعة نواقص التقرير الأسبوعي' : 'Missing Submissions Tracker'}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                  {selectedGrade}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {selectedShift === 'us' ? 'فترة أمريكا US' : 'فترة الشرق الأوسط MENA'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? `متابعة حالة تسليم المعلمين لمواد الصف للأسبوع (${currentWeek.headerDate}) قبل التصدير النهائي`
                  : `Tracker for teacher weekly submissions before final export`}
              </p>
            </div>
          </div>

          {/* Quick Stats & Toggle */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Completion percentage badge */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-600">
                {isAr ? 'نسبة الاكتمال:' : 'Completion:'}
              </span>
              <span className={`text-sm font-black ${
                missingTracker.completionPercentage === 100
                  ? 'text-emerald-600'
                  : missingTracker.completionPercentage >= 50
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}>
                {missingTracker.completionPercentage}%
              </span>
              <span className="text-xs text-slate-400">
                ({missingTracker.completedCount}/{missingTracker.totalExpected})
              </span>
            </div>

            {/* Toggle button */}
            <button
              type="button"
              onClick={() => setIsTrackerOpen(!isTrackerOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs transition"
            >
              <span>{isTrackerOpen ? (isAr ? 'إخفاء التفاصيل' : 'Hide Details') : (isAr ? 'عرض المعلمين المتبقين' : 'Show Pending')}</span>
              {missingTracker.missingList.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {missingTracker.missingList.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Details Area */}
        {isTrackerOpen && (
          <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50">
            {missingTracker.missingList.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold">
                    {isAr
                      ? `ممتاز! جميع المعلمين المقيدين بجدول حصص صف (${selectedGrade}) أكملوا إدخال خطتهم لهذا الأسبوع. التقرير مكتمل 100% وجاهز للتصدير المعتمد.`
                      : `All teachers for ${selectedGrade} have submitted their weekly statements! Ready for final export.`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      {isAr
                        ? `قائمة المعلمين والمواد التي لم تُسجل بياناتها بعد (${missingTracker.missingList.length} معلمين/مواد):`
                        : `Teachers & subjects with pending content (${missingTracker.missingList.length}):`}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyMissingReminder}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 font-bold transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isAr ? 'نسخ كليشة تذكير للمعلمين' : 'Copy Reminder Message'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {missingTracker.missingList.map((item, mIdx) => {
                    const daysLabels = item.missingDays
                      .map((d) => gradeDays.find((gd) => gd.dayNumber === d)?.nameAr || `Day ${d}`)
                      .join('، ');

                    return (
                      <div
                        key={mIdx}
                        className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs hover:border-amber-300 transition space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">
                              {item.teacherName}
                            </div>
                            <div className="font-bold text-teal-700 text-xs">
                              {item.subjectName}
                              {item.cohort !== 'joint' && ` (${item.cohort})`}
                              {item.nativeCohort !== 'both' && ` [${item.nativeCohort}]`}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] shrink-0">
                            {isAr ? 'غير مكتمل' : 'Pending'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 bg-amber-50/70 p-2 rounded-lg border border-amber-100">
                          <span className="font-bold text-amber-900 block mb-0.5">
                            {isAr ? 'الأيام المتبقية المطلوب إدخالها:' : 'Pending teaching days:'}
                          </span>
                          <span>{daysLabels}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGrade(item.grade);
                            setSelectedSubjectId(item.subjectId);
                            setSelectedCohort(item.cohort);
                            setSelectedNativeCohort(item.nativeCohort);
                            setSelectedTeacherName(item.teacherName);
                            setViewMode('teacher');
                            showToast(
                              isAr
                                ? `تم الانتقال لمادة (${item.subjectName}) للأستاذ/ة ${item.teacherName}`
                                : `Switched to ${item.teacherName} - ${item.subjectName}`,
                              'info'
                            );
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isAr ? 'الانتقال وتعبئة المحتوى ✍️' : 'Fill Content Now'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: Teacher Direct Entry Portal */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'teacher' && (
        <div className="space-y-6">

          {/* Teacher Subject and Cohort Parameters Card */}
          <div className="bg-gradient-to-r from-teal-50 via-slate-50 to-blue-50 rounded-2xl border border-teal-200 p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-700" />
                <h2 className="text-base font-extrabold text-slate-900">
                  {isAr ? 'اختيار المادة والشعبة الدراسية:' : 'Subject & Student Cohort:'}
                </h2>
                <span className="text-xs text-teal-800 font-bold bg-teal-100 px-2.5 py-0.5 rounded-full">
                  {isAr ? 'تعبئة أيام الحصص فقط تلقائياً' : 'Automated Teaching Days'}
                </span>
              </div>

              {/* PrimeTimetable Direct Link Button */}
              <a
                href={selectedShift === 'us' ? PRIMETIMETABLE_LINKS.us : PRIMETIMETABLE_LINKS.mena}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? `عرض جدول حصص ${selectedShift === 'us' ? 'فترة أمريكا' : 'فترة الشرق الأوسط'} (PrimeTimetable)` : 'View Timetable'}</span>
              </a>
            </div>

            {/* Quick Teacher Name Lookup (Optional - Auto links Grade, Subject & Cohort) */}
            <div className="mb-4 p-3 rounded-xl bg-white border border-teal-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600 shrink-0" />
                  <label className="text-xs font-bold text-slate-800">
                    {isAr
                      ? 'التعيين التلقائي بواسطة اسم المعلم (اختياري للربط السريع بالجدول):'
                      : 'Quick Lookup by Teacher Name (Optional):'}
                  </label>
                </div>
                <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                  <select
                    value={selectedTeacherName}
                    onChange={(e) => handleSelectTeacherName(e.target.value)}
                    className="w-full rounded-xl border border-teal-300 py-2 px-3 text-xs font-bold text-teal-950 bg-teal-50/40 focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  >
                    <option value="">
                      {isAr ? '-- تعيين يدوي مباشر (بدون تحديد اسم معلم) --' : '-- Direct manual selection (No teacher) --'}
                    </option>
                    {shiftTeachers.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {selectedTeacherName && (
                    <button
                      type="button"
                      onClick={() => handleSelectTeacherName('')}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition shrink-0"
                      title={isAr ? 'إلغاء التحديد' : 'Clear selection'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick switch between assigned classes if teacher is selected */}
              {selectedTeacherName && teacherAssignments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">
                    {isAr ? 'حصصك المسندة بالجدول:' : 'Your assigned classes:'}
                  </span>
                  {teacherAssignments.map((assignment, aIdx) => {
                    const isCurrent =
                      assignment.grade.toLowerCase().replace(/\s+/g, '') === selectedGrade.toLowerCase().replace(/\s+/g, '') &&
                      assignment.subjectId === selectedSubjectId;
                    return (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() => handleSelectTeacherAssignment(assignment)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                          isCurrent
                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:text-teal-900'
                        }`}
                      >
                        {assignment.grade} - {isAr ? assignment.subjectNameAr : assignment.subjectNameEn} ({assignment.cohort})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Subject */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isAr ? '1. المادة الدراسية (Subject):' : '1. Subject:'}
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 shadow-2xs"
                >
                  {STANDARD_SUBJECTS.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {isAr ? `${sub.nameAr} (${sub.nameEn})` : `${sub.nameEn} - ${sub.nameAr}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender Cohort (بنين / بنات / مشترك) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isAr ? '2. نوع الطلاب والشعبة (Cohort):' : '2. Gender Cohort:'}
                </label>
                <select
                  value={selectedCohort}
                  onChange={(e) => setSelectedCohort(e.target.value as GenderCohort)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 shadow-2xs"
                >
                  <option value="joint">كلاهما المشترك (Joint / All - لا يكتب تصنيف في الجدول)</option>
                  <option value="boys">بنين فقط (Boys)</option>
                  <option value="girls">بنات فقط (Girls)</option>
                </select>
              </div>

              {/* Native / Non-Native for Arabic & Islamic & Quran OR Shift Confirmation */}
              {isArabicSub ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isAr ? '3. المسار (ناطقين / غير ناطقين):' : '3. Track (Native / NN):'}
                  </label>
                  <select
                    value={selectedNativeCohort}
                    onChange={(e) => setSelectedNativeCohort(e.target.value as NativeCohort)}
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  >
                    <option value="both">كلاهما (ناطقين وغير ناطقين)</option>
                    <option value="native">للناطقين فقط (Native)</option>
                    <option value="non-native">لغير الناطقين (Non-Native)</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col justify-end">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[11px] block">{isAr ? 'جدول الحصص المعتمد:' : 'Active Shift Matrix:'}</span>
                      <span className="font-extrabold text-slate-900">
                        {selectedShift === 'us' ? '🇺🇸 فترة أمريكا (US Shift)' : '🇸🇦 فترة الشرق الأوسط (Mena Shift)'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      {isAr ? 'متطابق تلقائياً' : 'Synced'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Smart Summary Banner */}
            <div className="mt-4 p-3 bg-white rounded-xl border border-teal-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-teal-900 font-semibold">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  {isAr
                    ? `قام النظام بتهيئة جدول مادة (${currentSubjectDef.nameAr}) لصف (${selectedGrade}) لفترة (${selectedShift === 'us' ? 'أمريكا' : 'الشرق الأوسط'}) تلقائياً: الأيام التي ليس بها حصص تظهر مقفلة ومملوءة بـ "لا توجد حصة" ولا تتطلب أي تدخل.`
                    : `Schedule for ${currentSubjectDef.nameEn} (${selectedGrade} - ${selectedShift.toUpperCase()}) is mapped: Non-teaching days are locked with "No Session".`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800">
                  {saveStatus === 'saving' ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? '✅ محفوظ تلقائياً' : '✅ Auto-Saved')}
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* Audit Log & Lock on Submit Control Bar (نظام التأكيد والإغلاق) */}
          {/* ------------------------------------------------------------- */}
          <div className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-xs ${
            isSubjectLocked
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border-emerald-400 ring-2 ring-emerald-300/40'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Status information */}
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isSubjectLocked ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isSubjectLocked ? <Lock className="w-5 h-5" /> : <Edit3 className="w-5 h-5 text-teal-600" />}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm sm:text-base text-slate-900">
                      {isAr ? `حالة تقرير (${currentSubjectDef.nameAr}):` : `Status for ${currentSubjectDef.nameEn}:`}
                    </span>
                    {isSubjectLocked ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-xs shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isAr ? '🔒 معتمد ومقفل نهائياً (Completed & Locked)' : 'Locked & Submitted'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isAr ? '📝 مسودة قيد التعديل (Draft - Editable)' : 'Draft - Editable'}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-1">
                    {isSubjectLocked
                      ? (isAr
                          ? `تم اعتماد وقفل التقرير بواسطة (${subjectStatus.submitted_by || selectedTeacherName || 'المعلم'}) بتاريخ ${formatAuditTime(subjectStatus.locked_at)}. الحقول أدناه في وضع القراءة فقط لحماية البيانات.`
                          : `Locked by ${subjectStatus.submitted_by || 'Teacher'} on ${formatAuditTime(subjectStatus.locked_at)}. Inputs are in Read-Only mode.`)
                      : (isAr
                          ? (subjectStatus.unlock_reason
                              ? `⚠️ تم فك القفل مسبقاً لإجراء تعديل: "${subjectStatus.unlock_reason}". اضغط "اعتماد وحفظ نهائي" بعد الانتهاء.`
                              : 'يمكنك تعديل محتوى الحصص والواجبات، وعند الانتهاء اضغط "اعتماد وحفظ نهائي" لقفل التقرير وتوثيقه في Supabase.')
                          : 'Fill in session topics and click "Submit & Lock" to finalize.')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {isSubjectLocked ? (
                  /* When Locked: show Unlock Request Button */
                  <button
                    type="button"
                    onClick={handleOpenUnlockModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition"
                  >
                    <Unlock className="w-4 h-4 text-slate-950" />
                    <span>{isAr ? 'طلب تعديل / فتح القفل' : 'Request Unlock'}</span>
                  </button>
                ) : (
                  /* When Draft: show Submit & Lock Button */
                  <button
                    type="button"
                    onClick={handleSubmitAndLock}
                    disabled={isSubmittingLock}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-md transition disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4 text-emerald-200" />
                    <span>{isSubmittingLock ? (isAr ? 'جاري الاعتماد...' : 'Locking...') : (isAr ? 'اعتماد وحفظ نهائي (Submit & Lock)' : 'Submit & Lock')}</span>
                  </button>
                )}

                {/* Audit Log Viewer Button */}
                <button
                  type="button"
                  onClick={() => handleOpenAuditModal(selectedSubjectId)}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition"
                >
                  <History className="w-4 h-4 text-teal-700" />
                  <span>{isAr ? 'سجل التدقيق (Audit Log)' : 'Audit History'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Teacher Day-by-Day Cards (Day 1 to Day 5) */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <span>
                  {isAr
                    ? `توزيع خطة الأسبوع لمادة (${currentSubjectDef.nameAr}) - (${gradeDays.length} أيام: ${isElementaryOrMiddle ? 'الإثنين إلى الخميس' : 'الأحد إلى الخميس'}):`
                    : `Weekly Plan for ${currentSubjectDef.nameEn} (${gradeDays.length} Days: ${isElementaryOrMiddle ? 'Mon - Thu' : 'Sun - Thu'}):`}
                </span>
              </h3>
              <span className="text-xs font-bold text-teal-800 bg-teal-100/70 px-3 py-1 rounded-lg">
                {isElementaryOrMiddle
                  ? (isAr ? 'مرحلة رياض الأطفال حتى 8: 4 أيام دراسية فقط' : 'KG to Grade 8: 4 Days Only (Mon-Thu)')
                  : (isAr ? 'مرحلة ثانوية (9-12): 5 أيام دراسية' : 'High School (9-12): 5 Days (Sun-Thu)')}
              </span>
            </div>

            {gradeDays.map((dayItem) => {
              const dayNum = dayItem.dayNumber;
              const dayPlan = teacherDaysPlan[dayNum] || {
                id: `day${dayNum}-${selectedSubjectId}`,
                day: dayNum,
                subjectId: selectedSubjectId,
                subjectName: isArabicSub ? currentSubjectDef.nameAr : currentSubjectDef.nameEn,
                genderCohort: selectedCohort,
                nativeCohort: selectedNativeCohort,
                isNoSession: false,
                contentTopic: '',
                homework: '',
                optionalEnrichment: '',
              };
              const { autoNote } = getTimetableSessionStatus(
                selectedShift,
                selectedGrade,
                dayNum,
                selectedSubjectId,
                selectedCohort,
                selectedNativeCohort
              );

              return (
                <div
                  key={dayNum}
                  className={`rounded-2xl border transition-all duration-200 ${
                    dayPlan.isNoSession
                      ? 'bg-slate-50/90 border-slate-200 p-4'
                      : isSubjectLocked
                      ? 'bg-emerald-50/30 border-emerald-300 shadow-xs p-5'
                      : 'bg-white border-teal-200 shadow-sm hover:border-teal-400 p-5'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center ${
                        dayPlan.isNoSession ? 'bg-slate-200 text-slate-600' : isSubjectLocked ? 'bg-emerald-600 text-white' : 'bg-teal-600 text-white'
                      }`}>
                        {dayNum}
                      </span>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{isAr ? `اليوم ${dayNum}: ${dayItem.nameAr}` : `Day ${dayNum}: ${dayItem.nameEn}`}</span>
                          <span className="text-xs text-slate-500 font-semibold">({dayItem.shortEn})</span>
                          {isSubjectLocked && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>{isAr ? 'مقفل وضع القراءة فقط' : 'Read-only'}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {currentSubjectDef.nameEn} - {currentSubjectDef.nameAr}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {dayPlan.isNoSession ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 bg-slate-200/80 px-3 py-1 rounded-full">
                            🚫 {isAr ? 'لا توجد حصة (تعبئة تلقائية وفق الجدول)' : 'No Session (Auto Timetable)'}
                          </span>
                          {!isSubjectLocked && (
                            <button
                              type="button"
                              onClick={() => handleToggleTeacherNoSession(dayNum)}
                              className="text-xs text-teal-700 hover:text-teal-900 font-bold underline px-2 py-1"
                            >
                              {isAr ? 'تعديل استثنائي' : 'Manual Override'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                            📌 {isAr ? 'حصة مقررة بالجدول (يجب إدخال المحتوى والدرس)' : 'Teaching Day (Fill Content)'}
                          </span>
                          {!isSubjectLocked && (
                            <button
                              type="button"
                              onClick={() => handleToggleTeacherNoSession(dayNum)}
                              className="text-xs text-slate-400 hover:text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 transition"
                            >
                              {isAr ? 'تعيين: لا توجد حصة' : 'Mark as No Session'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* If No Session, show clean muted summary */}
                  {dayPlan.isNoSession ? (
                    <div className="mt-3 text-xs text-slate-600 flex items-center gap-2 bg-slate-100/70 p-3 rounded-xl border border-slate-200">
                      <Info className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {isAr ? 'العبارة المعتمدة في التقرير:' : 'Note in statement:'}{' '}
                        <strong className="text-slate-800 font-mono font-bold">"{dayPlan.contentTopic || autoNote || 'No Session'}"</strong>
                      </span>
                    </div>
                  ) : (
                    /* Active Session Input Fields */
                    <div className="mt-4 space-y-4">
                      
                      {/* Content / Topic */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                            <span>{isAr ? 'المحتوى والدرس (Content / Topic):' : 'Content / Topic:'}</span>
                          </label>

                          {/* Quick Insert Snippet Buttons (Only active when not locked) */}
                          {!isSubjectLocked && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setZoomModalDay(dayNum);
                                  setZoomModalInput(dayPlan.zoomUrl || '');
                                }}
                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition"
                              >
                                + {isAr ? 'رابط زووم' : 'Zoom Link'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = dayPlan.contentTopic || '';
                                  const prefix = isArabicSub ? 'حصة مسجلة عبر المنصة.\n' : 'Recorded Session:\n';
                                  handleTeacherDayChange(dayNum, { contentTopic: prefix + current });
                                }}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                              >
                                + {isAr ? 'حصة مسجلة' : 'Recorded'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = dayPlan.contentTopic || '';
                                  const note = `Girls: \nBoys: `;
                                  handleTeacherDayChange(dayNum, { contentTopic: current ? `${current}\n${note}` : note });
                                }}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                              >
                                + {isAr ? 'بنين / بنات' : 'Boys/Girls'}
                              </button>
                            </div>
                          )}
                        </div>

                        <textarea
                          rows={3}
                          value={dayPlan.contentTopic || ''}
                          disabled={isSubjectLocked}
                          onChange={(e) => handleTeacherDayChange(dayNum, { contentTopic: e.target.value })}
                          dir={isArabicSub ? 'rtl' : 'ltr'}
                          placeholder={
                            isArabicSub
                              ? 'مثال: اللغة العربية للناطقين: درس الصدق منجاة.\nغير الناطقين: عائلتي ومجتمعي.'
                              : 'e.g. Unit 2: Energy & Motion - Lesson 1: Circular Motion'
                          }
                          className={`w-full rounded-xl border p-3 text-xs sm:text-sm font-medium shadow-2xs font-sans leading-relaxed ${
                            isSubjectLocked
                              ? 'bg-slate-100/90 text-slate-700 cursor-not-allowed border-slate-300'
                              : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-teal-500'
                          }`}
                        />
                      </div>

                      {/* Homework & Enrichment Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Homework */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700">
                              {isAr ? 'الواجب المنزلي (Homework):' : 'Homework:'}
                            </label>
                            {!isSubjectLocked && (
                              <button
                                type="button"
                                onClick={() => handleTeacherDayChange(dayNum, { homework: isArabicSub ? 'لا يوجد واجب' : 'No HW' })}
                                className="text-[11px] text-teal-700 hover:underline font-medium"
                              >
                                {isAr ? '+ لا يوجد واجب' : '+ No HW'}
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={2}
                            value={dayPlan.homework || ''}
                            disabled={isSubjectLocked}
                            onChange={(e) => handleTeacherDayChange(dayNum, { homework: e.target.value })}
                            dir={isArabicSub ? 'rtl' : 'ltr'}
                            placeholder={isAr ? 'مثال: حل تدريبات ص 18 بالكتاب المدرسي' : 'e.g. Solve CW Booklet p.17+18'}
                            className={`w-full rounded-xl border p-2.5 text-xs shadow-2xs ${
                              isSubjectLocked
                                ? 'bg-slate-100/90 text-slate-700 cursor-not-allowed border-slate-300'
                                : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-teal-500'
                            }`}
                          />
                        </div>

                        {/* Optional / Enrichment */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700">
                              {isAr ? 'الإثراء / اختياري (Optional / Enrichment):' : 'Optional / Enrichment:'}
                            </label>
                            {!isSubjectLocked && (
                              <button
                                type="button"
                                onClick={() => handleTeacherDayChange(dayNum, { optionalEnrichment: 'Optional Quiz on LMS' })}
                                className="text-[11px] text-teal-700 hover:underline font-medium"
                              >
                                + Optional Quiz
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={2}
                            value={dayPlan.optionalEnrichment || ''}
                            disabled={isSubjectLocked}
                            onChange={(e) => handleTeacherDayChange(dayNum, { optionalEnrichment: e.target.value })}
                            dir={isArabicSub ? 'rtl' : 'ltr'}
                            placeholder={isAr ? 'مثال: كويز إثرائي اختياري عبر المنصة' : 'e.g. Reading Booklet p.31-32 + Optional Quiz'}
                            className={`w-full rounded-xl border p-2.5 text-xs shadow-2xs ${
                              isSubjectLocked
                                ? 'bg-slate-100/90 text-slate-700 cursor-not-allowed border-slate-300'
                                : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-teal-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Zoom Link Quick Display */}
                      {dayPlan.zoomUrl && (
                        <div className="flex items-center justify-between bg-blue-50/70 p-2 rounded-xl border border-blue-200 text-xs text-blue-900">
                          <div className="flex items-center gap-2 truncate">
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-semibold">{isAr ? 'رابط الحصة:' : 'Zoom:'}</span>
                            <span className="font-mono text-[11px] truncate">{dayPlan.zoomUrl}</span>
                          </div>
                          {!isSubjectLocked && (
                            <button
                              type="button"
                              onClick={() => handleTeacherDayChange(dayNum, { zoomUrl: '' })}
                              className="text-blue-500 hover:text-rose-600 font-bold px-2 py-0.5"
                            >
                              {isAr ? 'إزالة' : 'Remove'}
                            </button>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Teacher Subject Quizzes Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <span>{isAr ? `كويزات واختبارات الأسبوع لمادة (${currentSubjectDef.nameAr}):` : `Weekly Quizzes for ${currentSubjectDef.nameEn}:`}</span>
                  {isSubjectLocked && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{isAr ? 'مقفل' : 'Locked'}</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr ? 'تظهر هذه الكويزات في جدول الاختبارات الأسبوعية بأسفل تقرير المرحلة' : 'Scheduled quizzes show up in the weekly quiz table at bottom'}
                </p>
              </div>
            </div>

            {/* List of quizzes for this subject */}
            {subjectQuizzes.length > 0 ? (
              <div className="space-y-2 mb-4">
                {subjectQuizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                          {quiz.date}
                        </span>
                        <span className="font-extrabold text-slate-800">{quiz.subject}</span>
                      </div>
                      <div className="font-semibold text-slate-700">{quiz.topics}</div>
                      {quiz.materials && <div className="text-slate-500 text-[11px]">{quiz.materials}</div>}
                    </div>
                    {!isSubjectLocked && (
                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title={isAr ? 'حذف الكويز' : 'Delete Quiz'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl mb-4">
                {isAr ? 'لا توجد كويزات مجدولة لهذه المادة في هذا الأسبوع.' : 'No quizzes scheduled for this subject this week.'}
              </div>
            )}

            {/* Add Quiz Form (Only enabled when not locked) */}
            {!isSubjectLocked ? (
              <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isAr ? 'تاريخ الاختبار (Date):' : 'Date:'}
                  </label>
                  <input
                    type="text"
                    value={newQuizDate}
                    onChange={(e) => setNewQuizDate(e.target.value)}
                    placeholder="e.g. 22/10/2026"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 bg-white"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isAr ? 'موضوع ومحتوى الكويز (Topics to cover):' : 'Topics to cover:'}
                  </label>
                  <input
                    type="text"
                    value={newQuizTopics}
                    onChange={(e) => setNewQuizTopics(e.target.value)}
                    placeholder={isAr ? 'مثال: الحديث الضعيف وأقسامه' : 'e.g. Lesson 1 Quiz on Linear Inequalities'}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-medium text-slate-900 bg-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddTeacherQuiz}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isAr ? 'إضافة كويز' : 'Add Quiz'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{isAr ? 'جدول الكويزات معتمد ومقفل مع تقرير المادة. لإضافة أو حذف كويز، يرجى طلب فك القفل أولاً.' : 'Quiz table is locked. Request unlock to add or edit quizzes.'}</span>
              </div>
            )}
          </div>


          {/* Quick Action Navigation Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700">
                {isAr
                  ? `تم حفظ خطة (${currentSubjectDef.nameAr}) في تقرير ${selectedGrade} - ${selectedShift === 'us' ? 'فترة أمريكا' : 'فترة الشرق الأوسط'}`
                  : `Plan saved to ${selectedGrade} statement (${selectedShift.toUpperCase()})`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenResetWeekModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition"
                title={isAr ? 'تفريغ محتوى الأسبوع بالكامل (محمي برقم سري إداري)' : 'Reset All Week Content (PIN Protected)'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isAr ? 'تفريغ محتوى الأسبوع' : 'Reset Week'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenExportModal(selectedShift)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm"
              >
                <Download className="w-4 h-4 text-teal-400" />
                <span>{isAr ? 'تصدير التقرير المعتمد' : 'Export Statement'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('master')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition"
              >
                <span>{isAr ? 'معاينة التقرير المجمع للمرحلة (Master)' : 'View Master Grade Statement'}</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: Master Grade Statement & Supervision Tracker */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'master' && (
        <div className="space-y-6">

          {/* Readiness Tracker Dashboard */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Progress Percentage */}
              <div className="space-y-2 lg:max-w-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {isAr ? 'نسبة اكتمال التقرير للمرحلة:' : 'Weekly Statement Readiness:'}
                  </span>
                  <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
                    readinessStats.percentage >= 90
                      ? 'bg-emerald-100 text-emerald-800'
                      : readinessStats.percentage >= 60
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {readinessStats.percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      readinessStats.percentage >= 90
                        ? 'bg-emerald-500'
                        : readinessStats.percentage >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${readinessStats.percentage}%` }}
                  />
                </div>

                <div className="text-xs text-slate-500">
                  {readinessStats.filledFields} {isAr ? 'من أصل' : 'of'} {readinessStats.totalFields} {isAr ? 'خانة مادة مكتملة' : 'subject slots completed'}
                </div>
              </div>

              {/* Missing Submissions Alert */}
              <div className="flex-1 lg:max-w-md">
                {readinessStats.missingSubjects.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{isAr ? 'تنبيه: مواد لم تكتمل بياناتها بعد:' : 'Pending / Missing Submissions:'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {readinessStats.missingSubjects.map((sub, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900 font-semibold text-[11px]">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center gap-2 text-emerald-900 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{isAr ? 'رائع! التقرير الأسبوعي مكتمل وجاهز بنسبة 100% للتصدير والإرسال.' : 'Complete! Statement is 100% ready for export.'}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions for Supervisors */}
              <div className="flex flex-wrap lg:flex-col gap-2">
                <button
                  type="button"
                  onClick={handleApplyTimetableAutomation}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs transition"
                  title={isAr ? 'ملء أيام الحصص الخالية بـ "لا توجد حصة" آلياً' : 'Auto Fill Empty Sessions'}
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'تعبئة الجداول آلياً' : 'Auto-Fill Sessions'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenExportModal(selectedShift)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تصدير التقرير الأسبوعي' : 'Export Statement'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBatchK12ModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-800 hover:from-emerald-700 hover:to-teal-900 text-white font-black text-xs transition shadow-sm"
                  title={isAr ? 'تحميل مجلد ZIP يحتوي كل المراحل منفصلة Word & PDF' : 'Download All Stages ZIP'}
                >
                  <FolderArchive className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isAr ? '📦 تصدير كافة المراحل (K to 12)' : '📦 Export K-12 (All)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenResetWeekModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition"
                  title={isAr ? 'تفريغ محتوى الأسبوع لكافة المواد (محمي برقم سري إداري)' : 'Empty All Subjects Content (PIN Protected)'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isAr ? 'تفريغ محتوى الأسبوع' : 'Empty Week (PIN)'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* Master Stage Overview: Subject Approval & Lock Status Board */}
          {/* تتحول خانة المادة فوراً إلى اللون الأخضر عند اعتمادها وقفلها */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <span>{isAr ? `لوحة اعتماد ومتابعة مواد (${selectedGrade}) - (${selectedShift === 'us' ? 'فترة أمريكا' : 'فترة الشرق الأوسط'}):` : `Subject Approval & Lock Board (${selectedGrade}):`}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'المواد المعتمدة والمقفلة تتحول فوراً للون الأخضر الكامل مع توثيق هوية وتاريخ المعلم المعتمد'
                    : 'Approved and locked subjects immediately turn green with submitter and audit timestamp'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  {isAr ? 'حالة المزامنة السحابية:' : 'Cloud Status:'}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  isSupabaseConfigured()
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  <Database className="w-3.5 h-3.5" />
                  <span>{isSupabaseConfigured() ? 'Supabase متصل' : 'تخزين محلي موثق'}</span>
                </span>
              </div>
            </div>

            {/* Grid of subjects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {STANDARD_SUBJECTS.map((sub) => {
                const status = docData.subjectStatuses?.[sub.id] || gradeSubjectStatuses[sub.id];
                const isLocked = Boolean(status?.is_locked && status?.status === 'submitted');
                
                // Find teacher for this subject in this grade
                const assigned = getExpectedTeachersForGrade(selectedShift, selectedGrade).find(
                  (a) => a.subjectId === sub.id
                );

                return (
                  <div
                    key={sub.id}
                    className={`rounded-2xl p-4 border transition-all duration-300 space-y-3 relative overflow-hidden ${
                      isLocked
                        ? 'bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-100/40 border-2 border-emerald-500 shadow-sm ring-2 ring-emerald-400/20'
                        : 'bg-slate-50/90 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {isAr ? sub.nameAr : sub.nameEn}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {isAr ? sub.nameEn : sub.nameAr}
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black text-[11px] shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                          <span>{isAr ? 'مكتمل ومعتمد' : 'Locked'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{isAr ? 'قيد الإعداد' : 'Draft'}</span>
                        </span>
                      )}
                    </div>

                    {/* Teacher / Submitter info */}
                    <div className="text-xs space-y-1 bg-white/70 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500 text-[11px]">{isAr ? 'المعلم المقرر:' : 'Teacher:'}</span>
                        <span className="font-bold text-slate-900 truncate max-w-[140px]">
                          {assigned?.teacherName || (status?.submitted_by || 'غير محدد')}
                        </span>
                      </div>

                      {isLocked && status?.locked_at && (
                        <div className="flex items-center justify-between text-emerald-800 text-[11px] pt-1 border-t border-emerald-100">
                          <span>{isAr ? 'تاريخ الاعتماد:' : 'Locked at:'}</span>
                          <span className="font-mono font-semibold">{formatAuditTime(status.locked_at)}</span>
                        </div>
                      )}

                      {!isLocked && status?.unlock_reason && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                          <span>{isAr ? 'سبب الفتح للتعديل: ' : 'Unlocked: '}</span>
                          <span className="font-medium">{status.unlock_reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {isLocked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenAuditModal(sub.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-[11px] transition shadow-2xs"
                            title={isAr ? 'سجل التدقيق' : 'Audit Log'}
                          >
                            <History className="w-3 h-3 text-emerald-700" />
                            <span>{isAr ? 'سجل التدقيق' : 'Audit'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMasterRequestUnlock(sub.id)}
                            className="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] transition shadow-2xs"
                            title={isAr ? 'طلب تعديل / فتح القفل' : 'Unlock for edit'}
                          >
                            <Unlock className="w-3 h-3" />
                            <span>{isAr ? 'فتح القفل' : 'Unlock'}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubjectId(sub.id);
                              setViewMode('teacher');
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] transition"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{isAr ? 'تعبئة المحتوى' : 'Edit Plan'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMasterQuickLockSubject(sub.id, isAr ? sub.nameAr : sub.nameEn)}
                            className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                            title={isAr ? 'اعتماد وقفل نهائي' : 'Quick Lock'}
                          >
                            <Lock className="w-3 h-3" />
                            <span>{isAr ? 'اعتماد' : 'Lock'}</span>
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Master View Sub-tabs: Official Preview vs Direct Editor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveMasterTab('preview')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition ${
                    activeMasterTab === 'preview'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'معاينة النموذج الرسمي المعتمد' : 'Official Template Preview'}</span>
                </button>

                <button
                  onClick={() => setActiveMasterTab('editor')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition ${
                    activeMasterTab === 'editor'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isAr ? 'محرر الجدول الشامل' : 'Grid Editor'}</span>
                </button>

                <button
                  onClick={() => setActiveMasterTab('quizzes')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition ${
                    activeMasterTab === 'quizzes'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isAr ? `كويزات المرحلة (${docData.quizzes?.length || 0})` : `Quizzes (${docData.quizzes?.length || 0})`}</span>
                </button>
              </div>

              {/* Master Header Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleOpenExportModal(selectedShift)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition"
                >
                  <Download className="w-4 h-4 text-blue-200" />
                  <span>{isAr ? 'خيارات التصدير (Word & PDF)' : 'Export Options'}</span>
                </button>
                <button
                  onClick={() => handleResetWithSample()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  title={isAr ? 'استرجاع النموذج المعتمد' : 'Load Approved Sample'}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isAr ? 'النموذج المعتمد' : 'Load Sample'}</span>
                </button>
                <button
                  onClick={() => handleResetEmpty()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-700 font-bold text-xs transition"
                  title={isAr ? 'تفريغ بيانات الأسبوع' : 'Reset Week Data'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isAr ? 'تفريغ الأسبوع' : 'Reset Week'}</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: Official In-App Preview (Exact Replica of School Template) */}
            {activeMasterTab === 'preview' && (
              <div className="space-y-4">
                
                {/* Visual Header of Statement */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                  
                  {/* Sahlah Brand Title */}
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-black text-slate-900 tracking-wider">SAHLAH</h2>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Academic Projection</div>
                  </div>

                  {/* Metadata line */}
                  <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-bold text-slate-900 pb-3 mb-4 border-b border-slate-300 gap-2">
                    <span>Date: {docData.weekDateHeader}</span>
                    <span>Term: {docData.term}</span>
                    <span className="px-2.5 py-0.5 rounded bg-teal-100 text-teal-900 font-bold">
                      Shift: {docData.shift === 'us' ? 'US Shift' : 'MENA Shift'}
                    </span>
                    <span>{docData.schoolYear}</span>
                  </div>

                  {/* Salutation */}
                  <div className="text-xs sm:text-sm font-bold text-slate-900 mb-4 space-y-1">
                    <p>Dear {docData.grade} Parents,</p>
                    <p className="underline">
                      Please find below the academic projection for {docData.grade} ({docData.shift === 'us' ? 'US Shift' : 'MENA Shift'}) for the week of {docData.weekRangeText}.
                    </p>
                  </div>

                  {/* HTML rendered projection table */}
                  <div
                    className="overflow-x-auto bg-white rounded-xl border border-slate-300"
                    dangerouslySetInnerHTML={{
                      __html: generateWeeklyStatementHtml(docData)
                        .replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '')
                        .replace(/<\/body>[\s\S]*?<\/html>/i, '')
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Grid Editor */}
            {activeMasterTab === 'editor' && (
              <div className="space-y-4">
                {/* Day selector buttons for this grade */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                  {gradeDays.map((dItem) => {
                    const d = dItem.dayNumber;
                    return (
                      <button
                        key={d}
                        onClick={() => setActiveMasterDay(d)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                          activeMasterDay === d
                            ? 'bg-teal-700 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{isAr ? `اليوم ${d}: ${dItem.nameAr}` : `Day ${d}: ${dItem.nameEn}`}</span>
                        <span className="text-[11px] opacity-80">({dItem.shortEn})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Subject list for active day */}
                <div className="space-y-3">
                  {(docData.days[activeMasterDay] || []).map((subPlan, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">{subPlan.subjectName}</span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({subPlan.genderCohort || 'joint'})
                          </span>
                        </div>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={subPlan.isNoSession}
                            onChange={(e) => handleUpdateMasterSubject(activeMasterDay, idx, { isNoSession: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>{isAr ? 'لا توجد حصة' : 'No Session'}</span>
                        </label>
                      </div>

                      {/* Content & Homework inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Content / Topic</label>
                          <textarea
                            rows={2}
                            value={subPlan.contentTopic || ''}
                            onChange={(e) => handleUpdateMasterSubject(activeMasterDay, idx, { contentTopic: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Homework</label>
                          <textarea
                            rows={2}
                            value={subPlan.homework || ''}
                            onChange={(e) => handleUpdateMasterSubject(activeMasterDay, idx, { homework: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Quizzes */}
            {activeMasterTab === 'quizzes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isAr ? 'كافة كويزات الأسبوع للمرحلة (Weekly Quiz Schedule)' : 'All Grade Quizzes for the Week'}
                  </h3>
                </div>

                <div className="space-y-2">
                  {(docData.quizzes || []).map((quiz) => (
                    <div key={quiz.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                            {quiz.date}
                          </span>
                          <span className="font-bold text-slate-900">{quiz.subject}</span>
                        </div>
                        <div className="font-semibold text-slate-700">{quiz.topics}</div>
                        {quiz.materials && <div className="text-slate-500 text-[11px]">{quiz.materials}</div>}
                      </div>

                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DEDICATED SHIFT-FIRST EXPORT MODAL */}
      {/* ------------------------------------------------------------- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-start">
            
            {/* Modal Header - Sticky and always visible */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    {isAr ? 'تصدير التقرير الأسبوعي المعتمد' : 'Export Official Weekly Statement'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'تصدير المرحلة الحالية أو تحميل كافة المراحل (K-12) دفعة واحدة' : 'Export current grade or all stages (K-12) batch ZIP'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-2.5 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition shadow-2xs"
                title={isAr ? 'إغلاق النافذة' : 'Close modal'}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">

            {/* STEP 1: Select Shift First */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'الخطوة 1: اختر الفترة المطلوبة للتصدير أولاً:' : 'Step 1: Choose Shift to Export First:'}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* MENA Shift Card */}
                <button
                  type="button"
                  onClick={() => setExportShiftChoice('mena')}
                  className={`p-4 rounded-2xl border-2 text-start transition-all relative ${
                    exportShiftChoice === 'mena'
                      ? 'border-teal-600 bg-teal-50/60 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">🇸🇦</span>
                    {exportShiftChoice === 'mena' ? (
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-slate-300"></span>
                    )}
                  </div>
                  <div className="font-black text-slate-900 text-sm">
                    {isAr ? 'فترة الشرق الأوسط (MENA)' : 'MENA Shift'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isAr ? 'ملف خاص بجدول وحصص فترة الشرق الأوسط' : 'Dedicated MENA schedule file'}
                  </div>
                  <div className="font-mono text-[10px] text-teal-800 mt-2 bg-teal-100/60 px-2 py-0.5 rounded truncate">
                    Weekly_Statement_{selectedGrade.replace(/\s+/g, '_')}_MENA_Shift.docx
                  </div>
                </button>

                {/* US Shift Card */}
                <button
                  type="button"
                  onClick={() => setExportShiftChoice('us')}
                  className={`p-4 rounded-2xl border-2 text-start transition-all relative ${
                    exportShiftChoice === 'us'
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">🇺🇸</span>
                    {exportShiftChoice === 'us' ? (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-slate-300"></span>
                    )}
                  </div>
                  <div className="font-black text-slate-900 text-sm">
                    {isAr ? 'فترة أمريكا (US Shift)' : 'US Shift'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isAr ? 'ملف خاص بجدول وحصص فترة أمريكا الشمالية' : 'Dedicated US schedule file'}
                  </div>
                  <div className="font-mono text-[10px] text-blue-800 mt-2 bg-blue-100/60 px-2 py-0.5 rounded truncate">
                    Weekly_Statement_{selectedGrade.replace(/\s+/g, '_')}_US_Shift.docx
                  </div>
                </button>
              </div>
            </div>

            {/* Administrative Missing Submissions Warning */}
            {missingTracker.missingList.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-amber-950 flex items-center justify-between">
                    <span>{isAr ? 'تنبيه إداري قبل التصدير النهائي:' : 'Administrative Submission Notice:'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportModalOpen(false);
                        setIsTrackerOpen(true);
                      }}
                      className="text-teal-700 underline font-bold hover:text-teal-900"
                    >
                      {isAr ? 'عرض قائمة النواقص' : 'View Missing List'}
                    </button>
                  </div>
                  <div>
                    {isAr
                      ? `يوجد ${missingTracker.missingList.length} مواد/معلمين لم يكتمل إدخال خطة حصصهم لهذا الأسبوع بعد (${missingTracker.missingList.map((m) => m.subjectName).join('، ')}). يمكنك الاستمرار بالتصدير أو استكمال النواقص أولاً.`
                      : `There are ${missingTracker.missingList.length} teachers with pending weekly lesson topics. You can proceed or complete them first.`}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Export Formats for the chosen shift */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>
                  {isAr
                    ? `الخطوة 2: اختر صيغة التصدير لفترة (${exportShiftChoice === 'us' ? 'أمريكا US' : 'الشرق الأوسط MENA'}):`
                    : `Step 2: Choose Export Format for (${exportShiftChoice.toUpperCase()}):`}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Word (.docx) */}
                <button
                  type="button"
                  disabled={isExportingDocx}
                  onClick={() => handleExportDocxForShift(exportShiftChoice)}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isExportingDocx ? (isAr ? 'جاري التوليد...' : 'Exporting...') : (isAr ? 'تنزيل ملف Word (.docx)' : 'Download Word (.docx)')}</span>
                </button>

                {/* Print / PDF */}
                <button
                  type="button"
                  onClick={() => handleExportPdfForShift(exportShiftChoice)}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition"
                >
                  <Printer className="w-4 h-4 text-teal-400" />
                  <span>{isAr ? 'طباعة / تصدير PDF معتمد' : 'Print / Export PDF'}</span>
                </button>
              </div>

              {/* Copy HTML Option */}
              <button
                type="button"
                onClick={() => handleCopyHtmlForShift(exportShiftChoice)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{isAr ? 'نسخ كود HTML للتقرير' : 'Copy HTML Code'}</span>
              </button>
            </div>

            {/* Batch Option: Export Both Shifts */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isExportingBoth}
                onClick={handleExportBothShifts}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-md transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isExportingBoth
                    ? (isAr ? 'جاري تنزيل الملفين...' : 'Downloading both files...')
                    : (isAr ? 'تصدير الفترتين معاً (ملفان منفصلان بنقرة واحدة)' : 'Download Both Shifts as Separate Files')}
                </span>
              </button>
              <p className="text-[11px] text-center text-slate-500 mt-1.5">
                {isAr
                  ? 'يقوم بتنزيل ملف Word لفترة Mena وملف Word لفترة US كملفين منفصلين جاهزين للإرسال.'
                  : 'Downloads both MENA & US Word files independently in one click.'}
              </p>
            </div>

            {/* 👑 SPECIAL ADMINISTRATION EXPORT: ALL STAGES IN ONE ZIP WITH SEPARATE FOLDERS */}
            <div className="pt-4 border-t-2 border-dashed border-teal-200 bg-teal-50/50 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-900 font-black text-sm">
                  <FolderArchive className="w-5 h-5 text-teal-700" />
                  <span>
                    {isAr
                      ? '👑 خاص بمسئول الإدارة: تحميل المراحل كاملة دفعة واحدة (ZIP)'
                      : '👑 Administration: Download All Stages (ZIP Batch)'}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-teal-200 text-teal-900 px-2 py-0.5 rounded-full">
                  13 {isAr ? 'مرحلة (من الروضة حتى G12)' : 'Stages (KG-G12)'}
                </span>
              </div>

              <p className="text-xs text-teal-800 leading-relaxed">
                {isAr
                  ? 'يقوم بتصدير حزمة مضغوطة (ZIP) تضم كافة المراحل دفعة واحدة، بحيث يكون لكل مرحلة (Kindergarten, Grade 1..12) مجلدها الخاص المنفصل، ويحتوي داخله على ملف Word (.docx) وملف PDF معتمد.'
                  : 'Exports a ZIP archive containing all 13 stages, organized in separate folders per stage with dedicated Word (.docx) and PDF files.'}
              </p>

              {/* Shift selector for Batch Export */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-700">{isAr ? 'الفترة:' : 'Shift:'}</span>
                <div className="inline-flex rounded-xl bg-white border border-teal-200 p-0.5 shadow-sm text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBatchShiftChoice('mena')}
                    className={`px-2.5 py-1 rounded-lg transition ${batchShiftChoice === 'mena' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {isAr ? 'الشرق الأوسط MENA' : 'MENA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchShiftChoice('us')}
                    className={`px-2.5 py-1 rounded-lg transition ${batchShiftChoice === 'us' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {isAr ? 'أمريكا US' : 'US'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchShiftChoice('both')}
                    className={`px-2.5 py-1 rounded-lg transition ${batchShiftChoice === 'both' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {isAr ? 'الفترتان معاً' : 'Both Shifts'}
                  </button>
                </div>
              </div>

              {/* Progress Display if Exporting */}
              {isBatchExporting && batchProgress && (
                <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>{batchProgress.statusText}</span>
                    </span>
                    <span className="text-teal-700">{batchProgress.current} / {batchProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Download Batch ZIP Button (K-12) */}
              <button
                type="button"
                disabled={isBatchExporting}
                onClick={() => handleBatchExportAllStages(batchShiftChoice)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white font-black text-xs sm:text-sm shadow-lg transition disabled:opacity-50 border border-teal-600/30"
              >
                <FolderArchive className="w-5 h-5 text-amber-300 shrink-0" />
                <span>
                  {isBatchExporting
                    ? (isAr ? 'جاري تجهيز حزمة المراحل كاملة (K-12)...' : 'Generating Batch ZIP...')
                    : (isAr ? '📦 تحميل كافة المراحل (K to 12) دفعة واحدة (Word & PDF في مجلد منفصل لكل مرحلة)' : '📦 Download All Stages (K to 12) (Word & PDF in Separate Folders)')}
                </span>
              </button>
            </div>

            </div>

            {/* Sticky Modal Footer with Clear Close Action */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-500">
                {isAr ? `الصف الحالي: ${selectedGrade} - الأسبوع ${selectedWeekNumber}` : `Current: ${selectedGrade} - Week ${selectedWeekNumber}`}
              </span>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs transition shadow-sm"
              >
                <X className="w-4 h-4" />
                <span>{isAr ? 'إغلاق نافذة التصدير' : 'Close Export Modal'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Zoom Link Input Modal (Sandboxed iframe safe) */}
      {/* ------------------------------------------------------------- */}
      {zoomModalDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">
                {isAr ? `إضافة رابط زووم للحصة (اليوم ${zoomModalDay})` : `Add Zoom Recording (Day ${zoomModalDay})`}
              </h3>
              <button
                onClick={() => setZoomModalDay(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {isAr
                ? 'الصق رابط التسجيل من منصة Zoom ليتم إدراجه تلقائياً داخل محتوى الحصة في التقرير.'
                : 'Paste the Zoom cloud recording link to include in the lesson topic.'}
            </p>

            <input
              type="url"
              value={zoomModalInput}
              onChange={(e) => setZoomModalInput(e.target.value)}
              placeholder="https://zoom.us/rec/share/..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 font-mono"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setZoomModalDay(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (zoomModalDay !== null) {
                    const current = teacherDaysPlan[zoomModalDay]?.contentTopic || '';
                    const linkText = zoomModalInput ? `\nRecorded Lesson:\n${zoomModalInput}\n` : '';
                    handleTeacherDayChange(zoomModalDay, {
                      zoomUrl: zoomModalInput,
                      contentTopic: current ? `${current}${linkText}` : linkText.trim(),
                    });
                    setZoomModalDay(null);
                    showToast(isAr ? 'تم إدراج رابط الحصة بنجاح' : 'Zoom link inserted', 'success');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
              >
                {isAr ? 'تأكيد وإدراج' : 'Insert Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Confirmation Modal (Sandboxed iframe safe) */}
      {/* ------------------------------------------------------------- */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.confirmColor === 'rose'
                    ? 'bg-rose-100 text-rose-600'
                    : confirmModal.confirmColor === 'emerald'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-900 text-base mb-1">{confirmModal.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition ${
                  confirmModal.confirmColor === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmModal.confirmColor === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* UNLOCK REQUEST CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    {isAr ? 'طلب تعديل / فتح القفل' : 'Request Unlock & Edit'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr ? `مادة (${currentSubjectDef.nameAr}) - ${selectedGrade}` : `${currentSubjectDef.nameEn} - ${selectedGrade}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informative Warning */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2 text-amber-950">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{isAr ? 'شفافية وتوثيق إداري كامل (Audit Log)' : 'Audit Trail Logging'}</span>
              </div>
              <p>
                {isAr
                  ? 'عند فتح القفل، ستعود حقول المادة لوضع التعديل، وسيتم فوراً تسجيل عملية الفك وسبب التعديل وهوية المستخدم وتوقيتها في جدول (weekly_statement_audit_logs) لضمان الشفافية الإدارية التامة.'
                  : 'Unlocking will re-enable editing fields and record an audit log entry in Supabase with your identity, reason, and timestamp.'}
              </p>
            </div>

            {/* Reason input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 block">
                {isAr ? 'سبب طلب التعديل (إلزامي للتوثيق الإداري):' : 'Reason for Unlocking (Required for Audit Log):'}
              </label>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder={
                  isAr
                    ? 'مثال: تعديل عنوان درس يوم الثلاثاء وتحديث رابط الواجب بعد التنسيق مع الإدارة'
                    : 'e.g. Correcting Tuesday homework topic and updating Zoom link'
                }
                className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 shadow-2xs"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmUnlock}
                disabled={isSubmittingUnlock || !unlockReason.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition disabled:opacity-50"
              >
                <Unlock className="w-4 h-4 text-slate-950" />
                <span>{isSubmittingUnlock ? (isAr ? 'جاري الفتح...' : 'Unlocking...') : (isAr ? 'تأكيد فتح القفل للتعديل' : 'Confirm Unlock')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* AUDIT LOG & VERSION HISTORY MODAL */}
      {/* ------------------------------------------------------------- */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    {isAr ? 'سجل التدقيق وتاريخ التعديلات (Audit Log)' : 'Audit Log & Change History'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{currentSubjectDef.nameEn} ({currentSubjectDef.nameAr})</span>
                    <span>•</span>
                    <span>{selectedGrade}</span>
                    <span>•</span>
                    <span>{selectedShift === 'us' ? 'US Shift' : 'MENA Shift'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Supabase Connected Status & Instant Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-slate-800">
                  {isSupabaseConfigured()
                    ? (isAr ? 'متصل بقاعدة Supabase: جدول weekly_statement_audit_logs' : 'Connected to weekly_statement_audit_logs')
                    : (isAr ? 'سجل التدقيق مفعل وموثق' : 'Audit Log active')}
                </span>
                <span className="font-mono text-[11px] text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md font-semibold">
                  statement_id: {getStatementKey(selectedGrade, selectedWeekNumber, selectedShift, selectedSubjectId)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAuditModal(selectedSubjectId)}
                disabled={isLoadingAudit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-extrabold border border-slate-300 transition shadow-2xs"
                title={isAr ? 'تحديث السجلات الآن' : 'Refresh audit logs'}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'تحديث السجلات' : 'Refresh'}</span>
              </button>
            </div>

            {/* Audit Log Timeline */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {isLoadingAudit ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>{isAr ? 'جاري تحميل سجل التدقيق...' : 'Loading audit trail...'}</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  <Info className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <span>{isAr ? 'لا توجد سجلات تعديل مسجلة بعد لهذه المادة. ستظهر هنا كافة عمليات الاعتماد وفك القفل.' : 'No audit records yet. All submit/lock and unlock operations will be logged here.'}</span>
                </div>
              ) : (
                auditLogs.map((log) => {
                  const isLock = log.action === 'submit_and_lock';
                  const isUnlock = log.action === 'unlock_for_editing';

                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-2xl border transition text-xs space-y-2 ${
                        isLock
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : isUnlock
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isLock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[11px]">
                              <Lock className="w-3 h-3 text-white" />
                              <span>{isAr ? 'اعتماد وقفل نهائي' : 'Submit & Lock'}</span>
                            </span>
                          ) : isUnlock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px]">
                              <Unlock className="w-3 h-3 text-slate-950" />
                              <span>{isAr ? 'طلب تعديل / فتح القفل' : 'Unlock for Edit'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[11px]">
                              <Edit3 className="w-3 h-3 text-slate-600" />
                              <span>{isAr ? 'حفظ مسودة' : 'Draft Save'}</span>
                            </span>
                          )}

                          <span className="font-extrabold text-slate-900">
                            {log.changed_by}
                          </span>
                        </div>

                        <span className="font-mono text-slate-500 text-[11px]">
                          {formatAuditTime(log.created_at)}
                        </span>
                      </div>

                      {log.reason && (
                        <div className="text-slate-700 font-medium bg-white/80 p-2.5 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-900">{isAr ? 'السبب / الملاحظة: ' : 'Reason: '}</span>
                          <span>{log.reason}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                {isAr ? `إجمالي السجلات: ${auditLogs.length}` : `Total records: ${auditLogs.length}`}
              </span>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Reset All Weekly Content Modal (PIN: Sahlah2027) */}
      {/* ------------------------------------------------------------- */}
      {isResetWeekModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-100 overflow-hidden text-start">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {isAr ? 'تفريغ محتوى الأسبوع لجميع المواد' : 'Reset All Week Content'}
                  </h3>
                  <p className="text-xs text-rose-100">
                    {isAr ? `للأسبوع ${selectedWeekNumber} - تقرير ${selectedGrade}` : `Week ${selectedWeekNumber} - ${selectedGrade}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsResetWeekModalOpen(false)}
                className="p-1.5 rounded-xl text-rose-100 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed">
                <div className="font-black flex items-center gap-1.5 mb-1 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{isAr ? 'إجراء إداري حساس:' : 'Administrative Action:'}</span>
                </div>
                {isAr
                  ? 'سيتم مسح وتفريغ كافة الدروس والواجبات والكويزات المدخلة لجميع المواد في هذا الأسبوع، ليصبح المحتوى فارغاً تماماً كما يملؤه المعلم. سيتم الحفاظ على توزيع الجداول وأيام عدم وجود الحصص (No Session).'
                  : 'This will completely wipe all lesson topics, homework, and quizzes for all subjects in this week, returning to empty state for teachers to fill. Timetable No-Session rules are preserved.'}
              </div>

              {/* PIN Input */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'أدخل الرقم السري المعتمد للتأكيد:' : 'Enter Security PIN to Confirm:'}</span>
                </label>

                <div className="relative">
                  <input
                    type={showResetPinText ? 'text' : 'password'}
                    value={resetPinInput}
                    onChange={(e) => {
                      setResetPinInput(e.target.value);
                      if (resetPinError) setResetPinError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmResetWeek();
                    }}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 rounded-2xl border-2 text-sm font-mono tracking-wider focus:outline-none transition ${
                      resetPinError
                        ? 'border-rose-500 bg-rose-50/50 focus:border-rose-600'
                        : 'border-slate-200 focus:border-rose-500 bg-slate-50 focus:bg-white'
                    }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPinText(!showResetPinText)}
                    className="absolute inset-y-0 end-0 px-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    title={showResetPinText ? (isAr ? 'إخفاء الرمز' : 'Hide PIN') : (isAr ? 'إظهار الرمز' : 'Show PIN')}
                  >
                    {showResetPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {resetPinError && (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1 animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{resetPinError}</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetWeekModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  disabled={isResettingWeek || !resetPinInput.trim()}
                  onClick={handleConfirmResetWeek}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isResettingWeek
                      ? (isAr ? 'جاري التفريغ...' : 'Clearing...')
                      : (isAr ? 'تأكيد تفريغ محتوى الأسبوع' : 'Confirm Empty Week')}
                  </span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Dedicated Batch Export All Stages (K to 12) Modal */}
      {/* ------------------------------------------------------------- */}
      {isBatchK12ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 text-start overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold flex items-center justify-center shrink-0 shadow-md">
                  <FolderArchive className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    {isAr ? '📦 حزمة تصدير كافة المراحل (K to 12) دفعة واحدة' : '📦 Batch Export All Stages (K to 12)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? `للأسبوع الدراسي ${selectedWeekNumber} - من مرحلة الروضة حتى الصف الثاني عشر`
                      : `Week ${selectedWeekNumber} • Kindergarten to Grade 12`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isBatchExporting) setIsBatchK12ModalOpen(false);
                }}
                disabled={isBatchExporting}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feature Description Card */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-xs text-teal-950 space-y-2 leading-relaxed">
              <div className="flex items-center gap-2 font-black text-teal-900 text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{isAr ? 'ميزة التصدير الإداري الشامل:' : 'Administrative Batch Archive:'}</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-teal-950 font-medium ps-1">
                <li>
                  {isAr
                    ? 'يتم تنزيل أرشيف مضغوط ZIP يحتوي مجلداً منفصلاً لكل مرحلة دراسية (Kindergarten, Grade 1, Grade 2, ... Grade 12).'
                    : 'Downloads an organized ZIP archive with a dedicated folder for each stage (Kindergarten, Grade 1, ... Grade 12).'}
                </li>
                <li>
                  {isAr
                    ? 'داخل كل مجلد مرحلة، يتوفر ملف Word (.docx) وملف PDF (.pdf) عالي الجودة ومطابق للنموذج الرسمي.'
                    : 'Each stage folder contains both official Word (.docx) and high-fidelity PDF (.pdf) files.'}
                </li>
                <li>
                  {isAr
                    ? 'تعتمد الجداول تلقائياً قواعد الحصص الرسمية وخطة كل معلم مع جدول الكويزات.'
                    : 'Preserves full PrimeTimetable scheduling rules and quiz projections.'}
                </li>
              </ul>
            </div>

            {/* Shift Filter Option */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'اختر الفترة المراد تصدير تقاريرها:' : 'Select Target Shift:'}</span>
              </label>

              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBatchShiftChoice('mena')}
                  disabled={isBatchExporting}
                  className={`py-2 px-3 rounded-xl transition ${
                    batchShiftChoice === 'mena'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'الشرق الأوسط (MENA)' : 'MENA Shift'}
                </button>
                <button
                  type="button"
                  onClick={() => setBatchShiftChoice('us')}
                  disabled={isBatchExporting}
                  className={`py-2 px-3 rounded-xl transition ${
                    batchShiftChoice === 'us'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'أمريكا (US)' : 'US Shift'}
                </button>
                <button
                  type="button"
                  onClick={() => setBatchShiftChoice('both')}
                  disabled={isBatchExporting}
                  className={`py-2 px-3 rounded-xl transition ${
                    batchShiftChoice === 'both'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'الفترتان معاً' : 'Both Shifts'}
                </button>
              </div>
            </div>

            {/* Live Progress Bar when Generating */}
            {isBatchExporting && batchProgress && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-teal-300 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                    <span>{batchProgress.statusText}</span>
                  </span>
                  <span className="font-mono text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md font-bold">
                    {batchProgress.current} / {batchProgress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((batchProgress.current / Math.max(1, batchProgress.total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchK12ModalOpen(false)}
                disabled={isBatchExporting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition disabled:opacity-40"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={isBatchExporting}
                onClick={async () => {
                  await handleBatchExportAllStages(batchShiftChoice);
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-lg hover:shadow-xl transition disabled:opacity-50"
              >
                <FolderArchive className="w-4 h-4 text-amber-300" />
                <span>
                  {isBatchExporting
                    ? (isAr ? 'جاري تجهيز وتنزيل الحزمة...' : 'Generating Archive...')
                    : (isAr ? 'بدء تنزيل الحزمة (Word & PDF)' : 'Download Batch ZIP')}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Toast Notification (Sandboxed iframe safe) */}
      {/* ------------------------------------------------------------- */}
      {toast && (
        <div className="fixed bottom-5 end-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ms-2 opacity-70 hover:opacity-100 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
