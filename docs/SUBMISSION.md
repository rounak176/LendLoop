# Submission handoff — 15 November 2026

## Included in the repository

- Next.js/Clerk/Convex app with server-enforced user/admin permissions.
- Base Web interface, listing management, loan requests, decisions, returns, notification bell and My activity history.
- Three sanitized n8n workflow exports in `n8n/workflows/`, plus required custom node source in `n8n/custom/`.
- README setup, environment reference, architecture, privacy/security decisions, production notes, and automation operations guide.
- 13 passing tests; lint, typecheck, and production build passed on 15 November 2026.

Notifications use durable mock logs, as permitted by the brief. No email provider is configured. Local Docker must run for automation; refresh the webhook tunnel URL after it changes.

## Recordings

Existing files were copied, without changing originals, to `/Users/rounakgupta/Desktop/LendLoop-submission/recordings/`:

1. `01-listing-create-edit.mov` — existing listing recording.
2. `02-signin-borrow-request.mov` — existing sign-in/request recording.
3. `03-request-approval.mov` — existing approval recording.
4. `04-loan-return.mov` — existing return recording.

These names describe the original filenames; video contents have not been independently reviewed. Check each before sharing. Keep videos outside Git and review for personal data or credentials.

### Remaining clips to record

5. `05-request-rejection.mp4`: borrower requests a tool; owner rejects it; borrower opens My activity and shows Rejected plus the decision notification. Use separate signed-in browser sessions.
6. `06-convex-loan-state.mp4`: show a demo loan in Convex, approve or return it in the app, then show the corresponding changed status and automation event in Convex. Hide credentials and unrelated data.
7. `07-n8n-automation.mp4`: create a request; show the successful request workflow execution and mock delivery record. For overdue, use the documented synthetic demo fixture, run the daily workflow manually, show the reminder write-back, then rerun to demonstrate no duplicate reminder. A loan is overdue only after its inclusive end date in APP_TIMEZONE and while approved/unreturned. Do not alter a real loan merely for the demo.

## Final delivery

- Confirm the repository is readable without GitHub authentication after publishing.
- Review and upload recordings to a shareable location if including video evidence; add viewer links to the application.
- Review the prepared application draft (stored separately from this repository), confirm recipient/application channel and attach any required resume.
- Send the application only when explicitly instructed. No application has been sent.

The checklist in TASKS.md retains incomplete manual accessibility and exhaustive permission/history audits rather than claiming they passed.
