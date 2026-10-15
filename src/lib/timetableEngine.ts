import type { ShiftType, GenderCohort, NativeCohort, WeeklyStatementDocument } from '@/types';
import { isElementaryOrMiddleSchool } from './academicCalendar';

export interface TeacherAssignment {
  teacherName: string;
  subjectId: string;
  subjectNameAr: string;
  subjectNameEn: string;
  grade: string;
  cohort: GenderCohort; // 'joint' | 'boys' | 'girls'
  nativeCohort: NativeCohort; // 'native' | 'non-native' | 'both'
  /** Days on which this teacher has classes (1..5) */
  teachingDays: number[];
  notes?: string;
}

/**
 * Smart automatic No-Session text generator matching user guidelines:
 * - English subjects: "No Session", "No Session - Boys", "No Session - Girls" (no suffix if joint)
 * - Arabic / Islamic / Quran: "لا توجد حصة", "للناطقين: لا توجد حصة", "الناطقين بغيرها: لا توجد حصة"
 */
export function getSmartNoSessionNote(
  subjectId: string,
  cohort: GenderCohort = 'joint',
  nativeCohort: NativeCohort = 'both'
): string {
  const isArabicOrIslamic = subjectId === 'arabic' || subjectId === 'islamic' || subjectId === 'quran';

  if (isArabicOrIslamic) {
    if (nativeCohort === 'native') {
      return 'للناطقين: لا توجد حصة';
    }
    if (nativeCohort === 'non-native') {
      return 'الناطقين بغيرها: لا توجد حصة';
    }
    return 'لا توجد حصة';
  }

  // English-language subjects
  if (cohort === 'boys') {
    return 'No Session - Boys';
  }
  if (cohort === 'girls') {
    return 'No Session - Girls';
  }
  return 'No Session';
}

