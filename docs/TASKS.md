# LendLoop task checklist

IDs are stable so they can be referenced in issues or a spreadsheet. Checked tasks have implementation or verification evidence. Unchecked tasks identify remaining manual verification; they are not all submission blockers. Updated 15 November 2026.

## 1. Foundation

- [x] F01 Scaffold Next.js App Router with TypeScript, linting, and package scripts.
- [x] F02 Create Clerk and Convex development projects; configure Clerk provider and Convex JWT validation.
- [x] F03 Create `.env.example`, validate required configuration, and ignore secret files.
- [x] F04 Add protected routes and sign-in/sign-out/session loading states.
- [x] F05 Define users, tools, loans, automation events, and reminder tables and indexes.
- [x] F06 Add shared authenticated-user, owner, participant, and admin authorization helpers.
- [x] F07 Implement trusted user-profile synchronization and a documented admin bootstrap operation.
- [ ] F08 Seed demo categories, tools, and test accounts without real personal data.

## UI foundation: Base Web

- [x] U01 Select and pin compatible Base Web, Styletron, React, and Next.js versions.
- [x] U02 Configure StyletronProvider and BaseProvider through an App Router client provider boundary.
- [ ] U03 Implement and verify SSR style collection/rehydration with per-request server style state.
- [x] U04 Define LendLoop theme tokens and reusable component overrides.
- [x] U05 Build shared Base Web form fields, buttons, cards, tabs, status displays, modals, and table wrappers as needed.
- [x] U06 Integrate controlled date-range inputs with neighborhood calendar-date serialization.
- [ ] U07 Verify responsive layouts, keyboard access, focus behavior, contrast, and loading/error states.

## 2. Listings and public experience

- [x] L01 Build public landing page with branding, tagline, and Clerk sign-in button.
- [x] L02 Implement a public Convex query that projects only tool name and category.
- [x] L03 Build authenticated board with availability and category filter.
- [x] L04 Create validated listing form for name, category, condition, and description.
- [x] L05 Implement owner-only create/edit/soft-delete mutations.
- [x] L06 Build My listings view and edit/remove controls.
- [ ] L07 Add loading, empty, validation, and operation-failure states; check keyboard access.

## 3. Borrowing

- [x] B01 Implement date validation, timezone rules, and self-borrow prevention.
- [x] B02 Create a pending borrow request with server-derived borrower identity.
- [x] B03 Implement owner-only approval/decline with valid state transitions.
- [x] B04 Prevent overlapping approvals atomically, including concurrent attempts.
- [x] B05 Implement owner-confirmed return; preserve loan history for removed listings.
- [x] B06 Build My requests and Incoming requests with authorized queries.
- [x] B07 Show dates, status, computed overdue state, and permitted actions.
- [x] B08 Persist request notification events transactionally with request changes.

## 4. Administration

- [x] A01 Build a protected admin page and admin-only backend functions.
- [x] A02 Implement removal of any listing without erasing historical loans.
- [x] A03 Implement all-loans view.
- [x] A04 Implement trusted-lender assignment and visible badge.

## 5. Request notifications

- [x] N01 Define versioned event payloads, event IDs, and minimal recipient data.
- [x] N02 Implement HMAC signing and durable scheduled outbound delivery in Convex.
- [x] N03 Create n8n webhook workflow with raw-body signature and timestamp verification.
- [x] N04 Add event/recipient deduplication and a logged mock notification adapter.
- [x] N05 Implement authenticated notification completion/failure write-back.
- [x] N06 Add bounded delivery retries and persistent terminal failure status.
- [x] N07 Export sanitized workflow JSON to `n8n/workflows/`.

## 6. Overdue reminders and failures

- [x] O01 Add secured Convex HTTP endpoints for overdue reads, claims, and acknowledgments.
- [x] O02 Configure daily n8n Schedule Trigger in the neighborhood timezone.
- [x] O03 Fetch paginated overdue loans with minimal fields.
- [x] O04 Implement atomic reminder claims, expiring leases, and loan/date deduplication.
- [x] O05 Recheck loan eligibility before claiming; skip returned loans.
- [x] O06 Send/log the reminder; write back success or failure using the claim token.
- [x] O07 Configure node retries and a central n8n Error Trigger workflow.
- [x] O08 Store visible failure details and document a safe retry/recovery procedure.
- [x] O09 Export overdue and error workflows without secrets or sensitive execution data.
- [x] O10 Optional: show recent automation events on each loan.

## 7. Verification and submission

- [ ] V01 Test unauthenticated, owner, borrower, unrelated user, and admin access directly against backend functions.
- [x] V02 Test invalid dates, self-borrowing, illegal transitions, and simultaneous overlapping approvals.
- [ ] V03 Test removed listings, history retention, and return handling.
- [x] V04 Test valid/tampered/stale signatures and replayed webhook deliveries.
- [x] V05 Test duplicate events, repeated daily runs, expired claims, and repeated acknowledgments.
- [x] V06 Test network failure, bounded retries, terminal failure visibility, and recovery.
- [x] V07 Verify public query responses and automation payloads do not expose unnecessary personal data.
- [x] V08 Run lint, type-check, production build, and focused integration tests.
- [x] V09 Complete local n8n setup, environment reference, architecture, and production notes.
- [x] V10 Import exported workflows into a clean n8n instance and run an end-to-end demo.
- [x] V11 Scan repository and workflow exports for secrets; publish the source repository when ready.
- [ ] V12 Prepare demo: list tool → request → approve → simulate overdue → reminder → return.

## Submission artifacts

- Application source in GitHub.
- Sanitized n8n workflow JSON files, including failure handling.
- README with reproducible setup and required environment variables.
- Architecture, authorization, privacy, and automation decisions.
- Short production-improvement note and verification results.

## Automation implementation checkpoint — 5 November 2026

Signed local Docker/n8n integration is implemented and live-tested using logged mock delivery. Workflows require the custom node source in `n8n/custom/` and encrypted credentials. See AUTOMATION.md for actual contracts, tunnel refresh, import, and recovery steps. Production email delivery is not configured.

## Remaining manual verification

- F08: Demo seed exists; reviewers create their own Clerk accounts.
- U03/U07/L07: Styletron SSR and responsive feedback are implemented; a comprehensive hydration/accessibility audit is not recorded.
- V01/V03: Automated coverage exercises key permissions and returns; a full role matrix and removed-listing history audit remain manual checks.
- V12: Existing app recordings are organized locally. Rejection, Convex, and n8n evidence still need recording/review; see SUBMISSION.md.
