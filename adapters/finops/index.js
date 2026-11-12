/**
 * FinOps / credit-policy illustration adapted from existing chassis.
 * Formulae are the current DEMO assumptions, not regulatory rules nor
 * empirical credit scoring. They must not be used for real lending decisions.
 */
import { evaluateGraph } from "../../core/graph-v3.js";
import { runUncertainty } from "../../core/uncertainty-v3.js";
import { chassis } from "../../verticals/finops/chassis.js";

const DEPENDENCIES = {
  volumen_colocaciones: ["tasa_aprobacion"],
  ingreso_intereses: ["volumen_colocaciones","tasa_interes_activa"],
  probabilidad_default: ["limite_credito_promedio","tasa_interes_activa"],
  provisiones_riesgo: ["volumen_colocaciones","probabilidad_default"],
  riesgo_sancion_cmf: ["presupuesto_compliance_aml"],
  impacto_brecha_datos: ["ingreso_intereses","inversion_ciberseguridad"],
  costo_fondos: ["volumen_colocaciones"],
  ebitda: ["ingreso_intereses","costo_fondos","provisiones_riesgo",
           "presupuesto_compliance_aml","inversion_ciberseguridad",
           "riesgo_sancion_cmf","impacto_brecha_datos"],
};
const DEFAULT_INPUTS = Object.fromEntries(Object.entries(chassis.inputs).map(([k,v])=>[k,v.value]));

export function evaluateFinops(inputs = {}, scenario = "base") {
  if (scenario && !Object.hasOwn(chassis.scenarios, scenario)) throw new Error("unknown scenario");
  const merged={...DEFAULT_INPUTS,...(scenario ? chassis.scenarios[scenario].values : {}),...inputs};
  const nodes=Object.fromEntries(Object.entries(chassis.nodes).map(([name,node])=>[name,node.formula]));
  return {
    vertical:"finops",kind:"illustrative-model",currency:"USD",
    horizon:"annual-illustrative",inputs:merged,
    nodes:evaluateGraph({inputs:merged,nodes,dependencies:DEPENDENCIES}),
    caveat:"Heuristic demo, not validated credit risk, regulatory fines, or forecast",
  };
}

export function finopsUncertainty({inputs={},distributions={},seed=11,iterations=1000,scenario="base"}={}) {
  const initial=evaluateFinops(inputs,scenario).inputs;
  const r=runUncertainty({
    baseInputs:initial,distributions,seed,iterations,
    model:(sample)=>evaluateFinops(sample,null),
    selectMetric:x=>x.nodes.ebitda,
    lossThreshold:0,
  });
  return {vertical:"finops",metric:"ebitda_demo",currency:"USD",...r};
}
