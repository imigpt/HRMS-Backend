# Half-Day Leave API

This addendum documents the Half-Day Leave endpoint used by the frontend LeaveModule.

Endpoint
- POST /api/leaves/half-day
- Auth: Authorization: Bearer <token>
- Content-Type: application/json

Request Body (JSON)
- employeeId (string, optional) — MongoDB _id; server defaults to authenticated user when omitted
- leaveType (string, required) — one of: sick, paid, unpaid
- date (string, required) — local date `YYYY-MM-DD`
- session (string, required) — `morning` | `afternoon`
- reason (string, required) — short explanation (frontend requires >=10 chars)
- leavePolicyId (string, optional)
- attachments (array[string], optional)

Example

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

Success (201)

```json
{
  "success": true,
  "message": "Half-day leave request submitted successfully",
  "data": { ... }
}
```

Errors
- 400 Validation failed (missing/invalid fields)
- 401 Unauthorized
- 409 Conflict: existing full-day or same-session half-day leave on that date
- 400 Insufficient balance for paid/sick (< 0.5 days)

Notes
- `unpaid` leave bypasses balance checks.
- Full-day approved leaves block check-in for that date; half-day approved leaves do not.
- Frontend sends `YYYY-MM-DD` and server treats it as local midnight to avoid timezone issues.

cURL

```bash
curl -X POST "https://your-server.example.com/api/leaves/half-day" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"leaveType":"paid","date":"2026-03-05","session":"morning","reason":"Doctor appointment"}'
```
