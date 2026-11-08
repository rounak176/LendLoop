# LendLoop implementation plan

Status: local scaffold implemented for the Next.js app, Base Web/Styletron providers, Clerk/Convex wiring, core listing/loan functions, and main routes. External projects are unconfigured; signed automation, integration tests, and production hardening remain outstanding.

Build a small, complete tool-lending product using Next.js App Router, TypeScript, Clerk, Convex, and n8n, with Base Web (`baseui`) and Styletron for the UI. Prioritize working authorization and reliable automation before visual polish.

## Sections: what and how

| Section | What to implement | How to implement | Done when |
| --- | --- | --- | --- |
| Foundation | App, authentication, environments | Scaffold Next.js; configure Clerk and its Convex JWT integration; validate server-side configuration; add an environment template without real secrets | Signed-in and signed-out sessions work locally |
| UI foundation | Base Web component system and LendLoop theme | Configure client-side StyletronProvider/BaseProvider boundary; pin compatible versions; validate App Router SSR and hydration; define theme tokens | Shared components render consistently on desktop/mobile without hydration warnings |
| Public landing page | LendLoop identity, tagline, available tool names and categories, sign-in | Expose a dedicated Convex public query returning only approved public fields; use Clerk sign-in controls | Anonymous users cannot retrieve owner or loan details |
| Tool board | Availability, category filter, listing form | Reactive Convex queries; validated mutations; name, category, condition, short description | A user can list and find tools; empty/loading/error states work |
| My listings | Edit/delete own listings | Derive ownership from authenticated identity in Convex; soft-delete listings; block new requests on inactive listings | Ownership cannot be bypassed by directly calling mutations |
| Borrowing | Date-range requests, approve/decline, return | Store explicit request states; validate date ranges and transitions; check approved date conflicts atomically in Convex | Two overlapping requests cannot both be approved |
| Personal dashboard | My requests and Incoming requests | Query by borrower and owner; authorize every read/action; show request dates and status | Each user sees only permitted records |
| Admin | Remove listings, see all loans, set trusted lender | Server-managed role records; protected admin queries/mutations; trust flag on lender profile | Normal users cannot invoke admin actions |
| Request notifications | Notify users when requests are created or change status | Persist an event with the state change; schedule signed delivery to n8n; deduplicate by event and recipient | Retried delivery does not create duplicate notification records |
| Overdue reminders | Daily reminder and status write-back | n8n calls authenticated Convex HTTP endpoints; claim eligible reminders; send/log; acknowledge result | Re-running the same daily batch is safe |
| Reliability and security | Retries, error visibility, minimized data | HMAC request verification, replay protection, bounded retries, durable status records, n8n error workflow | Failed runs are inspectable and recoverable |
| Documentation and handoff | Setup, workflow exports, decisions, production note | Maintain README, environment reference, JSON exports, and a short demo checklist | Another developer can run the documented demo |

## Proposed product decisions

These are implementation choices, not additional assignment requirements.

- Use calendar dates in a configured neighborhood timezone; both start and end dates are inclusive. A loan is overdue after its end date has passed in that timezone.
- Pending requests do not reserve a tool. Approval rejects overlapping approved loans in one transaction.
- Disallow borrowing your own tool. Only the owner approves/declines and confirms return; borrowers may request borrowing and read their own requests.
- States: `pending → approved | declined`; `approved → returned`. Compute overdue from dates rather than adding a separate request state.
- Keep historical loans when a listing is removed. Removal stops new requests; existing approved loans remain actionable.
- Bootstrap the first admin through a trusted server-side setup operation; never let a browser choose its role.
- Use logged mock notifications for the initial demo. Real email delivery is a later adapter.
- Record at most one successful overdue reminder per loan per local calendar day. Retry failures within that day's reminder record.
- Show recent automation activity per loan as the final optional enhancement.

## Build order

1. Foundation, data model, authentication, and authorization.
2. Public page, listings, borrowing, and personal dashboard.
3. Admin features and request-state validation.
4. Both n8n workflows, signing, deduplication, retries, and failure visibility.
5. Verification, documentation, workflow exports, and demo preparation.

See [TASKS.md](TASKS.md) for the complete checklist and [AUTOMATION.md](AUTOMATION.md) for integration details.
