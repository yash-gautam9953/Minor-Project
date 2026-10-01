## KhetLink

A Next.js MVP for matching nearby agricultural supply with bulk local demand. Farmers list available produce, buyers post quantity and target price, and either participant can accept a direct deal. The platform also includes mock price recommendations, transparent farm/market/retail references, an OpenStreetMap discovery view, and an illustrative impact dashboard.

## Run locally

```powershell
npm install
npm run dev
```

Open http://localhost:3000. Use **Log in → Try farmer**, **Try buyer**, or **Try admin** to enter the demo without credentials. Demo changes are stored in this browser's local storage and survive refreshes.

Use `npm run build` for a production build and `npm start` to serve it.

## Demo flow

1. Try the farmer account, open **My produce**, and add Tomato (500 kg, ₹25/kg).
2. Open **Nearby demand** or **My matches** and accept a restaurant or hostel request.
3. Open **Orders & deals**; the confirmed deal updates the farmer's earnings.
4. Try the buyer account, post a 300 kg Tomato request, and accept a nearby farmer.
5. Compare illustrative prices at **Price transparency**, then view mock metrics at **Platform impact**.

All seeded prices, demand, distance and impact numbers are demo estimates, not live market data or promised outcomes.

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