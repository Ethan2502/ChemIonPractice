# Implementation Plan: Comprehensive Deployment Fix

This plan addresses the current and potential production issues: "White Page" crashes, 404 API errors, and routing conflicts.

## Proposed Changes

### Frontend (Stability & UX)

#### [NEW] [components/ErrorBoundary.tsx](file:///Users/ethan/Documents/ChemIonPractice/src/components/ErrorBoundary.tsx)
- Create a standard React Error Boundary to catch rendering crashes and show a "Friendly error" page instead of a white screen.

#### [MODIFY] [App.tsx](file:///Users/ethan/Documents/ChemIonPractice/src/App.tsx)
- Wrap the entire application in the `ErrorBoundary`.

#### [MODIFY] [components/AuthModal.tsx](file:///Users/ethan/Documents/ChemIonPractice/src/components/AuthModal.tsx)
- Refine the error handling in `handleSubmit` to safely handle non-JSON responses (like Vercel's HTML error pages).

### Backend & Deployment (Connectivity)

#### [MODIFY] [vercel.json](file:///Users/ethan/Documents/ChemIonPractice/vercel.json)
- Simplify rewrites to use a more explicit `:path*` pattern.
- Ensure only necessary routes are intercepted by the backend.

#### [MODIFY] [api/index.ts](file:///Users/ethan/Documents/ChemIonPractice/api/index.ts)
- Add a catch-all error handler at the end of the Express app to log and return a JSON error instead of crashing.
- Mount routes more directly to avoid path mismatch issues.

---

## Verification Plan

### Manual Verification
1. **Local Build & Test**: Run `npm run build` and use a local static server to verify the Error Boundary and basic routing.
2. **Production Health Check**: Verify `https://.../api/health` returns "OK" after deployment.
3. **End-to-End Account Creation**: Use the browser tool to successfully sign up with a new account in the production environment.
