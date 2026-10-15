export interface AcademicWeek {
  weekNumber: number;
  term: '1' | '2' | '3';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  labelAr: string; // "الأسبوع 1: من 30 أغسطس 2026 إلى 3 سبتمبر 2026"
  labelEn: string; // "Week 1: Aug 30, 2026 – Sept 3, 2026"
  headerDate: string; // "August 30, 2026"
  rangeText: string; // "Aug 30 - Sept 3, 2026"
  isHoliday?: boolean;
  holidayName?: string;
}

export const ACADEMIC_YEAR = 'SY 2026-2027';

/**
 * Full School Year Calendar for 2026-2027 (3 Terms, 38 Weeks)
 * Sunday to Thursday academic weeks (standard MENA & International Gulf schedule)
 */
export const ACADEMIC_CALENDAR_2026_2027: AcademicWeek[] = [
  // ── Term 1 (Autumn 2026 - Started Sept 14, 2026) ──
  {
    weekNumber: 1,
    term: '1',
    startDate: '2026-09-14',
    endDate: '2026-09-17',
    labelAr: 'الأسبوع 1: من 14 سبتمبر 2026 إلى 17 سبتمبر 2026',
    labelEn: 'Week 1: Sept 14 – Sept 17, 2026',
    headerDate: 'September 14, 2026',
    rangeText: 'Sept 14-17, 2026',
  },
  {
    weekNumber: 2,
    term: '1',
    startDate: '2026-09-21',
    endDate: '2026-09-24',
    labelAr: 'الأسبوع 2: من 21 سبتمبر 2026 إلى 24 سبتمبر 2026',
    labelEn: 'Week 2: Sept 21 – Sept 24, 2026',
    headerDate: 'September 21, 2026',
    rangeText: 'Sept 21-24, 2026',
  },
  {
    weekNumber: 3,
    term: '1',
    startDate: '2026-09-28',
    endDate: '2026-10-01',
    labelAr: 'الأسبوع 3: من 28 سبتمبر 2026 إلى 1 أكتوبر 2026',
    labelEn: 'Week 3: Sept 28 – Oct 1, 2026',
    headerDate: 'September 28, 2026',
    rangeText: 'Sept 28 - Oct 1, 2026',
  },
  {
    weekNumber: 4,
    term: '1',
    startDate: '2026-10-05',
    endDate: '2026-10-08',
    labelAr: 'الأسبوع 4: من 5 أكتوبر 2026 إلى 8 أكتوبر 2026',
    labelEn: 'Week 4: Oct 5 – Oct 8, 2026',
    headerDate: 'October 5, 2026',
    rangeText: 'Oct 5-8, 2026',
  },
  {
    weekNumber: 5,
    term: '1',
    startDate: '2026-10-12',
    endDate: '2026-10-15',
    labelAr: 'الأسبوع 5: من 12 أكتوبر 2026 إلى 15 أكتوبر 2026',
    labelEn: 'Week 5: Oct 12 – Oct 15, 2026',
    headerDate: 'October 12, 2026',
    rangeText: 'Oct 12-15, 2026',
  },
  {
    weekNumber: 6,
    term: '1',
    startDate: '2026-10-19',
    endDate: '2026-10-22',
    labelAr: 'الأسبوع 6: من 19 أكتوبر 2026 إلى 22 أكتوبر 2026',
    labelEn: 'Week 6: Oct 19 – Oct 22, 2026',
    headerDate: 'October 19, 2026',
    rangeText: 'Oct 19-22, 2026',
  },
  {
    weekNumber: 7,
    term: '1',
    startDate: '2026-10-26',
    endDate: '2026-10-29',
    labelAr: 'الأسبوع 7: من 26 أكتوبر 2026 إلى 29 أكتوبر 2026',
    labelEn: 'Week 7: Oct 26 – Oct 29, 2026',
    headerDate: 'October 26, 2026',
    rangeText: 'Oct 26-29, 2026',
  },
  {
    weekNumber: 8,
    term: '1',
    startDate: '2026-11-02',
    endDate: '2026-11-05',
    labelAr: 'الأسبوع 8: من 2 نوفمبر 2026 إلى 5 نوفمبر 2026',
    labelEn: 'Week 8: Nov 2 – Nov 5, 2026',
    headerDate: 'November 2, 2026',
    rangeText: 'Nov 2-5, 2026',
  },
  {
    weekNumber: 9,
    term: '1',
    startDate: '2026-11-09',
    endDate: '2026-11-12',
    labelAr: 'الأسبوع 9: من 9 نوفمبر 2026 إلى 12 نوفمبر 2026',
    labelEn: 'Week 9: Nov 9 – Nov 12, 2026',
    headerDate: 'November 9, 2026',
    rangeText: 'Nov 9-12, 2026',
  },
  {
    weekNumber: 10,
    term: '1',
    startDate: '2026-11-16',
    endDate: '2026-11-19',
    labelAr: 'الأسبوع 10: من 16 نوفمبر 2026 إلى 19 نوفمبر 2026',
    labelEn: 'Week 10: Nov 16 – Nov 19, 2026',
    headerDate: 'November 16, 2026',
    rangeText: 'Nov 16-19, 2026',
  },
  {
    weekNumber: 11,
    term: '1',
    startDate: '2026-11-23',
    endDate: '2026-11-26',
    labelAr: 'الأسبوع 11: من 23 نوفمبر 2026 إلى 26 نوفمبر 2026',
    labelEn: 'Week 11: Nov 23 – Nov 26, 2026',
    headerDate: 'November 23, 2026',
    rangeText: 'Nov 23-26, 2026',
  },
  {
    weekNumber: 12,
    term: '1',
    startDate: '2026-11-30',
    endDate: '2026-12-03',
    labelAr: 'الأسبوع 12: من 30 نوفمبر 2026 إلى 3 ديسمبر 2026',
    labelEn: 'Week 12: Nov 30 – Dec 3, 2026',
    headerDate: 'November 30, 2026',
    rangeText: 'Nov 30 - Dec 3, 2026',
  },
  {
    weekNumber: 13,
    term: '1',
    startDate: '2026-12-07',
    endDate: '2026-12-10',
    labelAr: 'الأسبوع 13: من 7 ديسمبر 2026 إلى 10 ديسمبر 2026',
    labelEn: 'Week 13: Dec 7 – Dec 10, 2026',
    headerDate: 'December 7, 2026',
    rangeText: 'Dec 7-10, 2026',
  },
  {
    weekNumber: 14,
    term: '1',
    startDate: '2026-12-14',
    endDate: '2026-12-17',
    labelAr: 'الأسبوع 14: من 14 ديسمبر 2026 إلى 17 ديسمبر 2026',
    labelEn: 'Week 14: Dec 14 – Dec 17, 2026',
    headerDate: 'December 14, 2026',
    rangeText: 'Dec 14-17, 2026',
  },

  // ── Term 2 (Winter 2026-2027) ──
  {
    weekNumber: 15,
    term: '2',
    startDate: '2026-12-13',
    endDate: '2026-12-17',
    labelAr: 'الأسبوع 15: من 13 ديسمبر 2026 إلى 17 ديسمبر 2026',
    labelEn: 'Week 15: Dec 13 – Dec 17, 2026',
    headerDate: 'December 13, 2026',
    rangeText: 'Dec 13-17, 2026',
  },
  {
    weekNumber: 16,
    term: '2',
    startDate: '2026-12-20',
    endDate: '2026-12-24',
    labelAr: 'الأسبوع 16: من 20 ديسمبر 2026 إلى 24 ديسمبر 2026',
    labelEn: 'Week 16: Dec 20 – Dec 24, 2026',
    headerDate: 'December 20, 2026',
    rangeText: 'Dec 20-24, 2026',
  },
  {
    weekNumber: 17,
    term: '2',
    startDate: '2027-01-03',
    endDate: '2027-01-07',
    labelAr: 'الأسبوع 17: من 3 يناير 2027 إلى 7 يناير 2027',
    labelEn: 'Week 17: Jan 3 – Jan 7, 2027',
    headerDate: 'January 3, 2027',
    rangeText: 'Jan 3-7, 2027',
  },
  {
    weekNumber: 18,
    term: '2',
    startDate: '2027-01-10',
    endDate: '2027-01-14',
    labelAr: 'الأسبوع 18: من 10 يناير 2027 إلى 14 يناير 2027',
    labelEn: 'Week 18: Jan 10 – Jan 14, 2027',
    headerDate: 'January 10, 2027',
    rangeText: 'Jan 10-14, 2027',
  },
  {
    weekNumber: 19,
    term: '2',
    startDate: '2027-01-17',
    endDate: '2027-01-21',
    labelAr: 'الأسبوع 19: من 17 يناير 2027 إلى 21 يناير 2027',
    labelEn: 'Week 19: Jan 17 – Jan 21, 2027',
    headerDate: 'January 17, 2027',
    rangeText: 'Jan 17-21, 2027',
  },
  {
    weekNumber: 20,
    term: '2',
    startDate: '2027-01-24',
    endDate: '2027-01-28',
    labelAr: 'الأسبوع 20: من 24 يناير 2027 إلى 28 يناير 2027',
    labelEn: 'Week 20: Jan 24 – Jan 28, 2027',
    headerDate: 'January 24, 2027',
    rangeText: 'Jan 24-28, 2027',
  },
  {
    weekNumber: 21,
    term: '2',
    startDate: '2027-01-31',
    endDate: '2027-02-04',
    labelAr: 'الأسبوع 21: من 31 يناير 2027 إلى 4 فبراير 2027',
    labelEn: 'Week 21: Jan 31 – Feb 4, 2027',
    headerDate: 'January 31, 2027',
    rangeText: 'Jan 31 - Feb 4, 2027',
  },
  {
    weekNumber: 22,
    term: '2',
    startDate: '2027-02-07',
    endDate: '2027-02-11',
    labelAr: 'الأسبوع 22: من 7 فبراير 2027 إلى 11 فبراير 2027',
    labelEn: 'Week 22: Feb 7 – Feb 11, 2027',
    headerDate: 'February 7, 2027',
    rangeText: 'Feb 7-11, 2027',
  },
  {
    weekNumber: 23,
    term: '2',
    startDate: '2027-02-14',
    endDate: '2027-02-18',
    labelAr: 'الأسبوع 23: من 14 فبراير 2027 إلى 18 فبراير 2027',
    labelEn: 'Week 23: Feb 14 – Feb 18, 2027',
    headerDate: 'February 14, 2027',
    rangeText: 'Feb 14-18, 2027',
  },
  {
    weekNumber: 24,
    term: '2',
    startDate: '2027-02-21',
    endDate: '2027-02-25',
    labelAr: 'الأسبوع 24: من 21 فبراير 2027 إلى 25 فبراير 2027',
    labelEn: 'Week 24: Feb 21 – Feb 25, 2027',
    headerDate: 'February 21, 2027',
    rangeText: 'Feb 21-25, 2027',
  },
  {
    weekNumber: 25,
    term: '2',
    startDate: '2027-02-28',
    endDate: '2027-03-04',
    labelAr: 'الأسبوع 25: من 28 فبراير 2027 إلى 4 مارس 2027',
    labelEn: 'Week 25: Feb 28 – Mar 4, 2027',
    headerDate: 'February 28, 2027',
    rangeText: 'Feb 28 - Mar 4, 2027',
  },
  {
    weekNumber: 26,
    term: '2',
    startDate: '2027-03-07',
    endDate: '2027-03-11',
    labelAr: 'الأسبوع 26: من 7 مارس 2027 إلى 11 مارس 2027',
    labelEn: 'Week 26: Mar 7 – Mar 11, 2027',
    headerDate: 'March 7, 2027',
    rangeText: 'Mar 7-11, 2027',
  },

  // ── Term 3 (Spring/Summer 2027) ──
  {
    weekNumber: 27,
    term: '3',
    startDate: '2027-03-21',
    endDate: '2027-03-25',
    labelAr: 'الأسبوع 27: من 21 مارس 2027 إلى 25 مارس 2027',
    labelEn: 'Week 27: Mar 21 – Mar 25, 2027',
    headerDate: 'March 21, 2027',
    rangeText: 'Mar 21-25, 2027',
  },
  {
    weekNumber: 28,
    term: '3',
    startDate: '2027-03-28',
    endDate: '2027-04-01',
    labelAr: 'الأسبوع 28: من 28 مارس 2027 إلى 1 أبريل 2027',
    labelEn: 'Week 28: Mar 28 – Apr 1, 2027',
    headerDate: 'March 28, 2027',
    rangeText: 'Mar 28 - Apr 1, 2027',
  },
  {
    weekNumber: 29,
    term: '3',
    startDate: '2027-04-04',
    endDate: '2027-04-08',
    labelAr: 'الأسبوع 29: من 4 أبريل 2027 إلى 8 أبريل 2027',
    labelEn: 'Week 29: Apr 4 – Apr 8, 2027',
    headerDate: 'April 4, 2027',
    rangeText: 'Apr 4-8, 2027',
  },
  {
    weekNumber: 30,
    term: '3',
    startDate: '2027-04-11',
    endDate: '2027-04-15',
    labelAr: 'الأسبوع 30: من 11 أبريل 2027 إلى 15 أبريل 2027',
    labelEn: 'Week 30: Apr 11 – Apr 15, 2027',
    headerDate: 'April 11, 2027',
    rangeText: 'Apr 11-15, 2027',
  },
  {
    weekNumber: 31,
    term: '3',
    startDate: '2027-04-18',
    endDate: '2027-04-22',
    labelAr: 'الأسبوع 31: من 18 أبريل 2027 إلى 22 أبريل 2027',
    labelEn: 'Week 31: Apr 18 – Apr 22, 2027',
    headerDate: 'April 18, 2027',
    rangeText: 'Apr 18-22, 2027',
  },
  {
    weekNumber: 32,
    term: '3',
    startDate: '2027-04-25',
    endDate: '2027-04-29',
    labelAr: 'الأسبوع 32: من 25 أبريل 2027 إلى 29 أبريل 2027',
    labelEn: 'Week 32: Apr 25 – Apr 29, 2027',
    headerDate: 'April 25, 2027',
    rangeText: 'Apr 25-29, 2027',
  },
  {
    weekNumber: 33,
    term: '3',
    startDate: '2027-05-02',
    endDate: '2027-05-06',
    labelAr: 'الأسبوع 33: من 2 مايو 2027 إلى 6 مايو 2027',
    labelEn: 'Week 33: May 2 – May 6, 2027',
    headerDate: 'May 2, 2027',
    rangeText: 'May 2-6, 2027',
  },
  {
    weekNumber: 34,
    term: '3',
    startDate: '2027-05-09',
    endDate: '2027-05-13',
    labelAr: 'الأسبوع 34: من 9 مايو 2027 إلى 13 مايو 2027',
    labelEn: 'Week 34: May 9 – May 13, 2027',
    headerDate: 'May 9, 2027',
    rangeText: 'May 9-13, 2027',
  },
  {
    weekNumber: 35,
    term: '3',
    startDate: '2027-05-16',
    endDate: '2027-05-20',
    labelAr: 'الأسبوع 35: من 16 مايو 2027 إلى 20 مايو 2027',
    labelEn: 'Week 35: May 16 – May 20, 2027',
    headerDate: 'May 16, 2027',
    rangeText: 'May 16-20, 2027',
  },
  {
    weekNumber: 36,
    term: '3',
    startDate: '2027-05-23',
    endDate: '2027-05-27',
    labelAr: 'الأسبوع 36: من 23 مايو 2027 إلى 27 مايو 2027',
    labelEn: 'Week 36: May 23 – May 27, 2027',
    headerDate: 'May 23, 2027',
    rangeText: 'May 23-27, 2027',
  },
  {
    weekNumber: 37,
    term: '3',
    startDate: '2027-05-30',
    endDate: '2027-06-03',
    labelAr: 'الأسبوع 37: من 30 مايو 2027 إلى 3 يونيو 2027',
    labelEn: 'Week 37: May 30 – June 3, 2027',
    headerDate: 'May 30, 2027',
    rangeText: 'May 30 - June 3, 2027',
  },
  {
    weekNumber: 38,
    term: '3',
    startDate: '2027-06-06',
    endDate: '2027-06-10',
    labelAr: 'الأسبوع 38: من 6 يونيو 2027 إلى 10 يونيو 2027',
    labelEn: 'Week 38: June 6 – June 10, 2027',
    headerDate: 'June 6, 2027',
    rangeText: 'June 6-10, 2027',
  },
];