// ─────────────────────────────────────────────────────────────────────────────
// MENA Shift Timetable Database (From official Mena timetable schedule)
// ─────────────────────────────────────────────────────────────────────────────
export const MENA_TEACHERS_SCHEDULE: TeacherAssignment[] = [
  {
    "teacherName": "Rahma Anwar",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية",
    "subjectNameEn": "Arabic",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Rahma Anwar",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Rahma Anwar",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم",
    "subjectNameEn": "Quran",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Rahma Anwar",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية",
    "subjectNameEn": "Islamic",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Rahma Anwar",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Rahma Anwar",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      3,
      4
    ]
  },
  {
    "teacherName": "Rahma Anwar",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      4
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية",
    "subjectNameEn": "Arabic",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم",
    "subjectNameEn": "Quran",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية",
    "subjectNameEn": "Islamic",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      3,
      4
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      4
    ]
  },
  {
    "teacherName": "Yesser Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Yesser Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Yesser Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3,
      4
    ]
  },
  {
    "teacherName": "Yesser Fetyan",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Yesser Fetyan",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Yesser Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3,
      4,
      5
    ]
  },
  {
    "teacherName": "Rawan El Hijazy",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Rawan El Hijazy",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Rawan El Hijazy",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Rawan El Hijazy",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Rawan El Hijazy",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Rawan El Hijazy",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Nada",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 1",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Nada",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 1",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Nada",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 1",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Nada",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 1",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sarah Hassan",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 1",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Sarah Hassan",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 1",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Sarah Hassan",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 1",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sarah Hassan",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 1",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Lamyaa Aboumoussa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 2",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      3
    ]
  },
  {
    "teacherName": "Lamyaa Aboumoussa",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 2",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Lamyaa Aboumoussa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 2",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3,
      4
    ]
  },
  {
    "teacherName": "Lamyaa Aboumoussa",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 2",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Tasmia",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 2",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3,
      4
    ]
  },
  {
    "teacherName": "Tasmia",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 2",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Tasmia",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 2",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Tasmia",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 2",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 3",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 3",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 4",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 4",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 5",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Rana Mahdy",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 5",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Rana Mahdy",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 6",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Rana Mahdy",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Rana Mahdy",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 7",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Rana Mahdy",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Mariam Ali",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 8",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Mariam Ali",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Mariam Ali",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 9",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Mariam Ali",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 9",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Heba",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 10",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4,
      5
    ]
  },
  {
    "teacherName": "Heba",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 10",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Heba",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      5
    ]
  },
  {
    "teacherName": "Heba",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      3,
      4
    ]
  },
  {
    "teacherName": "Menna",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 3",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Menna",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 3",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Menna",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 4",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Menna",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 4",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Menna",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 5",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sarah Elalfy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 5",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Sarah Elalfy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 6",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      3
    ]
  },
  {
    "teacherName": "Sarah Elalfy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      3
    ]
  },
  {
    "teacherName": "Sarah Elalfy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 7",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sarah Elalfy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nahla Nagy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 8",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nahla Nagy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nahla Nagy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 9",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Nahla Nagy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 9",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4,
      5
    ]
  },
  {
    "teacherName": "Ahmed Samy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 10",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Ahmed Samy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 10",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Ahmed Samy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Ahmed Samy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4,
      5
    ]
  },
  {
    "teacherName": "Sara Abdelnaser",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 3",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Sara Abdelnaser",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 3",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sara Abdelnaser",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 4",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Sara Abdelnaser",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 4",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sara Abdelnaser",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 5",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sara Abdelnaser",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 5",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Yomna Noureldeen",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 6",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Yomna Noureldeen",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 7",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Dima Sakr",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Dima Sakr",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Dima Sakr",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 8",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Dima Sakr",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Diana",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 9",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      3,
      4
    ]
  },
  {
    "teacherName": "Diana",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 9",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Diana",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 10",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Diana",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 10",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      4
    ]
  },
  {
    "teacherName": "Diana",
    "subjectId": "science",
    "subjectNameAr": "العلوم والمواد الاختيارية",
    "subjectNameEn": "Science & Elective",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3,
      4
    ]
  },
  {
    "teacherName": "Diana",
    "subjectId": "science",
    "subjectNameAr": "العلوم والمواد الاختيارية",
    "subjectNameEn": "Science & Elective",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      3
    ]
  },
  {
    "teacherName": "Wissem",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 3",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Wissem",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 3",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Wissem",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 4",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Wissem",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 4",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Wissem",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 5",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Wissem",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 5",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 6",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 7",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 8",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Nouran B",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 9",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Nouran B",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 9",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Nouran B",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 10",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      4
    ]
  },
  {
    "teacherName": "Nouran B",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 10",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Nouran B",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية والمواد الاختيارية",
    "subjectNameEn": "Social Studies & Elective",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4,
      5
    ]
  },
  {
    "teacherName": "Nouran B",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية والمواد الاختيارية",
    "subjectNameEn": "Social Studies & Elective",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Shimaa Mohamed",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Shimaa Mohamed",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Shimaa Mohamed",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Shimaa Mohamed",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Shimaa Mohamed",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Shimaa Mohamed",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Huda",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Huda",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Huda",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Huda",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Huda",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Huda",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3,
      5
    ]
  },
  {
    "teacherName": "Hedaya",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Hedaya",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Hedaya",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Hedaya",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Hedaya",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Hedaya",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Mohamed Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Mohamed Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Mohamed Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Mohamed Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Fetyan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Eman Gamal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Eman Gamal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Eman Gamal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Eman Gamal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Eman Gamal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Eman Gamal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Eman Gamal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Azza",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Azza",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Azza",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Azza",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Azza",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Azza",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Anas",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Anas",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Anas",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Anas",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Anas",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Anas",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// US Shift Timetable Database (From official US timetable schedule)
// ─────────────────────────────────────────────────────────────────────────────
export const US_TEACHERS_SCHEDULE: TeacherAssignment[] = [
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم",
    "subjectNameEn": "Quran",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية",
    "subjectNameEn": "Islamic",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية",
    "subjectNameEn": "Arabic",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Sarah Sultan",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      4
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية",
    "subjectNameEn": "Arabic",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم",
    "subjectNameEn": "Quran",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية",
    "subjectNameEn": "Islamic",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Ms Romaissa",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Kindergarten",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      4
    ]
  },
  {
    "teacherName": "Salma Hisham",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 1",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Salma Hisham",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 1",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Salma Hisham",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 1",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Salma Hisham",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 1",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      3,
      4
    ]
  },
  {
    "teacherName": "Nabeelah Hassan",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 1",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Nabeelah Hassan",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 1",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Nabeelah Hassan",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 1",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Nabeelah Hassan",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 1",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Lamyaa Aboumoussa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 2",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      3
    ]
  },
  {
    "teacherName": "Lamyaa Aboumoussa",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 2",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Lamyaa Aboumoussa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 2",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Lamyaa Aboumoussa",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 2",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Tasmia",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 2",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Tasmia",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 2",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Tasmia",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 2",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      3
    ]
  },
  {
    "teacherName": "Tasmia",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 2",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Uweisha Khan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 3",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3,
      4
    ]
  },
  {
    "teacherName": "Uweisha Khan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 3",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Uweisha Khan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 4",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3,
      4
    ]
  },
  {
    "teacherName": "Uweisha Khan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 4",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      3
    ]
  },
  {
    "teacherName": "Uweisha Khan",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 5",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Marwa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 5",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Marwa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 6",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Marwa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Marwa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 7",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Marwa",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Mariam Ali",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 8",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3,
      4
    ]
  },
  {
    "teacherName": "Mariam Ali",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3,
      4
    ]
  },
  {
    "teacherName": "Mariam Ali",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 9",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Mariam Ali",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 9",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4,
      5
    ]
  },
  {
    "teacherName": "Ruqaya Ishak",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 10",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4,
      5
    ]
  },
  {
    "teacherName": "Ruqaya Ishak",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 10",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Ruqaya Ishak",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Ruqaya Ishak",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Raneem",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 3",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Raneem",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 3",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Raneem",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 4",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Raneem",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 4",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Raneem",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 5",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Nahla Ibrahim",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 5",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nahla Ibrahim",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 6",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nahla Ibrahim",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nahla Ibrahim",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 7",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nahla Ibrahim",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Ainish",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 8",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Ainish",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Ainish",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 9",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Ainish",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 9",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Ahmed Samy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 10",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Ahmed Samy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 10",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Ahmed Samy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Ahmed Samy",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      3,
      4
    ]
  },
  {
    "teacherName": "Yomna Noureldeen",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 3",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Yomna Noureldeen",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 3",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Yomna Noureldeen",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 4",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Yomna Noureldeen",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 4",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Yomna Noureldeen",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 5",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Yomna Noureldeen",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 6",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Yomna Noureldeen",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 7",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sherouk Mohamed",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 5",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Sherouk Mohamed",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sherouk Mohamed",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Sherouk Mohamed",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 8",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sherouk Mohamed",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Fatima Koriem",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 9",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Fatima Koriem",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 9",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Fatima Koriem",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 10",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Fatima Koriem",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 10",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Fatima Koriem",
    "subjectId": "science",
    "subjectNameAr": "العلوم وإدارة الأعمال",
    "subjectNameEn": "Science & Business",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4,
      5
    ]
  },
  {
    "teacherName": "Fatima Koriem",
    "subjectId": "science",
    "subjectNameAr": "العلوم وإدارة الأعمال",
    "subjectNameEn": "Science & Business",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Yousra",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 3",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Yousra",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 3",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Yousra",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 4",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Yousra",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 4",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Yousra",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 5",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Yousra",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 5",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 6",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 7",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 8",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Sardia Ebrahim",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Nadine",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 9",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Nadine",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 9",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Nadine",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 10",
    "cohort": "boys",
    "nativeCohort": "both",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Nadine",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 10",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      3,
      5
    ]
  },
  {
    "teacherName": "Nadine",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية وإدارة الأعمال",
    "subjectNameEn": "Social Studies & Business",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3,
      4
    ]
  },
  {
    "teacherName": "Nadine",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية وإدارة الأعمال",
    "subjectNameEn": "Social Studies & Business",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Gamal",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Bayan",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Bayan",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Bayan",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Bayan",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Bayan",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Mohamed Shaheen",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Mohamed Shaheen",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Shaheen",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      4
    ]
  },
  {
    "teacherName": "Mohamed Shaheen",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Shaheen",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Mohamed Shaheen",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Zeinab",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Zeinab",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Zeinab",
    "subjectId": "science",
    "subjectNameAr": "العلوم",
    "subjectNameEn": "Science",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nohaer Allam",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nohaer Allam",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Nohaer Allam",
    "subjectId": "math",
    "subjectNameAr": "الرياضيات",
    "subjectNameEn": "Math",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sara Hussein",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sara Hussein",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 6",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sara Hussein",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sara Hussein",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 7",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sara Hussein",
    "subjectId": "english",
    "subjectNameAr": "اللغة الإنجليزية",
    "subjectNameEn": "English",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Sara Hussein",
    "subjectId": "social-studies",
    "subjectNameAr": "الدراسات الاجتماعية",
    "subjectNameEn": "Social Studies",
    "grade": "Grade 8",
    "cohort": "girls",
    "nativeCohort": "both",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Anas",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Anas",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Anas",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Sara Fayed",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Sara Fayed",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sara Fayed",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Huda",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Huda",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Huda",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Mostafa",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Mostafa",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      4,
      5
    ]
  },
  {
    "teacherName": "Mostafa",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Mostafa",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Mostafa",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية للناطقين",
    "subjectNameEn": "Arabic (Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Jowairia",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Jowairia",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Jowairia",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Jowairia",
    "subjectId": "arabic",
    "subjectNameAr": "اللغة العربية لغير الناطقين",
    "subjectNameEn": "Arabic (Non-Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Mohamed Farouk",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Mohamed Farouk",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Mohamed Farouk",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Mohamed Farouk",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Mohamed Farouk",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Mohamed Farouk",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Wesam Khali",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Mr Galal",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Mr Galal",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      2,
      3
    ]
  },
  {
    "teacherName": "Mr Galal",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      2,
      4
    ]
  },
  {
    "teacherName": "Mr Galal",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Mohamed Shawky",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية للناطقين",
    "subjectNameEn": "Islamic (Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Zahra",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      4,
      5
    ]
  },
  {
    "teacherName": "Zahra",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Zahra",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Zahra",
    "subjectId": "islamic",
    "subjectNameAr": "التربية الإسلامية لغير الناطقين",
    "subjectNameEn": "Islamic (Non-Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Hani",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Hani",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3,
      4
    ]
  },
  {
    "teacherName": "Hani",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Hani",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Hani",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Hani",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 6",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      3,
      4
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 1",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 2",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      3,
      4
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 3",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      2
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 4",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      3,
      4
    ]
  },
  {
    "teacherName": "Arifa",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 5",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      1,
      3
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 7",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      1,
      4
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      4,
      5
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      4
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      4,
      5
    ]
  },
  {
    "teacherName": "Sondos",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم للناطقين",
    "subjectNameEn": "Quran (Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "native",
    "teachingDays": [
      2,
      5
    ]
  },
  {
    "teacherName": "Wissal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 8",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2
    ]
  },
  {
    "teacherName": "Wissal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 9",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      3,
      5
    ]
  },
  {
    "teacherName": "Wissal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 10",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      3
    ]
  },
  {
    "teacherName": "Wissal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 11",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      3
    ]
  },
  {
    "teacherName": "Wissal",
    "subjectId": "quran",
    "subjectNameAr": "القرآن الكريم لغير الناطقين",
    "subjectNameEn": "Quran (Non-Native)",
    "grade": "Grade 12",
    "cohort": "joint",
    "nativeCohort": "non-native",
    "teachingDays": [
      2,
      5
    ]
  }
];

