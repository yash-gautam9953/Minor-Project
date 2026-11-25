import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../services/matching.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
});
const matchingModule = { exports: {} };
runInNewContext(javascript, {
  exports: matchingModule.exports,
  module: matchingModule,
});
const { findDemandMatches, findFarmerMatches } = matchingModule.exports;

const produce = (overrides = {}) => ({
  id: "produce-a",
  farmerId: "farmer-a",
  farmerName: "Farmer A",
  produce: "Potato",
  quantityKg: 500,
  askingPricePerKg: 15,
  location: "Greater Noida",
  availableBy: "2026-10-02",
  status: "open",
  ...overrides,
});

const demand = (overrides = {}) => ({
  id: "demand-b",
  buyerId: "buyer-b",
  buyerName: "Buyer B",
  buyerType: "Restaurant",
  produce: "Potato",
  quantityKg: 300,
  targetPricePerKg: 18,
  location: "Greater Noida",
  requiredBy: "2026-10-05",
  status: "open",
  ...overrides,
});

test("matches compatible crop, price and distance with the smaller available quantity", () => {
  const result = findFarmerMatches(demand(), [produce()]);
  assert.equal(result.length, 1);
  assert.equal(result[0].quantityMatchedKg, 300);
  assert.equal(result[0].distanceKm, 0);
  assert.equal(findDemandMatches(produce(), [demand()])[0].potentialValue, 4500);
});

test("rejects different crops, a price mismatch, and unknown locations", () => {
  assert.equal(findFarmerMatches(demand(), [produce({ produce: "Onion" })]).length, 0);
  assert.equal(
    findFarmerMatches(demand({ targetPricePerKg: 14 }), [produce()]).length,
    0,
  );
  assert.equal(
    findFarmerMatches(demand({ location: "Unknown" }), [
      produce(),
    ]).length,
    0,
  );
  assert.equal(findFarmerMatches(demand({ location: "Delhi" }), [produce()])[0].distanceKm, 34);
});

test("ignores closed listings and closed demands", () => {
  assert.equal(findFarmerMatches(demand(), [produce({ status: "closed" })]).length, 0);
  assert.equal(findFarmerMatches(demand({ status: "closed" }), [produce()]).length, 0);
  assert.equal(findDemandMatches(produce({ status: "closed" }), [demand()]).length, 0);
});

test("ignores exhausted listings and demands", () => {
  assert.equal(findFarmerMatches(demand(), [produce({ quantityKg: 0 })]).length, 0);
  assert.equal(findFarmerMatches(demand({ quantityKg: 0 }), [produce()]).length, 0);
});
