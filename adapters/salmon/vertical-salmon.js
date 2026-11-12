/**
 * vertical-salmon.js
 * GL Strategic — Implementación del contrato para AquaEye / Salmon
 *
 * MAPA DE NAMING: acuícola → neutral
 * ─────────────────────────────────────────────────────────────
 *  volumen_vendible      → throughput          (toneladas vendibles)
 *  biomasa_cosechable    → throughput_cap_a    (biomasa disponible pre-planta)
 *  [sin recurso B nativo]→ throughput_cap_b    → N/A — ver FRICCIÓN 1
 *  ebitda                → economics.result_period (MUSD)
 *  ingreso               → economics.revenue
 *  costo_alimento        → economics.cost_variable (principal componente)
 *  costo_sanitario       → economics.cost_variable (componente 2)
 *  otros_costos          → economics.cost_fixed     (aprox.)
 *  riesgo_sanitario      → constraints_raw.risk_score
 *  fcr                   → inputs.process_efficiency  (FCR: kg alimento/kg pez)
 *  mort                  → inputs.loss_pct            (mortalidad %)
 *  calig                 → inputs.pest_index          (índice caligus)
 *  yield                 → inputs.yield_pct           (yield planta %)
 *  price                 → inputs.unit_price          (USD/kg)
 *  fx                    → inputs.fx_rate             (CLP/USD)
 *  biomasa_inicial       → assumptions.base_volume    (ton)
 *
 * FUNCIONES ACTUALES vs CONTRATO:
 * ─────────────────────────────────────────────────────────────
 *  simulate()               → SE REUTILIZA. Output renombrado a SimResult.
 *  constraints()            → NUEVA. Construida desde riesgo_sanitario + lógica cuello.
 *  calculateEconomics()     → SE REUTILIZA (inline en simulate) + adaptada.
 *  buildViewModel()         → NUEVA en el contrato. Salmon no tenía esta capa explícita.
 *  calculateMarginalImpacts → SE REUTILIZA. Output → ActionItem[].
 *  calculateSensitivity()   → SE REUTILIZA como runSensitivityAnalysis().
 *  runMonteCarlo()          → SE REUTILIZA. Output → MonteCarloResult.
 *  compareScenarios()       → SE REUTILIZA. Output → ScenarioResult[].
 *  estimateRiskBand()       → SE REUTILIZA — salmon-specific.
 *  buildKPIs()              → SE INTEGRA dentro de buildViewModel().
 *  buildActionPlan()        → SE INTEGRA dentro de calculateMarginalImpacts().
 *  getDominantChain()       → SE INTEGRA en summary del ViewModel.
 *  projectBacklog()         → No implementado en Salmon (retorna null).
 *
 * FRICCIONES DETECTADAS:
 * ─────────────────────────────────────────────────────────────
 *  FRICCIÓN 1: throughput_cap_b no existe
 *    Salmon tiene UN recurso de producción (biomasa), sin equivalente a camas.
 *    Se expone throughput_cap_b como null en SimResult.
 *    El Shell debe manejar null para este campo.
 *
 *  FRICCIÓN 2: result_period en MUSD vs M CLP en HealthEye
 *    El contrato declara currency en meta, pero ambos verticales retornan
 *    result_period en su propia unidad. El Shell debe normalizar si compara cross-vertical.
 *
 *  FRICCIÓN 3: BASE_RESULT calculado en tiempo de importación
 *    Salmon calcula BASE_RESULT = simulate(BASE_INPUTS) al importar el módulo.
 *    Esto es coupling temporal implícito. Se replica aquí pero se marca como deuda.
 *    El contrato no prescribe cómo calcular el base — lo deja al vertical.
 *
 *  FRICCIÓN 4: "backlog" no existe nativamente en Salmon
 *    En acuicultura no hay lista de espera acumulada.
 *    backlog en este vertical = lost_revenue (ingresos no capturados por mortalidad).
 *    backlog_stock = 0 siempre (no aplica el concepto de stock diferido).
 *    La UI debe usar el label del vertical ("Pérdida por mortalidad") no el término neutral.
 *
 *  FRICCIÓN 5: Economics mezclado con SimResult en el motor original
 *    simulate() en Salmon retorna ebitda, ingreso, costos — mezclado operación + finanzas.
 *    Para cumplir el contrato, la capa economics re-ensambla desde el resultado interno.
 *    Se preserva _internal en SimResult para evitar re-cálculo.
 */

import {
  corePercentile,
  coreTriangular,
  coreHistogram,
  coreStateColor,
} from './vertical-contract.js';

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 1 — METADATOS
// ═══════════════════════════════════════════════════════════════════

