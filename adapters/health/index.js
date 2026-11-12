/**
 * HealthEye adapter: preserve the original GL Portal operational and economic
 * models, with shared, deterministic uncertainty computation.
 */
import { VerticalHealth } from "./vertical-health.js";
import { runUncertainty } from "../../core/uncertainty-v3.js";

export const HEALTHEYE_MODEL = VerticalHealth;

export function evaluateHealthEye(
  inputs = VerticalHealth.SCENARIOS.base,
  assumptions = VerticalHealth.DEFAULT_ASSUMPTIONS,
  mode = "public",
) {
  const operation = VerticalHealth.simulate(inputs, assumptions);
  const economics = VerticalHealth.calculateEconomics(operation, inputs, assumptions, { mode });
  const constraints = VerticalHealth.constraints(operation, inputs, assumptions);
  return {
    product: "HealthEye",
    modelVersion: VerticalHealth.meta.version,
    currency: "CLP",
    outputUnit: "CLP/month",
    horizon: VerticalHealth.meta.period,
    mode, operation, economics, constraints,
  };
}

export function healthEyeUncertainty({
  inputs = VerticalHealth.SCENARIOS.base,
  assumptions = VerticalHealth.DEFAULT_ASSUMPTIONS,
  mode = "public",
  distributions = {},
  seed = 20261111,
  iterations = 1000,
} = {}) {
  const result = runUncertainty({
    model: sampledInputs => evaluateHealthEye(sampledInputs, assumptions, mode),
    baseInputs: inputs,
    distributions,
    selectMetric: x => x.economics.result_period,
    seed,
    iterations,
    lossThreshold: 0,
  });
  return {
    product: "HealthEye",
    metric: "result_period",
    metricUnit: "CLP/month",
    horizon: "month",
    mode,
    assumptionsVersion: "snapshot-gl-portal",
    ...result,
  };
}
