# Hariyata by Trivex IT

COD trust check for Sri Lankan online sellers. Before shipping a cash-on-delivery parcel, a seller checks the customer's phone number against delivery results other sellers have reported. After delivery, the seller reports what happened (delivered, rejected or fake), which sharpens the score for everyone.

## What's in this repo

| Folder | What it is |
| --- | --- |
| [`web/`](web/) | **The product.** Next.js web app for Vercel with Firebase Google sign-in, Firestore, subscriptions (Dialog Genie cards, bank transfer, eZ Cash) and an admin panel. Setup: [`web/SETUP.md`](web/SETUP.md). |
| `artifact-src/`, `artifact-dist/` | The earlier single-page prototype that ran as a Claude artifact. |

## Features (web app)

- **Check** a number in any format (07X, +94, 0094, spaces, dashes) and get a verdict: **Safe**, **Confirm**, **Risk** or **New**, with a 0–100 trust score.
- **Bulk check** a pasted WhatsApp, Facebook or Excel order list (Starter and Pro plans).
- **Report** delivered, rejected or fake, with undo. One record per seller per number.
- **Records**: your reports and the courier fees lost to returns.
- **Plans**: Free (30 checks/month), Starter Rs. 990, Pro Rs. 2,490, with monthly usage limits enforced on the server.
- **Admin**: approve payments, approve or block sellers, make admins, give plans, delete wrong reports, require approval for new sellers.
- Responsive: phone bottom tab bar, tablet layout, desktop sidebar with keyboard shortcuts. Light, dark and system themes.

## Security and privacy

- All data access goes through server API routes that verify the Firebase ID token, the user's role and plan limits. Firestore rules block direct browser access except reading your own profile.
- Phone numbers are never stored: only an HMAC-SHA256 hash keyed with a server secret.
- A single report from one seller can never make a number "Risk"; blocked or unapproved sellers' reports don't count.

## Develop

```bash
cd web
cp .env.example .env.local   # or set NEXT_PUBLIC_DEMO=1 to run on sample data
npm install
npm run dev
npm test
```

CI (`.github/workflows/web.yml`) runs tests, typecheck, a production build and phone/tablet/desktop screenshots of every page on each push.