const meta = {
  id:              'salmon',
  name:            'AquaEye',
  version:         '17.0.0',
  currency:        'USD',    // MUSD para result_period — ver FRICCIÓN 2
  period:          'cycle',  // ciclo de cultivo — no es exactamente 'month'
  throughput_unit: 'tons',   // toneladas vendibles
};

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 2 — ASSUMPTIONS Y ESCENARIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Assumptions por defecto.
 * ORIGEN: DEFAULT_ASSUMPTIONS en engine/simulate.js + base.yaml.
 *
 * NOTA: Las claves aquí usan naming neutral del contrato.
 * El motor interno las traduce vía _toInternalAssumptions().
 */
const DEFAULT_ASSUMPTIONS = {
  // ── Producción
  base_volume:                  12500,    // ton — biomasa_inicial
  // ── Costos operativos
  feed_cost_per_kg:             1200,     // CLP/kg alimento — costo_alimento_por_kg
  sanitary_cost_base:           1500000,  // USD — costo_sanitario_base
  sanitary_cost_per_pest_unit:  250000,   // USD/punto caligus — costo_sanitario_caligus_factor
  other_cost_per_base_volume:   500,      // CLP/ton — otros_costos_por_ton
  // ── Riesgo sanitario
  risk_score_base:              52,       // riesgo_sanitario_base
  risk_coef_pest:               5,        // riesgo_sanitario_coef_caligus
  risk_coef_loss_delta:         2,        // riesgo_sanitario_coef_mort_delta
  risk_base_loss_pct:           8,        // mort_base_riesgo
};

/**
 * Escenarios predefinidos.
 * ORIGEN: getSensitivityScenarios() en engine/kpi.js + BASE_INPUTS.
 */
const SCENARIOS = {
  base: {
    process_efficiency:  1.3,   // fcr
    loss_pct:            8,     // mort %
    pest_index:          3,     // calig idx
    yield_pct:           82,    // yield %
    unit_price:          5.5,   // USD/kg
    fx_rate:             850,   // CLP/USD
  },
  crisis_sanitary: {
    process_efficiency:  1.5,
    loss_pct:            15,
    pest_index:          7,
    yield_pct:           80,
    unit_price:          4.8,
    fx_rate:             850,
  },
  market_high: {
    process_efficiency:  1.2,
    loss_pct:            6,
    pest_index:          2,
    yield_pct:           85,
    unit_price:          7.0,
    fx_rate:             900,
  },
  worst_case: {
    process_efficiency:  1.8,
    loss_pct:            20,
    pest_index:          9,
    yield_pct:           75,
    unit_price:          4.0,
    fx_rate:             800,
  },
};

/**
 * Metadatos de palancas para el Shell.
 * ORIGEN: model/variables.json en AquaEye.
 */
const LEVERS_META = [
  { id: 'process_efficiency', label: 'Eficiencia de proceso (FCR)', unit: '',      min: 1.0, max: 2.0,  step: 0.1,  base: 1.3  },
  { id: 'loss_pct',           label: 'Pérdida de volumen (%)',       unit: '%',     min: 1,   max: 25,   step: 1,    base: 8    },
  { id: 'pest_index',         label: 'Índice de presión sanitaria',  unit: 'idx',   min: 0,   max: 10,   step: 0.5,  base: 3    },
  { id: 'yield_pct',          label: 'Rendimiento en planta (%)',    unit: '%',     min: 70,  max: 95,   step: 1,    base: 82   },
  { id: 'unit_price',         label: 'Precio por unidad (USD/kg)',   unit: 'USD/kg',min: 3.0, max: 10.0, step: 0.1,  base: 5.5  },
  { id: 'fx_rate',            label: 'Tipo de cambio (CLP/USD)',     unit: 'CLP',   min: 600, max: 1200, step: 10,   base: 850  },
];

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 3 — ADAPTADORES
// ═══════════════════════════════════════════════════════════════════

/**
 * Convierte VerticalInputs (neutral) → inputs internos Salmon.
 */
function toInternalInputs(inputs) {
  return {
    fcr:   inputs.process_efficiency,
    mort:  inputs.loss_pct,
    calig: inputs.pest_index,
    yield: inputs.yield_pct,
    price: inputs.unit_price,
    fx:    inputs.fx_rate,
  };
}

/**
 * Convierte VerticalAssumptions (neutral) → assumptions internas Salmon.
 */
function toInternalAssumptions(assumptions) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  return {
    biomasa_inicial:                a.base_volume,
    costo_alimento_por_kg:          a.feed_cost_per_kg,
    costo_sanitario_base:           a.sanitary_cost_base,
    costo_sanitario_caligus_factor: a.sanitary_cost_per_pest_unit,
    otros_costos_por_ton:           a.other_cost_per_base_volume,
    riesgo_sanitario_base:          a.risk_score_base,
    riesgo_sanitario_coef_caligus:  a.risk_coef_pest,
    riesgo_sanitario_coef_mort_delta: a.risk_coef_loss_delta,
    mort_base_riesgo:               a.risk_base_loss_pct,
  };
}

