# HRMS Backend API Reference

Summary of available API endpoints, authentication requirements, expected request bodies and quick examples. Paths are prefixed with `/api` (e.g., `POST /api/auth/login`). This document is a concise developer reference — tell me if you want full example responses or an OpenAPI spec.

---

**Authentication**

- POST /api/auth/login
  - Auth: Public
  - Body: { email: string, password: string }
  - Example:
    ```json
    { "email": "user@example.com", "password": "secret" }
    ```

- POST /api/auth/forgot-password
  - Auth: Public
  - Body: { email: string }

- POST /api/auth/reset-password
  - Auth: Public
  - Body: { token: string, password: string }

- POST /api/auth/register
  - Auth: Protected (admin, hr)
  - Multipart/form-data (optional `profilePhoto`)
  - Body (form fields): { name, email, phone, password, role, department, position, ... }

- GET /api/auth/me
  - Auth: Protected
  - Returns current user profile & roles

- POST /api/auth/logout
  - Auth: Protected

- GET /api/auth/login-history/:userId
  - Auth: Protected

- PUT /api/auth/update-location
  - Auth: Protected
  - Body: { location?: { latitude:number, longitude:number }, ip?: string }

---

**Employee** (`/api/employee/*`) — All routes require authentication

- GET /api/employee/dashboard
  - Auth: `employee`
  - Returns dashboard aggregation: `user`, `stats`, `leaveStats`, `attendanceStats`, `todayAttendance`, `tasks`, `announcements`

- GET /api/employee/profile
  - Auth: `employee`

- PUT /api/employee/profile
  - Auth: `employee`
  - Multipart/form-data (optional `profilePhoto`)
  - Body (form): { name?, phone?, address?, position?, department?, ... }

- PUT /api/employee/change-password
  - Auth: `employee`
  - Body: { currentPassword: string, newPassword: string }

- GET /api/employee/tasks
- GET /api/employee/leaves
- GET /api/employee/expenses
- GET /api/employee/attendance
- GET /api/employee/leave-balance
- GET /api/employee/team

---

**Leave** (`/api/leave/*`) — Auth required

- GET /api/leave/balance
  - Returns user leave balances

- GET /api/leave/statistics

- POST /api/leave
  - Validator: `validateLeaveRequest`
  - Body: { leaveType: string, startDate: ISODate, endDate: ISODate, reason: string }
  - Notes: `leaveType` must match server `LEAVE_TYPES` (e.g., paid, sick, unpaid)

- GET /api/leave
  - Query: `startDate`, `endDate`, `userId`, `status`

- GET /api/leave/:id
  - Params: `id` (ObjectId)

- PUT /api/leave/:id/approve
  - Auth: admin|hr

- PUT /api/leave/:id/reject
  - Auth: admin|hr

- PUT /api/leave/:id/cancel
  - Auth: Protected (controller verifies owner/permission)

---

**Attendance** (`/api/attendance/*`)

- POST /api/attendance/check-in
  - Body (multipart optional): { location?: { latitude, longitude }, note?: string } + optional `photo` file

- POST /api/attendance/check-out
  - Body: { location?: { latitude, longitude }, note?: string }

- GET /api/attendance/today
  - Returns today's attendance for authenticated user

- GET /api/attendance/my-attendance
  - Query: startDate, endDate

- GET /api/attendance/summary
  - Query: month, year

- POST /api/attendance/edit-request
  - Body: { date: ISODate, checkIn?: 'HH:mm', checkOut?: 'HH:mm', reason: string }

- POST /api/attendance/half-day-request
  - Body: { date: ISODate, reason: string }

- GET /api/attendance/edit-requests
- GET /api/attendance/edit-requests/pending (admin|hr)
- PUT /api/attendance/edit-requests/:requestId (admin|hr) — Body: { action: 'approve'|'reject', comments?: string }

- GET /api/attendance (admin|hr) — query filters
- POST /api/attendance/mark (admin|hr) — Body: { userId, date, checkIn, checkOut, note? }

---

**Tasks** (`/api/tasks/*`)

- GET /api/tasks/statistics
- POST /api/tasks
  - Validator: `validateTask`
  - Body: { title: string, assignedTo: userId, description?: string, priority?: string, dueDate?: ISODate }

- GET /api/tasks
- GET /api/tasks/:id
- PUT /api/tasks/:id
- PUT /api/tasks/:id/progress
  - Body: { progress: number }

- POST /api/tasks/:id/attachments (multipart)
- PUT /api/tasks/:id/subtasks/:subTaskId
  - Body: { completed: boolean }
