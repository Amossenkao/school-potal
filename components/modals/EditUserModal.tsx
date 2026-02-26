// modals/EditUserModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, AlertTriangle } from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import ConflictModal from './ConflictModal'; // Import the new modal
import { motion, AnimatePresence } from 'framer-motion';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

// Helper function to find the differences between two objects
const getChangedFields = (originalUser, updatedFormData) => {
	const changes = {};
	if (!originalUser || !updatedFormData) return changes;

	Object.keys(updatedFormData).forEach((key) => {
		if (key === 'isSponsor') return;
		if (
			JSON.stringify(originalUser[key]) !== JSON.stringify(updatedFormData[key])
		) {
			changes[key] = updatedFormData[key];
		}
	});

	return changes;
};

const EditUserModal = ({ isOpen, onClose, user, onSave, setFeedback }) => {
	const [formData, setFormData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [validationErrors, setValidationErrors] = useState([]);
	const [conflictState, setConflictState] = useState(null);
	const [expandedAccordions, setExpandedAccordions] = useState({});
	const [showPromotionModal, setShowPromotionModal] = useState(false);
	const [showDemotionModal, setShowDemotionModal] = useState(false);
	const [showCarryOverModal, setShowCarryOverModal] = useState(false);
	const [promotionForm, setPromotionForm] = useState({
		type: 'yearlyPromotion',
		classId: '',
		className: '',
		academicYear: '',
	});
	const [demotionForm, setDemotionForm] = useState({
		type: 'yearlyDemotion',
		classId: '',
		className: '',
		academicYear: '',
	});
	const [carryOverAcademicYear, setCarryOverAcademicYear] = useState('');
	const [carryOverSubjects, setCarryOverSubjects] = useState<any[]>([]);
	const [carryOverSponsorClass, setCarryOverSponsorClass] = useState<string | null>(
		null,
	);
	const [carryOverPosition, setCarryOverPosition] = useState('');
	const [carryOverAssignmentsExpanded, setCarryOverAssignmentsExpanded] =
		useState(false);
	const [carryOverExpandedAccordions, setCarryOverExpandedAccordions] = useState(
		{} as Record<string, boolean>,
	);
	const [actionError, setActionError] = useState('');
	const [actionLoading, setActionLoading] = useState(false);

	const schoolProfile = useSchoolStore((state) => state.school);
	const allowsDemotion =
		schoolProfile?.settings?.gradingSettings?.givesDemotion === true;
	const allowsDoublePromotion =
		schoolProfile?.settings?.gradingSettings?.givesDoublePromotion === true;

	const getClassNameFromId = (classId) => {
		if (!classId || !schoolProfile?.classLevels) return classId;
		for (const session of Object.values(schoolProfile.classLevels)) {
			if (!session || typeof session !== 'object') continue;
			for (const level of Object.values(session)) {
				if (!level?.classes || !Array.isArray(level.classes)) continue;
				const found = level.classes.find((cls) => cls.classId === classId);
				if (found) return found.name || classId;
			}
		}
		return classId;
	};

	const getYearsSpent = (profile) => {
		if (!profile) return 0;
		if (profile.role === 'student') {
			return profile.academicYears?.length || 0;
		}
		if (profile.role === 'teacher') {
			const years = new Set(
				(profile.subjects || []).map((s) => s.year).filter(Boolean),
			);
			return years.size;
		}
		if (profile.role === 'administrator') {
			return profile.academicYears?.length || 0;
		}
		return 0;
	};

	const getTeacherCurrentYearData = (profile) => {
		const years = (profile?.subjects || []).map((s) => s.year).filter(Boolean);
		if (years.length === 0) return null;
		const currentYear = years.sort((a, b) => b.localeCompare(a))[0];
		return (profile.subjects || []).find((s) => s.year === currentYear) || null;
	};

	const getAcademicYearTimeline = (profile) => {
		if (!profile || profile.role !== 'student') return [];
		return (profile.academicYears || [])
			.slice()
			.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
	};

	const getAdminTimeline = (profile) => {
		if (!profile || profile.role !== 'administrator') return [];
		return (profile.academicYears || [])
			.slice()
			.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
	};

	const getAllClassesWithSessionAndLevel = () => {
		if (!schoolProfile?.classLevels) return [];
		const all = [];
		Object.entries(schoolProfile.classLevels).forEach(([session, levels]) => {
			if (!levels || typeof levels !== 'object') return;
			Object.entries(levels).forEach(([level, levelData]) => {
				levelData.classes?.forEach((cls) => {
					all.push({ ...cls, session, level });
				});
			});
		});
		return all;
	};

	const getClassMetaById = (classId) => {
		if (!classId || !schoolProfile?.classLevels) return null;
		for (const [session, levels] of Object.entries(schoolProfile.classLevels)) {
			if (!levels || typeof levels !== 'object') continue;
			for (const [level, levelData] of Object.entries(levels)) {
				if (!levelData?.classes || !Array.isArray(levelData.classes)) continue;
				const found = levelData.classes.find((cls) => cls.classId === classId);
				if (found) return { ...found, session, level };
			}
		}
		return null;
	};

	const normalizeClassName = (name) => {
		if (!name) return '';
		return name.replace(/\s*-?\s*[A-D]$/i, '').trim();
	};

	const getOrderedClassesForSession = (session) => {
		if (!session || !schoolProfile?.classLevels?.[session]) return [];
		const ordered = [];
		Object.entries(schoolProfile.classLevels[session]).forEach(
			([level, levelData]) => {
				levelData.classes?.forEach((cls) => {
					ordered.push({ ...cls, session, level });
				});
			},
		);
		return ordered;
	};

	const getPromotionClassOptions = () => {
		const current = getClassMetaById(formData?.classId || user?.classId);
		if (!current) return getAllClassesWithSessionAndLevel();
		const ordered = getOrderedClassesForSession(current.session);
		const index = ordered.findIndex((cls) => cls.classId === current.classId);
		const currentBase = normalizeClassName(current.name);
		const higher = index >= 0 ? ordered.slice(index + 1) : ordered;
		return higher.filter((cls) => normalizeClassName(cls.name) !== currentBase);
	};

	const isAtHighestClass = () => {
		const current = getClassMetaById(formData?.classId || user?.classId);
		if (!current) return false;
		const ordered = getOrderedClassesForSession(current.session);
		const currentIndex = ordered.findIndex(
			(cls) => cls.classId === current.classId,
		);
		if (currentIndex === -1) return false;
		const currentBase = normalizeClassName(current.name);
		const hasHigherBaseClass = ordered
			.slice(currentIndex + 1)
			.some((cls) => normalizeClassName(cls.name) !== currentBase);
		return !hasHigherBaseClass;
	};

	const getDemotionClassOptions = () => {
		const current = getClassMetaById(formData?.classId || user?.classId);
		if (!current) return getAllClassesWithSessionAndLevel();
		const ordered = getOrderedClassesForSession(current.session);
		const index = ordered.findIndex((cls) => cls.classId === current.classId);
		const currentBase = normalizeClassName(current.name);
		const lower = index >= 0 ? ordered.slice(0, index) : ordered;
		return lower.filter((cls) => normalizeClassName(cls.name) !== currentBase);
	};

	const generateAcademicYears = (yearsAhead = 5) => {
		const years = [];
		const currentYear = new Date().getFullYear();
		for (let i = 0; i < yearsAhead + 3; i++) {
			const year = currentYear - 2 + i;
			years.push(`${year}-${year + 1}`);
		}
		return years;
	};

	const getAcademicYear = () => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();
		return currentMonth >= 7
			? `${currentYear}-${currentYear + 1}`
			: `${currentYear - 1}-${currentYear}`;
	};

	const getAcademicYearStart = (year) => {
		if (!year || typeof year !== 'string') return null;
		const start = Number.parseInt(year.split('-')[0], 10);
		return Number.isFinite(start) ? start : null;
	};

	const getCurrentAcademicYear = () =>
		schoolProfile?.currentAcademicYear || getAcademicYear();

	const getCurrentAndNextAcademicYears = () => {
		const currentYear = getCurrentAcademicYear();
		const currentStart = getAcademicYearStart(currentYear);
		if (!currentYear || currentStart === null) return [];
		const nextYear = `${currentStart + 1}-${currentStart + 2}`;
		return Array.from(new Set([currentYear, nextYear]));
	};

	const getLatestAcademicYearStartForUser = (profile) => {
		if (!profile) return null;
		let years = [];
		if (profile.role === 'student') {
			years = Array.isArray(profile.academicYears)
				? profile.academicYears.map((entry) => entry?.year)
				: [];
		} else if (profile.role === 'teacher') {
			years = Array.isArray(profile.subjects)
				? profile.subjects.map((entry) => entry?.year)
				: [];
		} else if (profile.role === 'administrator') {
			years = Array.isArray(profile.academicYears)
				? profile.academicYears.map((entry) => entry?.year)
				: [];
		}
		const starts = years
			.map((year) => getAcademicYearStart(year))
			.filter((start) => start !== null);
		if (starts.length === 0) return null;
		return Math.max(...starts);
	};

	const hasYearOptionLaterThanUser = (options, profile = user) => {
		if (!Array.isArray(options) || options.length === 0) return false;
		const latestStart = getLatestAcademicYearStartForUser(profile);
		if (latestStart === null) return options.length > 0;
		return options.some((year) => {
			const start = getAcademicYearStart(year);
			return start !== null && start > latestStart;
		});
	};

	useEffect(() => {
		if (user) {
			const userData = JSON.parse(JSON.stringify(user));
			if (userData.role === 'student' && userData.classId && schoolProfile) {
				const allClasses = getAllClassesWithSessionAndLevel();
				const foundClass = allClasses.find(
					(cls) => cls.classId === userData.classId,
				);
				if (foundClass) {
					userData.session = userData.session || foundClass.session;
					userData.classLevel = userData.classLevel || foundClass.level;
					userData.className = userData.className || foundClass.name;
				}
			}
			if (userData.role === 'teacher') {
				const activeYear = getCurrentAcademicYear();
				const yearData =
					userData.subjects?.find((entry) => entry.year === activeYear) ||
					(userData.subjects || [])
						.slice()
						.sort((a, b) => (b.year || '').localeCompare(a.year || ''))[0];
				const selectionMap = new Map();
				(yearData?.classes || []).forEach((classData) => {
					const meta = getClassMetaById(classData.classId);
					if (!meta) return;
					(classData.subjects || []).forEach((subject) => {
						const key = `${meta.session}|${meta.level}|${subject}`;
						if (!selectionMap.has(key)) {
							selectionMap.set(key, {
								subject,
								level: meta.level,
								session: meta.session,
							});
						}
					});
				});
				userData.subjects = Array.from(selectionMap.values());
			}

			setFormData(userData);
			setValidationErrors([]);
			setConflictState(null);
			setActionError('');
			setExpandedAccordions({});

			setPromotionForm({
				type: 'yearlyPromotion',
				classId: '',
				className: '',
				academicYear: '',
			});
			setDemotionForm({
				type: 'yearlyDemotion',
				classId: '',
				className: '',
				academicYear: '',
			});
			setCarryOverAcademicYear('');
			setCarryOverSubjects([]);
			setCarryOverSponsorClass(null);
			setCarryOverPosition(userData.position || '');
			setCarryOverAssignmentsExpanded(false);
			setCarryOverExpandedAccordions({});
		}
	}, [user, schoolProfile]);

	useEffect(() => {
		if (!isOpen) return undefined;
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [isOpen]);

	const getSessions = () =>
		schoolProfile?.classLevels ? Object.keys(schoolProfile.classLevels) : [];
	const getClassLevels = (session) =>
		schoolProfile?.classLevels?.[session]
			? Object.keys(schoolProfile.classLevels[session])
			: [];
	const getSubjectName = (subjectValue) => {
		if (typeof subjectValue === 'string') return subjectValue;
		if (subjectValue && typeof subjectValue === 'object') {
			return subjectValue.name || subjectValue.subject || '';
		}
		return '';
	};
	const getSubjectsBySessionAndLevel = (session, level) =>
		schoolProfile?.classLevels?.[session]?.[level]?.subjects || [];
	const getAllClassesForSession = (session) => {
		if (!schoolProfile?.classLevels?.[session]) return [];
		return Object.values(schoolProfile.classLevels[session]).flatMap(
			(level) => level.classes || [],
		);
	};
	const getClassesBySessionAndLevel = (session, level) =>
		schoolProfile?.classLevels?.[session]?.[level]?.classes || [];
	const getSelfContainedClasses = (session) => {
		if (!session) return [];
		return getClassesBySessionAndLevel(session, 'Self Contained');
	};
	const getAllClassesWithLevelsForSession = (session) => {
		if (!schoolProfile?.classLevels?.[session]) return [];
		const allClasses = [];
		Object.entries(schoolProfile.classLevels[session]).forEach(
			([level, levelData]) => {
				levelData.classes?.forEach((cls) => {
					allClasses.push({ ...cls, level });
				});
			},
		);
		return allClasses;
	};

	const getFullName = (profile) => {
		if (!profile) return 'User';
		return [profile.firstName, profile.middleName, profile.lastName]
			.filter(Boolean)
			.join(' ')
			.trim() || 'User';
	};

	const selectTriggerClass =
		'bg-gradient-to-br from-background to-muted/30 border-border/70 hover:border-primary/40 focus:ring-2 focus:ring-primary/30 transition';

	const adminPositions = [
		'Principal',
		'Vice Principal',
		'Academic Director',
		'Dean of Students',
		'Registrar',
		'Finance Officer',
		'IT Administrator',
		'HR Manager',
		'Guidance Counselor',
		'Librarian',
		'Secretary',
		'Administrative Assistant',
	];

	const getLevelVisualStyle = (level = '') => {
		const normalized = String(level).trim().toLowerCase();

		if (
			normalized.includes('elementary') ||
			normalized.includes('primary') ||
			normalized.includes('nursery')
		) {
			return {
				section: 'border-sky-200/70 bg-sky-50/40',
				badge: 'border-sky-300 bg-sky-100 text-sky-800',
			};
		}

		if (
			normalized.includes('junior') ||
			normalized.includes('middle') ||
			normalized.includes('jhs')
		) {
			return {
				section: 'border-emerald-200/70 bg-emerald-50/40',
				badge: 'border-emerald-300 bg-emerald-100 text-emerald-800',
			};
		}

		if (normalized.includes('senior') || normalized.includes('shs')) {
			return {
				section: 'border-amber-200/70 bg-amber-50/40',
				badge: 'border-amber-300 bg-amber-100 text-amber-900',
			};
		}

		return {
			section: 'border-border/70 bg-muted/20',
			badge: 'border-border/80 bg-muted text-foreground',
		};
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleGuardianInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			guardian: {
				...(prev.guardian || {}),
				[name]: value,
			},
		}));
	};

	const handleStudentSessionChange = (newSession) => {
		setFormData((prev) => ({
			...prev,
			session: newSession,
			classId: '',
			className: '',
			classLevel: '',
		}));
	};

	const handleStudentClassChange = (newClassId) => {
		if (!newClassId) {
			setFormData((prev) => ({
				...prev,
				classId: '',
				className: '',
				classLevel: '',
			}));
			return;
		}
		const allClasses = getAllClassesWithLevelsForSession(formData.session);
		const selectedClass = allClasses.find((c) => c.classId === newClassId);
		if (selectedClass) {
			setFormData((prev) => ({
				...prev,
				classId: selectedClass.classId,
				className: selectedClass.name,
				classLevel: selectedClass.level,
			}));
		}
	};

	const handleSubjectChange = (subject, level, session, checked) => {
		setFormData((prev) => {
			let existingSubjects = prev.subjects || [];
			// Clear self-contained selection for the session if a regular subject is selected
			const selfContainedInSession = existingSubjects.some(
				(s) => s.session === session && s.level === 'Self Contained',
			);

			if (selfContainedInSession) {
				existingSubjects = existingSubjects.filter(
					(s) => s.session !== session || s.level !== 'Self Contained',
				);
			}

			let updatedSubjects;
			if (checked) {
				updatedSubjects = [...existingSubjects, { subject, level, session }];
			} else {
				updatedSubjects = existingSubjects.filter(
					(s) =>
						!(
							s.subject === subject &&
							s.level === level &&
							s.session === session
						),
				);
			}
			return {
				...prev,
				subjects: updatedSubjects,
				sponsorClass: selfContainedInSession ? null : prev.sponsorClass,
			};
		});
	};

	const handleSelfContainedSelection = (classId, session, checked) => {
		setFormData((prev) => {
			const otherSubjectsInSession = (prev.subjects || []).filter(
				(s) => s.session !== session,
			);
			const updatedSubjects = checked
				? [
						...otherSubjectsInSession,
						...getSubjectsBySessionAndLevel(session, 'Self Contained')
							.map((subjectValue) => getSubjectName(subjectValue))
							.filter(Boolean)
							.map((subjectName) => ({
								subject: subjectName,
								level: 'Self Contained',
								session,
							})),
					]
				: otherSubjectsInSession;

			return {
				...prev,
				subjects: updatedSubjects,
				sponsorClass: checked ? classId : null,
			};
		});
	};

	const handleSponsorClassChange = (session, value) => {
		setFormData((prev) => {
			const normalizedValue = value === '__none__' ? null : value;
			const isSelfContained = (prev.subjects || []).some(
				(s) => s.level === 'Self Contained' && s.session === session,
			);
			if (!isSelfContained) {
				return {
					...prev,
					sponsorClass: normalizedValue,
				};
			}

			const otherSubjects = (prev.subjects || []).filter(
				(s) => s.session !== session,
			);
			return {
				...prev,
				subjects: otherSubjects,
				sponsorClass: normalizedValue,
			};
		});
	};

	const handleCarryOverSelfContainedSelection = (classId, session, checked) => {
		setCarryOverSubjects((prev) => {
			const otherSubjectsInSession = (prev || []).filter(
				(s) => s.session !== session,
			);
			const updatedSubjects = checked
				? [
						...otherSubjectsInSession,
						...getSubjectsBySessionAndLevel(session, 'Self Contained')
							.map((subjectValue) => getSubjectName(subjectValue))
							.filter(Boolean)
							.map((subjectName) => ({
								subject: subjectName,
								level: 'Self Contained',
								session,
							})),
					]
				: otherSubjectsInSession;
			return updatedSubjects;
		});
		setCarryOverSponsorClass(checked ? classId : null);
	};

	const handleCarryOverSponsorClassChange = (session, value) => {
		const normalizedValue = value === '__none__' ? null : value;
		const isSelfContained = (carryOverSubjects || []).some(
			(s) => s.level === 'Self Contained' && s.session === session,
		);
		if (isSelfContained) {
			setCarryOverSubjects((prev) =>
				(prev || []).filter((s) => s.session !== session),
			);
		}
		setCarryOverSponsorClass(normalizedValue);
	};

	const handleCarryOverSubjectChange = (subject, level, session, checked) => {
		let updatedSubjects = [...(carryOverSubjects || [])];
		const selfContainedSubjectsInSession = updatedSubjects.filter(
			(s) => s.session === session && s.level === 'Self Contained',
		);

		if (selfContainedSubjectsInSession.length > 0) {
			updatedSubjects = updatedSubjects.filter(
				(s) => s.session !== session || s.level !== 'Self Contained',
			);
		}

		if (checked) {
			updatedSubjects.push({ subject, level, session });
		} else {
			updatedSubjects = updatedSubjects.filter(
				(s) =>
					!(
						s.subject === subject &&
						s.level === level &&
						s.session === session
					),
			);
		}

		setCarryOverSubjects(updatedSubjects);
		if (selfContainedSubjectsInSession.length > 0) {
			const sponsorInSession =
				carryOverSponsorClass &&
				getAllClassesForSession(session).some(
					(cls) => cls.classId === carryOverSponsorClass,
				);
			if (sponsorInSession) {
				setCarryOverSponsorClass(null);
			}
		}
	};

	const toggleCarryOverAccordion = (session) => {
		setCarryOverExpandedAccordions((prev) => ({
			...prev,
			[session]: !prev[session],
		}));
	};

	const getTeacherLatestYearEntry = (profile) => {
		const entries = Array.isArray(profile?.subjects) ? profile.subjects : [];
		if (entries.length === 0) return null;
		return (
			entries
				.filter((entry) => entry?.year)
				.slice()
				.sort(
					(a, b) =>
						(getAcademicYearStart(b?.year) ?? -1) -
						(getAcademicYearStart(a?.year) ?? -1),
				)[0] || null
		);
	};

	const mapYearEntryToTeacherSelections = (yearEntry) => {
		const selectionMap = new Map();
		(yearEntry?.classes || []).forEach((classData) => {
			const classMeta = getClassMetaById(classData?.classId);
			if (!classMeta) return;
			(classData?.subjects || []).forEach((subjectValue) => {
				const subjectName =
					typeof subjectValue === 'string'
						? subjectValue
						: subjectValue?.subject || subjectValue?.name;
				if (!subjectName) return;
				const key = `${classMeta.session}|${classMeta.level}|${subjectName}`;
				if (!selectionMap.has(key)) {
					selectionMap.set(key, {
						subject: subjectName,
						level: classMeta.level,
						session: classMeta.session,
					});
				}
			});
		});
		return Array.from(selectionMap.values());
	};

	const fetchReassignedTeachers = async (reassignments) => {
		const reassignedTeacherIds = Array.isArray(reassignments?.details)
			? reassignments.details
					.map((detail) => detail?.previousTeacher?.id)
					.filter(Boolean)
			: [];
		if (reassignedTeacherIds.length === 0) return [];

		const results = await Promise.all(
			reassignedTeacherIds.map(async (id) => {
				try {
					const res = await fetch(`/api/users?id=${id}`);
					if (!res.ok) return null;
					const data = await res.json();
					return data.data;
				} catch {
					return null;
				}
			}),
		);

		return results.filter(Boolean);
	};

	const handleSave = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setValidationErrors([]);
		setConflictState(null);

		const payload =
			user?.role === 'teacher'
				? { ...formData, subjects: buildTeacherSubjectsPayload() }
				: formData;
		const changedData = getChangedFields(user, payload);

		if (Object.keys(changedData).length === 0) {
			setFeedback({ type: 'info', message: 'No changes were made.' });
			setIsLoading(false);
			onClose();
			return;
		}

		try {
			const res = await fetch(`/api/users?id=${user._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...changedData, forceAssignments: false }),
			});
			const data = await res.json();

			if (!res.ok) {
				if (res.status === 409 && data.requiresConfirmation) {
					setConflictState({
						conflicts: data.conflicts || [],
						conflictSummary: data.conflictSummary || {},
						errors: data.errors || [],
						changedData,
						mode: 'profile-update',
					});
				} else if (res.status === 400 && data.errors) {
					setValidationErrors(data.errors);
				} else {
					setValidationErrors([
						{ message: data.message || 'An unexpected error occurred.' },
					]);
				}
				setIsLoading(false);
				return;
			}

			const updatedReassignedTeachers = await fetchReassignedTeachers(
				data.reassignments,
			);
			if (data.reassignments?.performed) {
				setFeedback({
					type: 'success',
					message: `User updated successfully. ${data.reassignments.count} assignment(s) were reassigned.`,
				});
			} else {
				setFeedback({ type: 'success', message: 'User updated successfully.' });
			}
			onSave(data.data.user, updatedReassignedTeachers);
		} catch (err) {
			setValidationErrors([
				{ message: err.message || 'A network error occurred.' },
			]);
			setIsLoading(false);
		}
	};

	const handleConfirmReassignment = async () => {
		if (!conflictState) return;
		setIsLoading(true);
		setValidationErrors([]);
		setActionError('');

		try {
			if (conflictState.mode === 'carry-over') {
				const res = await fetch(
					`/api/users?id=${user._id}&action=addAcademicYear`,
					{
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							...(conflictState.requestBody || {}),
							confirmReassignments: true,
						}),
					},
				);
				const data = await res.json();

				if (!res.ok || !data.success) {
					throw new Error(
						data.message || 'Failed to add academic year with reassignments.',
					);
				}

				const updatedReassignedTeachers = await fetchReassignedTeachers(
					data.reassignments,
				);
				if (data.reassignments?.performed) {
					setFeedback({
						type: 'success',
						message: `Academic year added successfully. ${data.reassignments.count} assignment(s) were reassigned from other teachers.`,
					});
				} else {
					setFeedback({ type: 'success', message: data.message });
				}
				onSave(data.data?.user || data.data, updatedReassignedTeachers);
				setShowCarryOverModal(false);
				return;
			}

			if (!conflictState.changedData) return;
			const res = await fetch(`/api/users?id=${user._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...conflictState.changedData,
					confirmReassignments: true,
				}),
			});
			const data = await res.json();

			if (!res.ok) {
				throw new Error(
					data.message || 'Failed to update user with reassignments.',
				);
			}

			const updatedReassignedTeachers = await fetchReassignedTeachers(
				data.reassignments,
			);
			if (data.reassignments?.performed) {
				setFeedback({
					type: 'success',
					message: `User updated successfully. ${data.reassignments.count} assignment(s) were reassigned from other teachers.`,
				});
			} else {
				setFeedback({ type: 'success', message: 'User updated successfully.' });
			}
			onSave(data.data.user, updatedReassignedTeachers);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to confirm reassignments.';
			if (conflictState.mode === 'carry-over') {
				setActionError(message);
			} else {
				setValidationErrors([{ message }]);
			}
		} finally {
			setIsLoading(false);
			setConflictState(null);
		}
	};

	const toggleAccordion = (session) => {
		setExpandedAccordions((prev) => ({ ...prev, [session]: !prev[session] }));
	};

	const handlePromotion = () => {
		const promotionYearOptions = getPromotionAcademicYearOptions();
		const latestStart = getLatestAcademicYearStartForUser(user);
		const defaultPromotionYear =
			promotionYearOptions.find((year) => {
				const start = getAcademicYearStart(year);
				return start !== null && latestStart !== null && start > latestStart;
			}) ||
			promotionYearOptions[0] ||
			'';
		setActionError('');
		setPromotionForm((prev) => ({
			...prev,
			type: allowsDoublePromotion ? prev.type : 'yearlyPromotion',
			classId: '',
			className: '',
			academicYear: defaultPromotionYear,
		}));
		setShowPromotionModal(true);
	};

	const handleDemotion = () => {
		setActionError('');
		setDemotionForm((prev) => ({
			...prev,
			classId: '',
			className: '',
			academicYear: '',
		}));
		setShowDemotionModal(true);
	};

	const handleCarryOver = () => {
		const options = getCarryOverAcademicYearOptions();
		const latestStart = getLatestAcademicYearStartForUser(user);
		setActionError('');
		setCarryOverAssignmentsExpanded(false);
		const defaultYear =
			options.find((year) => {
				const start = getAcademicYearStart(year);
				return start !== null && latestStart !== null && start > latestStart;
			}) ||
			options[0] ||
			'';
		setCarryOverAcademicYear(defaultYear);
		if (user?.role === 'teacher') {
			const latestYearEntry = getTeacherLatestYearEntry(user);
			const defaultSelections = mapYearEntryToTeacherSelections(latestYearEntry);
			setCarryOverSubjects(defaultSelections);
			setCarryOverSponsorClass(user?.sponsorClass || null);
			setCarryOverExpandedAccordions({});
		}
		if (user?.role === 'administrator') {
			const latestAdminYear = getAdminTimeline(user)[0];
			setCarryOverPosition(
				latestAdminYear?.position || user?.position || adminPositions[0],
			);
			setCarryOverExpandedAccordions({});
		}
		setShowCarryOverModal(true);
	};

	const getAcademicYearOptions = () => {
		const years = new Set(generateAcademicYears());
		if (schoolProfile?.currentAcademicYear) {
			years.add(schoolProfile.currentAcademicYear);
		}
		return Array.from(years).sort((a, b) => b.localeCompare(a));
	};

	const getPromotionAcademicYearOptions = () => {
		return getCurrentAndNextAcademicYears();
	};

	const getCarryOverAcademicYearOptions = () => {
		if (!user || !['teacher', 'administrator'].includes(user.role)) return [];
		return getCurrentAndNextAcademicYears();
	};

	const buildTeacherClassesPayloadFromSelections = (
		selections,
		sponsorClassValue,
	) => {
		const classMap = new Map();
		const normalizedSelections = Array.isArray(selections) ? selections : [];
		const selfContainedSelections = normalizedSelections.filter(
			(s) => s.level === 'Self Contained',
		);
		const regularSelections = normalizedSelections.filter(
			(s) => s.level !== 'Self Contained',
		);

		regularSelections.forEach((selection) => {
			const classes = getClassesBySessionAndLevel(
				selection.session,
				selection.level,
			);
			classes.forEach((cls) => {
				if (!classMap.has(cls.classId)) {
					classMap.set(cls.classId, new Set());
				}
				classMap.get(cls.classId).add(selection.subject);
			});
		});

		if (selfContainedSelections.length > 0 && sponsorClassValue) {
			if (!classMap.has(sponsorClassValue)) {
				classMap.set(sponsorClassValue, new Set());
			}
			selfContainedSelections.forEach((selection) => {
				classMap.get(sponsorClassValue).add(selection.subject);
			});
		}

		return Array.from(classMap.entries())
			.map(([classId, subjectsSet]) => ({
				classId,
				subjects: Array.from(subjectsSet).sort(),
			}))
			.filter((entry) => entry.subjects.length > 0)
			.sort((a, b) => a.classId.localeCompare(b.classId));
	};

	const buildTeacherSubjectsPayload = () => {
		const academicYear = getCurrentAcademicYear();
		const classes = buildTeacherClassesPayloadFromSelections(
			formData?.subjects || [],
			formData?.sponsorClass,
		);

		const existingSubjects = Array.isArray(user?.subjects) ? user.subjects : [];
		const otherYears = existingSubjects.filter(
			(entry) => entry.year !== academicYear,
		);
		const currentYearEntry = { year: academicYear, classes };

		return [...otherYears, currentYearEntry];
	};

	const handlePromotionSubmit = async () => {
		setActionError('');
		const promotionYearOptions = getPromotionAcademicYearOptions();
		if (
			promotionForm.type === 'yearlyPromotion' &&
			!hasYearOptionLaterThanUser(promotionYearOptions, user)
		) {
			setActionError(
				'No eligible promotion year is available from the current options.',
			);
			return;
		}
		if (isAtHighestClass()) {
			setActionError(
				'Cannot promote this student because they are already in the highest possible class.',
			);
			return;
		}
		if (!promotionForm.classId || !promotionForm.className) {
			setActionError('Please select a new class.');
			return;
		}
		if (
			promotionForm.type === 'yearlyPromotion' &&
			!promotionForm.academicYear
		) {
			setActionError('Please select the new academic year.');
			return;
		}
		if (
			promotionForm.type === 'yearlyPromotion' &&
			!promotionYearOptions.includes(promotionForm.academicYear)
		) {
			setActionError(
				'Yearly promotions must use the current academic year or the next academic year.',
			);
			return;
		}
		if (promotionForm.type === 'yearlyPromotion') {
			const latestStart = getLatestAcademicYearStartForUser(user);
			const selectedStart = getAcademicYearStart(promotionForm.academicYear);
			if (
				latestStart !== null &&
				selectedStart !== null &&
				selectedStart <= latestStart
			) {
				setActionError(
					"The selected year must be later than the student's latest academic year.",
				);
				return;
			}
		}

		setActionLoading(true);
		try {
			const res = await fetch(
				`/api/users?id=${user._id}&action=promote&type=${promotionForm.type}`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						promotedToClassId: promotionForm.classId,
						promotedToClassName: promotionForm.className,
						newAcademicYear:
							promotionForm.type === 'yearlyPromotion'
								? promotionForm.academicYear
								: undefined,
					}),
				},
			);
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || 'Promotion failed.');
			}
			onSave(data.data?.student || data.data?.user || data.data);
			setFeedback({ type: 'success', message: data.message });
			setShowPromotionModal(false);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Promotion failed.';
			setActionError(message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleDemotionSubmit = async () => {
		setActionError('');
		if (!demotionForm.classId || !demotionForm.className) {
			setActionError('Please select a new class.');
			return;
		}
		if (demotionForm.type === 'yearlyDemotion' && !demotionForm.academicYear) {
			setActionError('Please select the academic year to repeat.');
			return;
		}

		setActionLoading(true);
		try {
			const res = await fetch(
				`/api/users?id=${user._id}&action=demote&type=${demotionForm.type}`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						demotedToClassId: demotionForm.classId,
						demotedToClassName: demotionForm.className,
						previousAcademicYear:
							demotionForm.type === 'yearlyDemotion'
								? demotionForm.academicYear
								: undefined,
					}),
				},
			);
			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.message || 'Demotion failed.');
			}
			onSave(data.data?.student || data.data?.user || data.data);
			setFeedback({ type: 'success', message: data.message });
			setShowDemotionModal(false);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Demotion failed.';
			setActionError(message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleCarryOverSubmit = async () => {
		setActionError('');
		setConflictState(null);
		const options = getCarryOverAcademicYearOptions();
		if (!hasYearOptionLaterThanUser(options, user)) {
			setActionError(
				'No eligible academic year is available from the current options.',
			);
			return;
		}
		if (!carryOverAcademicYear) {
			setActionError('Please select a new academic year.');
			return;
		}
		if (!options.includes(carryOverAcademicYear)) {
			setActionError(
				'Please select either the current academic year or the next academic year.',
			);
			return;
		}
		const latestStart = getLatestAcademicYearStartForUser(user);
		const selectedStart = getAcademicYearStart(carryOverAcademicYear);
		if (
			latestStart !== null &&
			selectedStart !== null &&
			selectedStart <= latestStart
		) {
			setActionError(
				'The selected year must be later than the user\'s latest academic year.',
			);
			return;
		}

		const requestBody: any = {
			newAcademicYear: carryOverAcademicYear,
		};

		if (user?.role === 'teacher') {
			const classes = buildTeacherClassesPayloadFromSelections(
				carryOverSubjects,
				carryOverSponsorClass,
			);
			if (!Array.isArray(classes) || classes.length === 0) {
				setActionError(
					'Please select at least one class/subject assignment for the new academic year.',
				);
				return;
			}
			requestBody.classes = classes;
			requestBody.sponsorClass = carryOverSponsorClass || null;
		}

		if (user?.role === 'administrator') {
			if (!carryOverPosition) {
				setActionError('Please select a position for the new academic year.');
				return;
			}
			requestBody.position = carryOverPosition;
		}

		setActionLoading(true);
		try {
			const res = await fetch(`/api/users?id=${user._id}&action=addAcademicYear`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});
			const data = await res.json();
			if (!res.ok) {
				if (res.status === 409 && data.requiresConfirmation) {
					setConflictState({
						conflicts: data.conflicts || [],
						conflictSummary: data.conflictSummary || {},
						errors: data.errors || [],
						mode: 'carry-over',
						requestBody,
					});
					return;
				}
				throw new Error(data.message || 'Failed to add academic year.');
			}
			if (!data.success) {
				throw new Error(data.message || 'Failed to add academic year.');
			}
			const updatedReassignedTeachers = await fetchReassignedTeachers(
				data.reassignments,
			);
			if (data.reassignments?.performed) {
				setFeedback({
					type: 'success',
					message: `Academic year added successfully. ${data.reassignments.count} assignment(s) were reassigned.`,
				});
			} else {
				setFeedback({ type: 'success', message: data.message });
			}
			onSave(data.data?.user || data.data, updatedReassignedTeachers);
			setShowCarryOverModal(false);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to add academic year.';
			setActionError(message);
		} finally {
			setActionLoading(false);
		}
	};

	if (!isOpen || !formData) return null;

	return (
		<>
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
				<div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border">
					<header className="flex justify-between items-center p-4 sm:p-6 border-b border-border flex-shrink-0">
						<div className="flex items-center gap-3">
							<img
								src={
									formData?.avatar ||
									user?.avatar ||
									`https://ui-avatars.com/api/?name=${encodeURIComponent(
										getFullName(user),
									)}&background=random`
								}
								alt={getFullName(user)}
								className="h-10 w-10 rounded-full border-2 border-primary/20 object-cover"
							/>
							<div>
								<h4 className="text-xl md:text-2xl font-semibold text-foreground">
									Edit User Profile
								</h4>
								<p className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-none">
									{getFullName(user)}
								</p>
								{user?.role === 'student' && (
									<p className="text-[11px] text-muted-foreground/80 truncate max-w-[200px] sm:max-w-none">
										{formData?.className ||
											getClassNameFromId(formData?.classId || user?.classId) ||
											'No class assigned'}
									</p>
								)}
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-full hover:bg-muted transition-colors"
						>
							<X className="h-5 w-5" />
						</button>
					</header>

					<main className="overflow-y-auto flex-grow p-4 sm:p-8 space-y-6">
						{validationErrors.length > 0 && (
							<div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
								<p className="font-semibold flex items-center mb-2">
									<AlertTriangle className="h-4 w-4 mr-2" />
									Please fix the following issues:
								</p>
								<ul className="list-disc pl-5 space-y-1">
									{validationErrors.map((err, index) => (
										<li key={index}>{err.message}</li>
									))}
								</ul>
							</div>
						)}

						<section>
							<h5 className="font-semibold mb-3 text-lg border-b pb-2">
								Profile Overview
							</h5>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<div>
									<p className="text-sm text-muted-foreground">Role</p>
									<p className="text-md font-medium text-foreground capitalize">
										{user.role}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">
										Years with Institution
									</p>
									<p className="text-md font-medium text-foreground">
										{getYearsSpent(user)}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Status</p>
									<span
										className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
											user.isActive
												? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
												: 'bg-destructive/10 text-destructive'
										}`}
									>
										{user.isActive ? 'Active' : 'Inactive'}
									</span>
								</div>
							</div>

							{user.role === 'student' && (
								<div className="mt-4 space-y-3">
									<p className="text-sm text-muted-foreground">Current Class</p>
									<p className="text-md font-medium text-foreground">
										{user.className ||
											getClassNameFromId(user.classId) ||
											'N/A'}
									</p>
									<div className="mt-2 space-y-2">
										<p className="text-sm text-muted-foreground">
											Academic Year History
										</p>
										{getAcademicYearTimeline(user).length === 0 && (
											<p className="text-sm text-muted-foreground">
												No academic history available.
											</p>
										)}
										{getAcademicYearTimeline(user).map((entry, idx) => (
											<div
												key={`${entry.year}-${idx}`}
												className="rounded-lg border border-border bg-muted/40 p-3"
											>
												<p className="text-sm font-medium text-foreground">
													{entry.year || 'Unknown Year'}
												</p>
												<p className="text-xs text-muted-foreground">
													Class:{' '}
													{entry.className ||
														getClassNameFromId(entry.classId) ||
														'N/A'}
												</p>
											</div>
										))}
									</div>
								</div>
							)}

							{user.role === 'teacher' && (
								<div className="mt-4 space-y-2">
									<p className="text-sm text-muted-foreground">
										Current Subjects & Classes
									</p>
									{getTeacherCurrentYearData(user) ? (
										<div className="space-y-2">
											{getTeacherCurrentYearData(user).classes?.map(
												(cls, idx) => (
													<div
														key={`${cls.classId}-${idx}`}
														className="rounded-lg border border-border bg-muted/40 p-3"
													>
														<p className="text-sm font-medium text-foreground">
															Class:{' '}
															{cls.className ||
																getClassNameFromId(cls.classId) ||
																cls.classId}
														</p>
														<p className="text-xs text-muted-foreground">
															Subjects:{' '}
															{(cls.subjects || []).join(', ') || 'N/A'}
														</p>
													</div>
												),
											)}
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											No current assignments available.
										</p>
									)}
								</div>
							)}

							{user.role === 'administrator' && (
								<div className="mt-4 space-y-2">
									<p className="text-sm text-muted-foreground">
										Position Timeline
									</p>
									{getAdminTimeline(user).length === 0 && (
										<p className="text-sm text-muted-foreground">
											No administrative history available.
										</p>
									)}
									{getAdminTimeline(user).map((entry, idx) => (
										<div
											key={`${entry.year}-${idx}`}
											className="rounded-lg border border-border bg-muted/40 p-3"
										>
											<p className="text-sm font-medium text-foreground">
												{entry.year || 'Unknown Year'}
											</p>
											<p className="text-xs text-muted-foreground">
												Position: {entry.position || 'N/A'}
											</p>
										</div>
									))}
								</div>
							)}
						</section>

						<section>
							<h5 className="font-semibold mb-3 text-lg border-b pb-2">
								Personal Information
							</h5>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<InputField
									label="First Name"
									name="firstName"
									value={formData.firstName}
									onChange={handleInputChange}
								/>
								<InputField
									label="Middle Name"
									name="middleName"
									value={formData.middleName}
									onChange={handleInputChange}
								/>
								<InputField
									label="Last Name"
									name="lastName"
									value={formData.lastName}
									onChange={handleInputChange}
								/>
								<InputField
									label="Email Address"
									name="email"
									type="email"
									value={formData.email}
									onChange={handleInputChange}
								/>
								<InputField
									label="Phone Number"
									name="phone"
									value={formData.phone}
									onChange={handleInputChange}
								/>
								<div className="sm:col-span-2">
									<InputField
										label="Address"
										name="address"
										value={formData.address}
										onChange={handleInputChange}
									/>
								</div>
							</div>
						</section>

						{user.role === 'student' && (
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Academic Information
								</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											Session
										</label>
										<Select
											value={formData.session || ''}
											onValueChange={handleStudentSessionChange}
										>
											<SelectTrigger className={selectTriggerClass}>
												<SelectValue placeholder="Select Session" />
											</SelectTrigger>
											<SelectContent>
												{getSessions().map((session) => (
													<SelectItem key={session} value={session}>
														{session}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											Class
										</label>
										<Select
											value={formData.classId || ''}
											onValueChange={handleStudentClassChange}
											disabled={!formData.session}
										>
											<SelectTrigger className={selectTriggerClass}>
												<SelectValue placeholder="Select Class" />
											</SelectTrigger>
											<SelectContent>
												{formData.session &&
													getClassLevels(formData.session).map((level) => {
														const levelStyle = getLevelVisualStyle(level);
														return (
															<React.Fragment key={level}>
																<div
																	className={`mx-1 mt-1 mb-1 inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${levelStyle.badge}`}
																>
																	{level}
																</div>
																{getAllClassesWithLevelsForSession(
																	formData.session,
																)
																	.filter((cls) => cls.level === level)
																	.map((cls) => (
																		<SelectItem
																			key={cls.classId}
																			value={cls.classId}
																		>
																			{cls.name}
																		</SelectItem>
																	))}
															</React.Fragment>
														);
													})}
											</SelectContent>
										</Select>
									</div>
								</div>
							</section>
						)}

						{user.role === 'student' && (
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Guardian Information
								</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<InputField
										label="Guardian First Name"
										name="firstName"
										value={formData.guardian?.firstName}
										onChange={handleGuardianInputChange}
									/>
									<InputField
										label="Guardian Middle Name"
										name="middleName"
										value={formData.guardian?.middleName}
										onChange={handleGuardianInputChange}
									/>
									<InputField
										label="Guardian Last Name"
										name="lastName"
										value={formData.guardian?.lastName}
										onChange={handleGuardianInputChange}
									/>
									<InputField
										label="Guardian Email"
										name="email"
										type="email"
										value={formData.guardian?.email}
										onChange={handleGuardianInputChange}
									/>
									<InputField
										label="Guardian Phone"
										name="phone"
										value={formData.guardian?.phone}
										onChange={handleGuardianInputChange}
									/>
									<div className="sm:col-span-2">
										<InputField
											label="Guardian Address"
											name="address"
											value={formData.guardian?.address}
											onChange={handleGuardianInputChange}
										/>
									</div>
								</div>
							</section>
						)}

						{user.role === 'administrator' && (
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Administrative Information
								</h5>
								<div>
									<label className="block text-sm font-medium text-foreground mb-1">
										Position
									</label>
									<Select
										value={formData.position}
										onValueChange={(value) =>
											handleInputChange({
												target: { name: 'position', value },
											})
										}
									>
										<SelectTrigger className={selectTriggerClass}>
											<SelectValue placeholder="Select Position" />
										</SelectTrigger>
										<SelectContent>
											{adminPositions.map((pos) => (
												<SelectItem key={pos} value={pos}>
													{pos}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</section>
						)}

						{user.role === 'teacher' && schoolProfile && (
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Teaching Assignments
								</h5>
								<div className="space-y-4">
									{getSessions().map((session) => (
										<div
											key={session}
											className="border border-border rounded-lg"
										>
											<button
												type="button"
												onClick={() => toggleAccordion(session)}
												className="flex justify-between items-center w-full p-3 font-medium text-left bg-muted/50 hover:bg-muted/80 rounded-t-lg"
											>
												<span>{session} Session</span>
												<ChevronDown
													className={`w-5 h-5 transition-transform ${
														expandedAccordions[session] ? 'rotate-180' : ''
													}`}
												/>
											</button>
											<AnimatePresence>
												{expandedAccordions[session] && (
													<motion.div
														initial={{ opacity: 0, height: 0 }}
														animate={{ opacity: 1, height: 'auto' }}
														exit={{ opacity: 0, height: 0 }}
														className="p-4 space-y-4 border-t border-border"
													>
														{getSelfContainedClasses(session).length > 0 && (
															<div className="space-y-3">
																<p className="text-sm text-muted-foreground">
																	<span className="font-medium">
																		Self-Contained Class Teacher
																	</span>{' '}
																	<span className="italic">
																		(teaches all subjects)
																	</span>
																</p>
																<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
																	{getSelfContainedClasses(session).map((cls) => {
																		const isSelected =
																			formData.sponsorClass === cls.classId &&
																			(formData.subjects || []).some(
																				(s) =>
																					s.level === 'Self Contained' &&
																					s.session === session,
																			);
																		return (
																			<motion.label
																				key={`${session}-self-${cls.classId}`}
																				whileHover={{ scale: 1.02 }}
																				className={`relative flex items-center justify-center rounded-xl border p-3 cursor-pointer transition-all duration-300 ${
																					isSelected
																						? 'border-primary bg-primary/10 shadow-md'
																						: 'border-muted hover:border-primary/50 hover:bg-accent/10'
																				}`}
																			>
																				<input
																					type="radio"
																					name={`edit-selfContainedClass-${session}`}
																					checked={isSelected}
																					onChange={(e) =>
																						handleSelfContainedSelection(
																							cls.classId,
																							session,
																							e.target.checked,
																						)
																					}
																					className="absolute opacity-0"
																				/>
																				<span className="text-sm font-medium text-foreground">
																					{cls.name}
																				</span>
																			</motion.label>
																		);
																	})}
																</div>
															</div>
														)}
														<div>
															<label className="block text-sm font-medium text-foreground mb-2">
																Subjects Taught
															</label>
															<div className="space-y-3">
																{getClassLevels(session)
																	.filter((level) => level !== 'Self Contained')
																	.map((level) => {
																		const levelStyle = getLevelVisualStyle(level);
																		return (
																			<div
																				key={level}
																				className={`rounded-lg border p-3 ${levelStyle.section}`}
																			>
																				<h6 className="mb-2">
																					<span
																						className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${levelStyle.badge}`}
																					>
																						{level}
																					</span>
																				</h6>
																				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
																					{getSubjectsBySessionAndLevel(
																						session,
																						level,
																					).map((subject) => {
																						const subjectName =
																							getSubjectName(subject);
																						if (!subjectName) return null;
																						const isChecked = (
																							formData.subjects || []
																						).some(
																							(s) =>
																								s.subject === subjectName &&
																								s.level === level &&
																								s.session === session,
																						);
																						return (
																							<motion.label
																								key={`${subjectName}-${level}`}
																								whileHover={{
																									scale: 1.03,
																								}}
																								className={`relative flex items-center rounded-lg border p-2 cursor-pointer transition-all text-sm ${
																									isChecked
																										? 'border-primary bg-primary/10 shadow-sm'
																										: 'border-muted hover:border-primary/40 hover:bg-accent/5'
																								}`}
																							>
																								<input
																									type="checkbox"
																									checked={isChecked}
																									onChange={(e) =>
																										handleSubjectChange(
																											subjectName,
																											level,
																											session,
																											e.target.checked,
																										)
																									}
																									className="absolute opacity-0"
																								/>
																								<span className="ml-1 text-foreground">
																									{subjectName}
																								</span>
																							</motion.label>
																						);
																					})}
																				</div>
																			</div>
																		);
																	})}
															</div>
														</div>
														<div>
															<label className="block text-sm font-medium text-foreground mb-2">
																Class Sponsorship
															</label>
															<Select
																value={
																	formData.sponsorClass &&
																	getAllClassesForSession(session).find(
																		(cls) => cls.classId === formData.sponsorClass,
																	)
																		? formData.sponsorClass
																		: '__none__'
																}
																onValueChange={(value) =>
																	handleSponsorClassChange(session, value)
																}
															>
																<SelectTrigger className={selectTriggerClass}>
																	<SelectValue placeholder="No sponsorship" />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="__none__">
																		No sponsorship
																	</SelectItem>
																	{getAllClassesWithLevelsForSession(session)
																		.filter((cls) => cls.level !== 'Self Contained')
																		.map((cls) => (
																			<SelectItem
																				key={cls.classId}
																				value={cls.classId}
																			>
																				{cls.name}
																			</SelectItem>
																		))}
																</SelectContent>
															</Select>
															{formData.sponsorClass &&
																getAllClassesForSession(session).some(
																	(cls) => cls.classId === formData.sponsorClass,
																) && (
																	<p className="text-xs text-green-600 mt-1">
																		This teacher will be assigned as sponsor for
																		the selected class
																	</p>
																)}
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</div>
									))}
								</div>
							</section>
						)}
					</main>

					<footer className="p-4 sm:p-6 bg-muted/50 border-t border-border rounded-b-xl flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
						<div className="w-full sm:w-auto">
							{user.role === 'student' && (
								<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
									<button
										type="button"
										onClick={handlePromotion}
										className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
									>
										Promote Student
									</button>
									{allowsDemotion && (
										<button
											type="button"
											onClick={handleDemotion}
											className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
										>
											Demote Student
										</button>
									)}
								</div>
							)}
							{(user.role === 'teacher' || user.role === 'administrator') && (
								<button
									type="button"
									onClick={handleCarryOver}
									className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
								>
									Bring To New Academic Year
								</button>
							)}
						</div>
						<div className="w-full sm:w-auto flex flex-col sm:flex-row sm:justify-end gap-2">
							<button
								type="button"
								onClick={onClose}
								className="w-full sm:w-auto px-6 py-2 rounded-lg hover:bg-muted/80"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={isLoading || !!conflictState}
								className="w-full sm:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed"
							>
								{isLoading ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</footer>

					{showPromotionModal && (
						<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
							<div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-xl">
								<div className="flex items-center justify-between p-4 border-b border-border">
									<h5 className="text-lg font-semibold text-foreground">
										Promote Student
									</h5>
									<button
										type="button"
										onClick={() => setShowPromotionModal(false)}
										className="p-2 rounded-full hover:bg-muted transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
								<div className="p-4 space-y-4">
									{actionError && (
										<p className="text-sm text-red-600">{actionError}</p>
									)}
									{isAtHighestClass() ? (
										<p className="text-sm text-muted-foreground">
											Cannot promote this student because they are already in
											the highest possible class.
										</p>
									) : (
										<>
											{allowsDoublePromotion ? (
												<div>
													<label className="block text-sm font-medium text-foreground mb-1">
														Promotion Type
													</label>
													<Select
														value={promotionForm.type}
														onValueChange={(value) => {
															const promotionYearOptions =
																getPromotionAcademicYearOptions();
															const latestStart =
																getLatestAcademicYearStartForUser(user);
															const defaultPromotionYear =
																promotionYearOptions.find((year) => {
																	const start = getAcademicYearStart(year);
																	return (
																		start !== null &&
																		latestStart !== null &&
																		start > latestStart
																	);
																}) ||
																promotionYearOptions[0] ||
																'';
															setPromotionForm((prev) => ({
																...prev,
																type: value,
																academicYear:
																	value === 'yearlyPromotion'
																		? promotionYearOptions.includes(prev.academicYear)
																			? prev.academicYear
																			: defaultPromotionYear
																		: prev.academicYear,
															}));
														}}
													>
														<SelectTrigger className={selectTriggerClass}>
															<SelectValue placeholder="Select type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="yearlyPromotion">
																Yearly Promotion
															</SelectItem>
															<SelectItem value="doublePromotion">
																Semester (Double) Promotion
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
											) : (
												<p className="text-sm text-muted-foreground">
													Only yearly promotion is allowed.
												</p>
											)}
											<div>
												<label className="block text-sm font-medium text-foreground mb-1">
													New Class
												</label>
												<Select
													value={promotionForm.classId}
													onValueChange={(value) => {
														const selected =
															getPromotionClassOptions().find(
																(cls) => cls.classId === value,
															);
														setPromotionForm((prev) => ({
															...prev,
															classId: value,
															className: selected?.name || '',
														}));
													}}
												>
													<SelectTrigger className={selectTriggerClass}>
														<SelectValue placeholder="Select Class" />
													</SelectTrigger>
													<SelectContent>
														{getPromotionClassOptions().map((cls) => (
															<SelectItem key={cls.classId} value={cls.classId}>
																{cls.name} ({cls.level} - {cls.session})
															</SelectItem>
														))}
														{getPromotionClassOptions().length === 0 && (
															<div className="px-2 py-1.5 text-sm text-muted-foreground">
																No higher classes available.
															</div>
														)}
													</SelectContent>
												</Select>
											</div>
									{promotionForm.type === 'yearlyPromotion' && (
										<div>
											<label className="block text-sm font-medium text-foreground mb-1">
												New Academic Year
											</label>
											<Select
												value={promotionForm.academicYear}
												onValueChange={(value) =>
													setPromotionForm((prev) => ({
														...prev,
														academicYear: value,
													}))
												}
											>
												<SelectTrigger className={selectTriggerClass}>
													<SelectValue placeholder="Select Academic Year" />
												</SelectTrigger>
												<SelectContent>
													{getPromotionAcademicYearOptions().map((year) => (
														<SelectItem key={year} value={year}>
															{year}
														</SelectItem>
													))}
													{getPromotionAcademicYearOptions().length === 0 && (
														<div className="px-2 py-1.5 text-sm text-muted-foreground">
															No academic year options available.
														</div>
													)}
													{getPromotionAcademicYearOptions().length > 0 &&
														!hasYearOptionLaterThanUser(
															getPromotionAcademicYearOptions(),
															user,
														) && (
															<div className="px-2 py-1.5 text-sm text-muted-foreground">
																No selectable year is later than the student&apos;s latest year.
															</div>
														)}
												</SelectContent>
											</Select>
										</div>
									)}
										</>
									)}
								</div>
								<div className="p-4 border-t border-border flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setShowPromotionModal(false)}
										className="px-4 py-2 rounded-lg hover:bg-muted/80"
									>
										Cancel
									</button>
									{!isAtHighestClass() && (
										<button
											type="button"
											onClick={handlePromotionSubmit}
											disabled={
												actionLoading ||
												(promotionForm.type === 'yearlyPromotion' &&
													!hasYearOptionLaterThanUser(
														getPromotionAcademicYearOptions(),
														user,
													))
											}
											className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
										>
											{actionLoading ? 'Saving...' : 'Confirm Promotion'}
										</button>
									)}
								</div>
							</div>
						</div>
					)}

					{showDemotionModal && (
						<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
							<div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-xl">
								<div className="flex items-center justify-between p-4 border-b border-border">
									<h5 className="text-lg font-semibold text-foreground">
										Demote Student
									</h5>
									<button
										type="button"
										onClick={() => setShowDemotionModal(false)}
										className="p-2 rounded-full hover:bg-muted transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
								<div className="p-4 space-y-4">
									{actionError && (
										<p className="text-sm text-red-600">{actionError}</p>
									)}
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											Demotion Type
										</label>
										<Select
											value={demotionForm.type}
											onValueChange={(value) =>
												setDemotionForm((prev) => ({
													...prev,
													type: value,
												}))
											}
										>
											<SelectTrigger className={selectTriggerClass}>
												<SelectValue placeholder="Select type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="yearlyDemotion">
													Yearly Demotion
												</SelectItem>
												<SelectItem value="semesterDemotion">
													Semester Demotion
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											New Class
										</label>
										<Select
											value={demotionForm.classId}
											onValueChange={(value) => {
												const selected = getDemotionClassOptions().find(
													(cls) => cls.classId === value,
												);
												setDemotionForm((prev) => ({
													...prev,
													classId: value,
													className: selected?.name || '',
												}));
											}}
										>
											<SelectTrigger className={selectTriggerClass}>
												<SelectValue placeholder="Select Class" />
											</SelectTrigger>
											<SelectContent>
												{getDemotionClassOptions().map((cls) => (
													<SelectItem key={cls.classId} value={cls.classId}>
														{cls.name} ({cls.level} - {cls.session})
													</SelectItem>
												))}
												{getDemotionClassOptions().length === 0 && (
													<div className="px-2 py-1.5 text-sm text-muted-foreground">
														No lower classes available.
													</div>
												)}
											</SelectContent>
										</Select>
									</div>
									{demotionForm.type === 'yearlyDemotion' && (
										<div>
											<label className="block text-sm font-medium text-foreground mb-1">
												Academic Year to Repeat
											</label>
											<Select
												value={demotionForm.academicYear}
												onValueChange={(value) =>
													setDemotionForm((prev) => ({
														...prev,
														academicYear: value,
													}))
												}
											>
												<SelectTrigger className={selectTriggerClass}>
													<SelectValue placeholder="Select Academic Year" />
												</SelectTrigger>
												<SelectContent>
													{getAcademicYearOptions().map((year) => (
														<SelectItem key={year} value={year}>
															{year}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}
								</div>
								<div className="p-4 border-t border-border flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setShowDemotionModal(false)}
										className="px-4 py-2 rounded-lg hover:bg-muted/80"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={handleDemotionSubmit}
										disabled={actionLoading}
										className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
									>
										{actionLoading ? 'Saving...' : 'Confirm Demotion'}
									</button>
								</div>
							</div>
						</div>
					)}

					{showCarryOverModal && (
						<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
							<div className="bg-card w-full max-w-3xl max-h-[92vh] rounded-xl border border-border shadow-xl flex flex-col">
								<div className="flex items-center justify-between p-4 border-b border-border">
									<div>
										<h5 className="text-lg font-semibold text-foreground">
											Bring To New Academic Year
										</h5>
										<p className="text-xs text-muted-foreground mt-0.5">
											Current assignments are preselected by default.
										</p>
									</div>
									<button
										type="button"
										onClick={() => setShowCarryOverModal(false)}
										className="p-2 rounded-full hover:bg-muted transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
								<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
									{actionError && (
										<p className="text-sm text-red-600">{actionError}</p>
									)}
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											New Academic Year
										</label>
										<Select
											value={carryOverAcademicYear}
											onValueChange={(value) => setCarryOverAcademicYear(value)}
										>
											<SelectTrigger className={selectTriggerClass}>
												<SelectValue placeholder="Select Academic Year" />
											</SelectTrigger>
											<SelectContent>
												{getCarryOverAcademicYearOptions().map((year) => (
													<SelectItem key={year} value={year}>
														{year}
													</SelectItem>
												))}
												{getCarryOverAcademicYearOptions().length === 0 && (
													<div className="px-2 py-1.5 text-sm text-muted-foreground">
														No eligible academic year options available.
													</div>
												)}
												{getCarryOverAcademicYearOptions().length > 0 &&
													!hasYearOptionLaterThanUser(
														getCarryOverAcademicYearOptions(),
														user,
													) && (
														<div className="px-2 py-1.5 text-sm text-muted-foreground">
															No selectable year is later than the user&apos;s latest year.
														</div>
													)}
											</SelectContent>
										</Select>
									</div>

									{user?.role === 'teacher' && (
										<div className="rounded-lg border border-border bg-muted/30 p-3">
											<p className="text-sm font-medium text-foreground">
												Default Teacher Assignments
											</p>
											<p className="text-xs text-muted-foreground mt-1 leading-relaxed">
												{(carryOverSubjects || []).length} subject selections
												preloaded across{' '}
												{
													new Set(
														(carryOverSubjects || [])
															.map((entry) => entry?.session)
															.filter(Boolean),
													).size
												}{' '}
												session(s). Sponsor class:{' '}
												{carryOverSponsorClass
													? getClassNameFromId(carryOverSponsorClass)
													: 'None'}
												.
											</p>
										</div>
									)}

									{user?.role === 'administrator' && (
										<div className="rounded-lg border border-border bg-muted/30 p-3">
											<p className="text-sm font-medium text-foreground">
												Default Administrator Assignment
											</p>
											<p className="text-xs text-muted-foreground mt-1 leading-relaxed">
												Position preselected: {carryOverPosition || 'N/A'}.
											</p>
										</div>
									)}

									{['teacher', 'administrator'].includes(user?.role) && (
										<div className="border border-border rounded-lg overflow-hidden">
											<button
												type="button"
												onClick={() =>
													setCarryOverAssignmentsExpanded((prev) => !prev)
												}
												className="flex justify-between items-center w-full p-3 text-left bg-muted/50 hover:bg-muted/80 transition-colors"
											>
												<div>
													<p className="text-sm font-medium text-foreground">
														{user?.role === 'teacher'
															? 'Subject/Class Settings'
															: 'Position Settings'}
													</p>
													<p className="text-xs text-muted-foreground">
														Collapsed by default. Expand to review or change.
													</p>
												</div>
												<ChevronDown
													className={`w-5 h-5 transition-transform ${
														carryOverAssignmentsExpanded ? 'rotate-180' : ''
													}`}
												/>
											</button>
											<AnimatePresence>
												{carryOverAssignmentsExpanded && (
													<motion.div
														initial={{ opacity: 0, height: 0 }}
														animate={{ opacity: 1, height: 'auto' }}
														exit={{ opacity: 0, height: 0 }}
														className="p-3 sm:p-4 space-y-4 border-t border-border"
													>
														{user?.role === 'administrator' && (
															<div>
																<label className="block text-sm font-medium text-foreground mb-1">
																	Position For New Year
																</label>
																<Select
																	value={carryOverPosition}
																	onValueChange={(value) =>
																		setCarryOverPosition(value)
																	}
																>
																	<SelectTrigger
																		className={selectTriggerClass}
																	>
																		<SelectValue placeholder="Select Position" />
																	</SelectTrigger>
																	<SelectContent>
																		{adminPositions.map((pos) => (
																			<SelectItem key={pos} value={pos}>
																				{pos}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
														)}

														{user?.role === 'teacher' && (
															<div className="space-y-4">
																<div className="space-y-3">
																	<p className="text-sm font-medium text-foreground">
																		Subject Assignments
																	</p>
																	{getSessions().map((session) => (
																		<div
																			key={`carry-over-${session}`}
																			className="border border-border rounded-lg overflow-hidden"
																		>
																			<button
																				type="button"
																				onClick={() =>
																					toggleCarryOverAccordion(session)
																				}
																				className="flex justify-between items-center w-full p-3 font-medium text-left bg-muted/40 hover:bg-muted/70"
																			>
																				<span className="text-sm">
																					{session} Session
																				</span>
																				<ChevronDown
																					className={`w-5 h-5 transition-transform ${
																						carryOverExpandedAccordions[session]
																							? 'rotate-180'
																							: ''
																					}`}
																				/>
																			</button>
																			<AnimatePresence>
																				{carryOverExpandedAccordions[session] && (
																					<motion.div
																						initial={{ opacity: 0, height: 0 }}
																						animate={{ opacity: 1, height: 'auto' }}
																						exit={{ opacity: 0, height: 0 }}
																						className="p-3 sm:p-4 space-y-4 border-t border-border"
																					>
																						{getSelfContainedClasses(session).length > 0 && (
																							<div className="space-y-3">
																								<p className="text-sm text-muted-foreground">
																									<span className="font-medium">
																										Self-Contained Class Teacher
																									</span>{' '}
																									<span className="italic">
																										(teaches all subjects)
																									</span>
																								</p>
																								<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
																									{getSelfContainedClasses(session).map(
																										(cls) => {
																											const isSelected =
																												carryOverSponsorClass ===
																													cls.classId &&
																												(carryOverSubjects || []).some(
																													(selection) =>
																														selection.level ===
																															'Self Contained' &&
																														selection.session ===
																															session,
																												);
																											return (
																												<motion.label
																													key={`carry-over-self-${session}-${cls.classId}`}
																													whileHover={{ scale: 1.02 }}
																													className={`relative flex items-center justify-center rounded-xl border p-3 cursor-pointer transition-all duration-300 ${
																														isSelected
																															? 'border-primary bg-primary/10 shadow-md'
																															: 'border-muted hover:border-primary/50 hover:bg-accent/10'
																													}`}
																												>
																													<input
																														type="radio"
																														name={`carry-over-selfContainedClass-${session}`}
																														checked={isSelected}
																														onChange={(e) =>
																															handleCarryOverSelfContainedSelection(
																																cls.classId,
																																session,
																																e.target.checked,
																															)
																														}
																														className="absolute opacity-0"
																													/>
																													<span className="text-sm font-medium text-foreground">
																														{cls.name}
																													</span>
																												</motion.label>
																											);
																										},
																									)}
																								</div>
																							</div>
																						)}
																						<div className="space-y-3">
																							{getClassLevels(session)
																								.filter(
																									(level) =>
																										level !== 'Self Contained',
																								)
																								.map((level) => {
																									const levelStyle =
																										getLevelVisualStyle(level);
																									return (
																										<div
																											key={`carry-over-${session}-${level}`}
																											className={`rounded-lg border p-3 ${levelStyle.section}`}
																										>
																											<h6 className="mb-2">
																												<span
																													className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${levelStyle.badge}`}
																												>
																													{level}
																												</span>
																											</h6>
																											<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
																												{getSubjectsBySessionAndLevel(
																													session,
																													level,
																												).map((subject) => {
																													const subjectName =
																														getSubjectName(
																															subject,
																														);
																													if (!subjectName)
																														return null;
																													const isChecked = (
																														carryOverSubjects ||
																														[]
																													).some(
																														(selection) =>
																															selection.subject ===
																																subjectName &&
																															selection.level ===
																																level &&
																															selection.session ===
																																session,
																													);
																													return (
																														<motion.label
																															key={`carry-over-${subjectName}-${level}-${session}`}
																															whileHover={{
																																scale: 1.02,
																															}}
																															className={`relative flex items-center rounded-lg border p-2 cursor-pointer transition-all text-sm ${
																																isChecked
																																	? 'border-primary bg-primary/10 shadow-sm'
																																	: 'border-muted hover:border-primary/40 hover:bg-accent/5'
																															}`}
																														>
																															<input
																																type="checkbox"
																																checked={isChecked}
																																onChange={(e) =>
																																	handleCarryOverSubjectChange(
																																		subjectName,
																																		level,
																																		session,
																																		e.target.checked,
																																	)
																																}
																																className="absolute opacity-0"
																															/>
																															<span className="ml-1 text-foreground">
																																{subjectName}
																															</span>
																														</motion.label>
																													);
																												})}
																											</div>
																										</div>
																									);
																								})}
																						</div>
																						<div>
																							<label className="block text-sm font-medium text-foreground mb-1">
																								Sponsor Class
																							</label>
																							<Select
																								value={
																									carryOverSponsorClass &&
																									getAllClassesForSession(
																										session,
																									).some(
																										(cls) =>
																											cls.classId ===
																											carryOverSponsorClass,
																									)
																										? carryOverSponsorClass
																										: '__none__'
																								}
																								onValueChange={(value) =>
																									handleCarryOverSponsorClassChange(
																										session,
																										value,
																									)
																								}
																							>
																								<SelectTrigger
																									className={selectTriggerClass}
																								>
																									<SelectValue placeholder="No sponsorship" />
																								</SelectTrigger>
																								<SelectContent>
																									<SelectItem value="__none__">
																										No sponsorship
																									</SelectItem>
																									{getAllClassesWithLevelsForSession(
																										session,
																									)
																										.filter(
																											(cls) =>
																												cls.level !==
																												'Self Contained',
																										)
																										.map((cls) => (
																											<SelectItem
																												key={cls.classId}
																												value={cls.classId}
																											>
																												{cls.name}
																											</SelectItem>
																										))}
																								</SelectContent>
																							</Select>
																						</div>
																					</motion.div>
																				)}
																			</AnimatePresence>
																		</div>
																	))}
																</div>
															</div>
														)}
													</motion.div>
												)}
											</AnimatePresence>
										</div>
									)}
								</div>
								<div className="p-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
									<button
										type="button"
										onClick={() => setShowCarryOverModal(false)}
										className="w-full sm:w-auto px-4 py-2 rounded-lg hover:bg-muted/80"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={handleCarryOverSubmit}
										disabled={
											actionLoading ||
											getCarryOverAcademicYearOptions().length === 0 ||
											!hasYearOptionLaterThanUser(
												getCarryOverAcademicYearOptions(),
												user,
											)
										}
										className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
									>
										{actionLoading ? 'Saving...' : 'Confirm'}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
			<ConflictModal
				isOpen={!!conflictState}
				onClose={() => setConflictState(null)}
				conflictState={conflictState}
				onConfirm={handleConfirmReassignment}
				isLoading={isLoading}
				userName={`${formData.firstName} ${formData.lastName}`}
				schoolProfile={schoolProfile}
			/>
		</>
	);
};

const InputField = ({ label, ...props }) => (
	<div>
		<label className="block text-sm font-medium text-foreground mb-1">
			{label}
		</label>
	<input
		{...props}
		className="w-full p-2 border border-border/70 rounded-lg bg-gradient-to-br from-background to-muted/30 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-primary/40"
	/>
	</div>
);

export default EditUserModal;
