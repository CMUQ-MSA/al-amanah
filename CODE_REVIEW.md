# Al-Amanah Full-Stack Codebase Review

**Date:** March 15, 2026  
**Scope:** End-to-end security, architecture, and code review  
**Stack:** FastAPI + SQLAlchemy + SQLite + React 18 + Vite + nginx + Docker Compose

---

## Section A: Top Findings

### Finding 1: Task Pool Reassignment Does NOT Reset Status to PENDING

- **Severity:** High
- **Confidence:** High
- **Location:** `backend/app/routers/tasks.py` lines 145–170

**The Problem:** The `update_task` endpoint checks for `assignment_changed` by comparing `assigned_to` and `assigned_team_id`, but does **not** check whether `assigned_user_ids` (pool assignments) changed. A pool reassignment silently leaves the task in its current status (e.g., DONE) even though the assignees are now completely different people.

```python
# Lines 149-153: Only checks two of three assignment paths
assignment_changed = False
if "assigned_to" in update_dict and update_dict["assigned_to"] != task.assigned_to:
    assignment_changed = True
if "assigned_team_id" in update_dict and update_dict["assigned_team_id"] != task.assigned_team_id:
    assignment_changed = True
# BUG: no check for assigned_user_ids change!
```

**Impact:** Task marked DONE by User A remains DONE after reassigning to Users B and C via pool — violating the core business rule that assignment changes reset status to PENDING.

**Recommendation:** After the existing `assignment_changed` checks, add:
```python
if assigned_user_ids is not None:
    current_pool_ids = sorted([a.user_id for a in task.assignments])
    new_pool_ids = sorted(assigned_user_ids)
    if current_pool_ids != new_pool_ids:
        assignment_changed = True
```

**Prevention:** Test: Update a DONE task's `assigned_user_ids` and assert `status == PENDING`.

---

### Finding 2: CORS `allow_origin_regex` Matches ANY HTTPS Origin

- **Severity:** High
- **Confidence:** High
- **Location:** `backend/app/main.py` lines 53–55

**The Problem:** In production (`DEBUG=False`), the CORS regex `r"https://.*"` matches **any** HTTPS origin — including `https://evil.com`. Combined with `allow_credentials=True`, this allows any HTTPS website to make authenticated cross-origin requests using the user's session cookie.

```python
return {"allow_origin_regex": r"https://.*"}
```

**Impact:** Classic credential-forwarding CORS exploitation. An attacker's HTTPS site can call the API with the victim's cookies, reading dashboard data, modifying tasks, or escalating privileges if the user is an admin.

**Recommendation:** Replace with the actual domain:
```python
return {"allow_origin_regex": r"https://.*\.cmuqmsa\.org"}
```
Or use an explicit `allow_origins` list:
```python
return {"allow_origins": ["https://tasks.cmuqmsa.org"]}
```

**Prevention:** Test that validates CORS preflight responses reject `https://evil.com` as origin.

---

### Finding 3: Rate Limiter Sees nginx Proxy IP, Not Real Client IP

- **Severity:** High
- **Confidence:** High
- **Location:** `backend/app/limiter.py` lines 4–5, `nginx/nginx.conf` line 31

**The Problem:** `get_remote_address` from SlowAPI reads `request.client.host`, which behind the nginx proxy is always the Docker network IP of the nginx container (e.g., `172.x.x.x`). While nginx sets `X-Real-IP` and `X-Forwarded-For`, the limiter does not use those headers. This means:
1. All users share a single rate limit bucket.
2. One user hitting the limit blocks **all** users from logging in.
3. An actual attacker is not individually rate-limited at all.

```python
limiter = Limiter(key_func=get_remote_address)  # Sees Docker internal IP, not real client
```

**Impact:** Rate limiting on `/auth/login` (brute-force protection) is effectively non-functional in the Docker deployment.

**Recommendation:**
```python
from fastapi import Request

def get_real_ip(request: Request) -> str:
    """Extract client IP from proxy headers, falling back to direct connection."""
    forwarded = request.headers.get("X-Real-IP")
    if forwarded:
        return forwarded
    return request.client.host

limiter = Limiter(key_func=get_real_ip)
```

Backend port is only `expose`d (not `ports`), so only nginx can reach it — header spoofing from external clients is not possible in this topology.

**Prevention:** Integration test: send login requests with different `X-Real-IP` headers and verify independent rate tracking.

---

### Finding 4: No Session Invalidation on Password Change or User Deletion

