# HRMS Backend API Reference

This document lists server HTTP endpoints, methods, access roles, and request bodies (fields and upload expectations).

---

## Authentication

- POST /api/auth/login
  - Access: Public
  - Body: { email? (string) OR employeeId? (string), password (string), location? (object: { lat, lng, accuracy, address? }) }
  - Response: token, user

- POST /api/auth/forgot-password
  - Access: Public
  - Body: { email: string }

- POST /api/auth/reset-password
  - Access: Public
  - Body: { token: string, password: string }

- POST /api/auth/register
  - Access: Protected (admin, hr)
  - Body (multipart/form-data): fields from user creation (name, email, password, role, employeeId, company, etc.)
  - File: `profilePhoto` optional

- GET /api/auth/me
  - Access: Protected

- POST /api/auth/logout
  - Access: Protected

- GET /api/auth/login-history/:userId
  - Access: Protected

- PUT /api/auth/update-location
  - Access: Protected
  - Body: { location: { lat, lng, accuracy, address? } }

---

## Attendance

- POST /api/attendance/check-in
  - Access: Protected (all authenticated users)
  - Body (multipart/form-data):
    - Optional file: `photo` (image)
    - Field: `location` — either an object or JSON-stringified object with { lat (number), lng (number), accuracy (number), address (string, optional) }
  - Notes: Controller parses `location` if string, uploads photo to Cloudinary if present.

- POST /api/attendance/check-out
  - Access: Protected
  - Body: { location: { lat, lng, accuracy, address? } }

- GET /api/attendance/today
  - Access: Protected
  - Query: none

- GET /api/attendance/my-attendance
  - Access: Protected
  - Query params: startDate, endDate, pagination filters

- GET /api/attendance/summary
  - Access: Protected
  - Query: month, year, userId (optional)

- POST /api/attendance/edit-request
  - Access: Protected (Employee)
  - Body: { attendanceId, requestedCheckIn (datetime/string), requestedCheckOut (datetime/string), reason (string, >=10 chars) }

- POST /api/attendance/half-day-request
  - Access: Protected (Employee)
  - Body: { date (date/string), reason (string, >=10 chars) }

- GET /api/attendance/edit-requests
  - Access: Protected (Employee)

- GET /api/attendance/edit-requests/pending
  - Access: Protected (hr, admin)

- PUT /api/attendance/edit-requests/:requestId
  - Access: Protected (hr, admin)
  - Body: { action: 'approved'|'rejected', reviewNote?: string }

- GET /api/attendance
  - Access: Protected (hr, admin)
  - Query: date range filters

- POST /api/attendance/mark
  - Access: Protected (hr, admin)
  - Body: { userId (required), date?, checkIn?, checkOut?, status?, note? } (controller passes rest to service)

---

## Employee (self-service)

- GET /api/employee/dashboard
  - Access: Protected (employee)

- GET /api/employee/profile
  - Access: Protected (employee)

- PUT /api/employee/profile
  - Access: Protected (employee)
  - Body (multipart/form-data): allowed fields { phone, address, dateOfBirth }
  - File: `profilePhoto` optional

- PUT /api/employee/change-password
  - Access: Protected
  - Body: { currentPassword, newPassword }

- GET /api/employee/tasks
  - Access: Protected
  - Query: status

- GET /api/employee/leaves
  - Access: Protected
  - Query: status

- GET /api/employee/expenses
  - Access: Protected
  - Query: status

- GET /api/employee/attendance
  - Access: Protected
  - Query: startDate, endDate

- GET /api/employee/leave-balance
  - Access: Protected

- GET /api/employee/team
  - Access: Protected

---

## HR

- GET /api/hr/dashboard
  - Access: Protected (hr, admin)

- GET /api/hr/departments/stats
  - Access: Protected (hr)

- GET /api/hr/employees
  - Access: Protected (hr)
  - Query: department, status, search

- GET /api/hr/employees/:id
  - Access: Protected (hr)

- POST /api/hr/employees
  - Access: Protected (hr)
  - Body (multipart/form-data): fields for user creation (name, email, password, employeeId, department, position, etc.)
  - File: `profilePhoto` optional

- PUT /api/hr/employees/:id
  - Access: Protected (hr)
  - Body (multipart/form-data): allowed update fields (name, email, phone, employeeId, department, position, status, dateOfBirth, joinDate, address)
  - File: `profilePhoto` optional

- DELETE /api/hr/employees/:id
  - Access: Protected (hr)

- GET /api/hr/attendance/today
  - Access: Protected (hr)

