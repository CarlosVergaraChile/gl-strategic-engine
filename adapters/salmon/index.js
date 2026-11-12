/**
 * Adaptador AquaEye: utiliza la implementación existente de GL Portal
 * sin cambiar fórmulas, unidades ni lógica del negocio.
 * El análisis de incertidumbre usa el nuevo núcleo reproducible.
 */
import { VerticalSalmon } from "./vertical-salmon.js";
import { runUncertainty } from "../../core/uncertainty-v3.js";

export const AQUAEYE_MODEL = VerticalSalmon;

export function evaluateAquaEye(
  inputs = VerticalSalmon.SCENARIOS.base,
  assumptions = VerticalSalmon.DEFAULT_ASSUMPTIONS,
) {
  const sim = VerticalSalmon.simulate(inputs, assumptions);
  const economics = VerticalSalmon.calculateEconomics(sim, inputs, assumptions);
  const operationalConstraints = VerticalSalmon.constraints(sim, inputs, assumptions);
  return {
    product: "AquaEye",
    modelVersion: VerticalSalmon.meta.version,
    horizon: VerticalSalmon.meta.period,
    currency: VerticalSalmon.meta.currency,
    outputUnit: "million USD",
    operation: sim,
    economics,
    constraints: operationalConstraints,
  };
}

export function aquaEyeUncertainty({
  inputs = VerticalSalmon.SCENARIOS.base,
  assumptions = VerticalSalmon.DEFAULT_ASSUMPTIONS,
  distributions = {},
  seed = 20261111,
  iterations = 1000,
} = {}) {
  const out = runUncertainty({
    model: sampledInputs => evaluateAquaEye(sampledInputs, assumptions),
    baseInputs: inputs,
    distributions,
    selectMetric: result => result.economics.result_period,
    seed,
    iterations,
    lossThreshold: 0,
  });
  return {
    product: "AquaEye",
    metric: "result_period",
    metricUnit: "million USD",
    horizon: VerticalSalmon.meta.period,
    assumptionsVersion: "snapshot-gl-portal",
    ...out,
  };
}
