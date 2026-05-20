# State Management Rules

For any state management implementation, you MUST use only the following tools based on the state type:

| State Type | Best Tool | Why |
| :--- | :--- | :--- |
| **API / Server Data** | **TanStack Query** | Caching, autosync, retries, background fetching |
| **Global App / UI State** | **Zustand** | Lightweight, fast, simple global state |

## Guidelines

1. **API / Server Data (TanStack Query)**:
   - Always fetch, mutate, cache, and synchronize server data using React Query (TanStack Query).
   - Do not store server responses in global stores (like Zustand/Redux) or local React state unless absolutely necessary for transient UI edits before submission.
   - Use custom hooks to wrap query and mutation logic.

2. **Global App / UI State (Zustand)**:
   - Use Zustand for simple, lightweight global client-side state (e.g., active user sessions, sidebar toggle state, theme preference, wizard step progress).
   - Avoid boilerplate-heavy state managers like Redux or complex context-based state structures unless required by existing components.

3. **Local State**:
   - Use standard React `useState` / `useReducer` only for component-scoped, non-shared, transient state.
