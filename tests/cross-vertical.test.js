import test from "node:test";
import assert from "node:assert/strict";
import { aquaEyeUncertainty, evaluateAquaEye } from "../adapters/salmon/index.js";
import { healthEyeUncertainty, evaluateHealthEye } from "../adapters/health/index.js";

test("verticals keep independent units, metrics and horizons", () => {
  const aqu = aquaEyeUncertainty({ seed: 555, iterations: 30 });
  const hea = healthEyeUncertainty({ seed: 555, iterations: 30 });
  assert.equal(aqu.metricUnit, "million USD");
  assert.equal(aqu.horizon, "cycle");
  assert.equal(hea.metricUnit, "CLP/month");
  assert.equal(hea.horizon, "month");
});

test("interleaved verticals do not contaminate deterministic results", () => {
  const a1 = aquaEyeUncertainty({
    seed: 13, iterations: 60,
    distributions: { loss_pct: { type: "triangular", min: 5, mode: 8, max: 12 } },
  });
  const h1 = healthEyeUncertainty({
    seed: 21, iterations: 60,
    distributions: { waste_pct: { type: "triangular", min: 5, mode: 15, max: 30 } },
  });
  assert.deepEqual(a1, aquaEyeUncertainty({
    seed: 13, iterations: 60,
    distributions: { loss_pct: { type: "triangular", min: 5, mode: 8, max: 12 } },
  }));
  assert.deepEqual(h1, healthEyeUncertainty({
    seed: 21, iterations: 60,
    distributions: { waste_pct: { type: "triangular", min: 5, mode: 15, max: 30 } },
  }));
});

test("operational results remain separate from economic outcomes", () => {
  const aqu = evaluateAquaEye();
  const hea = evaluateHealthEye();
  assert.equal(typeof aqu.operation.throughput, "number");
  assert.equal(typeof hea.operation.throughput, "number");
  assert.equal(typeof aqu.economics.result_period, "number");
  assert.equal(typeof hea.economics.result_period, "number");
  assert.notEqual(aqu.outputUnit, hea.outputUnit);
});
