## KhetLink

KhetLink is a Next.js MVP for matching nearby farmers with restaurants, retailers, hostels and other bulk buyers. Farmers list produce, buyers post demand, the matching service compares crop, quantity, price and distance, and either side can accept a direct deal.

The MVP also includes price transparency, an OpenStreetMap discovery view, a mock impact dashboard and optional Appwrite integration.

## Prerequisites

- Node.js 20 or newer
- npm
- Git, if you want to push the project to GitHub
The MVP works without Appwrite. If no Appwrite variables are configured, it uses the local demo fallback.

1. Copy the environment template:

	```powershell
	Copy-Item .env.example .env.local
	```

2. Fill in `.env.local` using the variables listed in `.env.example`.
3. In Appwrite, create collections for `users`, `farmers`, `buyers`, `produce`, `demands`, `matches`, `orders`, and optionally `price_history`.
4. Add attributes matching the interfaces in `types/index.ts` and configure read/write permissions.
5. Restart `npm run dev` after changing `.env.local`.

Appwrite credentials must not be committed to GitHub. A failed Appwrite write does not block the local demo, but the current screens still use browser state as the source of truth.

## Validate before sharing or deploying

```powershell
npm run lint
npm run build
```

To test the production build locally:

```powershell
npm start
```

## Push to GitHub

If the project is not yet connected to GitHub:

```powershell
git init

From the project folder:

```powershell
npm install
```

For later changes:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
```

The `.gitignore` excludes `node_modules`, `.next`, local environment files, TypeScript cache files, screenshots and zip archives. `.env.example` remains trackable and can be shared with the team.

## Deploy on Vercel

### Vercel dashboard

1. Push the project to GitHub.
2. Open [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **Add New Project** and import the KhetLink repository.
4. Keep the detected framework as **Next.js**.
5. Use `npm run build` as the build command if Vercel asks for it.
6. If Appwrite is enabled, add the same variables from `.env.local` under **Project Settings → Environment Variables**.
7. Click **Deploy**.
8. Open the generated Vercel URL and test `/login`, the farmer flow, the buyer flow and `/marketplace`.

### Vercel CLI

```powershell
npm install -g vercel
vercel login
vercel
vercel --prod
```

Do not upload `.env.local` or put secrets in source files. Add environment variables through Vercel project settings.

## Project structure

- `app/`: Next.js App Router entry points and global styles
- `components/platform-app.tsx`: main role-based product experience
- `components/demand-map.tsx`: OpenStreetMap and Leaflet map
- `components/ui/`: reusable UI components
1. Open [http://localhost:3000/login](http://localhost:3000/login).
- `services/mock-data.ts`: seeded NCR listings, demands and chart data
- `services/matching.ts`: crop, quantity, price and distance matching
- `services/price-recommendation.ts`: deterministic price recommendation service
	- **Try admin**: the platform impact view.
3. No email address or password is required for the demo buttons.

## Known MVP limitations

- Prices and impact metrics are illustrative, not live market data.
- Appwrite reads are not the source for populating the platform screens.
- Deal status is stored locally in the browser.
- There is no payment gateway, delivery tracking or transport workflow.
- There are no route authorization guards; this is a presentation prototype.

## Complete farmer demo

1. Log in with **Try farmer**.
2. Open **My produce**.
3. In **Add available produce**, select Tomato, 500 kg, ₹25/kg and Greater Noida.
4. Click **Publish produce listing** and confirm it appears in **Current listings**.
5. Open **Nearby demand** or **My matches**.
6. Show the nearby Tomato demand and calculated potential deal value.
7. Click **Accept this deal** for a buyer request.
8. Open **Orders & deals** and verify the order status is `confirmed`.
9. Open **Earnings** and verify the confirmed deal value and traded quantity.

The seeded demo normally shows Green Table Kitchen requesting 300 kg Tomato. At ₹25/kg, the deal value is ₹7,500.

## Complete buyer demo

1. Return to `/login` or use **Sign out** and log in with **Try buyer**.
2. Open **My demands**.
3. Create a demand with Tomato, 300 kg, target price ₹29/kg and delivery location Greater Noida.
4. Click **Post buyer demand**.
5. Open **Find farmers** when the app navigates there.
6. Verify that matching farmers appear with quantity, price, distance and deal value.
7. Click **Accept farmer**.
8. Open **Orders & deals** and verify that the confirmed order appears.

## Shared pages to demonstrate

- **Price transparency**: illustrative farmer, market and retail price references.
- **Platform impact**: illustrative farmers, buyers, deals, produce volume and farmer benefit metrics.
- **Local discovery**: buyer demand, available produce and the OpenStreetMap map. The map is embedded in `/marketplace`; `/map` is not a separate route.
- **Mobile view**: resize the browser to a phone width and confirm the workspace, forms, tables and map remain usable.

All prices, listings, distances, charts and impact figures are demo estimates. They are not live mandi prices, live market quotes or guaranteed farmer outcomes.

## State and persistence

- Demo state is saved in browser localStorage under `kisan-connect-demo-v1`.
- Added produce, posted demands, accepted deals and order status survive a refresh in the same browser.
- Data is local to the browser and is not shared with other team members.
- The initial state is seeded from `services/mock-data.ts`.
- Clear browser site data to reset the local demo.

## Appwrite

Copy `.env.example` to `.env.local` and set the public endpoint, project ID, database ID, and collection IDs. Authentication uses Appwrite email/password sessions when configured. User, farmer, buyer, produce, demand, match and order writes use the Appwrite database adapter. Missing configuration or a failed write leaves the local demo usable; local demo state remains the source for the prototype screens.

Create collections for `users`, `farmers`, `buyers`, `produce`, `demands`, `matches`, `orders`, and optionally `price_history`. Define attributes matching the entity interfaces in `types/index.ts`. Add an `id` string attribute if local identifiers should be stored in each document. Set read/write permissions for the intended participants. Appwrite schemas and permissions are configured in the Appwrite Console; this MVP does not provision them.

## Structure

- `app/`: Next.js App Router entry points and global theme
- `components/`: shared app experience, map and UI primitives
- `lib/appwrite.ts`: optional Appwrite authentication/database adapter
- `services/mock-data.ts`: NCR demo listings and chart data
- `services/matching.ts`: deterministic crop, price and distance matching
- `services/price-recommendation.ts`: replaceable deterministic pricing service
- `services/platform-store.tsx`: browser-persisted demo state and deal actions
- `types/index.ts`: entity and service contracts

The pricing service is an isolated async module so it can later call a FastAPI/ML endpoint without changing the screens.