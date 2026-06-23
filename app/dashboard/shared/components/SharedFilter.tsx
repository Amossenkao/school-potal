'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import { areAcademicYearsEqual } from '@/utils/academicYear';
import {
  buildSchoolAcademicYearRange,
  getStudentAcademicYears,
  getTeacherAcademicYears,
  pickCurrentOrMostRecentAcademicYear,
  pickMostRecentAcademicYear,
} from '@/utils/academicYearOptions';
import { StudentMultiSelect } from './StudentMultiSelect';
import { PageLoading } from '@/components/loading';
import AccessDenied from '@/components/AccessDenied';

interface BaseFilters {
  academicYear: string;
  selectedStudents: string[];
}

export interface YearlyReportFilters extends BaseFilters {
  session: string;
  classLevel: string;
  className: string;
  sponsorName: string; // NEW: Sponsor name field
}

export interface SemesterReportFilters extends BaseFilters {
  session: string;
  classLevel: string;
  className: string;
  semester: 'first' | 'second' | '';
}

export interface PeriodicReportFilters extends BaseFilters {
  session: string;
  gradeLevel: string;
  className: string;
  period: string;
}

type FilterConfig<T extends BaseFilters> = {
  fields: Array<keyof T>;
  dependencies: Record<keyof T, Array<keyof T>>;
  autoSelectSingle?: boolean;
  studentAutoPopulate?: boolean;
  validateCanSubmit?: (filters: T) => boolean;
  getDefaultAcademicYear?: () => string;
  getAvailableSessions?: (school: any) => string[];
  getAvailableGradeLevels?: (school: any, session: string) => string[];
  getAvailableClasses?: (school: any, session: string, classLevel: string) => any[];
  getFilteredOptions?: (school: any, filters: T) => any[]; // For semester/period options
  renderExtraFields?: (filters: T, setFilters: React.Dispatch<React.SetStateAction<T>>) => JSX.Element;
};

interface SharedFilterProps<T extends BaseFilters> {
  filters: T;
  setFilters: React.Dispatch<React.SetStateAction<T>>;
  onSubmit: () => void;
  config: FilterConfig<T>;
  isStudent?: boolean;
  reportType?: 'yearly' | 'semester' | 'periodic';
  schoolName?: string;
}

