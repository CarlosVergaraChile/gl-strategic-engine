import test from "node:test";
import assert from "node:assert/strict";
import { VerticalHealth } from "../adapters/health/vertical-health.js";
import { evaluateHealthEye, healthEyeUncertainty } from "../adapters/health/index.js";

const assumptions = VerticalHealth.DEFAULT_ASSUMPTIONS;
test("HealthEye adapter preserves both operating and economic output", () => {
  for (const inputs of Object.values(VerticalHealth.SCENARIOS)) {
    for (const mode of ["public", "private"]) {
      const original = VerticalHealth.simulate(inputs, assumptions);
      const eco = VerticalHealth.calculateEconomics(original, inputs, assumptions, { mode });
      const result = evaluateHealthEye(inputs, assumptions, mode);
      assert.deepEqual(result.operation, original);
      assert.deepEqual(result.economics, eco);
      assert.equal(result.currency, "CLP");
      assert.equal(result.horizon, "month");
    }
  }
});

test("HealthEye Monte Carlo is deterministic and metric-unit aware", () => {
  const options = {
    inputs: VerticalHealth.SCENARIOS.base,
    assumptions,
    distributions: { waste_pct: { type: "triangular", min: 5, mode: 15, max: 30 } },
    iterations: 200,
    seed: 100,
  };
  const a = healthEyeUncertainty(options);
  assert.deepEqual(a, healthEyeUncertainty(options));
  assert.equal(a.metricUnit, "CLP/month");
  assert.ok(a.p10 <= a.p50 && a.p50 <= a.p90);
});

test("HealthEye fixed distribution equals baseline", () => {
  const inputs = VerticalHealth.SCENARIOS.base;
  const baseline = evaluateHealthEye(inputs, assumptions).economics.result_period;
  const r = healthEyeUncertainty({
    inputs, assumptions,
    distributions: { resource_count: { type: "fixed", value: inputs.resource_count } },
    seed: 2, iterations: 20,
  });
  assert.equal(r.p50, baseline);
});