- **Severity:** Medium
- **Confidence:** High
- **Location:** `backend/app/routers/auth.py` lines 94–110, `backend/app/routers/users.py` lines 84–95

**The Problem:** Sessions are signed tokens containing `{"user_id": N}` with a 7-day expiry. There is no server-side session store. When:
1. A user changes their password, all existing sessions remain valid for up to 7 days.
2. An admin deletes a user, the user's session token remains technically valid — `get_current_user` will fail with 401 "User not found" because the DB lookup fails, not because the session was invalidated.

Case #1 is the main concern: after a password change (potentially due to compromise), the old/compromised session remains usable.

**Impact:** Compromised session persists after password reset.

**Recommendation:** Add a `password_changed_at` timestamp to the User model and include it in the session token. During verification, reject tokens issued before the last password change.

**Prevention:** Test: change password, then verify old session cookie returns 401.

---

### Finding 5: Admin Can Delete Their Own Account

- **Severity:** Medium
- **Confidence:** High
- **Location:** `backend/app/routers/users.py` lines 84–95

**The Problem:** The `delete_user` endpoint has no check preventing an admin from deleting their own account. The `_` parameter discards the admin user identity, so there is no comparison between `user_id` and the current admin's ID.

```python
async def delete_user(user_id: int, db, _: User = Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    # No check: user_id != _.id
    db.delete(user)
```

**Impact:** An admin can accidentally lock out the only admin account, requiring direct database intervention to recover.

**Recommendation:**
```python
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    db.delete(user)
    db.commit()
```

**Prevention:** Test: admin attempts to delete themselves, expects 400.

---

### Finding 6: FastAPI Docs/OpenAPI Exposed in Production via nginx

- **Severity:** Medium
- **Confidence:** High
- **Location:** `nginx/nginx.conf` lines 38–49

**The Problem:** The nginx config proxies `/docs` and `/openapi.json` to the backend unconditionally. FastAPI serves interactive Swagger UI by default (`docs_url` is not disabled). In production, this exposes the full API schema, internal model structures, and a live testing interface.

```nginx
location /docs {
    proxy_pass http://backend:8000;
}
location /openapi.json {
    proxy_pass http://backend:8000;
}
```

**Impact:** Reconnaissance — attackers see every endpoint, parameter, and schema. Not a direct exploit, but significantly reduces the barrier to finding and exploiting other issues.

**Recommendation:** Conditionally disable docs in production in `main.py`:
```python
app = FastAPI(
    title="MSA Task Tracker",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)
```

**Prevention:** Automated check that `/docs` returns 404 in production config.

---

### Finding 7: `markDone` Optimistic Rollback Assumes PENDING as Previous State

- **Severity:** Medium
- **Confidence:** High
- **Location:** `frontend/src/features/dashboard/components/TaskRow.tsx` lines 24–36

**The Problem:** In `markDone`, the rollback on error hardcodes revert to `status: 'PENDING'`:
```typescript
// Revert on error
updateTask(task.id, { status: 'PENDING', completed_by: null, completed_by_name: null });
```
While the UI guard makes this unlikely in practice (checkbox only shows for PENDING tasks), `undoStatus` correctly captures previous state (lines 43-46) while `markDone` does not — indicating an inconsistency.

**Impact:** Minor — next dashboard refresh would fix any mismatch. But inconsistent defensive coding.

**Recommendation:** Capture `task.status` before the optimistic update:
```typescript
const markDone = async () => {
    const previousStatus = task.status;
    const previousCompletedBy = task.completed_by;
    const previousCompletedByName = task.completed_by_name;
    updateTask(task.id, { status: 'DONE', completed_by: user?.id, completed_by_name: user?.display_name });
    try {
        await api.markTaskDone(task.id);
    } catch (e) {
        updateTask(task.id, { status: previousStatus, completed_by: previousCompletedBy, completed_by_name: previousCompletedByName });
    }
};
```

**Prevention:** Frontend test: simulate `markDone` API failure and assert rollback restores original state.

---

### Finding 8: Scheduler Per-Task Error Handling Gaps

- **Severity:** Medium
- **Confidence:** Medium
- **Location:** `backend/app/services/scheduler.py` lines 24–74

**The Problem:** In `check_auto_reminders`, the session commits per-task inside the loop, but the outer `try/except` wraps the entire loop. If `send_reminder` succeeds for task 1 and its `auto_reminder_sent` is committed, but task 2 fails, the outer `except` calls `db.rollback()` which is a no-op for already-committed changes. However, if the commit for task 1 succeeds but `send_reminder` for task 2 raises before commit, the reminder was sent but the flag wasn't set — causing a duplicate reminder on the next run.

