# KhetLink - Teacher Demo and Testing Guide

This guide walks through the complete farmer-to-buyer order and delivery flow. It is written for a classroom demonstration using test accounts and test data.

## What the demo shows

KhetLink connects farmers who list available produce with buyers who post bulk demands. After a compatible match is accepted, the app creates an order. The buyer can record a simulated payment, the admin assigns a rider, and the rider updates delivery progress.

## Before the demo

1. Configure Appwrite and `.env.local` using the setup instructions in [README.md](./README.md#appwrite-backend-setup).
2. Run the schema setup if this is a new or updated Appwrite project:

   ```powershell
   npm run appwrite:setup
   ```

3. Create a separate Appwrite account for the admin. Add its Appwrite user ID to the server-only `APPWRITE_ADMIN_USER_IDS` value in `.env.local`. Do not register the admin as a farmer, buyer, or rider.
4. Start the app:

   ```powershell
   npm install
   npm run dev
   ```

   If dependencies are already installed, you only need `npm run dev`.

5. Open `http://localhost:3000`.
6. Use separate browser profiles, or sign out before switching accounts. Appwrite keeps one active session per browser profile for this app.

If you change `.env.local`, restart the development server. Never show or share `APPWRITE_API_KEY`.

## Accounts to prepare

Prepare four accounts:

| Role | How to create or access it | Main responsibility |
|---|---|---|
| Farmer | Register at `/register` and choose **Farmer** | List available produce and confirm the order |
| Buyer | Register separately and choose **Buyer** | Post a demand, simulate payment, confirm receipt |
| Rider | Register separately and choose **Rider** | Update pickup and delivery progress |
| Admin | Create in Appwrite Auth and add its user ID to `APPWRITE_ADMIN_USER_IDS` | Review orders and assign a registered rider |

Sign in to the admin account at `/login`. The app routes the allowlisted account to the admin dashboard.

## End-to-end test

Use fresh test data, or choose produce and demand records that are still open.

### 1. Farmer publishes produce

1. Sign in as the farmer.
2. Open **My produce**.
3. In **Farm pickup address**, enter the full farm address and select **Save pickup address**.
4. Enter:
   - Produce: **Wheat**
   - Quantity: **100 kg**
   - Asking price: **₹20/kg**
   - Location: **Greater Noida**
   - Availability: a future date
5. Select **Publish produce listing**.

**Expected:** The listing appears in the farmer's list without a full-page reload. New listings appear above older ones. A farmer must save the pickup address before publishing produce.

### 2. Buyer posts a demand

1. Sign in as the buyer in a separate browser profile.
2. Open **My demands**.
3. Enter:
   - Produce: **Wheat**
   - Quantity: **50 kg**
   - Maximum price: **₹25/kg**
   - Location: **Greater Noida**
   - A test delivery address
   - A future required date
4. Select **Post buyer demand**.
5. Open **Find farmers**.

**Expected:** The farmer's Wheat listing is shown as a compatible match. The buyer's delivery address is not shown to farmers or on the public marketplace. The farmer's pickup address is not shown to buyers.

### 3. Accept the match and create an order

1. From the buyer's match list, select the compatible farmer and accept the match. The farmer can also accept it from their match view.
2. Open **Orders & deals** for the buyer or farmer.

**Expected:** A new order appears with both pickup and delivery addresses available to the appropriate roles. The matched quantity is deducted from the produce and demand. When the demand is fully satisfied, it disappears from **My demands**; any still-open remainder stays there.

For the example above, the order value is 50 kg × ₹20 = **₹1,000**.

### 4. Record the buyer's simulated payment

1. As the buyer, open **Orders & deals**.
2. Open the order's **Payment demo**.
3. Choose a demo method and select **Simulate payment**.

**Expected:** The order is marked as demo-paid and becomes available in the admin's delivery queue. The example 5% commission estimate is **₹50**. No payment details are collected and no money is charged.

### 5. Admin assigns a rider

1. Sign in as the admin and open **Admin dashboard**.
2. If the paid order is not visible yet, select **Refresh data** in the top bar.
3. In the delivery queue, select the registered rider.
4. Enter the route distance and per-kilometre fee, then assign the rider.

For example, 10 km × ₹12/km gives a recorded rider fee of **₹120**.

**Expected:** The admin can review the farm pickup address and buyer delivery address, then the order shows the rider assignment and calculated fee. The admin manages assignment and pricing; the admin does not update the rider's delivery progress.

### 6. Rider updates delivery progress

1. Sign in as the assigned rider.
2. If the order is not visible yet, select **Refresh data**.
3. Select **I reached the farmer** at pickup.
4. After the test delivery, select **I delivered to the buyer**.

**Expected:** Each status update is saved and appears in the rider's panel without a full-page reload.

### 7. Buyer confirms receipt

1. Sign in as the buyer.
2. Select **Refresh data** to load the rider's latest status.
3. In **Orders & deals**, select **Confirm received**.

**Expected:** The deal is marked completed and is reflected in the buyer's and farmer's completed-order views. Refresh data in the other account to see a change made by a different account.

## Refreshing data during the demo

- Actions performed in the current account update the app state after the server responds; do not reload the whole website.
- Updates made in another account (for example, admin assignment or rider progress) can be loaded with the **Refresh data** button in the workspace top bar.
- Navigation between workspace pages is client-side. If a request fails, read the error shown in the app and check the development-server logs rather than repeatedly refreshing.

## Optional matching check

Post a second demand with a different crop, or a maximum price below the farmer's asking price. That request should not match the farmer's listing. Matching uses the supported crop and location options; it is not live GPS or verified route planning.

## What to explain to teachers

> “KhetLink connects bulk buyers directly with farmers. The buyer posts a crop, quantity, target price, location, and delivery address. The platform finds compatible listings and creates an order when a match is accepted. A buyer-side demo payment unlocks the admin delivery queue. The admin assigns a registered rider, and the rider updates pickup and delivery progress. The workflow is backed by Appwrite, while payment and delivery tracking are demonstrations.”

## Important demo limitations

- The payment flow is simulated. It does not charge a card, process UPI, or transfer money.
- The 5% commission is an estimate, not collected platform revenue.
- Rider fees are calculated from admin-entered distance and rate; they are not paid out by the app.
- The farm pickup address is saved once in the farmer profile and copied to new orders. Existing orders can use the farmer's saved address when the admin assigns a rider.
- Rider progress is updated manually. There is no live GPS tracking.
- Location matching uses the app's supported city-distance data, not verified coordinates or live routing.
- `npm test` checks local code behavior; it does not prove that records were saved in your Appwrite project. For a live demo, confirm the resulting documents in the intended Appwrite Console.
