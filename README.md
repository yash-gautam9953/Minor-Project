# KhetLink

KhetLink is a Next.js MVP for matching nearby farmers with restaurants, retailers, hostels and other bulk buyers. Farmers list produce, buyers post demand, the matching service compares crop, quantity, price and distance, and either side can accept a direct deal.

The MVP uses Appwrite as the source of truth for accounts, profiles, produce, demands, matches and orders. Market-price history and verified geographic coordinates are not available, so the interface identifies those limits instead of displaying invented data.

## Prerequisites

- Node.js 20 or newer
- npm
- Git for GitHub collaboration
- Chrome or Edge for browser testing

## Run locally

From the project folder:

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Stop the development server with `Ctrl+C`.

## Sign in or register

1. Configure Appwrite as described below and start the app.
2. Register a farmer or buyer at [http://localhost:3000/register](http://localhost:3000/register), or sign in at [http://localhost:3000/login](http://localhost:3000/login).
3. Use separate Appwrite accounts to test the farmer and buyer workflows.

There are no demo accounts or seeded marketplace records. If Appwrite is unavailable or misconfigured, the app shows an error rather than substituting sample data.

## Farmer workflow

1. Register and sign in as a farmer.
2. Open **My produce**.
3. Enter an actual produce listing, including its price, quantity and location.
4. Click **Publish produce listing**.
5. Open **Nearby demand** or **My matches**.
6. Select a compatible buyer request and click **Accept this deal**.
7. Open **Orders & deals** and verify `confirmed` status.
8. Complete the order to include it in completed-order earnings.

## Buyer workflow

1. Register and sign in with a separate buyer account.
2. Open **My demands**.
3. Enter an actual produce demand, quantity, target price and location.
4. Click **Post buyer demand**.
5. Open **Find farmers**.
6. Review compatible Appwrite produce listings and match details.
7. Click **Accept farmer**.
8. Open **Orders & deals** and verify the order.

## Shared pages

- **Price transparency**: states that verified mandi and retail data is unavailable. Listing prices are user-entered offers, not official market prices.
- **Platform impact**: totals are calculated from Appwrite farmer, buyer, produce, demand, match and completed-order records.
- **Local discovery**: open demands and produce listings are read from Appwrite at `/marketplace`. Locations are shown as text because records do not contain verified coordinates.
- **Mobile view**: test the workspace, forms, tables and location overview at phone width.

No sample farmers, buyers, listings, demands, orders, charts or platform statistics are used to make the application appear populated.

## State and persistence

- All marketplace records are read from and written to the configured Appwrite database. Browser storage is not used as a marketplace database.
- Appwrite account sessions are managed by Appwrite; farmer and buyer workflows require a signed-in account. Admin access is restricted to account IDs in a server-only allowlist.
- Code-path connection does not by itself verify production persistence. Confirm saved documents in the intended Appwrite project when testing.

## Appwrite backend setup

1. Create an Appwrite project and add a Web platform for your local URL (for example `localhost`) and deployed hostname.
2. Copy the environment template:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. In `.env.local`, set `NEXT_PUBLIC_APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID`. Create an Appwrite API key with these scopes and set it as `APPWRITE_API_KEY`:

   - `databases.read`, `databases.write`
   - `collections.read`, `collections.write`
   - `attributes.read`, `attributes.write`
   - `documents.read`, `documents.write`

   The provisioning script needs database, collection and attribute scopes to create the schema. The running app needs document scopes to load and update listings, demands, orders and account status. Leave the database and collection IDs blank for the default names, or fill them with IDs of existing resources.
4. Run the provisioning script:

   ```powershell
   npm run appwrite:setup
   ```

   It creates or reuses the `khetlink` database, the `users`, `farmers`, `buyers`, `produce`, `demands`, `matches` and `orders` collections, and all required attributes (including optional `users.accountStatus` for admin account management). It writes the resulting IDs back into `.env.local`. It is safe to rerun: existing matching resources are reused; incompatible attributes cause a clear error instead of being replaced. The collections are created without public permissions and with document security enabled.

5. Keep `APPWRITE_API_KEY` server-only. Do not prefix it or database/collection IDs with `NEXT_PUBLIC_`, commit `.env.local`, or share the key. The Next.js API route uses the key server-side and checks the signed-in account and role before writing.
6. Enable Email/Password authentication in Appwrite Auth settings. For the first test, do not require email verification; this MVP does not send verification emails.
7. For admin access, create a separate Appwrite Auth account (do not register it as a farmer/buyer), copy its Appwrite user ID, and place that ID in the server-only `APPWRITE_ADMIN_USER_IDS` variable. Multiple IDs can be comma-separated. Do not expose this allowlist with a `NEXT_PUBLIC_` prefix. The allowlisted account signs in through `/login` and is routed to `/admin/dashboard`; a client-selected role cannot grant admin access.
8. Restart `npm run dev`.

Register one farmer and one buyer using separate accounts (or separate browser profiles), publish a produce listing and a compatible demand, then accept the match. Accepting a match reads and updates the records inside one Appwrite transaction, creates a deterministic match record to prevent duplicate acceptance, updates both remaining quantities, and creates the order. The admin can view registered KhetLink users, listings, demands and orders, disable/enable farmer or buyer access to KhetLink, and close open listings. Disabling a KhetLink profile does not delete its Appwrite Auth account. API/configuration errors are shown in the UI; configured Appwrite mode does not silently switch to browser-local demo data.

The setup script checks the required collections and attributes against Appwrite; collections are private with document security enabled. The app currently reads all records from several collections and has no required indexes. Do not grant public collection permissions. The app uses Appwrite's server transaction support; concurrent changes conflict rather than overselling.

### Live demonstration checklist

1. Register a farmer and a buyer using separate accounts and browser profiles.
2. Create compatible produce and demand records using test values.
3. Confirm the selected crop appears in both match views, then accept the opportunity from either account.
4. Verify the listing and demand quantities reflect the accepted amount, and that both accounts can see the same order.
5. Mark the order completed and confirm the status refreshes for both users.
6. Try an incompatible crop or a target price below the asking price; no match should appear.
7. Sign in as a non-admin and visit `/admin/dashboard`; it must redirect to that account's own workspace. Test admin login with an ID explicitly configured in `APPWRITE_ADMIN_USER_IDS`.

The source does not contain test credentials, so the real two-account flow must be exercised with accounts you create in Appwrite. `npm test` runs local tests; it does not verify live database persistence. Do not create throwaway Appwrite Auth users for automated tests unless the API key has the `users.write` scope needed to delete those accounts afterward.

## Validate before sharing

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Test the production build locally with:

```powershell
npm start
```

## Push to GitHub

For a new GitHub repository:

```powershell
git init
git add .
git commit -m "Initial KhetLink MVP"
git branch -M main
git remote add origin https://github.com/<username>/<repository>.git
git push -u origin main
```

For later changes:

```powershell
git status
git add .
git commit -m "Describe the change"
git push
```

The `.gitignore` excludes dependencies, build output, local environment files, caches, screenshots and zip archives. `.env.example` remains trackable.

## Deploy on Vercel

### Dashboard

1. Push the repository to GitHub.
2. Open [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **Add New Project** and import the repository.
4. Keep the detected framework as **Next.js**.
5. Use `npm run build` if Vercel asks for a build command.
6. Add all `.env.example` variables under **Project Settings → Environment Variables**. Keep `APPWRITE_API_KEY` as a server-only variable, without the `NEXT_PUBLIC_` prefix.
7. Click **Deploy**.
8. Test `/login`, farmer and buyer accounts, `/price-transparency`, `/impact` and `/marketplace` on the deployed URL.

### CLI

```powershell
npm install -g vercel
vercel login
vercel
vercel --prod
```

## Project structure

- `app/`: Next.js App Router entry points and global styles
- `components/platform-app.tsx`: role-based product experience
- `components/demand-map.tsx`: text-only location overview (coordinates are not stored)
- `components/ui/`: reusable UI components
- `app/api/platform/route.ts`: authenticated Appwrite backend API
- `lib/appwrite.ts`: browser account authentication and API client
- `lib/appwrite-server.ts`: server-only Appwrite data access and validation
- `scripts/setup-appwrite.mjs`: idempotent database/collection/attribute provisioning
- `services/matching.ts`: crop, quantity, price and distance matching
- `services/platform-metrics.ts`: aggregates actual Appwrite records for platform totals
- `services/platform-options.ts`: supported crop and location form options
- `services/platform-store.tsx`: Appwrite-backed state and actions
- `tests/`: focused matching and API workflow tests
- `types/index.ts`: entity and service contracts

## Known MVP limitations

- Verified external market prices, historical price trends and geographic coordinates are unavailable.
- The Appwrite backend and account flow require the collections and server environment variables above to be configured.
- There is no payment gateway, delivery tracking or transport workflow.
- Admin access and user/listing management require the server-side allowlist and API-key user scopes.
