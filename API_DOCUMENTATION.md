# HRMS API Reference

Base URL: `/api`

Last updated: 2026-02-23

This document lists the backend HTTP endpoints, expected request bodies, query parameters and authorization requirements.

Auth header: `Authorization: Bearer <token>` (for protected routes)

---

## Auth (/api/auth)
- POST `/login` — Public
  - Body: `{ email, password }`
- POST `/forgot-password` — Public
  - Body: `{ email }`
- POST `/reset-password` — Public
  - Body: `{ token, password }`
- POST `/register` — Protected (`admin`, `hr`)
  - Multipart: `profilePhoto` (file)
  - Body: `{ employeeId, name, email, password, role?, department?, position? }`
- GET `/me` — Protected
- POST `/logout` — Protected
- GET `/login-history/:userId` — Protected
- PUT `/update-location` — Protected
  - Body: `{ latitude, longitude }` (or `{ location }`)

### Example: Login
- Request: POST `/api/auth/login`
  - Body: { "email": "user@example.com", "password": "secret" }
- Response (200):
  {
    "success": true,
    "data": {
      "user": { "id": "...", "name": "...", "email": "..." },
      "token": "ey..."
    }
  }

### Example: Register (admin/hr only)
- Request: POST `/api/auth/register` (multipart/form-data)
  - Fields: `name`, `email`, `password`, `role` (optional), `department` (optional), `position` (optional)
  - File field: `profilePhoto` (optional)
- Response (201): `{ success: true, data: { user: { ... } } }`

---

## Users (/api/users)
- PUT `/profile` — Protected
  - Multipart: `profilePhoto` (file)
  - Body: profile fields to update (name, email, department, position, etc.)
- GET `/` — Protected (`admin`, `hr`)
- GET `/:id` — Protected
- PUT `/:id` — Protected
  - Multipart: `profilePhoto` (file)
  - Body: fields to update for that user
- DELETE `/:id` — Protected (`admin`, `hr`)

---

## Admin (/api/admin)
All routes protected and authorized for role `admin`.
- GET `/dashboard`
- GET `/activity`
- GET `/companies`
- GET `/hr-accounts`
- GET `/hr/:id`
- POST `/hr/:id/reset-password` — Body: `{ password? }` (handled by controller)
- GET `/employees`
- GET `/leaves` (cross-company)
- GET `/tasks`

---

## HR (/api/hr)
Routes protected and authorized for `hr` and `admin`.
- GET `/dashboard`
- GET `/departments/stats`
- GET `/employees`
- GET `/employees/:id`
- POST `/employees` — Multipart: `profilePhoto` + Body: employee fields
- PUT `/employees/:id` — Multipart: `profilePhoto` + Body: fields to update
- DELETE `/employees/:id`
- GET `/attendance/today`
- GET `/leaves/pending`
- GET `/expenses/pending`

---

## Leave (/api/leave)
All routes require authentication; some require `hr`/`admin` for review actions.
- GET `/balance` — Get current user's leave balance
- GET `/statistics` — Leave statistics
- POST `/` — Create leave request
  - Body (example): `{ startDate, endDate, leaveType, reason, days, userId? }`
  - Middleware: `validateLeaveRequest`
- GET `/` — List leave requests (filtered by role)
  - Query: optional date range and filters (`startDate`, `endDate`, `status`, `type`)
- GET `/:id` — Get single leave
- PUT `/:id/approve` — Authorize `admin`, `hr`
  - Body: optional `{ reviewNote }`
- PUT `/:id/reject` — Authorize `admin`, `hr`
  - Body: optional `{ reviewNote }`
- PUT `/:id/cancel` — Cancel leave (permission checked in controller)

---

## Attendance (/api/attendance)
All routes require authentication.
- POST `/check-in` — Multipart `photo` optional
  - Body: optional `{ location }` or multipart `photo`
- POST `/check-out` — Body: `{ location? }` (validated by `validateAttendance`)
- GET `/today` — Today's status
- GET `/my-attendance` — Query: `startDate`, `endDate`
- GET `/summary` — Attendance summary for month
- POST `/edit-request` — Submit edit request
- POST `/half-day-request` — Submit half-day
- GET `/edit-requests` — My edit requests
- GET `/edit-requests/pending` — `admin`/`hr` pending edit requests
- PUT `/edit-requests/:requestId` — `admin`/`hr` review (approve/reject)
- GET `/` — All company attendance (`admin`/`hr`) with date filters
- POST `/mark` — `admin`/`hr` manually mark attendance

