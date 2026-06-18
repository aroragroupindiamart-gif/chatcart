---
name: Expo white screen on context use in index.tsx
description: Using useContext (via useAuth) in app/index.tsx causes a blank white screen on web; workaround is to read AsyncStorage directly.
---

## Rule
Do NOT call `useAuth()` (or any React context hook that depends on a provider) directly in `app/index.tsx`. The route guard screen must read `AsyncStorage` directly.

**Why:** On web, Expo Router renders `app/index.tsx` before context providers stabilize during the initial mount cycle. Calling `useContext` in this file causes a blank white screen with no error. The issue is specific to the root index screen.

**How to apply:** In `app/index.tsx`, use `AsyncStorage.getItem(TOKEN_KEY)` in a `useEffect` to check auth state, then redirect with `<Redirect>`. Context providers like `AuthProvider` are correctly available in all screens *inside* route groups (e.g. `(tabs)`, `(auth)`).
