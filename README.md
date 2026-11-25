# KhetLink

KhetLink is a Next.js MVP for matching nearby farmers with restaurants, retailers, hostels and other bulk buyers. Farmers list produce, buyers post demand, the matching service compares crop, quantity, price and distance, and either side can accept a direct deal.

The MVP also includes price transparency, an OpenStreetMap discovery view, a mock impact dashboard and an Appwrite-backed farmer-to-buyer workflow.

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

## Demo login (local mode)

1. Open [http://localhost:3000/login](http://localhost:3000/login).
2. Under **Or explore the demo**, choose:
   - **Try farmer**: Ravi Kumar and the farmer workspace.
   - **Try buyer**: Green Table Kitchen and the buyer workspace.
   - **Try admin**: the platform impact view.
3. No email or password is required for demo buttons.

When Appwrite is not configured, demo state is stored in this browser. To reset it, clear site data for `localhost:3000` and reload. Demo accounts are hidden when Appwrite is configured.

## Farmer demo flow

1. Choose **Try farmer**.
2. Open **My produce**.
3. Add `Tomato`, `500` kg, `₹25/kg`, location `Greater Noida`.
4. Click **Publish produce listing**.
5. Open **Nearby demand** or **My matches**.
6. Select a compatible buyer request and click **Accept this deal**.
7. Open **Orders & deals** and verify `confirmed` status.
8. Open **Earnings** and verify the confirmed value and traded quantity.

The seeded demo normally includes a 300 kg Tomato demand from Green Table Kitchen. At ₹25/kg, its potential value is ₹7,500.

## Buyer demo flow

1. Return to `/login` or use **Sign out**.
2. Choose **Try buyer**.
3. Open **My demands**.
4. Create a demand for `Tomato`, `300` kg, target price `₹29/kg`, delivery location `Greater Noida`.
5. Click **Post buyer demand**.
6. Open **Find farmers**.
7. Verify that farmer matches show quantity, price, distance and deal value.
8. Click **Accept farmer**.
9. Open **Orders & deals** and verify the confirmed order.

## Shared pages

- **Price transparency**: illustrative farmer, market and retail references.
- **Platform impact**: illustrative platform metrics and charts.
- **Local discovery**: buyer demand, available produce and the OpenStreetMap map at `/marketplace`.
- **Mobile view**: test the workspace, forms, tables and map at phone width.

All prices, distances, listings, charts and impact values are illustrative demo data. They are not live mandi prices, live market quotations or guaranteed outcomes.

## State and persistence

- Without Appwrite, the demo uses localStorage key `kisan-connect-demo-v1` and sample data from `services/mock-data.ts`.
- With Appwrite, user profiles, listings, demands, matches and orders are stored in the configured Appwrite database and shared across accounts.
- Appwrite account sessions are managed by Appwrite; farmer and buyer workflows require a signed-in account. Admin access is restricted to account IDs in a server-only allowlist.

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

The required collections and attributes are verified against the existing Appwrite database by `npm run appwrite:setup`; collections are private with document security enabled. The current demo reads whole collections and has no required indexes. Do not grant public collection permissions. The app uses Appwrite's server transaction support; concurrent changes conflict rather than overselling.

### Live demonstration checklist

1. Register Farmer A and Buyer B in separate browser profiles.
2. Farmer A lists 500 kg of Potato at ₹15/kg; Buyer B requests 300 kg at up to ₹18/kg.
3. Confirm Potato appears in both match views, then accept the opportunity from either account.
4. Verify the listing has 200 kg remaining, the demand is fulfilled, and the 300 kg order appears for both accounts.
5. Mark the order completed and confirm the status refreshes for both users.
6. Try an incompatible crop or a target price below the asking price; no match should appear.
7. Sign in as a non-admin and visit `/admin/dashboard`; it must redirect to that account's own workspace. Test admin login with an ID explicitly configured in `APPWRITE_ADMIN_USER_IDS`.

The source does not contain test credentials, so the real two-account flow must be exercised with separate accounts you create in Appwrite. `npm test` runs focused matching-rule tests; it does not replace the live account-to-order demonstration above. Do not create throwaway Appwrite Auth users for automated tests unless the API key has the `users.write` scope needed to delete those accounts afterward.

## Validate before sharing

```powershell
npm run lint
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
8. Test `/login`, both demo flows, `/price-transparency`, `/impact` and `/marketplace` on the deployed URL.

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
- `components/demand-map.tsx`: OpenStreetMap and Leaflet map
- `components/ui/`: reusable UI components
- `app/api/platform/route.ts`: authenticated Appwrite backend API
- `lib/appwrite.ts`: browser account authentication and API client
- `lib/appwrite-server.ts`: server-only Appwrite data access and validation
- `scripts/setup-appwrite.mjs`: idempotent database/collection/attribute provisioning
- `services/mock-data.ts`: seeded listings, demands and chart data
- `services/matching.ts`: crop, quantity, price and distance matching
- `services/price-recommendation.ts`: deterministic price recommendation
- `services/platform-store.tsx`: Appwrite-backed state, with local demo fallback when unconfigured
- `tests/`: focused matching and API workflow tests
- `types/index.ts`: entity and service contracts

## Known MVP limitations

- Prices and impact metrics are illustrative, not live market data.
- The Appwrite backend and account flow require the collections and server environment variables above to be configured.
- There is no payment gateway, delivery tracking or transport workflow.
- Platform impact and price history remain illustrative; admin access and user/listing management require the server-side allowlist and API-key user scopes.