---

## Tasks (/api/tasks)
All routes require authentication.
- GET `/statistics`
- POST `/` — Create task
  - Body: see `validateTask` (title, description, assignee(s), dueDate, priority, subtasks[])
- GET `/` — List tasks (filtered)
- GET `/:id` — Get single task
- PUT `/:id` — Update task
- PUT `/:id/progress` — Update progress
- POST `/:id/attachments` — Add attachment (file upload)
- PUT `/:id/subtasks/:subTaskId` — Update subtask status
- DELETE `/:id` — Delete task

---

## Announcements (/api/announcements)
All routes require authentication. Create/update/delete restricted to `admin`/`hr`.
- GET `/` — List announcements
- GET `/unread/count` — Unread count
- GET `/:id` — Get announcement
- PUT `/:id/read` — Mark as read
- POST `/` — Create announcement (admin/hr)
  - Body: `{ title, message, audience? }`
- PUT `/:id` — Update announcement (admin/hr)
- DELETE `/:id` — Delete (admin/hr)

---

## Chat (/api/chat)
All routes require authentication.
Rooms:
- GET `/rooms` — List chat rooms
- POST `/rooms/personal` — Body: `{ userId }` — get or create personal chat
- GET `/rooms/:roomId/messages`
- POST `/rooms/:roomId/messages` — Body: `{ content, attachments? }`
- POST `/rooms/:roomId/upload` — Multipart `file`
- PUT `/rooms/:roomId/read` — Mark room as read
Groups:
- POST `/groups` — Create group
- GET `/groups/:groupId`
- PUT `/groups/:groupId`
- DELETE `/groups/:groupId`
- POST `/groups/:groupId/members` — Add members
- DELETE `/groups/:groupId/members/:memberId` — Remove member
- POST `/groups/:groupId/leave` — Leave group
- GET `/groups/:groupId/messages`
Users / Messages / Legacy:
- GET `/users` — Company users for chat
- GET `/users/search` — Search
- DELETE `/messages/:messageId`
- GET `/unread` — Unread messages
- Legacy endpoints for compatibility are present (conversations, messages by user, send, read)

---

## Companies (/api/companies)
All routes require authentication; management requires `admin`.
- GET `/` — Admin: list companies
- POST `/` — Admin: create company
  - Body: `{ name, address, contact, timezone, ... }`
- PUT `/:id` — Admin: update
- DELETE `/:id` — Admin: delete
- PUT `/:id/status` — Admin: enable/disable company
- GET `/:id` — Company details (all authenticated users)
- GET `/:id/stats` — Company statistics

---

## Employees (/api/employees)
All require authentication; restricted to `employee` role for personal endpoints.
- GET `/dashboard` — `employee` only
- GET `/profile` — `employee` only
- PUT `/profile` — `employee` only, multipart `profilePhoto`
- PUT `/change-password` — `employee` only
- GET `/tasks` — `employee` only (my tasks)
- GET `/leaves` — `employee` only (my leaves)
- GET `/expenses` — `employee` only (my expenses)
- GET `/attendance` — `employee` only (my attendance)
- GET `/leave-balance` — `employee` only
- GET `/team` — `employee` only

---

## Expenses (/api/expenses)
All routes require authentication.
- GET `/statistics` — Query filters supported
- POST `/` — Create expense (multipart `receipt` + validate fields)
  - Body: `{ amount, date, category, description, projectId?, receipt (file) }`
- GET `/` — List expenses (filters: date range, status, user)
- GET `/:id` — Get single expense
- PUT `/:id` — Update expense
- PUT `/:id/approve` — `admin`/`hr` approve
- PUT `/:id/reject` — `admin`/`hr` reject
- PUT `/:id/pay` — `admin` mark as paid
- DELETE `/:id` — Delete expense

---

## Leave Balance (/api/leave-balance)
All routes require authentication.
- GET `/me` — My balance
- GET `/` — Admin: all balances
- GET `/:userId` — Get balance for user
- PUT `/:userId` — Admin assign balance
  - Body: `{ paid?: number, sick?: number, unpaid?: number }`
- POST `/bulk` — Admin bulk assign
  - Body: `{ userIds: string[], paid: number, sick: number, unpaid: number }`

---

## Payroll (/api/payroll)
All routes require authentication. Admin has full CRUD; HR/Employee have view-limited access.