- DELETE /api/tasks/:id

---

**Expenses** (`/api/expenses/*`)

- GET /api/expenses/statistics?startDate=&endDate=
- POST /api/expenses
  - Multipart (receipt) + Body: { category: string, amount: number, date: ISODate, description: string }
  - Validator enforces category enum and positive amount

- GET /api/expenses?startDate=&endDate=
- GET /api/expenses/:id
- PUT /api/expenses/:id
- PUT /api/expenses/:id/approve (admin|hr)
- PUT /api/expenses/:id/reject (admin|hr)
- PUT /api/expenses/:id/pay (admin)
- DELETE /api/expenses/:id

---

**Announcements** (`/api/announcements/*`)

- GET /api/announcements
- GET /api/announcements/unread/count
- GET /api/announcements/:id
- PUT /api/announcements/:id/read
- POST /api/announcements (admin|hr) — Body: { title, content, attachments? }
- PUT /api/announcements/:id (admin|hr)
- DELETE /api/announcements/:id (admin|hr)

---

**Clients** (`/api/client/*`)

- GET /api/client/dashboard (authorize client)
- Admin/HR: GET /api/client, GET /api/client/:id, POST /api/client (multipart), PUT /api/client/:id, DELETE /api/client/:id

---

**Company** (`/api/company/*`)

- GET /api/company (admin)
- POST /api/company (admin)
- PUT /api/company/:id (admin)
- DELETE /api/company/:id (admin)
- PUT /api/company/:id/status (admin)
- GET /api/company/:id
- GET /api/company/:id/stats

---

**HR** (`/api/hr/*`) - auth hr|admin

- GET /api/hr/dashboard
- GET /api/hr/departments/stats
- GET /api/hr/employees
- GET /api/hr/employees/:id
- POST /api/hr/employees (multipart)
- PUT /api/hr/employees/:id (multipart)
- DELETE /api/hr/employees/:id
- GET /api/hr/attendance/today
- GET /api/hr/leaves/pending
- GET /api/hr/expenses/pending

---

**Leave Balance** (`/api/leave-balance/*`)

- GET /api/leave-balance/me
- GET /api/leave-balance (admin)
- GET /api/leave-balance/:userId
- PUT /api/leave-balance/:userId (admin)
  - Body: { paid: number, sick: number, unpaid?: number }
- POST /api/leave-balance/bulk (admin)
  - Body: [{ userId, paid, sick, unpaid }, ...]

---

**Policy** (`/api/policy/*`)

- GET /api/policy
- GET /api/policy/:id
- GET /api/policy/:id/download
- POST /api/policy (admin, multipart file) — Body: { title, file }
- DELETE /api/policy/:id (admin)

---

**Chat** (`/api/chat/*`)

- GET /api/chat/rooms
- POST /api/chat/rooms/personal — Body: { userId }
- GET /api/chat/rooms/:roomId/messages
- POST /api/chat/rooms/:roomId/messages — Body: { content?, type?, file? }
- POST /api/chat/rooms/:roomId/upload (multipart)
- PUT /api/chat/rooms/:roomId/read
- POST /api/chat/groups — Body: { name, members[] }
- GET/PUT/DELETE group endpoints
- GET /api/chat/users, GET /api/chat/users/search?query=
- Messages: DELETE /api/chat/messages/:messageId, GET /api/chat/unread
- Legacy: /conversations, /messages/:userId, /send, /read/:userId, /unread/count

---

**Users** (`/api/users/*`)

- PUT /api/users/profile (protect, multipart)
- GET /api/users (admin|hr)
- GET /api/users/:id
- PUT /api/users/:id (protect, multipart)
- DELETE /api/users/:id (admin|hr)

---

**Admin** (`/api/admin/*`) — admin-only

- GET /api/admin/dashboard
- GET /api/admin/activity
- GET /api/admin/companies
- GET /api/admin/hr-accounts
- GET /api/admin/hr/:id
- POST /api/admin/hr/:id/reset-password
- GET /api/admin/employees
- GET /api/admin/leaves
- GET /api/admin/tasks

---

Notes & next steps
- Validation: See `middleware/validator.js` for required fields for leave, expense, task and attendance validation rules.
- File uploads: endpoints that accept files use `multipart/form-data` (middleware `uploadMiddleware`).
- If you want, I can:
  - Produce a full OpenAPI (Swagger) YAML file.
  - Add example JSON responses for each endpoint.
  - Generate a Postman collection.

File: [HRMS-Backend/API_DOCS.md](HRMS-Backend/API_DOCS.md)
