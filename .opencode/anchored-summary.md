## Objective
- Clean up feature keys (remove stale ones, rename existing ones, add the Graduation Clearance sub-route under Academic Documents), then extend the Administrator model with `isTeacher`/`classes` so admin-teachers inherit teacher feature access and class assignments.

## Important Details
- `enum: FEATURE_KEYS` must stay in the Mongoose schema; stale keys are stripped client‑side by `sanitizeFeatureConfig` in `SchoolProfileForm.tsx` before they reach form state
- Data‑domain names (`'attendance'` in `domainSyncCache.ts`, `schoolStore.ts`, `realtimeTypes.ts`) are **not** feature keys and are never renamed
- For the `isTeacher` flag: all feature‑access functions (`getUserAccessibleFeatures`, `hasFeatureAccess`, `getAccessibleRouteKeys`, `preloadComponentsForUser`, `generateDynamicComponentsMap`, `generateNavigationItems`, `getUserRoutes`, `validateComponentAccess`) have been updated with an optional `isTeacher` parameter; callers extract the flag from `(user as Administrator).isTeacher`
- The `classes` field on Administrator uses the same structure as Teacher's `subjects`

## Work State
### Completed
- **Feature key cleanup**: Removed `homepage`, `admissions`, `academic_resources` from `FeatureKey`/`FEATURE_KEYS`; removed entries from `componentsMap.ts`, `classLevels.ts`, `profile.json`; updated school API fallback
- **Feature key renames**: `grading_system` → `grade_management`, `attendance` → `student_attendance` in `FeatureKey`, `FEATURE_KEYS`, `componentsMap.ts`, `classLevels.ts`, `profile.json`
- **Graduation Clearance sub‑route**: Added under `academic_documents` in `componentsMap.ts` (points to `/dashboard/clearances`)
- **Mongoose enum fix**: Reverted removal of `enum: FEATURE_KEYS` from schema; added `sanitizeFeatureConfig` in `SchoolProfileForm.tsx`
- **Administrator model extension**: Added `isTeacher` (boolean) and `classes` (same shape as Teacher's `subjects`) to `Administrator` interface, Mongoose schema, and `buildUserResponse` in both login and users API routes
- **Feature access functions**: Updated `hasFeatureAccess()` and `getUserAccessibleFeatures()` in `componentsMap.ts` to accept `isTeacher` — when true, admin's accessible features include their role‑permission features plus all teacher features
- **Threading `isTeacher` through**: Updated `getAccessibleRouteKeys`, `preloadComponentsForUser`, `generateDynamicComponentsMap`, `generateNavigationItems`, `getUserRoutes`, `validateComponentAccess` to accept and pass `isTeacher`
- **Caller updates**: Updated `OfflineRouteRenderer.tsx`, `dashboard/[page]/page.tsx`, `AppSidebar.tsx`, `PrefetchDashboardChunks.tsx` to extract `isTeacher` from the user and pass it to the relevant functions

### Blocked
- (none)

## Next Move
- Verify `npx tsc --noEmit` passes (no new errors introduced by these changes)

## Relevant Files
- **`types/index.ts`**: `FeatureKey` definition, `FEATURE_KEYS` array, `Administrator` interface
- **`models/user/Administrator.ts`**: Mongoose schema for Administrator
- **`utils/componentsMap.ts`**: All feature‑access functions (now with `isTeacher` param)
- **`app/api/auth/login/route.ts`**, **`app/api/users/route.ts`**: `buildUserResponse` for administrators
- **`app/api/school/route.ts`**: Fallback defaults for enabledFeatures
- **`app/dashboard/admin/components/SchoolProfileForm.tsx`**: Client‑side sanitization
- **`models/profile/SchoolProfile.ts`**: Mongoose schema with `enum: FEATURE_KEYS`
- **`components/OfflineRouteRenderer.tsx`**, **`app/dashboard/[page]/page.tsx`**, **`app/dashboard/layout/AppSidebar.tsx`**, **`components/PrefetchDashboardChunks.tsx`**: Callers passing `isTeacher`
