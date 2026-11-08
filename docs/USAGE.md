# Local setup and usage

## 1. Connect real sign-in and data

There is no built-in demo password. Clerk manages accounts; Convex stores application data. A blank `.env.local` template has been created locally and is ignored by Git.

1. In this folder, run `npm install`.
2. Create a development application at https://dashboard.clerk.com and enable email sign-in (and any desired social provider).
3. Copy the publishable key and secret key into `.env.local` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Do not share the secret key.
4. In Clerk, activate the Convex integration. Copy the Clerk Frontend API URL.
5. Run `npx convex dev`; sign into Convex and create/select the development project. Keep this command running. Follow its prompts to set the development deployment and `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.
6. In that Convex deployment's Settings → Environment Variables, set `CLERK_JWT_ISSUER_DOMAIN` to the Clerk Frontend API URL (including `https://`). Set `APP_TIMEZONE` to `Asia/Kolkata` or the neighborhood timezone you intend to use. These backend values must be set in Convex, not only in `.env.local`. If initial deployment stops for a missing issuer, set it in the dashboard and retry.
7. Run `npm run check:setup`. It reports missing key names without printing secret values. Docker is optional for the web app.
8. In another terminal, run `npm run dev`; open http://localhost:3000. If a dev server already owns port 3000, use that server or stop it before restarting. Restart after changing environment values.

Official setup reference: https://docs.convex.dev/auth/clerk

## 2. Sign in

1. Open http://localhost:3000/sign-in or choose Sign in in the header.
2. Use the registration option in Clerk if this is your first visit. Complete the email verification or enabled social login.
3. The application creates your local user profile automatically. New accounts are members, not admins.
4. Your avatar appears in the header. Use its menu to sign out.

If the screen says sign-in is not connected, the local Clerk publishable key is missing. If profile setup fails, use Retry profile setup and check `convex dev`, the Clerk integration, and the matching issuer domain. A sign-in session alone does not prove Convex authentication is configured.

## 3. List, edit, and remove tools

1. Sign in and choose List a tool, or visit http://localhost:3000/tools/new.
2. Enter a name, category, condition, and description; publish.
3. Open http://localhost:3000/dashboard and find My listings.
4. Choose Edit to update details, or Remove to hide the listing. Historical loans remain.

## 4. Borrow a tool

1. Have account A create a listing.
2. Open a private browser window and register/sign in as account B. Using two sessions makes the owner and borrower flows easy to demonstrate.
3. On the home tool board, find account A's tool and choose Request dates.
4. Review existing reservations and select inclusive start/end dates. Submit the request.
5. Open B's dashboard to see its status and correct tool name.
6. In A's session, open Incoming requests on the dashboard and approve or decline.
7. Approval rejects conflicting reservations and expired start dates. Failures appear on the dashboard.
8. When the tool is returned, A chooses Confirm return under Your active loans. B sees the updated status.

Availability means available now, with future approved reservations listed on the request page. An approved unreturned loan whose start date has passed keeps a tool on loan, even after its due date. Pending requests do not reserve it.

## 5. Enable and use admin access

1. Sign in at least once with the account to be made admin.
2. Copy that user's `user_...` ID from Clerk's Users screen.
3. In the connected Convex dashboard, open Functions → `admin:bootstrapAdmin` and run the internal mutation with `{ "clerkId": "user_YOUR_ID" }`.
4. Visit http://localhost:3000/admin in that user's session.
5. Inspect all loans, remove listings, or assign/remove trusted-lender badges. Regular members see an access-required message and cannot call admin backend functions.

Optional: run the internal `seed:seedDemo` function to populate example listings. The synthetic owner is not a real login account, so use two real Clerk development accounts to test approval/return flows.

## 6. n8n status

The web app does not need Docker. To prepare local n8n, install/start Docker Desktop, verify `docker compose version`, run `node scripts/setup-automation.mjs`, then run `docker compose up -d` and open http://localhost:5678. Preserve existing encryption keys.

The local workflows now implement signed request notifications and daily overdue reminders using logged mock delivery. Follow AUTOMATION.md for setup. In this workspace they are already imported/published; keep Docker running and run `node scripts/sync-webhook-url.mjs` after tunnel recreation. No email is sent.

## 7. Verify

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Unit/integration-style tests use a local Convex simulation; real Clerk/Convex authentication and a full two-user browser walkthrough still require configured services.

## Success messages and notifications

Successful listing creation, edits/removal, borrow requests, approvals/rejections, returns, and admin changes open a Base Web confirmation modal. Failed actions retain an inline error and do not show success.

The header bell shows unread in-app notifications for incoming requests, accepted/rejected requests, and confirmed returns. Open it to see the latest 50 events, then choose View in My activity or Mark shown as read. Read status persists in Convex per recipient. The badge counts unread notifications (not all pending loans); large counts display 100+. Existing request events also appear. These in-app updates work independently of n8n delivery; n8n now records mock notifications/reminders.
