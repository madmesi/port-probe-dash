# Fix: "Cannot read properties of null (reading 'map')" Error

## Issue
The application was crashing when API endpoints returned null or non-array responses, then code tried to call `.map()` on the result.

## Root Cause
When `apiClient.getServers()`, `apiClient.getUsers()`, or other API methods returned null/undefined or a non-array value, the code attempted to immediately call `.map()` on the result, which throws:
```
Cannot read properties of null (reading 'map')
```

This could happen due to:
- Backend API errors or timeouts returning null JSON
- Network failures
- Authentication issues
- Unexpected response format from the server

## Files Fixed

### 1. `/src/components/BulkServerImport.tsx`
**Changes**: Added defensive null checks in both `handleTextImport()` and `handleExcelImport()` functions

```typescript
// Before (unsafe):
const existingServers = await apiClient.getServers();
const existingIPs = new Set(existingServers.map(s => s.ip_address));

// After (safe):
let existingServers: any[] = [];
try {
  const resp = await apiClient.getServers();
  existingServers = Array.isArray(resp) ? resp : [];
  if (!Array.isArray(resp)) {
    console.warn('apiClient.getServers() returned a non-array response:', resp);
  }
} catch (err) {
  console.error('Failed to fetch existing servers:', err);
  toast.error('Failed to fetch existing servers. Import may produce duplicates or fail.');
}

const existingIPs = new Set(existingServers.map((s: any) => s?.ip_address));
```

**Impact**: Excel and text server imports now won't crash if the API returns unexpected data.

### 2. `/src/pages/AdminUsers.tsx`
**Changes**: Added defensive null check in `fetchUsers()` function

```typescript
// Before (unsafe):
const data = await apiClient.getUsers();
setUsers(data.map((user: any) => ({ ... })));

// After (safe):
const data = await apiClient.getUsers();
const usersData = Array.isArray(data) ? data : [];
setUsers(usersData.map((user: any) => ({ ... })));
```

**Impact**: Admin Users page now handles API failures gracefully without crashing.

## Already Protected (No Changes Needed)
The following files already had proper null/array checks:
- `/src/pages/Index.tsx` - Already checks with `Array.isArray(data)`
- `/src/pages/AdminGroups.tsx` - Uses `data || []` fallback
- `/src/components/SSLManagement.tsx` - Checks both `certsData` and `serversData` with `Array.isArray()`
- `/src/components/SSLExpirationNotifications.tsx` - Checks with `Array.isArray(certificates)`
- `/src/components/admin/AdminUsersTab.tsx` - Already protected with `Array.isArray(rawData)`
- `/src/components/admin/AdminAPIKeysTab.tsx` - Uses `data || []` fallback

## Testing Recommendations

1. **Simulate API failure**: 
   - Temporarily break backend connection or mock API to return `null`
   - Try uploading an Excel file via Bulk Import
   - Navigate to Admin Users page
   - Verify no crash and appropriate error toasts appear

2. **Check console for logs**:
   - Look for `console.warn('apiClient.getServers() returned a non-array response: ...')`
   - Look for `console.error('Failed to fetch existing servers:', ...)`
   - These indicate the defensive code is working

3. **Monitor error reporting**:
   - Set up error tracking (Sentry, etc.) to catch any remaining unhandled exceptions
   - Watch for patterns in user reports about Excel import or Admin page crashes

## Pattern to Apply Elsewhere
If similar issues are found in the future, the pattern is:
```typescript
try {
  const data = await apiClient.someMethod();
  const safeData = Array.isArray(data) ? data : [];
  // Use safeData instead of data
} catch (error) {
  console.error('Error:', error);
  toast.error('Failed to fetch data');
}
```