- GET /api/hr/leaves/pending
  - Access: Protected (hr)

- GET /api/hr/expenses/pending
  - Access: Protected (hr)

---

## Admin

- GET /api/admin/dashboard
  - Access: Protected (admin)

- GET /api/admin/activity
  - Access: Protected (admin)

- GET /api/admin/companies
  - Access: Protected (admin)

- GET /api/admin/hr-accounts
  - Access: Protected (admin)

- GET /api/admin/hr/:id
  - Access: Protected (admin)

- POST /api/admin/hr/:id/reset-password
  - Access: Protected (admin)

- GET /api/admin/employees
  - Access: Protected (admin)

- GET /api/admin/leaves
  - Access: Protected (admin)

- GET /api/admin/tasks
  - Access: Protected (admin)

---

## Users

- PUT /api/users/profile
  - Access: Protected
  - Body (multipart/form-data): optional fields { name, phone, address, bio, dateOfBirth }
  - File: `profilePhoto` optional

- GET /api/user
  - Access: Protected (admin, hr)
  - Query: role, status, department

- GET /api/user/:id
  - Access: Protected

- PUT /api/users/:id
  - Access: Protected (admin, hr, employee with checks)
  - Body (multipart/form-data): fields allowed depend on role: name, email, phone, department, position, status, dateOfBirth, joinDate, employeeId, address
  - File: `profilePhoto` optional

- DELETE /api/user/:id
  - Access: Protected (admin, hr)

---

## Tasks

- GET /api/tasks/statistics
  - Access: Protected

- POST /api/tasks
  - Access: Protected
  - Body: task fields expected by service (title, description, assignedTo (id or array), priority, deadline, attachments? )

- GET /api/tasks
  - Access: Protected
  - Query filters

- GET /api/tasks/:id
  - Access: Protected

- PUT /api/tasks/:id
  - Access: Protected
  - Body: task updatable fields

- PUT /api/tasks/:id/progress
  - Access: Protected
  - Body: { progress: number }

- POST /api/tasks/:id/attachments
  - Access: Protected
  - Body: attachment metadata (controller forwards req.body)

- PUT /api/tasks/:id/subtasks/:subTaskId
  - Access: Protected
  - Body: { completed: boolean }

- DELETE /api/tasks/:id
  - Access: Protected

---

## Leave

- GET /api/leave/balance
  - Access: Protected
  - Query: userId (admin may fetch any)

- GET /api/leave/statistics
  - Access: Protected
  - Query: year, userId

- POST /api/leave
  - Access: Protected (employee)
  - Body: expected leave request fields (leaveType, startDate, endDate, reason, days?) — validated by `validateLeaveRequest` middleware

- GET /api/leave
  - Access: Protected
  - Query: date range filters

- GET /api/leave/:id
  - Access: Protected

- PUT /api/leave/:id/approve
  - Access: Protected (admin)
  - Body: { reviewNote?: string }

- PUT /api/leave/:id/reject
  - Access: Protected (admin)
  - Body: { reviewNote: string (required) }

- PUT /api/leave/:id
  - Access: Protected (admin)
  - Body: { leaveType?, startDate?, endDate?, reason?, status? }

- DELETE /api/leave/:id
  - Access: Protected (admin)

- PUT /api/leave/:id/cancel
  - Access: Protected

---

## Leave Balance

- GET /api/leave-balance/me
  - Access: Protected

- GET /api/leave-balance
  - Access: Protected (admin)

- GET /api/leave-balance/:userId
  - Access: Protected (admin or self)

- PUT /api/leave-balance/:userId
  - Access: Protected (admin)
  - Body: { paid?: number, sick?: number, unpaid?: number }

- POST /api/leave-balance/bulk
  - Access: Protected (admin)
  - Body: { userIds?: string[], paid: number, sick: number, unpaid: number }

---

## Expenses

- GET /api/expenses/statistics
  - Access: Protected
  - Query: date range

- POST /api/expenses
  - Access: Protected
  - Body (multipart/form-data): expense fields { amount, category, description, date, project?, etc. }
  - File: `receipt` optional

- GET /api/expenses
  - Access: Protected
  - Query: date range, status

- GET /api/expenses/:id
  - Access: Protected

- PUT /api/expenses/:id
  - Access: Protected
  - Body: updatable expense fields

- PUT /api/expenses/:id/approve
  - Access: Protected (admin, hr)
  - Body: { reviewNote?: string }

- PUT /api/expenses/:id/reject
  - Access: Protected (admin, hr)
  - Body: { reviewNote: string (required) }

