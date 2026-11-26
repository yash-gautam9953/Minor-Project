import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../services/platform-metrics.ts", import.meta.url),
  "utf8",
);
const commissionSource = await readFile(
  new URL("../services/commission.ts", import.meta.url),
  "utf8",
);
const commissionModule = { exports: {} };
runInNewContext(
  ts.transpile(commissionSource, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  }),
  {
    exports: commissionModule.exports,
    module: commissionModule,
  },
);
const { calculatePlatformCommission } = commissionModule.exports;
const javascript = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
});
const metricsModule = { exports: {} };
runInNewContext(javascript, {
  exports: metricsModule.exports,
  module: metricsModule,
  require: (name) => {
    if (name === "@/services/commission") return commissionModule.exports;
    throw new Error(`Unexpected platform metrics dependency: ${name}`);
  },
});
const { calculatePlatformMetrics } = metricsModule.exports;

test("demo commission is 5 percent of the order value", () => {
  assert.equal(calculatePlatformCommission(7500), 375);
});

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
      { status: "pending", quantityKg: 40, totalValue: 2000 },
      { status: "confirmed", quantityKg: 40, totalValue: 3000 },
      { status: "completed", quantityKg: 12, totalValue: 1500 },
      { status: "completed", quantityKg: 8, totalValue: 500 },
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
    estimatedCommissionTotal: 250,
  });
});
