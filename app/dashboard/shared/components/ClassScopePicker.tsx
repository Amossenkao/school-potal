'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import {
	ChipGrid,
	useClassDirectory,
} from '@/app/dashboard/shared/components/StudentFinder';

/**
 * Session → level → class drill-down, showing the trail
 * `All > Morning > Senior High > Grade 10 A`.
 *
 * This is the same control Scholarships gets from `StudentFinder`'s browse
 * mode, lifted out so both screens share one implementation instead of two that
 * look alike until one of them changes. The grid itself is `ChipGrid`, imported
 * from there.
 *
 * Once a level is chosen the grid collapses to the trail — the picker is a way
 * in, not something that should keep occupying the page. Clicking any crumb
 * reopens the grid at that step.
 *
 * Picking a class is optional: a level is enough to show a schedule.
 */

export interface ClassScope {
	session: string;
	level: string;
	classId: string;
}

interface ClassScopePickerProps {
	schoolProfile: any;
	value: ClassScope;
	onChange: (value: ClassScope) => void;
	/**
	 * `session::level` keys this user may see. A student gets exactly one, and
	 * the picker resolves straight through rather than offering a choice that
	 * isn't really there.
	 */
	allowedLevelKeys: string[];
	/** Optional per-class hint on the class chips. */
	classHint?: (classId: string) => string | undefined;
	/**
	 * Show the trail as plain text with no way to change it. Used for students
	 * and parents, whose scope is fixed to their own class — the trail still
	 * tells them what they are looking at, but offers no control that would
	 * only ever be refused.
	 */
	readOnly?: boolean;
	className?: string;
}

export default function ClassScopePicker({
	schoolProfile,
	value,
	onChange,
	allowedLevelKeys,
	classHint,
	readOnly = false,
	className = '',
}: ClassScopePickerProps) {
	const directory = useClassDirectory(schoolProfile);
	const [expanded, setExpanded] = useState(!readOnly);

	const allowed = useMemo(() => new Set(allowedLevelKeys), [allowedLevelKeys]);

	const sessions = useMemo(
		() =>
			directory.sessions.filter((session) =>
				allowedLevelKeys.some((key) => key.startsWith(`${session}::`)),
			),
		[directory.sessions, allowedLevelKeys],
	);

	const levels = useMemo(() => {
		if (!value.session) return [];
		return (directory.levelsBySession[value.session] || []).filter((level) =>
			allowed.has(`${value.session}::${level}`),
		);
	}, [directory.levelsBySession, value.session, allowed]);

	const classes = useMemo(() => {
		if (!value.session || !value.level) return [];
		return directory.classesByLevel[`${value.session}::${value.level}`] || [];
	}, [directory.classesByLevel, value.session, value.level]);

	// Step past any stage that offers no real choice, so a student never has a
	// one-item grid standing between them and their timetable.
	useEffect(() => {
		if (!value.session && sessions.length === 1) {
			onChange({ session: sessions[0], level: '', classId: '' });
		}
	}, [value.session, sessions, onChange]);

	useEffect(() => {
		if (value.session && !value.level && levels.length === 1) {
			onChange({ session: value.session, level: levels[0], classId: '' });
		}
	}, [value.session, value.level, levels, onChange]);

	// Resolved by the auto-advance above rather than by a click: collapse.
	useEffect(() => {
		if (value.level && sessions.length <= 1 && levels.length <= 1) {
			setExpanded(false);
		}
	}, [value.level, sessions.length, levels.length]);

	const stage: 'session' | 'level' | 'class' = !value.session
		? 'session'
		: !value.level
			? 'level'
			: 'class';

	const openAt = (next: ClassScope) => {
		onChange(next);
		setExpanded(true);
	};

	const className_ = value.classId
		? directory.byId[value.classId]?.className || value.classId
		: 'All classes';

	// Fixed scope: the trail reads as a label, not as a control.
	if (readOnly) {
		return (
			<div
				className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground ${className}`}
			>
				{[value.session, value.level, className_]
					.filter(Boolean)
					.map((part, index) => (
						<span key={`${index}-${part}`} className="flex items-center gap-1.5">
							{index > 0 && (
								<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
							)}
							<span className="font-bold text-foreground">{part}</span>
						</span>
					))}
				{!value.level && <span>No class on record</span>}
			</div>
		);
	}

	return (
		<div className={`rounded-2xl border border-border bg-card p-3 ${className}`}>
			<div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
				<button
					type="button"
					onClick={() => openAt({ session: '', level: '', classId: '' })}
					className="font-bold text-primary hover:underline"
				>
					All
				</button>

				{value.session && (
					<>
						<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
						<button
							type="button"
							onClick={() =>
								openAt({ session: value.session, level: '', classId: '' })
							}
							className="font-bold text-primary hover:underline"
						>
							{value.session}
						</button>
					</>
				)}

				{value.level && (
					<>
						<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
						<button
							type="button"
							onClick={() =>
								openAt({
									session: value.session,
									level: value.level,
									classId: '',
								})
							}
							className="font-bold text-primary hover:underline"
						>
							{value.level}
						</button>
					</>
				)}

				{value.level && (
					<>
						<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
						<span className="font-bold text-foreground">{className_}</span>
					</>
				)}

				{!expanded && (
					<button
						type="button"
						onClick={() => setExpanded(true)}
						className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
					>
						<SlidersHorizontal className="h-3 w-3" />
						Change
					</button>
				)}
			</div>

			{expanded && (
				<div className="mt-3">
					{stage === 'session' ? (
						<ChipGrid
							items={sessions.map((name) => ({ key: name, label: name }))}
							onPick={(key) => onChange({ session: key, level: '', classId: '' })}
							emptyMessage="No sessions available to you."
						/>
					) : stage === 'level' ? (
						<ChipGrid
							items={levels.map((name) => ({ key: name, label: name }))}
							onPick={(key) =>
								onChange({ session: value.session, level: key, classId: '' })
							}
							emptyMessage="No levels in this session."
						/>
					) : (
						<ChipGrid
							items={[
								{ key: '__all__', label: 'All classes' },
								...classes.map((node) => ({
									key: node.classId,
									label: node.className,
									hint: classHint?.(node.classId),
								})),
							]}
							onPick={(key) => {
								onChange({
									session: value.session,
									level: value.level,
									classId: key === '__all__' ? '' : key,
								});
								setExpanded(false);
							}}
							emptyMessage="No classes at this level."
						/>
					)}
				</div>
			)}
		</div>
	);
}
