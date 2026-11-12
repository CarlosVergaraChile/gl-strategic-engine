import test from "node:test";
import assert from "node:assert/strict";
import { VerticalSalmon } from "../adapters/salmon/vertical-salmon.js";
import { evaluateAquaEye, aquaEyeUncertainty } from "../adapters/salmon/index.js";

const base = VerticalSalmon.SCENARIOS.base;
const assumptions = VerticalSalmon.DEFAULT_ASSUMPTIONS;

test("AquaEye adapter retains existing operational/economic outputs", () => {
  for (const inputs of Object.values(VerticalSalmon.SCENARIOS)) {
    const expectedSimulation = VerticalSalmon.simulate(inputs, assumptions);
    const expectedEconomics = VerticalSalmon.calculateEconomics(expectedSimulation, inputs, assumptions);
    const actual = evaluateAquaEye(inputs, assumptions);
    assert.deepEqual(actual.operation, expectedSimulation);
    assert.deepEqual(actual.economics, expectedEconomics);
    assert.equal(actual.outputUnit, "million USD");
  }
});

test("AquaEye Monte Carlo returns deterministic constant for fixed scenario", () => {
  const baseResult = evaluateAquaEye(base, assumptions).economics.result_period;
  const risk = aquaEyeUncertainty({
    inputs: base,
    assumptions,
    distributions: { unit_price: { type: "fixed", value: base.unit_price } },
    seed: 17,
    iterations: 100,
  });
  assert.equal(risk.p10, baseResult);
  assert.equal(risk.p50, baseResult);
  assert.equal(risk.p90, baseResult);
  assert.equal(risk.metricUnit, "million USD");
});

test("AquaEye Monte Carlo is repeatable for same seed", () => {
  const options = {
    inputs: base,
    assumptions,
    distributions: {
      unit_price: { type: "triangular", min: 4.7, mode: 5.5, max: 6.4 },
      loss_pct: { type: "triangular", min: 4, mode: 8, max: 14 },
    },
    seed: 99,
    iterations: 300,
  };
  const a = aquaEyeUncertainty(options);
  const b = aquaEyeUncertainty(options);
  assert.deepEqual(a, b);
  assert.ok(a.p10 <= a.p50 && a.p50 <= a.p90);
});

test("AquaEye metrics are explicitly sector-specific; no forced EBITDA key", () => {
  const x = aquaEyeUncertainty({ iterations: 15 });
  assert.equal(x.metric, "result_period");
  assert.ok(Number.isFinite(x.p50));
});