```python
for task in tasks:
    # ... send reminder ...
    task.auto_reminder_sent = True
    db.commit()  # Per-task commit
```

**Impact:** Duplicate Discord notifications on partial failures. Not a data integrity issue, but a user annoyance.

**Recommendation:** Add per-task `try/except`:
```python
for task in tasks:
    try:
        # ... send reminder ...
        task.auto_reminder_sent = True
        db.commit()
    except Exception as e:
        logger.error(f"Failed for task {task.id}: {e}")
        db.rollback()
```

**Prevention:** Test with mocked `send_reminder` that fails on the 2nd call — verify 1st task's flag persists.

---

### Finding 9: `UserUpdate` Schema + `setattr` Loop Pattern

- **Severity:** Low
- **Confidence:** High
- **Location:** `backend/app/routers/users.py` lines 72–77, `backend/app/schemas/user.py` lines 30–37

**The Problem:** The update pattern uses `model_dump(exclude_unset=True)` → `setattr(user, key, value)` generically. This is safe today because the Pydantic schema controls which fields exist. The `password` → `password_hash` translation on line 73–74 is correctly handled. The concern is future-proofing: if someone adds a sensitive field (like `password_hash` or `username`) to `UserUpdate`, the `setattr` loop would blindly apply it.

**Impact:** No current exploit. Defensive-coding hygiene observation.

**Recommendation:** No action needed unless the schema grows. Consider adding an explicit allowlist if the team grows.

---

### Finding 10: SQLite Concurrent Write Contention

- **Severity:** Low
- **Confidence:** Medium
- **Location:** `backend/app/database.py` lines 14–27

**The Problem:** WAL mode is correctly enabled, but SQLite still has a single-writer constraint. The `PRAGMA synchronous=NORMAL` setting trades some durability for speed — in a crash, the last few transactions may be lost.

**Impact:** For the expected user base (MSA coordination — likely <50 concurrent users), this is unlikely to be a bottleneck. Acceptable for current scale.

**Recommendation:** No action needed at current scale. If scaling beyond ~100 concurrent users, consider PostgreSQL. The SQLAlchemy abstraction makes migration straightforward.

---

## Section B: Open Questions / Assumptions

1. **Cloudflare tunnel trust model:** The `is_https_request` function in `auth.py` trusts `cf-visitor` and `x-forwarded-proto` headers. If the backend is ever exposed without Cloudflare/nginx in front of it, these headers could be spoofed. **Assumption:** Backend is never directly exposed — Docker confirms `expose: 8000` (not `ports`), which is correct.

2. **Scheduler `asyncio.create_task` in lambda:** `scheduler.py` line 79 uses `lambda: asyncio.create_task(check_auto_reminders())`. This fires-and-forgets the task. If the coroutine raises, the exception becomes an unhandled task exception. **Needs verification:** Whether APScheduler's `AsyncIOScheduler` properly handles async jobs without this lambda wrapper.

3. **Frontend `User` type missing `created_at`:** The TypeScript `User` interface in `frontend/src/types/index.ts` omits `created_at`, while the backend `UserOut` schema includes it. Benign if the frontend never uses it, but represents schema drift.

4. **Comment content length:** `CommentCreate` has no `max_length` constraint — comments can be arbitrarily long. The backend model uses `Text` type (unbounded).

5. **Import endpoint trusts input enum strings:** `export.py` line 267 does `TaskType[task_data.task_type]` which raises `KeyError` on invalid enum values. Caught by the outer `try/except`, but the error message doesn't indicate which specific task had bad data.

---

## Section C: Suggested Fix Plan

**Priority order** (risk vs. effort):

| Priority | Finding | Effort | Risk if Unfixed |
|----------|---------|--------|-----------------|
| **P0** | #2 — CORS regex too permissive | 5 min | Cross-origin credential theft |
| **P0** | #3 — Rate limiter sees proxy IP only | 15 min | Brute-force login unprotected |
| **P1** | #1 — Pool reassignment skips status reset | 10 min | Data integrity violation |
| **P1** | #6 — Docs exposed in production | 5 min | Recon exposure |
| **P2** | #5 — Admin self-deletion | 5 min | Accidental lockout |
| **P2** | #4 — No session invalidation on password change | 30 min | Compromised session persistence |
| **P3** | #7 — markDone rollback inconsistency | 5 min | Cosmetic state mismatch |
| **P3** | #8 — Scheduler per-task error handling | 10 min | Duplicate notifications |

