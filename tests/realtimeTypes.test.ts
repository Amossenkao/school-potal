import { describe, it, expect } from 'vitest';
import {
	buildRealtimeEvent,
	resolveSyncDomain,
	resolveEventDomainFromType,
} from '@/lib/realtimeTypes';

describe('resolveSyncDomain', () => {
	it('prefers the publisher-declared domain over the type mapping', () => {
		// A schedules publish resolves to CLASS_UPDATED, which the type mapping
		// reads as `users`. The declared domain has to win, or the seq advances
		// the wrong cursor and skips real users changes.
		expect(resolveSyncDomain({ type: 'CLASS_UPDATED', domain: 'schedules' })).toBe(
			'schedules',
		);
		expect(resolveEventDomainFromType('CLASS_UPDATED')).toBe('users');
	});

	it('falls back to the type mapping when no domain is carried', () => {
		expect(resolveSyncDomain({ type: 'GRADE_UPDATED' })).toBe('grades');
		expect(resolveSyncDomain({ type: 'EVENT_CREATED' })).toBe('calendar');
		expect(resolveSyncDomain({ type: 'TEACHER_ATTENDANCE_SAVED' })).toBe(
			'teacher_attendance',
		);
		expect(resolveSyncDomain({ type: 'GRADE_CHANGE_REQUESTED' })).toBe(
			'gradeRequests',
		);
	});

	it('ignores a blank domain', () => {
		expect(resolveSyncDomain({ type: 'GRADE_UPDATED', domain: '  ' })).toBe(
			'grades',
		);
	});
});

describe('buildRealtimeEvent', () => {
	it('carries domain and seq onto the wire', () => {
		const event = buildRealtimeEvent({
			tenantId: 'school-a',
			domain: 'calendar',
			academicYear: '2026-2027',
			seq: 42,
			reason: 'calendar-created',
		});
		expect(event.domain).toBe('calendar');
		expect(event.seq).toBe(42);
		expect(event.payload.academicYear).toBe('2026-2027');
	});

	it('omits seq and domain when not supplied', () => {
		const event = buildRealtimeEvent({
			tenantId: 'school-a',
			type: 'ANNOUNCEMENT_CREATED',
		});
		expect(event.seq).toBeUndefined();
		expect(event.domain).toBeUndefined();
	});
});
