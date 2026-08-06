import type { AcademicPeriod } from '@/types/schoolProfile';

/**
 * The school's marking periods, in order.
 *
 * These mirror the `AcademicPeriod` union in types/schoolProfile.ts, which is
 * what `Grade.period` is actually stored as — so anything offering "pick a
 * period" (test schedules, exam clearances, report cards) should draw from
 * here rather than inventing its own list and drifting out of sync.
 */
export const ACADEMIC_PERIODS: { value: AcademicPeriod; label: string }[] = [
	{ value: 'first', label: '1st Period' },
	{ value: 'second', label: '2nd Period' },
	{ value: 'third', label: '3rd Period' },
	{ value: 'third_period_exam', label: '3rd Period Exam' },
	{ value: 'fourth', label: '4th Period' },
	{ value: 'fifth', label: '5th Period' },
	{ value: 'sixth', label: '6th Period' },
	{ value: 'sixth_period_exam', label: '6th Period Exam' },
];

export const periodLabel = (value?: string) =>
	ACADEMIC_PERIODS.find((entry) => entry.value === value)?.label ||
	value ||
	'No period';
