import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../services/delivery.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
});
const deliveryModule = { exports: {} };
runInNewContext(javascript, {
  exports: deliveryModule.exports,
  module: deliveryModule,
});
const {
  calculateRiderFee,
  canRiderAdvanceDelivery,
  canViewDemandDeliveryAddress,
  canViewOrderDeliveryAddress,
  omitDemandDeliveryAddress,
} = deliveryModule.exports;

test("rider fee uses entered route distance and per-km rate", () => {
  assert.equal(calculateRiderFee(12, 10), 120);
  assert.equal(calculateRiderFee(12.5, 10.25), 128);
});

test("only the assigned rider can advance delivery one step at a time", () => {
  const assignedDeal = {
    riderId: "rider-1",
    paymentStatus: "simulated_paid",
    deliveryStatus: "rider_assigned",
  };
  assert.equal(canRiderAdvanceDelivery(assignedDeal, "rider-1", "at_farmer"), true);
  assert.equal(canRiderAdvanceDelivery(assignedDeal, "rider-2", "at_farmer"), false);
  assert.equal(canRiderAdvanceDelivery(assignedDeal, "rider-1", "delivered"), false);
  assert.equal(
    canRiderAdvanceDelivery(
      { ...assignedDeal, deliveryStatus: "at_farmer" },
      "rider-1",
      "delivered",
    ),
    true,
  );
});

test("delivery addresses are visible only to the buyer, admin, and assigned rider", () => {
  const order = { buyerId: "buyer-1", riderId: "rider-1" };
  assert.equal(canViewOrderDeliveryAddress(order, "buyer", "buyer-1"), true);
  assert.equal(canViewOrderDeliveryAddress(order, "buyer", "buyer-2"), false);
  assert.equal(canViewOrderDeliveryAddress(order, "farmer", "farmer-1"), false);
  assert.equal(canViewOrderDeliveryAddress(order, "rider", "rider-1"), true);
  assert.equal(canViewOrderDeliveryAddress(order, "rider", "rider-2"), false);
  assert.equal(canViewOrderDeliveryAddress(order, "admin"), true);
  assert.equal(
    canViewDemandDeliveryAddress({ buyerId: "buyer-1" }, "buyer", "buyer-1"),
    true,
  );
  assert.equal(
    canViewDemandDeliveryAddress({ buyerId: "buyer-1" }, "farmer", "farmer-1"),
    false,
  );
});

test("redacted demand addresses are omitted from JSON responses", () => {
  const demand = {
    id: "demand-1",
    buyerId: "buyer-1",
    buyerName: "Buyer",
    buyerType: "Retailer",
    produce: "Wheat",
    quantityKg: 20,
    targetPricePerKg: 10,
    location: "Jaipur",
    deliveryAddress: "Private address",
    requiredBy: "2026-12-01",
    status: "open",
  };
  const redacted = omitDemandDeliveryAddress(demand);

  assert.equal(Object.hasOwn(redacted, "deliveryAddress"), false);
  assert.doesNotThrow(() => JSON.stringify(redacted));
});
