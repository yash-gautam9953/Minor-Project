import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../services/platform-metrics.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
});
const metricsModule = { exports: {} };
runInNewContext(javascript, {
  exports: metricsModule.exports,
  module: metricsModule,
});
const { calculatePlatformMetrics } = metricsModule.exports;

test("platform metrics include only active listings and completed order volume", () => {
  const metrics = calculatePlatformMetrics({
    farmers: [{}, {}],
    buyers: [{}],
    produce: [
      { status: "open", quantityKg: 20 },
      { status: "closed", quantityKg: 30 },
      { status: "open", quantityKg: 0 },
    ],
    demands: [
      { status: "open", quantityKg: 15 },
      { status: "matched", quantityKg: 25 },
    ],
    deals: [
      { status: "confirmed", quantityKg: 40 },
      { status: "completed", quantityKg: 12 },
      { status: "completed", quantityKg: 8 },
    ],
    acceptedMatchCount: 3,
  });

  assert.deepEqual({ ...metrics }, {
    farmerCount: 2,
    buyerCount: 1,
    activeProduceCount: 1,
    activeDemandCount: 1,
    acceptedMatchCount: 3,
    completedOrderCount: 2,
    completedOrderVolumeKg: 20,
  });
});
