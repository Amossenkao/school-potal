# Plan: Real-Time Events for Superadmin Operations

## Context
Superadmin pages (schools list, school detail, admin management) currently use `fetch()` + `useState` with no real-time updates. When one superadmin session makes a change (toggle school active, create/update/delete admin), other sessions don't see it until they manually refetch or navigate. The codebase already has a fully integrated Ably real-time system for school-level operations — we need to extend it to superadmin operations.

## Goal
When any superadmin performs an action (activate/deactivate school, create/update/delete/toggle admin), ALL other superadmin sessions see the change immediately via Ably events.

---

## Changes

### 1. Server: Add Ably event publishing to superadmin API routes

**Files to modify:**

- `app/api/superadmin/schools/[id]/route.ts` — After PATCH (toggle active), PUT (full update), DELETE
- `app/api/superadmin/schools/[id]/admins/route.ts` — After POST (create admin)
- `app/api/superadmin/schools/[id]/admins/[userId]/route.ts` — After PUT (update), PATCH (toggle_active, reset_password), DELETE

**Pattern** (follows existing convention from `app/api/calendar/route.ts`, `app/api/grades/route.ts`):

```ts
import { publishSyncEventSafe } from '@/lib/realtimeSync';

// After mutation succeeds:
await publishSyncEventSafe({
  tenantId: school.host,  // the school's host IS the tenantId
  domain: 'school',       // for school profile changes
  // OR domain: 'users',  // for admin account changes
  payload: { /* mutated data */ },
  reason: 'school-toggled-active',  // kebab-case reason
  actorId: /* superadmin user ID if available */,
});
```

**Event types to publish:**

| Route | Action | Event `reason` | `domain` |
|---|---|---|---|
| `schools/[id]/route.ts` PATCH | Toggle school active | `school-toggled-active` | `school` |
| `schools/[id]/route.ts` PUT | Update school profile | `school-updated` | `school` |
| `schools/[id]/route.ts` DELETE | Delete school | `school-deleted` | `school` |
| `schools/[id]/admins/route.ts` POST | Create admin | `user-created` | `users` |
| `schools/[id]/admins/[userId]/route.ts` PUT | Update admin | `user-updated` | `users` |
| `schools/[id]/admins/[userId]/route.ts` PATCH toggle | Toggle admin active | `user-updated` | `users` |
| `schools/[id]/admins/[userId]/route.ts` PATCH reset | Reset admin password | `user-updated` | `users` |
| `schools/[id]/admins/[userId]/route.ts` DELETE | Delete admin | `user-deleted` | `users` |

**Note:** Each route needs the school's `host` (already available from the `[id]` param) to use as `tenantId`. The `actorId` can come from `authorizeUser(request)` if available, or be omitted.

### 2. Server: Create superadmin Ably token endpoint

**New file:** `app/api/superadmin/sync-token/route.ts`

This endpoint mints Ably tokens for superadmin users with wildcard capabilities across ALL school channels:

```ts
export async function GET(request: NextRequest) {
  const currentUser = await authorizeUser(request);
  if (!currentUser || currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const tokenRequest = await createAblyTokenRequest({
    tenantId: 'superadmin',  // special tenant key
    user: { id: currentUser.id, role: 'super_admin' },
    role: 'super_admin',
    clientId: currentUser.id,
  });
  
  return NextResponse.json({ success: true, ...tokenRequest });
}
```

**Also update:** `lib/realtimeTypes.ts` — Add `superadmin:{userId}` channel type and update `getAuthorizedRealtimeChannels` to handle `super_admin` role subscribing to a `superadmin:*` broadcast channel.

**Update:** `lib/realtimeTypes.ts` `getAuthorizedRealtimeCapabilities` — When role is `super_admin`, grant subscribe capability on `school:*` (wildcard) so the token works for any school channel.

### 3. Client: Create `useSuperadminRealtime` hook

**New file:** `app/superadmin/hooks/useSuperadminRealtime.ts`

A lightweight hook that:
1. Creates its own `Ably.Realtime` client (separate from AuthProvider's)
2. Authenticates via `/api/superadmin/sync-token`
3. Subscribes to specified school channels
4. Calls back with events as they arrive
5. Cleans up on unmount

```ts
export function useSuperadminRealtime(options: {
  schoolHosts?: string[];      // schools to subscribe to
  onEvent?: (event: RealtimeEvent) => void;
}) {
  // Creates Ably client, subscribes to school:{host} for each host
  // Returns { connected: boolean }
}
```

### 4. Client: Update superadmin pages to consume events

**Files to modify:**

- `app/superadmin/schools/page.tsx` (schools list)
- `app/superadmin/schools/[id]/page.tsx` (school detail)
- `app/superadmin/schools/[id]/admins/page.tsx` (admin management)

**Pattern for schools list page:**
```ts
const { connected } = useSuperadminRealtime({
  schoolHosts: schools.map(s => s.host),
  onEvent: (event) => {
    if (event.type === 'SCHOOL_UPDATED' || event.reason === 'school-toggled-active') {
      // Update the specific school in local state
      setSchools(prev => prev.map(s => 
        s.host === event.payload.host ? { ...s, ...event.payload } : s
      ));
    }
    if (event.reason === 'school-deleted') {
      setSchools(prev => prev.filter(s => s.host !== event.payload.host));
    }
  },
});
```

**Pattern for admins page:**
```ts
const { connected } = useSuperadminRealtime({
  schoolHosts: [host],  // just the one school
  onEvent: (event) => {
    if (['user-created', 'user-updated', 'user-deleted'].includes(event.reason)) {
      // Refetch admins list for this school
      fetchAdmins();
    }
  },
});
```

---

## File Summary

| File | Action |
|---|---|
| `app/api/superadmin/schools/[id]/route.ts` | Add Ably publish after PATCH, PUT, DELETE |
| `app/api/superadmin/schools/[id]/admins/route.ts` | Add Ably publish after POST |
| `app/api/superadmin/schools/[id]/admins/[userId]/route.ts` | Add Ably publish after PUT, PATCH, DELETE |
| `app/api/superadmin/sync-token/route.ts` | **NEW** — Ably token endpoint for superadmin |
| `lib/realtimeTypes.ts` | Add superadmin channel types + wildcard capabilities |
| `app/superadmin/hooks/useSuperadminRealtime.ts` | **NEW** — Ably subscription hook for superadmin pages |
| `app/superadmin/schools/page.tsx` | Use `useSuperadminRealtime`, handle school events |
| `app/superadmin/schools/[id]/page.tsx` | Use `useSuperadminRealtime`, handle school events |
| `app/superadmin/schools/[id]/admins/page.tsx` | Use `useSuperadminRealtime`, handle admin events |

## Verification
1. Run `npx tsc --noEmit` to verify type safety
2. Open two browser tabs to `/superadmin/schools`
3. In tab A: toggle a school's active status
4. In tab B: verify the status updates instantly without manual refresh
5. Navigate to a school's admin page, create an admin in one tab, verify it appears in another
6. Test toggle admin active, reset password, delete admin — all should propagate in real-time