/**
 * Convierte resultado interno Salmon → SimResult neutral.
 *
 * FRICCIÓN 4: backlog no existe nativamente.
 * Se mapea a ingresos no capturados por pérdida de volumen vs escenario de 0% pérdida.
 * backlog_stock = 0 (no aplica).
 *
 * FRICCIÓN 1: throughput_cap_b = null (no hay segundo recurso).
 */
function toSimResult(r, inputs, a_internal) {
  // Potencial de volumen sin pérdidas (para calcular "backlog" conceptual)
  const max_throughput = a_internal.biomasa_inicial * (inputs.yield_pct / 100);
  const volume_lost    = Math.max(0, max_throughput - r.volumen_vendible);

  return {
    throughput:         r.volumen_vendible,         // ton vendibles
    throughput_cap_a:   r.biomasa_cosechable,       // ton cosechables (pre-planta)
    throughput_cap_b:   null,                        // FRICCIÓN 1: no existe en Salmon
    backlog:            volume_lost,                 // FRICCIÓN 4: volume lost, no lista de espera
    backlog_stock:      0,                           // no aplica
    resource_usage: {
      base_volume:      a_internal.biomasa_inicial,
      biomass_harvested: r.biomasa_cosechable,
      volume_sold:      r.volumen_vendible,
    },
    constraints_raw: {
      risk_score:       r.riesgo_sanitario,
      pest_index:       inputs.pest_index,
      loss_pct:         inputs.loss_pct,
      process_eff:      inputs.process_efficiency,
    },
    drivers: {
      _internal: r,     // preservado para calculateEconomics
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 4 — MOTOR INTERNO (función pura — de engine/simulate.js)
// ORIGEN: simulate() en engine/simulate.js
// Sin modificaciones funcionales — naming interno preservado
// ═══════════════════════════════════════════════════════════════════

/**
 * Motor de simulación interno AquaEye.
 * Recibe inputs y assumptions con naming interno acuícola.
 *
 * FRICCIÓN 5: retorna ebitda + costos — mezclado operación+finanzas.
 * Se preserva para que _calculateEconomicsInternal() lo reutilice.
 */
function _simulateInternal(inp, a_int) {
  const { fcr, mort, calig, price, fx } = inp;
  const yield_pct = inp.yield;

  // ── Cadena de producción
  const biomasa_cosechable = a_int.biomasa_inicial * (1 - mort / 100);
  const volumen_vendible   = biomasa_cosechable * (yield_pct / 100);

  // ── Ingresos (USD)
  const ingreso_usd  = volumen_vendible * price * 1000;
  const ingreso_musd = ingreso_usd / 1_000_000;

  // ── Costos (→ MUSD)
  const costo_alimento_clp  = a_int.biomasa_inicial * 1000 * fcr * a_int.costo_alimento_por_kg;
  const costo_alimento_musd = costo_alimento_clp / fx / 1_000_000;

  const costo_sanitario_usd  = a_int.costo_sanitario_base + (calig * a_int.costo_sanitario_caligus_factor);
  const costo_sanitario_musd = costo_sanitario_usd / 1_000_000;

  const otros_costos_clp  = a_int.biomasa_inicial * a_int.otros_costos_por_ton;
  const otros_costos_musd = otros_costos_clp / fx / 1_000_000;

  const costo_total_musd = costo_alimento_musd + costo_sanitario_musd + otros_costos_musd;
  const ebitda           = ingreso_musd - costo_total_musd;

  const costo_unitario_usd = volumen_vendible > 0
    ? costo_total_musd * 1_000_000 / (volumen_vendible * 1000)
    : 0;
  const margen = price - costo_unitario_usd;

  const riesgo_sanitario = Math.max(0,
    a_int.riesgo_sanitario_base
    + (calig * a_int.riesgo_sanitario_coef_caligus)
    + (mort - a_int.mort_base_riesgo) * a_int.riesgo_sanitario_coef_mort_delta
  );

  return {
    biomasa_cosechable,
    volumen_vendible,
    ingreso:         ingreso_musd,
    costo_alimento:  costo_alimento_musd,
    costo_sanitario: costo_sanitario_musd,
    otros_costos:    otros_costos_musd,
    ebitda,
    costo_unitario:  costo_unitario_usd,
    margen,
    riesgo_sanitario,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 5 — IMPLEMENTACIÓN DEL CONTRATO
// ═══════════════════════════════════════════════════════════════════

/**
 * CAPA 1: Motor — interfaz del contrato.
 */
function simulate(inputs, assumptions) {
  const a_int = toInternalAssumptions(assumptions);
  const inp   = toInternalInputs(inputs);
  const r     = _simulateInternal(inp, a_int);
  return toSimResult(r, inputs, a_int);
}

/**
 * CAPA 2: Restricciones.
 * ORIGEN: Lógica extraída de estimateRiskBand() + riesgo_sanitario del motor.
 *
 * En Salmon no hay cuello A vs B como en HealthEye.
 * El cuello dominante se determina por cuál driver tiene mayor impacto marginal negativo:
 *   - Pérdida de volumen (mort alta) → resource_a (biomasa)
 *   - Eficiencia de proceso (FCR alto, costos) → process
 *   - Presión sanitaria (pest_index alto) → sanitary
 *
 * FRICCIÓN DETECTADA:
 *   El concepto de "cuello de botella" en Salmon es económico, no físico.
 *   No es equivalente al cuello pabellón/camas de HealthEye.
 *   Se mapea al contrato con semántica adaptada: bottleneck indica el driver de riesgo dominante.
 */
function constraints(simResult, inputs, assumptions) {
  const raw = simResult.constraints_raw;

  // Determinar cuello dominante por heurística de drivers
  let bottleneck       = 'none';
  let bottleneck_label = 'Sin cuello crítico';
  const violations     = [];

  if (raw.loss_pct > 12) {
    bottleneck       = 'resource_a';
    bottleneck_label = 'Volumen (pérdida crítica de biomasa)';
    violations.push({
      resource: 'resource_a',
      limit:    12,
      actual:   raw.loss_pct,
      severity: raw.loss_pct > 18 ? 'high' : 'medium',
      label:    `Pérdida de volumen ${raw.loss_pct}% supera umbral crítico`,
    });
  } else if (raw.process_eff > 1.6) {
    bottleneck       = 'process';
    bottleneck_label = 'Eficiencia de proceso (FCR elevado)';
    violations.push({
      resource: 'process',
      limit:    1.6,
      actual:   raw.process_eff,
      severity: 'medium',
      label:    `FCR ${raw.process_eff} eleva costos de alimentación`,
    });
  } else if (raw.pest_index > 5) {
    bottleneck       = 'sanitary';
    bottleneck_label = 'Sanitario (presión de parásitos)';
    violations.push({
      resource: 'sanitary',
      limit:    5,
      actual:   raw.pest_index,
      severity: raw.pest_index > 7 ? 'high' : 'medium',
      label:    `Índice sanitario ${raw.pest_index} genera costos elevados`,
    });
  }

  // Riesgo sanitario compuesto
  if (raw.risk_score > 70) {
    violations.push({
      resource: 'risk_composite',
      limit:    70,
      actual:   raw.risk_score,
      severity: raw.risk_score > 85 ? 'high' : 'medium',
      label:    `Score de riesgo sanitario compuesto: ${Math.round(raw.risk_score)}`,
    });
  }

  return {
    bottleneck,
    bottleneck_label,
    capacity_limits: {
      resource_a: simResult.throughput_cap_a,  // biomasa cosechable
      resource_b: null,                         // FRICCIÓN 1: no existe
    },
    violations,
  };
}

/**
 * CAPA 3: Economía.
 * ORIGEN: Datos financieros inline en _simulateInternal() (FRICCIÓN 5).
 * ADAPTACIÓN: Se re-ensambla desde _internal para no re-ejecutar el motor.
 *
 * Salmon no tiene modos públicos/privados — config.mode se ignora.
 * FRICCIÓN DETECTADA:
 *   Si en el futuro Salmon agrega modo spot vs contrato, config.mode
 *   estará disponible en el contrato sin cambios de interfaz.
 */
function calculateEconomics(simResult, inputs, assumptions, config = {}) {
  const r = simResult.drivers._internal;  // resultado interno con campos financieros

  const result_period = r.ebitda;          // MUSD
  const revenue       = r.ingreso;         // MUSD
  const cost_variable = r.costo_alimento + r.costo_sanitario; // MUSD
  const cost_fixed    = r.otros_costos;    // MUSD (aproximación — ver FRICCIÓN 5)
  const cost_total    = r.costo_alimento + r.costo_sanitario + r.otros_costos;
  const margin_unit   = r.margen;          // USD/kg

  // Oportunidad perdida: volumen no capturado por pérdidas * precio
  const opportunity_cost = simResult.backlog * inputs.unit_price;  // MUSD aprox.

  // KPIs — estructura neutral del contrato
  const a_int      = toInternalAssumptions(assumptions);
  const base_ebitda = _simulateInternal(toInternalInputs(SCENARIOS.base), a_int).ebitda;
  const base_vol    = _simulateInternal(toInternalInputs(SCENARIOS.base), a_int).volumen_vendible;

  const kpis_raw = [
    {
      key:   'throughput',
      label: 'throughput',
      val:   Math.round(r.volumen_vendible),
      unit:  'ton',
      state: r.volumen_vendible >= base_vol ? 'good' : 'bad',
    },
    {
      key:   'process_efficiency',
      label: 'process_efficiency',
      val:   parseFloat(inputs.process_efficiency).toFixed(2),
      unit:  '',
      state: inputs.process_efficiency <= SCENARIOS.base.process_efficiency ? 'good' : 'bad',
    },
    {
      key:   'loss_pct',
      label: 'loss_pct',
      val:   parseFloat(inputs.loss_pct) + '%',
      unit:  '',
      state: inputs.loss_pct <= SCENARIOS.base.loss_pct ? 'good' : 'bad',
    },
    {
      key:   'result',
      label: 'result_period',
      val:   '$' + result_period.toFixed(1),
      unit:  'M USD',
      state: result_period >= base_ebitda ? 'good' : result_period >= 0 ? 'warn' : 'bad',
    },
  ];

  // Alertas
  const alerts_raw = [];
  if (margin_unit < 0) {
    alerts_raw.push({ type: 'alert', msg: 'Margen por kg negativo — costo unitario supera precio de mercado.' });
  }
  if (inputs.loss_pct > 15) {
    alerts_raw.push({ type: 'alert', msg: `Pérdida de biomasa crítica: ${inputs.loss_pct}% — riesgo biológico severo.` });
  }
  if (inputs.pest_index > 5) {
    alerts_raw.push({ type: 'warn', msg: `Presión sanitaria elevada: índice ${inputs.pest_index} — costo sanitario sobre base.` });
  }
  if (result_period < 0) {
    alerts_raw.push({ type: 'alert', msg: `EBITDA negativo: $${result_period.toFixed(1)}M USD — situación de pérdida operacional.` });
  }
  if (opportunity_cost > 0.5) {
    alerts_raw.push({ type: 'warn', msg: `Volumen no capturado por pérdidas: ~$${opportunity_cost.toFixed(1)}M USD en revenue diferido.` });
  }

  // Waterfall — valores puros (colores asignados en buildViewModel)
  const waterfall_raw = [
    { id: 'revenue',        label: 'Ingresos',         value:  revenue,        positive: true            },
    { id: 'cost_feed',      label: 'Alimentación',     value: -r.costo_alimento, positive: false          },
    { id: 'cost_sanitary',  label: 'Sanitario',        value: -r.costo_sanitario, positive: false         },
    { id: 'cost_other',     label: 'Otros costos',     value: -cost_fixed,     positive: false            },
    { id: 'result',         label: 'EBITDA',           value:  result_period,  positive: result_period >= 0 },
  ];

  return {
    result_period,
    revenue,
    cost_fixed,
    cost_variable,
    cost_total,
    margin_unit,
    opportunity_cost,
    kpis_raw,
    alerts_raw,
    waterfall_raw,
    // Extensiones salmon-specific
    _salmon: {
      costo_unitario_usd: r.costo_unitario,
      riesgo_sanitario:   r.riesgo_sanitario,
      delta_vs_base:      result_period - base_ebitda,
    },
  };
}

/**
 * CAPA 4: ViewModel.
 * ORIGEN: buildKPIs() + getDominantChain() de engine/kpi.js — integradas.
 * ADAPTACIÓN: Salmon no tenía buildViewModel() explícito; se crea conforme al contrato.
 */
function buildViewModel(simResult, economics, constraintsResult, inputs, assumptions, config = {}) {
  const labelMap = {
    throughput:          'Volumen vendible',
    process_efficiency:  'FCR',
    loss_pct:            'Pérdida de biomasa',
    pest_index:          'Presión sanitaria',
    unit_price:          'Precio USD/kg',
    result_period:       'EBITDA',
    resource_a:          'Biomasa cosechable',
    resource_b:          null,       // FRICCIÓN 1: no existe
    bottleneck:          'Driver de riesgo dominante',
  };

  // KPIs con labels del vertical
  const kpis = economics.kpis_raw.map(k => ({
    ...k,
    label: labelMap[k.label] ?? k.label,
    color: coreStateColor(k.state),
  }));

  // Waterfall con colores
  const waterfall = economics.waterfall_raw.map(w => ({
    ...w,
    color: w.positive
      ? (w.id === 'result' ? 'var(--color-warn, #d29922)' : 'var(--color-good, #3fb950)')
      : 'var(--color-bad, #f85149)',
  }));

  // Cadena causal dominante (de getDominantChain() en kpi.js)
  const a_int       = toInternalAssumptions(assumptions);
  const base_r      = _simulateInternal(toInternalInputs(SCENARIOS.base), a_int);
  const impact      = economics.result_period - base_r.ebitda;

  let dominant_chain = 'Todos los parámetros en niveles base.';
  if (inputs.loss_pct > SCENARIOS.base.loss_pct) {
    dominant_chain = 'Pérdida ↑ → Biomasa ↓ → Volumen ↓ → Ingreso ↓ → EBITDA ↓';
  } else if (inputs.process_efficiency > SCENARIOS.base.process_efficiency) {
    dominant_chain = 'FCR ↑ → Costo alimento ↑ → Margen ↓ → EBITDA ↓';
  } else if (inputs.pest_index > SCENARIOS.base.pest_index) {
    dominant_chain = 'Presión sanitaria ↑ → Costo sanitario ↑ → Margen ↓ → EBITDA ↓';
  } else if (inputs.unit_price > SCENARIOS.base.unit_price) {
    dominant_chain = 'Precio ↑ → Ingreso ↑ → Margen ↑ → EBITDA ↑';
  }

  const flags = {
    is_mode_private:  false,        // Salmon no tiene modo privado aún
    has_backlog:      simResult.backlog > 0,
    is_bottleneck_a:  constraintsResult.bottleneck === 'resource_a',
    is_bottleneck_b:  false,         // FRICCIÓN 1
    result_negative:  economics.result_period < 0,
    has_sanitary_risk: simResult.constraints_raw.risk_score > 60,
  };

  return {
    kpis,
    alerts: economics.alerts_raw,
    visuals: {
      waterfall,
      charts_config: [],
    },
    labels:  labelMap,
    flags,
    summary: {
      throughput:       simResult.throughput,
      backlog:          simResult.backlog,
      result_period:    economics.result_period,
      bottleneck:       constraintsResult.bottleneck_label,
      opportunity_cost: economics.opportunity_cost,
      dominant_chain,
      impact_vs_base:   impact,
    },
  };
}

/**
 * Análisis de sensibilidad.
 * ORIGEN: calculateSensitivity() + calculateMarginalImpacts() en engine/simulate.js.
 * ADAPTACIÓN: output → SensitivityItem[].
 */
function runSensitivityAnalysis(inputs, assumptions, config = {}) {
  const a_int = toInternalAssumptions(assumptions);
  const inp   = toInternalInputs(inputs);
  const r_base = _simulateInternal(inp, a_int);

  const LEVERS_SENS = [
    { key: 'process_efficiency', internalKey: 'fcr',   delta_pct: 0.10, risk_direction: 'up'   },
    { key: 'loss_pct',           internalKey: 'mort',  delta_pct: 0.10, risk_direction: 'up'   },
    { key: 'pest_index',         internalKey: 'calig', delta_pct: 0.10, risk_direction: 'up'   },
    { key: 'yield_pct',          internalKey: 'yield', delta_pct: 0.10, risk_direction: 'down' },
    { key: 'unit_price',         internalKey: 'price', delta_pct: 0.10, risk_direction: 'down' },
    { key: 'fx_rate',            internalKey: 'fx',    delta_pct: 0.10, risk_direction: 'down' },
  ];

  return LEVERS_SENS.map(lev => {
    const base_val = inputs[lev.key];
    const delta    = base_val * lev.delta_pct;

    const inp_up   = toInternalInputs({ ...inputs, [lev.key]: base_val + delta });
    const inp_down = toInternalInputs({ ...inputs, [lev.key]: base_val - delta });

    const r_up   = _simulateInternal(inp_up,   a_int);
    const r_down = _simulateInternal(inp_down, a_int);

    const sim_up   = toSimResult(r_up,   { ...inputs, [lev.key]: base_val + delta }, a_int);
    const sim_down = toSimResult(r_down, { ...inputs, [lev.key]: base_val - delta }, a_int);

    const eco_base = calculateEconomics(toSimResult(r_base, inputs, a_int), inputs, assumptions);
    const eco_up   = calculateEconomics(sim_up,   { ...inputs, [lev.key]: base_val + delta }, assumptions);
    const eco_down = calculateEconomics(sim_down, { ...inputs, [lev.key]: base_val - delta }, assumptions);

    return {
      lever:               lev.key,
      label:               LEVERS_META.find(m => m.id === lev.key)?.label ?? lev.key,
      delta_result_up:     eco_up.result_period   - eco_base.result_period,
      delta_result_down:   eco_down.result_period - eco_base.result_period,
      delta_throughput_up:  r_up.volumen_vendible   - r_base.volumen_vendible,
      delta_throughput_down: r_down.volumen_vendible - r_base.volumen_vendible,
      range_result:        Math.abs(eco_up.result_period - eco_down.result_period),
      risk_direction:      lev.risk_direction,
    };
  }).sort((a, b) => b.range_result - a.range_result);
}

/**
 * Impactos marginales — Plan de Acción.
 * ORIGEN: calculateMarginalImpacts() en engine/simulate.js.
 * ADAPTACIÓN: output → ActionItem[].
 */
function calculateMarginalImpacts(inputs, assumptions, config = {}) {
  const a_int = toInternalAssumptions(assumptions);

  const LEVERS_DEF = [
    { key: 'process_efficiency', label: 'Optimizar FCR',           apply: inp => ({ ...inp, process_efficiency: Math.max(1.0, inp.process_efficiency - 0.05) }), horizon: 'quick_win',  horizon_days: 14  },
    { key: 'loss_pct',           label: 'Reducir pérdida',         apply: inp => ({ ...inp, loss_pct:           Math.max(1,   inp.loss_pct - 1)           }), horizon: 'structural',  horizon_days: 30  },
    { key: 'pest_index',         label: 'Control de presión sanit.',apply: inp => ({ ...inp, pest_index:         Math.max(0,   inp.pest_index - 1)         }), horizon: 'quick_win',  horizon_days: 7   },
    { key: 'yield_pct',          label: 'Mejorar rendimiento',     apply: inp => ({ ...inp, yield_pct:          Math.min(95,  inp.yield_pct + 1)          }), horizon: 'structural',  horizon_days: 30  },
    { key: 'unit_price',         label: 'Gestión de precio',       apply: inp => ({ ...inp, unit_price:         inp.unit_price + 0.10                    }), horizon: 'quick_win',  horizon_days: 1   },
    { key: 'fx_rate',            label: 'Cobertura tipo de cambio', apply: inp => ({ ...inp, fx_rate:            inp.fx_rate + 10                         }), horizon: 'quick_win',  horizon_days: 1   },
  ];

  const r_base   = _simulateInternal(toInternalInputs(inputs), a_int);
  const eco_base = calculateEconomics(toSimResult(r_base, inputs, a_int), inputs, assumptions);

  return LEVERS_DEF.map((lev, idx) => {
    const modified_inputs = lev.apply(inputs);
    const r_mod   = _simulateInternal(toInternalInputs(modified_inputs), a_int);
    const eco_mod = calculateEconomics(toSimResult(r_mod, modified_inputs, a_int), modified_inputs, assumptions);

    const d_result   = eco_mod.result_period   - eco_base.result_period;
    const d_tp       = r_mod.volumen_vendible  - r_base.volumen_vendible;

    return {
      rank:             idx + 1,  // pre-sort; re-asignado post-sort
      lever:            lev.key,
      label:            lev.label,
      delta_result:     d_result,
      delta_throughput: d_tp,
      horizon:          lev.horizon,
      horizon_days:     lev.horizon_days,
      blocked:          false,    // Salmon no tiene concepto de cuello bloqueante como Health
      cost_impl:        null,     // Salmon no tiene LEVER_COSTS
      roi:              null,     // sin costo de implementación, no se puede calcular ROI
      payback_months:   null,
    };
  })
  .sort((a, b) => Math.abs(b.delta_result) - Math.abs(a.delta_result))
  .map((item, i) => ({ ...item, rank: i + 1 }));
}

/**
 * Monte Carlo.
 * ORIGEN: runMonteCarlo() en engine/simulate.js.
 * ADAPTACIÓN: output → MonteCarloResult.
 */
function runMonteCarlo(inputs, assumptions, options = {}, config = {}) {
  const a_int      = toInternalAssumptions(assumptions);
  const iterations = options.iterations ?? 1000;
  const defs       = options.variables ?? {};

  const varDefs = {
    unit_price: defs.unit_price ?? { min: inputs.unit_price * 0.85, mode: inputs.unit_price, max: inputs.unit_price * 1.15 },
    loss_pct:   defs.loss_pct   ?? { min: Math.max(1, inputs.loss_pct * 0.70), mode: inputs.loss_pct, max: inputs.loss_pct * 1.30 },
    process_efficiency: defs.process_efficiency ?? { min: inputs.process_efficiency * 0.90, mode: inputs.process_efficiency, max: inputs.process_efficiency * 1.10 },
    fx_rate:    defs.fx_rate    ?? { min: inputs.fx_rate * 0.92, mode: inputs.fx_rate, max: inputs.fx_rate * 1.08 },
  };

  const ebitdas  = [];
  const margenes = [];
  const volumes  = [];

  for (let i = 0; i < iterations; i++) {
    const noisy = {
      ...inputs,
      unit_price:          coreTriangular(varDefs.unit_price.min, varDefs.unit_price.mode, varDefs.unit_price.max),
      loss_pct:            coreTriangular(varDefs.loss_pct.min,   varDefs.loss_pct.mode,   varDefs.loss_pct.max),
      process_efficiency:  coreTriangular(varDefs.process_efficiency.min, varDefs.process_efficiency.mode, varDefs.process_efficiency.max),
      fx_rate:             coreTriangular(varDefs.fx_rate.min,    varDefs.fx_rate.mode,    varDefs.fx_rate.max),
    };

    const r   = _simulateInternal(toInternalInputs(noisy), a_int);
    const sim = toSimResult(r, noisy, a_int);
    const eco = calculateEconomics(sim, noisy, assumptions);

    ebitdas.push(eco.result_period);
    margenes.push(r.margen);
    volumes.push(r.volumen_vendible);
  }

  const hist = coreHistogram(ebitdas, 20);

  return {
    p10:           corePercentile(ebitdas, 10),
    p50:           corePercentile(ebitdas, 50),
    p90:           corePercentile(ebitdas, 90),
    prob_negative: ebitdas.filter(v => v < 0).length / iterations,
    bins:          hist.bins,
    iterations,
    drivers_used:  Object.keys(varDefs),
    // Extensiones salmon-specific
    _salmon: {
      volume_p10:  corePercentile(volumes, 10),
      volume_p50:  corePercentile(volumes, 50),
      volume_p90:  corePercentile(volumes, 90),
      margin_p10:  corePercentile(margenes, 10),
      margin_p50:  corePercentile(margenes, 50),
      margin_p90:  corePercentile(margenes, 90),
    },
  };
}

/**
 * Comparación de escenarios.
 * ORIGEN: compareScenarios() en engine/simulate.js.
 * ADAPTACIÓN: output → ScenarioResult[].
 */
function compareScenarios(scenarios, assumptions, config = {}) {
  const a_int   = toInternalAssumptions(assumptions);
  const base_sc = scenarios.find(s => s.name === 'base') ?? scenarios[0];
  const base_r  = _simulateInternal(toInternalInputs(base_sc.inputs), a_int);
  const base_sim = toSimResult(base_r, base_sc.inputs, a_int);
  const base_eco = calculateEconomics(base_sim, base_sc.inputs, assumptions);

  return scenarios.map(sc => {
    const r   = _simulateInternal(toInternalInputs(sc.inputs), a_int);
    const sim = toSimResult(r, sc.inputs, a_int);
    const eco = calculateEconomics(sim, sc.inputs, assumptions);
    const cns = constraints(sim, sc.inputs, assumptions);
    return {
      name:          sc.name,
      inputs:        sc.inputs,
      sim,
      eco,
      constraints:   cns,
      delta_vs_base: eco.result_period - base_eco.result_period,
    };
  });
}

/**
 * Estimación rápida de riesgo — salmon-specific.
 * ORIGEN: estimateRiskBand() en engine/kpi.js.
 * NOTA: Esta función NO es parte del core obligatorio.
 *       Solo AquaEye la implementa.
 */
function estimateRiskBand(inputs, assumptions) {
  const drivers = [];
  let score = 0;

  if (inputs.loss_pct > 12) {
    drivers.push(`Pérdida crítica (${inputs.loss_pct.toFixed(0)}%)`); score += 2;
  } else if (inputs.loss_pct > 9) {
    drivers.push(`Pérdida elevada (${inputs.loss_pct.toFixed(0)}%)`); score += 1;
  }
  if (inputs.pest_index > 5) {
    drivers.push(`Presión sanitaria crítica (idx ${inputs.pest_index.toFixed(1)})`); score += 2;
  } else if (inputs.pest_index > 3) {
    drivers.push(`Presión sanitaria (idx ${inputs.pest_index.toFixed(1)})`); score += 1;
  }
  if (inputs.unit_price < 5.0) {
    drivers.push(`Precio bajo (${inputs.unit_price.toFixed(2)} USD/kg)`); score += 2;
  } else if (inputs.unit_price < 5.5) {
    drivers.push(`Precio bajo base ($${inputs.unit_price.toFixed(2)}/kg)`); score += 1;
  }
  if (inputs.process_efficiency > 1.6) {
    drivers.push(`FCR elevado (${inputs.process_efficiency.toFixed(2)})`); score += 1;
  }
  if (inputs.yield_pct < 78) {
    drivers.push(`Rendimiento crítico (${inputs.yield_pct}%)`); score += 1;
  }

  let risk_level;
  if (score >= 4)      risk_level = 'HIGH';
  else if (score >= 2) risk_level = 'MEDIUM';
  else                 risk_level = 'LOW';

  return { risk_level, drivers };
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 6 — EXPORTACIÓN DEL VERTICAL
// ═══════════════════════════════════════════════════════════════════

export const VerticalSalmon = {
  meta,
  DEFAULT_ASSUMPTIONS,
  SCENARIOS,
  LEVERS_META,
  simulate,
  constraints,
  calculateEconomics,
  buildViewModel,
  runSensitivityAnalysis,
  calculateMarginalImpacts,
  runMonteCarlo,
  compareScenarios,
  projectBacklog:   () => null,   // No implementado en Salmon
  estimateRiskBand,
};
