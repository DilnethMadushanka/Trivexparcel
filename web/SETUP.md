# Hariyata web app: setup guide

Stack: **Next.js** on **Vercel**, **Firebase** (Google sign-in + Firestore), **Dialog Genie** card payments, plus bank transfer and eZ Cash approved by an admin.

Everything below can start on free plans. Read the cost notes at the end before charging customers.

---

## 0. Try it first without any setup (demo mode)

Demo mode runs the whole app in the browser with sample data.

1. On Vercel, import this repo (step 3 below) and set only `NEXT_PUBLIC_DEMO` = `1`.
2. Open the site. You are signed in as an admin with sample sellers, reports and payments. Nothing is saved.

Remove `NEXT_PUBLIC_DEMO` before going live.

---

## 1. Firebase project

1. Go to <https://console.firebase.google.com> and **Add project** (Google Analytics is optional).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Pick a support email and save.
3. **Build → Firestore Database → Create database.** Choose a location close to Sri Lanka (for example `asia-south1`, Mumbai) and start in **production mode**.
4. **Firestore → Rules:** paste the contents of [`firestore.rules`](firestore.rules) and **Publish**. Browsers can only read their own profile; everything else goes through the app's server.
5. **Project settings (gear) → General → Your apps → Web (`</>`)**. Register an app. Copy `apiKey`, `authDomain`, `projectId`, `appId`.
6. **Project settings → Service accounts → Generate new private key.** A JSON file downloads. Keep it secret.
   Turn it into one line for Vercel:
   - Mac/Linux: `base64 -w0 service-account.json` (on Mac: `base64 -i service-account.json`)
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))`

## 2. Secrets you create

- `HASH_SECRET`: a long random string. Phone numbers are stored only as a keyed hash with it.
  Generate: `openssl rand -hex 32`. **Never change it after launch**, or old reports stop matching.
- `ADMIN_EMAILS`: your Google email (comma-separate several). These accounts become admins on first sign-in.

## 3. Vercel

1. <https://vercel.com> → **Add New → Project** → import `DilnethMadushanka/Trivexparcel`.
2. **Root Directory:** `web`. Framework: Next.js (auto-detected).
3. **Environment Variables:** add everything from [`.env.example`](.env.example):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | from step 1.5 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | from step 1.5 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | from step 1.5 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | from step 1.5 |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | from step 1.6 |
| `HASH_SECRET` | from step 2 |
| `ADMIN_EMAILS` | your Google email |
| `NEXT_PUBLIC_SITE_URL` | your site URL, e.g. `https://hariyata.vercel.app` |
| `PAY_BANK_DETAILS` | the account sellers transfer to |
| `PAY_EZCASH_NUMBER` | your eZ Cash number |

4. **Deploy.**
5. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain** → your Vercel domain (e.g. `hariyata.vercel.app`). Without this, Google sign-in is refused.

## 4. First sign-in

Open the site, **Continue with Google** with the email in `ADMIN_EMAILS`. You'll see the **Admin** tab.

To invite sellers, just share the link. Each seller signs in with their own Google account and gets their own records. Turn on **Require approval for new sellers** in Admin if you want to vet them first.

## 5. Payments

### Bank transfer and eZ Cash (works today)

Sellers pick a plan on **Plan**, pay to the details you set, and enter the reference. You see it in **Admin → Payments** and press **Approve**: the plan activates for 30 days (or extends the current one).

### Dialog Genie card payments (when your merchant account is ready)

1. Apply for **Genie Business** (Dialog Finance) online payments and get your API key and API documentation.
2. Open [`lib/server/billing.ts`](lib/server/billing.ts). The `startGenieCheckout` and `handleGenieWebhook` functions are a starting point: match the endpoint path, field names, amount unit (rupees or cents), and the signature header to Genie's documentation.
3. Set `GENIE_API_BASE`, `GENIE_API_KEY`, `GENIE_WEBHOOK_SECRET` in Vercel and redeploy.
4. In the Genie dashboard, set the webhook URL to `https://YOUR-SITE/api/billing/webhook`.
5. Make a test payment. The **Card** option on the Plan page turns on automatically when the three variables are set.

The webhook only activates a plan once per payment, ignores repeats, and rejects a mismatched amount.

## 6. Plans and prices

Edit [`lib/plans.ts`](lib/plans.ts): Free 30 checks/month, Starter Rs. 990 (300 checks + bulk), Pro Rs. 2,490 (unlimited). Usage resets each calendar month in Sri Lanka time.

---

## Cost notes (check current terms before launch)

- **Vercel Hobby (free) is for non-commercial, personal use only.** Fine for the beta and the demo. When you start charging, move to Vercel Pro, or host the same app on Firebase App Hosting (needs the Firebase Blaze plan, which has a free usage tier).
- **Firebase Spark (free):** Firestore 1 GiB stored, 50,000 reads and 20,000 writes per day; Google sign-in is free. Each check reads the matching reports plus the reporters' profiles, so the free tier covers a few thousand checks a day.
- **Phone-number (SMS) login is not used** because SMS costs money. Google sign-in is free.

## Local development

```bash
cd web
cp .env.example .env.local   # fill in values, or set NEXT_PUBLIC_DEMO=1
npm install
npm run dev                  # http://localhost:3000
npm test                     # scoring and plan logic
```

Every push runs the **Web app** GitHub Action: install, tests, typecheck, build, and screenshots of every page on phone, tablet and desktop (download them from the run's **Artifacts**).