export function getAcademicWeekByNumber(weekNumber: number): AcademicWeek {
  const found = ACADEMIC_CALENDAR_2026_2027.find((w) => w.weekNumber === weekNumber);
  return found || ACADEMIC_CALENDAR_2026_2027[0]; // Default to Week 1
}

/**
 * Checks if grade is Kindergarten through Grade 8 (4-day week: Monday to Thursday)
 * Grade 9 through Grade 12 is 5-day week (Sunday to Thursday)
 */
export function isElementaryOrMiddleSchool(grade: string): boolean {
  if (!grade) return false;
  const normalized = grade.toLowerCase().trim();
  if (
    normalized.includes('kg') ||
    normalized.includes('kindergarten') ||
    normalized.includes('روضة') ||
    normalized.includes('تمهيدي')
  ) {
    return true;
  }
  const match = normalized.match(/grade\s*(\d+)/i) || normalized.match(/صف\s*(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    return num >= 1 && num <= 8;
  }
  return false;
}

export interface DayColumnConfig {
  dayNumber: number;
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
}

/**
 * Returns the exact academic days for a grade:
 * - KG to Grade 8: 4 days (Monday to Thursday)
 * - Grade 9 to 12: 5 days (Sunday to Thursday)
 */
export function getDaysForGrade(grade: string): DayColumnConfig[] {
  if (isElementaryOrMiddleSchool(grade)) {
    // 4 Days: Monday to Thursday
    return [
      { dayNumber: 1, nameEn: 'Monday', nameAr: 'الإثنين', shortEn: 'Mon', shortAr: 'إثنين' },
      { dayNumber: 2, nameEn: 'Tuesday', nameAr: 'الثلاثاء', shortEn: 'Tue', shortAr: 'ثلاثاء' },
      { dayNumber: 3, nameEn: 'Wednesday', nameAr: 'الأربعاء', shortEn: 'Wed', shortAr: 'أربعاء' },
      { dayNumber: 4, nameEn: 'Thursday', nameAr: 'الخميس', shortEn: 'Thu', shortAr: 'خميس' },
    ];
  }

  // Grade 9-12 (High School): 5 Days: Sunday to Thursday
  return [
    { dayNumber: 1, nameEn: 'Sunday', nameAr: 'الأحد', shortEn: 'Sun', shortAr: 'أحد' },
    { dayNumber: 2, nameEn: 'Monday', nameAr: 'الإثنين', shortEn: 'Mon', shortAr: 'إثنين' },
    { dayNumber: 3, nameEn: 'Tuesday', nameAr: 'الثلاثاء', shortEn: 'Tue', shortAr: 'ثلاثاء' },
    { dayNumber: 4, nameEn: 'Wednesday', nameAr: 'الأربعاء', shortEn: 'Wed', shortAr: 'أربعاء' },
    { dayNumber: 5, nameEn: 'Thursday', nameAr: 'الخميس', shortEn: 'Thu', shortAr: 'خميس' },
  ];
}

/**
 * Formats week details specifically for the selected grade:
 * displays date range and header according to whether it's 4 days or 5 days.
 */
export function getAcademicWeekForGrade(weekNumber: number, grade: string): AcademicWeek {
  const baseWeek = getAcademicWeekByNumber(weekNumber);
  const is4Days = isElementaryOrMiddleSchool(grade);

  if (is4Days) {
    return {
      ...baseWeek,
      rangeText: baseWeek.rangeText, // Mon to Thu
      headerDate: baseWeek.headerDate,
    };
  }

  // High school 5-day week: if regular week, starts on Sunday (1 day earlier than Monday)
  return baseWeek;
}