Employee Salary endpoints:
- GET `/salaries/me` — Get my salary details
- GET `/salaries` — List salaries (admin sees all)
- GET `/salaries/:id` — Get salary by ID
- POST `/salaries` — Admin create salary
  - Body: `{ userId, basic, allowances: [{ name, amount }], deductions: [{ name, amount }], effectiveFrom, note? }`
- PUT `/salaries/:id` — Admin update salary
- DELETE `/salaries/:id` — Admin delete salary

Pre-payments:
- GET `/pre-payments`
- GET `/pre-payments/:id`
- POST `/pre-payments` — Admin create
  - Body: `{ userId, amount, reason, date }`
- PUT `/pre-payments/:id` — Admin update
- DELETE `/pre-payments/:id` — Admin delete

Increment/Promotion:
- GET `/increments`
- GET `/increments/:id`
- POST `/increments` — Admin create
  - Body: `{ userId, amount, type: 'increment'|'promotion', effectiveDate, note }`
- PUT `/increments/:id` — Admin update
- DELETE `/increments/:id` — Admin delete

Payroll records:
- GET `/my-payrolls` — My payrolls
- GET `/` — List payrolls
- GET `/:id` — Get payroll by ID
- POST `/generate` — Admin generate payroll (body: params like month, year, companyId?)
- PUT `/:id` — Admin update payroll
- DELETE `/:id` — Admin delete payroll

---

## Policies (/api/policies)
All require authentication; write actions require `admin`.
- GET `/` — List policies
- GET `/:id` — Get policy
- GET `/:id/download` — Download file
- POST `/` — Admin create policy (multipart `file` + metadata)
- DELETE `/:id` — Admin delete

---

## Setup (/api/setup)
- POST `/first-admin` — Create first admin
  - Body: `{ employeeId, name, email, password, department?, position? }`
- GET `/status` — Check if setup required

---

## Notes
- All routes listed are mounted under `/api` in `server.js` (e.g. `app.use('/api/auth', authRoutes)`).
- Many endpoints validate request payloads using middleware (`validator.js`) — payloads should follow the server validators (e.g. `validateLeaveRequest`, `validateExpense`, `validateTask`).
- File uploads use multipart `form-data` with field names specified in the routes (commonly `profilePhoto`, `file`, `receipt`, `photo`).

If you want, I can:
- Generate a Postman collection for all endpoints.
- Expand each endpoint with full request/response JSON examples by reading the corresponding controller and validator files.

---

## New Auth endpoints added 23/2/2026 (EVENING)
The following endpoints were integrated on 23/2/2026. All routes are mounted under `/api/auth`.

1) Change own password
- Endpoint: `PUT /api/auth/change-password`
- Auth: Required (Bearer token)
- Body (JSON):

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

- Success response (200):

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

Notes: the user must provide their current password. The server validates the current password and saves the new password with bcrypt hashing.

2) Admin/HR reset another user's password
- Endpoint: `PUT /api/auth/admin-reset-password/:userId`
- Auth: Required (Bearer token). Access control: `admin` and `hr` roles only (HR is restricted to employee/client accounts by business rules).
- Path params:
  - `userId` — the MongoDB `_id` of the user whose password will be reset.
- Body (JSON): (optional)

```json
{
  "newPassword": "OptionalNewPassword"
}
```

- Behavior:
  - If `newPassword` is provided in the body, the server sets that password for the user.
  - If not provided, the server generates a secure random 12-character password and sets it.
  - For HR users the endpoint will only operate on users in allowed roles (employee/client) per server-side checks.

- Success response (200):

```json
{
  "success": true,
  "message": "Password reset successfully",
  "password": "GeneratedOrProvidedPassword" // present only when server returns the generated password
}
```

3) Generate a secure random password (helper)
- Endpoint: `GET /api/auth/generate-password`
- Auth: Required (Bearer token). Access control: `admin` and `hr` roles.
- Query: none
- Success response (200):

```json
{
  "success": true,
  "password": "Abc12!@#XyZ"
}
```

Notes: this endpoint returns a secure, generated password string suitable for use when resetting accounts.

4) List user credentials (paginated)
- Endpoint: `GET /api/auth/user-credentials`
- Auth: Required (Bearer token). Access control: `admin` and `hr` roles (HR filtered to employee/client scope).
- Query parameters:
  - `page` (optional, default 1)
  - `limit` (optional, default 10)
  - `search` (optional) — matches name, email, or employeeId
  - `role` (optional) — filter by role (e.g., `employee`, `hr`, `admin`, `client`)