**Recommended sequence:** #2 → #3 → #1 → #6 → #5 → #4 → #7 → #8

---

## Section D: Test Gaps and Concrete New Tests

### Backend Test Coverage: 182 tests across 12 files

### Critical Missing Tests:

1. **Pool assignment status reset** (Finding #1):
   ```python
   def test_update_task_pool_assignment_resets_status(admin_client, task, db_session):
       """Changing assigned_user_ids resets DONE task to PENDING."""
       task.status = TaskStatus.DONE
       db_session.commit()
       response = admin_client.put(f"/api/tasks/{task.id}", json={"assigned_user_ids": [999]})
       assert response.json()["status"] == "PENDING"
   ```

2. **CORS origin rejection**:
   ```python
   def test_cors_rejects_arbitrary_https_origin():
       """Production CORS should not allow https://evil.com."""
   ```

3. **Rate limiter with X-Real-IP**:
   ```python
   def test_rate_limit_per_real_ip(client):
       """Different X-Real-IP values get independent rate limits."""
   ```

4. **Admin self-deletion guard**:
   ```python
   def test_admin_cannot_delete_self(admin_client, admin_user):
       response = admin_client.delete(f"/api/users/{admin_user.id}")
       assert response.status_code == 400
   ```

5. **Session invalidation on password change**:
   ```python
   def test_old_session_invalid_after_password_change(client, member_user):
       """Session created before password change should be rejected."""
   ```

6. **Task status transition edge cases**:
   ```python
   def test_done_to_undo_to_done_to_cannot_do(member_client, task):
       """Full cycle: PENDING→DONE→PENDING(undo)→DONE→CANNOT_DO should work."""
   ```

7. **Scheduler duplicate prevention**:
   ```python
   async def test_auto_reminder_not_sent_twice():
       """Task with auto_reminder_sent=True is not reminded again."""
   ```

8. **Delete user with active tasks/assignments**:
   ```python
   def test_delete_user_with_assigned_tasks(admin_client, task, member_user):
       """Deleting a user with assigned tasks should handle gracefully."""
   ```

9. **Import with invalid enum values**:
   ```python
   def test_import_invalid_task_status(admin_client):
       """Import with status='INVALID' should report error, not crash."""
   ```

10. **Event cascade deletion**:
    ```python
    def test_delete_event_cascades_to_tasks(admin_client, event, task):
        """Deleting an event should also delete its tasks."""
    ```

### Frontend Test Gaps:

- **AdminPanel component** — No component-level tests
- **Form components** — No tests for create/edit task, create user forms
- **ThemeContext** — Used but not tested
- **Network resilience** — Error boundaries, retry logic, offline handling
- **Integration flows** — End-to-end workflows (create task → assign → complete)

---

## Section E: Quick Wins vs. Deeper Refactors

### Quick Wins (< 30 min each, immediate value):

1. **Fix CORS regex** — one-line change in `backend/app/main.py` line 55 to restrict to `cmuqmsa.org`
2. **Disable docs in production** — add `docs_url=None if not settings.DEBUG else "/docs"` to FastAPI constructor
3. **Add self-deletion guard** — 3 lines in `backend/app/routers/users.py` line 90
4. **Fix pool assignment status reset** — 4 lines in `backend/app/routers/tasks.py` line 155
5. **Fix markDone rollback** — capture `task.status` before optimistic update in `TaskRow.tsx`

### Deeper Refactors (require design decisions):

1. **Server-side session store** — Currently stateless signed tokens. Adding Redis/DB-backed sessions would enable true invalidation on password change, explicit session revocation, and concurrent session limits. Significant architectural change but addresses Finding #4.

2. **Rate limiter proxy-awareness** — Needs careful implementation to prevent IP spoofing via `X-Real-IP` header. Current Docker topology (backend not directly exposed) makes this safe, but it should be documented as a deployment constraint.

3. **Migrate from SQLite to PostgreSQL** — For production deployments with >50 concurrent users. SQLAlchemy abstraction makes this relatively straightforward.

4. **Extract duplicated `task_to_out` / assignee resolution** — Both `tasks.py` and `dashboard.py` have nearly identical assignee resolution code (~50 lines each). Consolidating into a shared utility reduces divergence risk.

5. **Frontend: Add error boundary around Dashboard** — Currently API errors set an error string but there's no React Error Boundary. An unhandled rejection in the render path would white-screen the app.
