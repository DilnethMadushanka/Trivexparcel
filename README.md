# Hariyata by Trivex IT

COD trust check for Sri Lankan online sellers. Before shipping a cash-on-delivery parcel, a seller checks the customer's phone number against delivery results that other sellers have reported. After the parcel goes out, the seller reports what happened (delivered, rejected, or fake order), which makes the score better for everyone.

## Features

- **Check**: enter a number in any format (07X, +94, 0094, with spaces or dashes) and get a verdict: Hariyata (safe), Balala (confirm first), Risk (take an advance), or Aluth (no data yet).
- **Bulk check**: paste a WhatsApp, Facebook or Excel order list; every Sri Lankan number in it is found and checked at once (up to 90).
- **Report**: mark a number as Delivered, Rejected or Fake. One record per seller per number, with undo.
- **Records**: a seller's own reports and the courier money lost to returns.
- **Admin panel**: approve or block sellers, require approval for new sellers, delete wrong reports.

## Roles

| Role | How someone gets it | Can do |
| --- | --- | --- |
| Owner / Admin | Artifact owner, or given **Editor** access in the Share menu | Everything, plus the admin panel |
| Seller | Given **Contributor** access | Check and report |
| Pending | Seller not yet approved, while approval is on | Check and report; reports don't count toward scores yet |
| Blocked | Blocked by an admin | Check only; past reports stop counting |

The database rules make `roles` and `config` writable only at admin level, so sellers cannot change roles or settings.

## Scoring

Implemented in `src/logic.js`:

- Fake orders count double a rejection.
- Score = Laplace-smoothed delivery rate, 0 to 100.
- 75+ with at least 2 deliveries and no fakes: **Hariyata**. Below 45: **Risk**. In between, or thin data: **Balala**.
- A single report from one seller can never mark a number as Risk. Risk needs repeated rejections, or bad reports from two or more sellers.

## Privacy

Phone numbers never reach the database. Each number is normalized to `94XXXXXXXXX` and stored only as a SHA-256 hash. A masked form (`077 ••• ••67`) is kept so sellers can recognise their own reports.

## Project layout

```
src/page.html        App UI and behaviour (artifact page)
src/logic.js         Pure functions: normalize, extract, score, hash
test/logic.test.js   Unit tests for the logic
scripts/build.py     Inlines logic.js into page.html -> dist/hariyata.html
dist/hariyata.html   Built single-file page
```

```
npm test        # run logic tests
npm run build   # rebuild dist/hariyata.html
```

## Status

v0.3 beta. Runs as a Claude artifact with a shared database. A standalone version (own domain, login, PayHere subscription billing, server-side enforcement of one record per seller) is the next step before a paid launch.