- Success response (200):

```json
{
  "success": true,
  "data": [
    {
      "_id": "603d...",
      "employeeId": "EMP-001",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "employee",
      "department": "Engineering",
      "position": "Software Engineer",
      "status": "active",
      "profilePhoto": "https://.../photo.jpg",
      "joinDate": "2023-01-15"
    }
  ],
  "total": 123,
  "page": 1,
  "totalPages": 13
}
```

Notes: The endpoint returns user metadata only; passwords are never exposed. Use this endpoint to populate user credential management UIs (reset/generate password actions are separate).

5) Reset password (existing endpoint — updated signature)
- Endpoint: `PUT /api/auth/reset-password` (or existing route used for password resets)
- Body (JSON):

```json
{
  "email": "user@example.com",
  "resetToken": "123456", // the 6-digit OTP/token sent to email
  "newPassword": "new-password"
}
```

- Success response (200):

```json
{
  "success": true,
  "message": "Password has been reset"
}
```

Notes: The frontend flow for forgot password should call `POST /api/auth/forgot-password` with `{ email }` to trigger an email with a 6-digit code and then call this endpoint with `email`, `resetToken` and `newPassword`.

---

If you want, I can append cURL examples or a ready-made Postman collection for these endpoints to this document.

---

---

## Half-Day Leave (POST /api/leaves/half-day)

Create a half-day leave request for an employee. This endpoint is used by the frontend `LeaveModule` when a user applies for a half-day (morning or afternoon).

- **Endpoint:** `POST /api/leaves/half-day`
- **Auth:** `Authorization: Bearer <token>` (required)
- **Content-Type:** `application/json`

Request body schema:

- `employeeId` (string, optional) — MongoDB `_id` of the employee; if omitted the server uses the authenticated user `req.user._id`.
- `leaveType` (string, required) — one of: `sick`, `paid`, `unpaid`.
- `date` (string, required) — local date in `YYYY-MM-DD` format (frontend sends local date; server treats it as local midnight).
- `session` (string, required) — `morning` or `afternoon`.
- `reason` (string, required) — brief reason (frontend enforces minimum 10 characters).
- `leavePolicyId` (string, optional) — reference to a company leave policy if applicable.
- `attachments` (array[string], optional) — array of file URLs or IDs (if files uploaded separately).

Example request body:

```json
{
  "leaveType": "paid",
  "date": "2026-03-05",
  "session": "morning",
  "reason": "Doctor appointment",
  "leavePolicyId": "policy_123",
  "attachments": ["https://files.example.com/doc1.pdf"]
}
```

Success response (201 Created):

```json
{
  "success": true,
  "message": "Half-day leave request submitted successfully",
  "data": {
    "_id": "60f7c2a1b9e1f23d4c8a9b2c",
    "user": "60f7c2a1b9e1f23d4c8a9b2c",
    "leaveType": "paid",
    "isHalfDay": true,
    "session": "morning",
    "startDate": "2026-03-05T00:00:00.000Z",
    "endDate": "2026-03-05T00:00:00.000Z",
    "days": 0.5,
    "status": "pending",
    "reason": "Doctor appointment",
    "createdAt": "2026-02-24T10:12:34.000Z"
  }
}
```

Common error responses:

- **400 Bad Request** — validation failed (missing or invalid fields). Example:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Session is required", "Date is invalid"]
}
```

- **401 Unauthorized** — missing/invalid auth token.

- **409 Conflict** — existing leave conflict (full-day or same-session half-day):

```json
{
  "success": false,
  "message": "A half-day or full-day leave already exists for this date and session"
}
```

- **400 Insufficient Balance** — when requesting `paid`/`sick` and remaining balance < 0.5:

```json
{
  "success": false,
  "message": "Insufficient paid leave balance for a half-day request. Contact your admin to assign leave balance."
}
```

Notes & business rules:

- The server treats `unpaid` leave as unlimited; it bypasses leave-balance checks.
- Full-day approved leaves covering the requested date will block half-day creation (conflict) and also prevent the user from checking in that day.
- Approved half-day leaves do not block check-in (employee may still check in/out for the other session).
- Date validation uses local date semantics to avoid timezone off-by-one errors. Frontend should send `YYYY-MM-DD`.

cURL example:

```bash
curl -X POST "https://your-server.example.com/api/leaves/half-day" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"leaveType":"paid","date":"2026-03-05","session":"morning","reason":"Doctor appointment"}'
```