/**
 * Returns all teachers assigned in a given shift (sorted alphabetically A-Z)
 */
export function getTeachersForShift(shift: ShiftType): string[] {
  const list = shift === 'us' ? US_TEACHERS_SCHEDULE : MENA_TEACHERS_SCHEDULE;
  const set = new Set<string>();
  list.forEach((t) => set.add(t.teacherName));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Returns all teacher assignments for a specific teacher in a shift
 */
export function getTeacherAssignments(shift: ShiftType, teacherName: string): TeacherAssignment[] {
  const list = shift === 'us' ? US_TEACHERS_SCHEDULE : MENA_TEACHERS_SCHEDULE;
  return list.filter((t) => t.teacherName.toLowerCase().trim() === teacherName.toLowerCase().trim());
}

/**
 * Returns all expected teachers for a specific grade in a shift
 */
export function getExpectedTeachersForGrade(shift: ShiftType, grade: string): TeacherAssignment[] {
  const list = shift === 'us' ? US_TEACHERS_SCHEDULE : MENA_TEACHERS_SCHEDULE;
  const normalizedGrade = grade.toLowerCase().replace(/\s+/g, '');
  return list.filter((t) => {
    const tGrade = t.grade.toLowerCase().replace(/\s+/g, '');
    return tGrade === normalizedGrade;
  });
}

/**
 * Smart lookup: determines if a subject/cohort has a session on a given day based on the teacher schedule,
 * or falls back to standard matrix if no exact assignment.
 */
export function getTeacherSessionStatus(
  shift: ShiftType,
  grade: string,
  day: number,
  subjectId: string,
  cohort: GenderCohort = 'joint',
  nativeCohort: NativeCohort = 'both',
  teacherName?: string
): { hasSession: boolean; autoNote: string; matchedTeacher?: string } {
  const list = shift === 'us' ? US_TEACHERS_SCHEDULE : MENA_TEACHERS_SCHEDULE;
  const normalizedGrade = grade.toLowerCase().replace(/\s+/g, '');

  // If teacherName is provided, find exact match
  if (teacherName) {
    const teacherMatch = list.find((t) =>
      t.teacherName.toLowerCase().trim() === teacherName.toLowerCase().trim() &&
      t.grade.toLowerCase().replace(/\s+/g, '') === normalizedGrade &&
      t.subjectId === subjectId
    );

    if (teacherMatch) {
      const hasSession = teacherMatch.teachingDays.includes(day);
      const autoNote = hasSession
        ? ''
        : getSmartNoSessionNote(subjectId, teacherMatch.cohort, teacherMatch.nativeCohort);
      return { hasSession, autoNote, matchedTeacher: teacherMatch.teacherName };
    }
  }

  // General lookup by grade, subject, and cohort
  const matches = list.filter((t) =>
    t.grade.toLowerCase().replace(/\s+/g, '') === normalizedGrade &&
    t.subjectId === subjectId &&
    (cohort === 'joint' || t.cohort === 'joint' || t.cohort === cohort) &&
    (nativeCohort === 'both' || t.nativeCohort === 'both' || t.nativeCohort === nativeCohort)
  );

  if (matches.length > 0) {
    const hasSession = matches.some((m) => m.teachingDays.includes(day));
    const first = matches[0];
    const autoNote = hasSession
      ? ''
      : getSmartNoSessionNote(subjectId, first.cohort, first.nativeCohort);
    return { hasSession, autoNote, matchedTeacher: first.teacherName };
  }

  // Fallback defaults for unlisted combinations
  const isElementary = isElementaryOrMiddleSchool(grade);
  const maxDays = isElementary ? 4 : 5;
  if (day > maxDays) {
    return { hasSession: false, autoNote: getSmartNoSessionNote(subjectId, cohort, nativeCohort) };
  }

  return { hasSession: true, autoNote: '' };
}

export interface MissingTeacherSubmission {
  teacherName: string;
  subjectName: string;
  subjectId: string;
  grade: string;
  cohort: GenderCohort;
  nativeCohort: NativeCohort;
  teachingDays: number[];
  missingDays: number[];
}

/**
 * Calculates missing submissions for a grade in a weekly statement:
 * Matches expected teachers against entered docData content.
 */
export function calculateMissingTeacherSubmissions(
  docData: WeeklyStatementDocument,
  shift: ShiftType,
  grade: string
): {
  totalExpected: number;
  completedCount: number;
  missingList: MissingTeacherSubmission[];
  completionPercentage: number;
} {
  const expected = getExpectedTeachersForGrade(shift, grade);
  const missingList: MissingTeacherSubmission[] = [];
  let completedCount = 0;

  for (const assignment of expected) {
    const isLockedAndSubmitted = Boolean(
      docData.subjectStatuses?.[assignment.subjectId]?.is_locked &&
      docData.subjectStatuses?.[assignment.subjectId]?.status === 'submitted'
    );

    if (isLockedAndSubmitted) {
      completedCount++;
      continue;
    }

    const missingDays: number[] = [];

    for (const d of assignment.teachingDays) {
      const dayPlans = docData.days[d] || [];
      const plan = dayPlans.find((p) => p.subjectId === assignment.subjectId);

      const isFilled = plan && (
        plan.isNoSession ||
        (plan.contentTopic && plan.contentTopic.trim().length > 0 && !plan.contentTopic.includes('No Session') && !plan.contentTopic.includes('لا توجد'))
      );

      if (!isFilled) {
        missingDays.push(d);
      }
    }

    if (missingDays.length > 0) {
      missingList.push({
        teacherName: assignment.teacherName,
        subjectName: assignment.subjectNameAr,
        subjectId: assignment.subjectId,
        grade: assignment.grade,
        cohort: assignment.cohort,
        nativeCohort: assignment.nativeCohort,
        teachingDays: assignment.teachingDays,
        missingDays,
      });
    } else {
      completedCount++;
    }
  }

  const totalExpected = expected.length;
  const completionPercentage = totalExpected > 0 ? Math.round((completedCount / totalExpected) * 100) : 100;

  return {
    totalExpected,
    completedCount,
    missingList,
    completionPercentage,
  };
}
