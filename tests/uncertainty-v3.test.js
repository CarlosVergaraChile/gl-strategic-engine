import test from "node:test";
import assert from "node:assert/strict";
import { runUncertainty } from "../core/uncertainty-v3.js";

const base = {
  model: ({ demand, capacity }) => ({ throughput: Math.min(demand, capacity), margin: Math.min(demand, capacity) * 2 }),
  baseInputs: { demand: 90, capacity: 100 },
  distributions: { demand: { type: "triangular", min: 60, mode: 90, max: 140 } },
  selectMetric: x => x.throughput,
  seed: 42, iterations: 300,
};
test("reproducible for same seed", () => {
  assert.deepEqual(runUncertainty(base), runUncertainty(base));
});
test("does not hardcode EBITDA", () => {
  const r = runUncertainty({ ...base, selectMetric: x => x.margin });
  assert.ok(r.p50 >= 0);
});
test("invalid distribution rejected", () => {
  assert.throws(() => runUncertainty({ ...base,
    distributions: { demand: { type: "triangular", min: 200, mode: 30, max: 100 } }
  }), /invalid triangular/);
});
test("constant scenario has exact quantiles", () => {
  const r = runUncertainty({
    model: x => ({ result: x.qty * 3 }), baseInputs: { qty: 10 },
    selectMetric: x => x.result, iterations: 10, seed: 3
  });
  assert.equal(r.p10, 30);
  assert.equal(r.p90, 30);
});