- PUT /api/expenses/:id/pay
  - Access: Protected (admin)

- DELETE /api/expenses/:id
  - Access: Protected

---

## Companies

- GET /api/companies
  - Access: Protected (admin)
  - Query: status, search

- POST /api/companies
  - Access: Protected (admin)
  - Body: { name, email, phone, address, website, industry, size }

- PUT /api/companies/:id
  - Access: Protected (admin)
  - Body: company fields (subscription excluded)

- DELETE /api/companies/:id
  - Access: Protected (admin)

- PUT /api/companies/:id/status
  - Access: Protected (admin)
  - Body: { status: 'active'|'inactive'|'suspended' }

- GET /api/companies/:id
  - Access: Protected

- GET /api/companies/:id/stats
  - Access: Protected

---

## Clients

- GET /api/clients/dashboard
  - Access: Protected (client)

- GET /api/clients
  - Access: Protected (admin, hr)
  - Query: search, status

- GET /api/clients/:id
  - Access: Protected (admin, hr)

- POST /api/clients
  - Access: Protected (admin, hr)
  - Body (multipart/form-data): { name, email, password, phone, companyName, clientNotes, address, company? }
  - File: `profilePhoto` optional

- PUT /api/clients/:id
  - Access: Protected (admin, hr)
  - Body: client updatable fields (password, role restricted)

- DELETE /api/clients/:id
  - Access: Protected (admin, hr)

---

## Chat

(Selected endpoints and request bodies)

- GET /api/chat/rooms
  - Access: Protected

- POST /api/chat/rooms/personal
  - Access: Protected
  - Body: { userId (string) }

- GET /api/chat/rooms/:roomId/messages
  - Access: Protected

- POST /api/chat/rooms/:roomId/messages
  - Access: Protected
  - Body: { content?: string, attachments?: [] }

- POST /api/chat/rooms/:roomId/upload
  - Access: Protected
  - File: `file` (multipart)

- POST /api/chat/groups
  - Access: Protected (admin, hr)
  - Body: { name (string, required), description?, members?: [userIds] }

- POST /api/chat/groups/:groupId/members
  - Access: Protected (admin, hr)
  - Body: { memberIds: [string] }

- DELETE /api/chat/groups/:groupId/members/:memberId
  - Access: Protected (admin, hr)

- POST /api/chat/groups/:groupId/leave
  - Access: Protected

- DELETE /api/chat/groups/:groupId
  - Access: Protected (admin)

- Other message/group management endpoints accept JSON bodies as described above.

---

## Policies

- GET /api/policies
  - Access: Protected
  - Query: search

- GET /api/policies/:id
  - Access: Protected

- POST /api/policies
  - Access: Protected (admin)
  - Body (multipart/form-data): { title (required), description?, location? }
  - File: `file` (policy file, raw)

- DELETE /api/policies/:id
  - Access: Protected (admin)

- GET /api/policies/:id/download
  - Access: Protected

---

## Notifications

- GET /api/notifications
  - Access: Protected
  - Query: page, limit, type

- PUT /api/notifications/read-all
  - Access: Protected

- PUT /api/notifications/:id/read
  - Access: Protected

- DELETE /api/notifications/:id
  - Access: Protected

---

## Announcements

- GET /api/announcements
  - Access: Protected

- GET /api/announcements/unread/count
  - Access: Protected

- GET /api/announcements/:id
  - Access: Protected

- PUT /api/announcements/:id/read
  - Access: Protected

- POST /api/announcements
  - Access: Protected (admin, hr)
  - Body: { title, message, audience?, pinned? }

- PUT /api/announcements/:id
  - Access: Protected (admin, hr)

- DELETE /api/announcements/:id
  - Access: Protected (admin, hr)

---

## Setup

- POST /api/setup/first-admin
  - Access: Public (one-time)
  - Body: { employeeId, name, email, password }

- GET /api/setup/status
  - Access: Public

---

Notes:
- File upload fields are handled via `uploadMiddleware` and usually use multipart/form-data.
- Location fields across attendance/auth/update-location are accepted as objects; controllers may also accept JSON-stringified `location` when sent inside FormData.
- Some endpoints rely on `validate*` middleware to enforce more precise shapes (e.g., `validateLeaveRequest`, `validateAttendance`, `validateExpense`). For exact schema, consult the corresponding middleware in `middleware/validator.js`.

If you'd like, I can:
- Add example curl requests for each endpoint.
- Expand body field descriptions with types and validation notes (from validators/models).
- Split this into separate files per resource (e.g., `docs/auth.md`, `docs/attendance.md`).