export const SharedFilter = <T extends BaseFilters>({
  filters,
  setFilters,
  onSubmit,
  config,
  isStudent = false,
  reportType,
  schoolName,
}: SharedFilterProps<T>) => {
  const currentSchool = useSchoolStore((state) => state.school);
  const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);
  const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
  const user = useAuth((state) => state.user);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const userRole = user?.role || 'student';
  const isSystemAdmin = userRole === 'system_admin';
  const isAdministrator = userRole === 'administrator';
  const isActualStudent = userRole === 'student';

  // Helper function to get student class ID for year
  const getStudentClassIdForYear = useCallback(
    (student: any, academicYear: string) => {
      const yearEntry = Array.isArray(student?.academicYears)
        ? student.academicYears.find((ay: any) =>
            areAcademicYearsEqual(ay.year, academicYear),
          )
        : null;
      if (yearEntry?.classId) return yearEntry.classId;

      const historicalClassId = String(
        student?.historicalClass?.classId || '',
      ).trim();
      const historicalAcademicYear = String(
        student?.historicalClass?.academicYear || '',
      ).trim();
      if (
        historicalClassId &&
        (!historicalAcademicYear ||
          areAcademicYearsEqual(historicalAcademicYear, academicYear))
      ) {
        return historicalClassId;
      }

      const directClassId = String(student?.classId || '').trim();
      if (directClassId) return directClassId;

      const currentClassId = String(student?.currentClass?.classId || '').trim();
      if (currentClassId) return currentClassId;

      return '';
    },
    [],
  );

  const buildStudentFullName = (student: any) =>
    [student?.firstName, student?.middleName, student?.lastName]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim() || (typeof student?.name === 'string' ? student.name.trim() : '');

  const resolveStudentDisplayName = (student: any, fallbackName = '') => {
    const fullName = buildStudentFullName(student);
    if (fullName) return fullName;

    const cachedName =
      typeof student?.name === 'string' ? student.name.trim() : '';
    if (cachedName) return cachedName;

    const apiName =
      typeof student?.studentName === 'string' ? student.studentName.trim() : '';
    if (apiName) return apiName;

    return fallbackName;
  };

  // Academic year options
  const academicYearOptions = useMemo(() => {
    const schoolYears = buildSchoolAcademicYearRange(currentSchool);
    if (isActualStudent) {
      const studentYears = getStudentAcademicYears(user);
      return studentYears.length > 0 ? studentYears : schoolYears;
    }
    if (isSystemAdmin || isAdministrator) {
      return schoolYears;
    }
    if (userRole === 'teacher') {
      const teacherYears = getTeacherAcademicYears(user);
      const scopedYears = teacherYears.filter((year) =>
        schoolYears.some((schoolYear) =>
          areAcademicYearsEqual(schoolYear, year),
        ),
      );
      return scopedYears.length > 0 ? scopedYears : teacherYears;
    }
    return schoolYears;
  }, [
    currentSchool,
    isActualStudent,
    isSystemAdmin,
    isAdministrator,
    userRole,
    user,
  ]);

  const defaultAcademicYear = useMemo(() => {
    const schoolCurrentAcademicYear =
      currentSchool?.currentAcademicYear ||
      (config.getDefaultAcademicYear ? config.getDefaultAcademicYear() : getCurrentAcademicYear());
    if (isActualStudent) {
      return (
        pickMostRecentAcademicYear(
          academicYearOptions,
          schoolCurrentAcademicYear,
        ) || schoolCurrentAcademicYear
      );
    }
    return (
      (config.getCurrentOrMostRecentAcademicYear
        ? config.getCurrentOrMostRecentAcademicYear(
            academicYearOptions,
            schoolCurrentAcademicYear,
          )
        : pickCurrentOrMostRecentAcademicYear(
            academicYearOptions,
            schoolCurrentAcademicYear,
          )) || schoolCurrentAcademicYear
    );
  }, [
    academicYearOptions,
    isActualStudent,
    currentSchool?.currentAcademicYear,
    config.getDefaultAcademicYear,
    config.getCurrentOrMostRecentAcademicYear,
  ]);

  // Available options based on config
  const availableSessions = useMemo(() => {
    if (config.getAvailableSessions) {
      return config.getAvailableSessions(currentSchool);
    }
    return currentSchool?.classLevels ? Object.keys(currentSchool.classLevels) : [];
  }, [currentSchool, config.getAvailableSessions]);

  const availableGradeLevels = useMemo(() => {
    if (config.getAvailableGradeLevels && filters.session) {
      return config.getAvailableGradeLevels(currentSchool, filters.session);
    }
    return filters.session && currentSchool?.classLevels?.[filters.session]
      ? Object.keys(currentSchool.classLevels[filters.session])
      : [];
  }, [filters.session, currentSchool, config.getAvailableGradeLevels]);

  const availableClasses = useMemo(() => {
    if (config.getAvailableClasses && filters.session && filters.classLevel) {
      return config.getAvailableClasses(
        currentSchool,
        filters.session,
        filters.classLevel,
      );
    }
    return filters.session &&
      filters.classLevel &&
      currentSchool?.classLevels?.[filters.session]?.[filters.classLevel]
      ? currentSchool.classLevels[filters.session][filters.classLevel].classes
      : [];
  }, [
    filters.session,
    filters.classLevel,
    currentSchool,
    config.getAvailableClasses,
  ]);

  // Filtered options (e.g., semester options with access restrictions)
  const filteredOptions = useMemo(() => {
    if (config.getFilteredOptions) {
      return config.getFilteredOptions(currentSchool, filters);
    }
    return [];
  }, [currentSchool, filters, config.getFilteredOptions]);

  // Auto-select single available options
  useEffect(() => {
    if (!config.autoSelectSingle) return;

    // Auto-select session if only one is available
    if (
      !isActualStudent &&
      availableSessions.length === 1 &&
      config.fields.includes('session')
    ) {
      setFilters((prev) => {
        const nextSession = availableSessions[0];
        if (prev.session === nextSession) return prev;
        return {
          ...prev,
          session: nextSession,
          // Reset dependent fields
          ...(config.dependencies.session || []).reduce(
            (acc, depField) => ({
              ...acc,
              [depField]: '',
            }),
            {},
          ),
          selectedStudents: [],
        };
      });
    }

    // Auto-select grade level if only one is available for the selected session
    if (
      !isActualStudent &&
      filters.session &&
      !filters.gradeLevel &&
      config.fields.includes('gradeLevel') &&
      availableGradeLevels.length === 1
    ) {
      setFilters((prev) => {
        const nextClassLevel = availableGradeLevels[0];
        if (prev.classLevel === nextClassLevel) return prev;
        return {
          ...prev,
          classLevel: nextClassLevel,
          // Reset dependent fields
          ...(config.dependencies.gradeLevel || []).reduce(
            (acc, depField) => ({
              ...acc,
              [depField]: '',
            }),
            {},
          ),
          selectedStudents: [],
        };
      });
    }

    // Auto-select class if only one is available for the selected session and grade level
    if (
      !isActualStudent &&
      filters.classLevel &&
      !filters.className &&
      config.fields.includes('className') &&
      availableClasses.length === 1
    ) {
      setFilters((prev) => ({
        ...prev,
        className: availableClasses[0].classId,
        selectedStudents: [],
      }));
    }
  }, [
    isActualStudent,
    availableSessions,
    availableGradeLevels,
    availableClasses,
    filters.session,
    filters.gradeLevel,
    filters.classLevel,
    config.autoSelectSingle,
    config.fields,
    config.dependencies,
    setFilters,
  ]);

  // Fetch students when className changes
  useEffect(() => {
    if (!config.fields.includes('className') || !filters.className) {
      setStudents([]);
      if (!isActualStudent) {
        setFilters((prev) =>
          prev.selectedStudents.length === 0
            ? prev
            : { ...prev, selectedStudents: [] },
        );
      }
      return;
    }

    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const offline =
          typeof navigator !== 'undefined' && navigator.onLine === false;
        const cachedUsers = getScopedAcademicYearValue(
          usersByAcademicYear,
          filters.academicYear,
        ).value;
        if (cachedUsers?.students?.length) {
          const filtered = cachedUsers.students.filter(
            (student: any) =>
              getStudentClassIdForYear(student, filters.academicYear) ===
              filters.className,
          );
          if (filtered.length > 0) {
            const mappedStudents = filtered.map((student: any) => {
              const classId = getStudentClassIdForYear(
                student,
                filters.academicYear,
              );
              return {
                id: normalizeStudentId(
                  student.studentId,
                  student.id,
                  student._id,
                ),
                name: buildStudentFullName(student),
                className: classId,
              };
            });
            setStudents(mappedStudents);
            return;
          }
        }
        const cacheKey = `${reportType || 'report'}:students:${filters.academicYear}:${filters.className}`;
        const cached = getClientCache<any[]>(cacheKey);
        if (cached) {
          setStudents(cached);
          return;
        }
        if (offline) {
          setStudents([]);
          return;
        }
        const response = await fetch(
          `/api/users?classId=${filters.className}&role=student&academicYear=${filters.academicYear}`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }
        const responseData = await response.json();
        if (responseData.success && responseData.data) {
          setUsersForYear(
            filters.academicYear,
            {
              students: Array.isArray(responseData.data)
                ? responseData.data
                : [],
            },
            { merge: true },
          );
          const mappedStudents = responseData.data.map((student: any) => ({
            id: normalizeStudentId(
              student.studentId,
              student.id,
              student._id,
            ),
            name: buildStudentFullName(student),
            className: getStudentClassIdForYear(
              student,
              filters.academicYear,
            ),
          }));
          setStudents(mappedStudents);
          setClientCache(cacheKey, mappedStudents, OFFLINE_CACHE_TTL_MS);
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    if (config.fields.includes('className')) {
      fetchStudents();
    }
  }, [
    filters.className,
    filters.academicYear,
    isActualStudent,
    setFilters,
    usersByAcademicYear,
    setUsersForYear,
    getStudentClassIdForYear,
    reportType,
  ]);

  // Validate selected students against available students
  useEffect(() => {
    if (!isActualStudent) return;
    const allowedIds = new Set(students.map((student) => student.id));
    setFilters((prev) => {
      if (!prev.selectedStudents.length) return prev;
      const nextSelected = prev.selectedStudents.filter((studentId) =>
        allowedIds.has(normalizeStudentId(studentId)),
      );
      if (nextSelected.length === prev.selectedStudents.length) {
        return prev;
      }
      return {
        ...prev,
        selectedStudents: nextSelected,
      };
    });
  }, [students, isActualStudent, setFilters]);

  // Can submit logic
  const canSubmit = useMemo(() => {
    if (config.validateCanSubmit) {
      return config.validateCanSubmit(filters);
    }
    // Default implementation - check required fields
    const requiredFields = config.fields.filter(
      (field) =>
        field !== 'selectedStudents' && // selectedStudents can be empty
        field !== 'sponsorName', // sponsorName is optional
    );
    return requiredFields.every((field) => !!filters[field as keyof T]);
  }, [filters, config.validateCanSubmit, config.fields]);

  // Handle student auto-population
  useEffect(() => {
    if (!config.studentAutoPopulate || !isActualStudent || !user) return;
    const yearEntry = Array.isArray(user?.academicYears)
      ? user.academicYears.find((ay: any) =>
          areAcademicYearsEqual(ay.year, filters.academicYear),
        )
      : null;
    const classIdForYear =
      yearEntry?.classId ||
      (areAcademicYearsEqual(
        filters.academicYear,
        currentSchool?.currentAcademicYear || getCurrentAcademicYear(),
      )
        ? user.classId || ''
        : '');
    const classMeta = getClassMetaById(
      currentSchool?.classLevels,
      classIdForYear,
    );
    const nextSelectedStudents = [normalizeStudentId(user.studentId, user.id)];

    setFilters((prev) => {
      const next = {
        ...prev,
        session: classMeta?.session || '',
        classLevel: classMeta?.level || '',
        className: classIdForYear || '',
        selectedStudents: nextSelectedStudents,
      };
      const isSameSelection =
        prev.selectedStudents.length === nextSelectedStudents.length &&
        prev.selectedStudents.every(
          (studentId, index) => studentId === nextSelectedStudents[index],
        );
      if (
        prev.session === next.session &&
        prev.classLevel === next.classLevel &&
        prev.className === next.className &&
        isSameSelection
      ) {
        return prev;
      }
      return next;
    });
  }, [
    isActualStudent,
    user,
    filters.academicYear,
    setFilters,
    currentSchool,
    config.studentAutoPopulate,
  ]);

  // Keep academic year valid
  useEffect(() => {
    const isSelectedYearAvailable = academicYearOptions.some((year) =>
      areAcademicYearsEqual(year, filters.academicYear),
    );
    if (!filters.academicYear || !isSelectedYearAvailable) {
      setFilters((prev) => ({
        ...prev,
        academicYear: defaultAcademicYear,
      }));
    }
  }, [
    filters.academicYear,
    academicYearOptions,
    defaultAcademicYear,
    setFilters,
  ]);

  const getScopedAcademicYearValue = (
    obj: any,
    year: string,
  ) => {
    return Object.entries(obj || {}).reduce(
      (acc, [key, value]) => {
        if (areAcademicYearsEqual(key, year)) {
          return { value, index: acc.index };
        }
        return acc;
      },
      { value: null, index: -1 },
    );
  };

  const OFFLINE_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

  const normalizeStudentId = (...ids: Array<unknown>) => {
    for (const id of ids) {
      if (id === null || id === undefined) continue;
      const normalized = String(id).trim();
      if (normalized) return normalized;
    }
    return '';
  };

  if (
    isActualStudent &&
    currentSchool?.settings?.studentSettings?.yearlyReportAccess === false
  ) {
    return (
      <AccessDenied
        message="You are currently not allowed to view yearly reports"
        description=""
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
      <div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4 text-center">
          {reportType === 'yearly'
            ? 'My Report Card'
            : reportType === 'semester'
            ? 'My Semester Report'
            : 'Filter Report Card'}
        </h2>

        {academicYearOptions.length > 1 && config.fields.includes('academicYear') && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Academic Year
            </label>
            <select
              value={filters.academicYear}
              onChange={(e) => {
                setFilters((f) => ({
                  ...f,
                  academicYear: e.target.value,
                  // Reset dependent fields when academic year changes
                  ...(config.dependencies.academicYear || []).reduce(
                    (acc, depField) => ({
                      ...acc,
                      [depField]: '',
                    }),
                    {},
                  ),
                  selectedStudents: [],
                }));
              }}
              className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}

        {availableSessions.length > 1 &&
          config.fields.includes('session') && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Session</label>
              <select
                value={filters.session}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    session: e.target.value,
                    // Reset dependent fields when session changes
                    ...(config.dependencies.session || []).reduce(
                      (acc, depField) => ({
                        ...acc,
                        [depField]: '',
                      }),
                      {},
                    ),
                    selectedStudents: [],
                  }))
                }
                className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
                disabled={!filters.academicYear}
              >
                <option value="">Select Session</option>
                {availableSessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>
          )}

        {filters.session &&
          availableGradeLevels.length > 1 &&
          config.fields.includes('classLevel') && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Grade Level
              </label>
              <select
                value={filters.classLevel}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    classLevel: e.target.value,
                    // Reset dependent fields when class level changes
                    ...(config.dependencies.classLevel || []).reduce(
                      (acc, depField) => ({
                        ...acc,
                        [depField]: '',
                      }),
                      {},
                    ),
                    selectedStudents: [],
                  }))
                }
                className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
                disabled={!filters.session}
              >
                <option value="">Select Grade Level</option>
                {availableGradeLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          )}

        {filters.classLevel &&
          availableClasses.length > 1 &&
          config.fields.includes('className') && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Class</label>
              <select
                value={filters.className}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    className: e.target.value,
                    selectedStudents: [],
                  }))
                }
                className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
                disabled={!filters.classLevel}
              >
                <option value="">Select Class</option>
                {availableClasses.map((classInfo: any) => (
                  <option key={classInfo.classId} value={classInfo.classId}>
                    {classInfo.name}
                  </option>
                ))}
              </select>
            </div>
          )}

        {filters.className && (
          <div className="mb-4">
            {loadingStudents ? (
              <div className="text-center py-4">
                <PageLoading fullScreen={false} variant="minimal" size="sm" />
              </div>
            ) : (
              <StudentMultiSelect
                students={students}
                selectedStudents={filters.selectedStudents}
                onSelectionChange={(studentIds) =>
                  setFilters((prev) => ({
                    ...prev,
                    selectedStudents: studentIds,
                  }))
                }
              />
            )}
          </div>
        )}

        {config.renderExtraFields && (
          <div className="mb-4">
            {config.renderExtraFields(filters, setFilters)}
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onSubmit}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            disabled={!canSubmit}
          >
            {isActualStudent ? 'View Report' : 'Apply Filter'}
          </button>
        </div>
      </div>
    </div>
  );
};