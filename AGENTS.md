# Project Guidelines & Memory Rules (AGENTS.md)

## State Persistence & User Scoping Rules

1. **Service Call User Scoping**:
   - Always pass `targetUserId` explicitly as the `userId` parameter when calling data services (`protectionService.set`, `netWorthService.set`, `budgetService.update`, etc.).
   - Never rely on default user context when a `viewingUserId` or explicit `targetUserId` is present.

2. **Form Draft State Isolation**:
   - Local form state (`draftDetail` / `draftItem`) must remain stable while editing.
   - Do not reset local draft states inside `useEffect` dependencies triggered by UI collapse/expand actions (`isExpanded`).

3. **Atomic Persistence**:
   - Always use `set` with the explicit `targetUserId` instead of separated `update`/`set` conditional branches to guarantee document synchronization in Firestore/local state.

## Scope & Change Discipline Rule
4. **Strict Scope Discipline**:
   - Hanya buat perubahan yang diminta secara khusus oleh pengguna.
   - Jangan ubah, tambah, padam, atau reka bentuk semula fungsi/komponen/kod sedia ada yang tidak berkaitan dengan permintaan.
