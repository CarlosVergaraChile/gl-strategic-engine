/**
 * vertical-health.js
 * GL Strategic — Implementación del contrato para HealthEye
 *
 * MAPA DE NAMING: hospitalario → neutral
 * ─────────────────────────────────────────────────────────────
 *  cirugias_mes          → throughput
 *  cap_pab               → throughput_cap_a  (capacidad recurso A: pabellones)
 *  cap_camas             → throughput_cap_b  (capacidad recurso B: camas post-op)
 *  delta_lista           → backlog           (Δ lista de espera mensual)
 *  lista_espera_stock    → backlog_stock      (stock acumulado)
 *  cuello_de_botella     → bottleneck        (en constraints())
 *  h_efectivas           → resource_usage.resource_a_effective_hours
 *  pabellones_activos    → inputs.resource_count
 *  suspension            → inputs.waste_pct  (porcentaje de pérdida operativa)
 *  ocupacion             → inputs.utilization_pct
 *  duracion_media        → inputs.unit_duration
 *  recambio              → inputs.changeover_time
 *  camas_disponibles     → inputs.resource_b_count
 *  estancia_media_dias   → inputs.resource_b_usage_rate
 *  demanda_mes           → inputs.demand
 *  resultado_mes         → economics.result_period (M CLP)
 *  arancel_fonasa        → inputs.unit_price
 *
 * FUNCIONES ACTUALES vs CONTRATO:
 * ─────────────────────────────────────────────────────────────
 *  simulate()               → SE REUTILIZA. Output renombrado a SimResult.
 *  constraints()            → NUEVA. Extrae lógica de cuello de simulate().
 *  calculatePublicEconomics → SE REUTILIZA. Expuesta como calculateEconomics(mode='public').
 *  calculatePrivateEconomics→ SE REUTILIZA. Expuesta como calculateEconomics(mode='private').
 *  buildViewModel()         → SE REUTILIZA. Firma adaptada al contrato.
 *  applyContext()           → SE INTEGRA dentro de buildViewModel().
 *  calculateMarginalImpacts → SE REUTILIZA. Output mapeado a ActionItem[].
 *  findMinDelta()           → SE REUTILIZA internamente.
 *  runSensitivityAnalysis() → SE REUTILIZA. Output mapeado a SensitivityItem[].
 *  runMonteCarlo()          → SE REUTILIZA. Output mapeado a MonteCarloResult.
 *  compareScenarios()       → SE REUTILIZA. Output mapeado a ScenarioResult[].
 *  projectWaitlist()        → SE REUTILIZA como projectBacklog() — health-specific.
 *  getDecisionRecommendation→ REQUIERE ADAPTACIÓN (hoy lee currentInputs global).
 *  applyCSVData()           → QUEDA EN SHELL (manipula DOM y currentInputs global).
 *  render()                 → QUEDA EN SHELL.
 *  todos los renderers DOM  → QUEDAN EN SHELL.
 *
 * DEUDA TÉCNICA IDENTIFICADA (NO modificar aquí, registrar):
 * ─────────────────────────────────────────────────────────────
 *  ⚠️  APP_MODE es global — debe convertirse en parámetro config.mode
 *  ⚠️  currentInputs es global — debe gestionarse en Shell
 *  ⚠️  ACTIVE_ASSUMPTIONS es global — debe gestionarse en Shell
 *  ⚠️  waterfall construido dentro de calculatePublicEconomics — mezcla cálculo+presentación
 *  ⚠️  getDecisionRecommendation() lee currentInputs directamente
 *  ⚠️  runMonteCarloCached() usa _mcCache global — no thread-safe
 *  ⚠️  renderTornadoChart() lee currentInputs directamente en varios puntos
 */

import {
  VerticalContract,
  corePercentile,
  coreRandNormal,
  coreHistogram,
  coreStateColor,
} from './vertical-contract.js';

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 1 — METADATOS
// ═══════════════════════════════════════════════════════════════════

const meta = {
  id:              'health',
  name:            'HealthEye',
  version:         '1.0.0',
  currency:        'CLP',
  period:          'month',
  throughput_unit: 'procedures',   // neutral — en UI se muestra 'cx/mes'
};

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 2 — ASSUMPTIONS Y ESCENARIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Assumptions por defecto.
 * ORIGEN: DEFAULT_ASSUMPTIONS en index.html, líneas 1625-1651.
 * Sin cambios de valores — solo naming interno preservado para compatibilidad
 * con las funciones de HealthEye que aún se reutilizan.
 *
 * FRICCIÓN DETECTADA:
 *   Las claves aquí son hospitalarias (camas_postop_default, pabellones_dotados, etc.)
 *   porque las funciones de simulate() y calculateEconomics() existentes las leen directamente.
 *   Para aislar completamente esto, se necesitaría refactor de simulate() — FUERA DEL ALCANCE.
 *   La estrategia es mapear solo en los boundaries (inputs → contrato, contrato → UI).
 */
const DEFAULT_ASSUMPTIONS = {
  // ── Capacidad operativa
  pabellones_dotados:              6,
  dias_habiles_mes:                22,
  horas_turno:                     8,
  turnos_dia:                      1,
  // ── Costos
  costo_rrhh_fijo_mes:             85_000_000,   // CLP/mes — cost_fixed en el contrato
  costo_variable_cirugia:          280_000,       // CLP/cx  — cost_variable_unit
  // ── Presupuesto y aranceles
  presupuesto_dipres_mes:          120_000_000,   // CLP/mes — base_revenue
  arancel_fonasa_default:          420_000,       // CLP/cx
  // ── Demanda y lista de espera
  demanda_quirurgica_mes:          180,           // demanda de referencia
  lista_espera_inicial:            1240,          // backlog_stock inicial
  // ── Recurso B (camas post-op)
  camas_postop_default:            20,
  estancia_media_default:          3.0,           // días
  // ── Modelo económico público
  produccion_comprometida_mes:     160,           // threshold de producción comprometida
  factor_pago_sobreproduccion:     0.3,
  factor_penalidad_subejercicio:   0.0,
  // ── Modelo económico privado (mix pagador)
  mix_isapre:                      0.5,
  mix_fonasa_le:                   0.3,
  mix_particular:                  0.2,
  precio_isapre:                   900_000,
  precio_fonasa_le:                500_000,
  precio_particular:               700_000,
  costo_hora_pabellon:             150_000,
  duracion_promedio_horas:         1.6,
};

/**
 * Escenarios predefinidos.
 * ORIGEN: SCENARIOS en index.html, líneas 1659-1664.
 *
 * NOTA: Los inputs aquí usan naming hospitalario interno.
 * El mapeo a naming neutral se hace en los boundaries de cada función.
 *
 * FRICCIÓN DETECTADA:
 *   Las claves son específicas del dominio hospitalario.
 *   Para el contrato, se exponen como VerticalInputs y la UI
 *   usa LEVERS_META para saber cómo renderizarlos.
 */
const SCENARIOS = {
  base: {
    resource_count:       4,    // pabellones_activos
    waste_pct:            15,   // suspension
    unit_duration:        95,   // duracion_media (min)
    changeover_time:      20,   // recambio (min)
    utilization_pct:      78,   // ocupacion
    unit_price:           420_000, // arancel_fonasa
    demand:               180,  // demanda_mes
    resource_b_count:     20,   // camas_disponibles
    resource_b_usage_rate: 3.0, // estancia_media_dias
  },
  optimizado: {
    resource_count:       4,
    waste_pct:            8,
    unit_duration:        90,
    changeover_time:      15,
    utilization_pct:      88,
    unit_price:           420_000,
    demand:               180,
    resource_b_count:     25,
    resource_b_usage_rate: 2.5,
  },
  expansion: {
    resource_count:       6,
    waste_pct:            10,
    unit_duration:        90,
    changeover_time:      18,
    utilization_pct:      85,
    unit_price:           420_000,
    demand:               180,
    resource_b_count:     30,
    resource_b_usage_rate: 2.8,
  },
};

/**
 * Metadatos de palancas para construcción de sliders en el Shell.
 * ORIGEN: Derivado de los inputs de simulate() y los rangos de los sliders del HTML.
 */
const LEVERS_META = [
  { id: 'resource_count',        label: 'Recursos A activos',    unit: '',    min: 1,  max: 12,  step: 1,   base: 4  },
  { id: 'waste_pct',             label: 'Tasa de pérdida (%)',   unit: '%',   min: 0,  max: 50,  step: 1,   base: 15 },
  { id: 'unit_duration',         label: 'Duración por unidad',   unit: 'min', min: 20, max: 180, step: 1,   base: 95 },
  { id: 'changeover_time',       label: 'Tiempo de recambio',    unit: 'min', min: 0,  max: 60,  step: 1,   base: 20 },
  { id: 'utilization_pct',       label: 'Utilización (%)',       unit: '%',   min: 40, max: 98,  step: 1,   base: 78 },
  { id: 'resource_b_count',      label: 'Recursos B disp.',      unit: '',    min: 5,  max: 100, step: 1,   base: 20 },
  { id: 'resource_b_usage_rate', label: 'Tasa de uso recurso B', unit: 'd',   min: 0.5,max: 14,  step: 0.5, base: 3.0},
  { id: 'demand',                label: 'Demanda del período',   unit: '/mes',min: 50, max: 400, step: 10,  base: 180},
  { id: 'unit_price',            label: 'Precio por unidad',     unit: 'CLP', min: 100_000, max: 1_000_000, step: 10_000, base: 420_000 },
];

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 3 — ADAPTADOR DE INPUTS
// Traduce entre naming neutral (contrato) y naming interno (motor existente)
// ═══════════════════════════════════════════════════════════════════

/**
 * Convierte VerticalInputs (naming neutral) → inputs internos HealthEye.
 * Necesario porque simulate() existente lee claves hospitalarias.
 *
 * @param {Object} inputs  - VerticalInputs con naming neutral
 * @returns {Object}        - inputs con naming hospitalario interno
 */
function toInternalInputs(inputs) {
  return {
    pabellones_activos:   inputs.resource_count,
    suspension:           inputs.waste_pct,
    duracion_media:       inputs.unit_duration,
    recambio:             inputs.changeover_time,
    ocupacion:            inputs.utilization_pct,
    arancel_fonasa:       inputs.unit_price,
    demanda_mes:          inputs.demand,
    camas_disponibles:    inputs.resource_b_count,
    estancia_media_dias:  inputs.resource_b_usage_rate,
    // Flags internos — transparentes para el contrato
    _modo_extension:      inputs._extended_mode ?? false,
  };
}

/**
 * Convierte resultado interno de simulate() → SimResult neutral.
 *
 * @param {Object} r        - Resultado interno de simulate() HealthEye
 * @returns {SimResult}
 */
function toSimResult(r) {
  return {
    throughput:         r.cirugias_mes,
    throughput_cap_a:   r.cap_pab,
    throughput_cap_b:   r.cap_camas,
    backlog:            r.delta_lista,
    backlog_stock:      r.lista_espera_stock,
    resource_usage: {
      resource_a_effective_hours: r.h_efectivas,
    },
    constraints_raw: {
      cap_a:            r.cap_pab,
      cap_b:            r.cap_camas,
      bottleneck_raw:   r.cuello_de_botella,  // 'PABELLÓN' | 'CAMAS'
    },
    drivers: {
      // Campos internos que aún consumen las funciones de economics
      // Se preservan para no romper calculateEconomics hasta refactor
      _internal: r,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 4 — MOTOR INTERNO (función pura — extraída de index.html)
// ORIGEN: simulate() en index.html líneas 1689-1731
// Sin modificaciones funcionales — solo documentación del mapping
// ═══════════════════════════════════════════════════════════════════

/**
 * Motor interno de simulación HealthEye.
 * Recibe inputs CON naming hospitalario interno.
 * Usado internamente — el contrato expone simulate() con naming neutral.
 *
 * FRICCIÓN DETECTADA:
 *   Este motor mezcla lógica operativa (throughput) con lógica de costos
 *   (costo_fijo, costo_variable, presupuesto_base).
 *   El contrato separa esto: SimResult no debe tener financiero.
 *   Por ahora se preservan los campos financieros en _internal para
 *   compatibilidad con calculateEconomics — se deben eliminar en refactor.
 */
function _simulateInternal(internalInputs, a) {
  const {
    pabellones_activos, suspension, duracion_media, recambio, ocupacion,
    demanda_mes,
    camas_disponibles   = a.camas_postop_default,
    estancia_media_dias = a.estancia_media_default,
  } = internalInputs;

  const factor_extension = internalInputs._modo_extension ? 1.5 : 1.0;

  // ── Cadena operativa (throughput)
  const horas_brutas  = pabellones_activos * a.horas_turno * a.turnos_dia * a.dias_habiles_mes * factor_extension;
  const h_efectivas   = horas_brutas * (ocupacion / 100) * (1 - suspension / 100);
  const cap_pab       = Math.floor(h_efectivas * 60 / (duracion_media + recambio));
  const cap_camas     = Math.floor((camas_disponibles * a.dias_habiles_mes) / estancia_media_dias);
  const cirugias_mes  = Math.min(cap_pab, cap_camas);

  const delta_lista   = demanda_mes - cirugias_mes;
  const cuello        = cap_pab <= cap_camas ? 'PABELLÓN' : 'CAMAS';

  // ── Económicos internos (FRICCIÓN: no deberían estar en simulate)
  // Se preservan en _internal hasta refactor de calculateEconomics
  const costo_fijo      = a.costo_rrhh_fijo_mes;
  const costo_variable  = cirugias_mes * a.costo_variable_cirugia;
  const presupuesto_base = a.presupuesto_dipres_mes;

  return {
    h_efectivas,
    cap_pab,
    cap_camas,
    cirugias_mes,
    delta_lista,
    cuello_de_botella:   cuello,
    lista_espera_stock:  a.lista_espera_inicial + delta_lista,
    // Económicos — solo para compatibilidad interna con calculateEconomics
    costo_fijo,
    costo_variable,
    presupuesto_base,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 5 — IMPLEMENTACIÓN DEL CONTRATO
// ═══════════════════════════════════════════════════════════════════

/**
 * CAPA 1: Motor de simulación — interfaz del contrato.
 * Traduce inputs neutrales → internos → SimResult neutral.
 */
function simulate(inputs, assumptions) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const internal = toInternalInputs(inputs);
  const r = _simulateInternal(internal, a);
  return toSimResult(r);
}

/**
 * CAPA 2: Restricciones — identifica cuello de botella.
 * ORIGEN: Lógica extraída de _simulateInternal() y de la propiedad `cuello`.
 * ADAPTACIÓN REQUERIDA: En el motor actual, el cuello se calcula dentro de simulate.
 * Aquí se re-interpreta desde constraints_raw sin re-ejecutar el motor.
 */
function constraints(simResult, inputs, assumptions) {
  const raw = simResult.constraints_raw;

  // El cuello en HealthEye es el recurso que tiene MENOR capacidad
  const bottleneck = raw.bottleneck_raw === 'PABELLÓN' ? 'resource_a' : 'resource_b';

  const bottleneck_label = raw.bottleneck_raw === 'PABELLÓN'
    ? 'Recurso A (capacidad de proceso)'
    : 'Recurso B (capacidad de alojamiento)';

  const violations = [];

  // Violación: demanda supera throughput
  if (simResult.backlog > 0) {
    violations.push({
      resource:  'throughput',
      limit:     inputs.demand,
      actual:    simResult.throughput,
      severity:  simResult.backlog > inputs.demand * 0.1 ? 'high' : 'medium',
      label:     'Demanda supera capacidad de producción',
    });
  }

  // Violación: recurso A es cuello
  if (bottleneck === 'resource_a' && raw.cap_a < raw.cap_b) {
    violations.push({
      resource:  'resource_a',
      limit:     raw.cap_b,
      actual:    raw.cap_a,
      severity:  'medium',
      label:     'Recurso A limita antes que Recurso B',
    });
  }

  // Violación: recurso B es cuello
  if (bottleneck === 'resource_b' && raw.cap_b < raw.cap_a) {
    violations.push({
      resource:  'resource_b',
      limit:     raw.cap_a,
      actual:    raw.cap_b,
      severity:  'medium',
      label:     'Recurso B limita antes que Recurso A',
    });
  }

  return {
    bottleneck,
    bottleneck_label,
    capacity_limits: {
      resource_a: raw.cap_a,
      resource_b: raw.cap_b,
    },
    violations,
  };
}

/**
 * CAPA 3: Economía — router por modo institucional.
 * ORIGEN: calculateEconomics() en index.html línea 3048.
 * ADAPTACIÓN: modo recibido como config.mode en lugar de APP_MODE global.
 *
 * FRICCIÓN DETECTADA:
 *   Las funciones internas aún construyen waterfall[] con colores CSS hardcodeados
 *   (var(--teal), var(--red), etc.). Esto mezcla presentación con cálculo.
 *   El contrato separa waterfall_raw (valores) de colores (responsabilidad del Shell).
 *   Por ahora se preserva la estructura actual en _raw y se expone limpia.
 */
function calculateEconomics(simResult, inputs, assumptions, config = {}) {
  const mode = config.mode ?? 'public';   // 'public' | 'private'
  const a    = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const r    = simResult.drivers._internal; // compatibilidad con motor existente

  if (mode === 'private') {
    return _calculatePrivateEconomics(r, inputs, a);
  }
  return _calculatePublicEconomics(r, inputs, a);
}

/**
 * Economía pública.
 * ORIGEN: calculatePublicEconomics() en index.html línea 2883.
 * ADAPTACIÓN: inputs recibidos como neutrales, se accede a unit_price.
 * FRICCIÓN: construye waterfall con colores — mezclado con presentación.
 */
function _calculatePublicEconomics(r, inputs, a) {
  const arancel     = inputs.unit_price ?? a.arancel_fonasa_default;
  const comprometidas = a.produccion_comprometida_mes;
  const cx          = r.cirugias_mes;

  const produccion_pagada  = Math.min(cx, comprometidas);
  const sobreproduccion    = Math.max(0, cx - comprometidas);
  const subejercicio       = Math.max(0, comprometidas - cx);

  const ingreso_comprometido = produccion_pagada * arancel;
  const ingreso_sobreprod    = sobreproduccion * arancel * a.factor_pago_sobreproduccion;
  const penalidad_subej      = subejercicio * arancel * a.factor_penalidad_subejercicio;
  const revenue              = ingreso_comprometido + ingreso_sobreprod - penalidad_subej;

  const cost_fixed    = r.costo_fijo;
  const cost_variable = r.costo_variable;
  const cost_total    = cost_fixed + cost_variable;
  const result_period = parseFloat(((r.presupuesto_base + revenue - cost_total) / 1e6).toFixed(2));

  const demand        = inputs.demand || 1;
  const coverage      = cx / demand;
  const opportunity_cost = Math.round(r.delta_lista) > 0
    ? Math.round(r.delta_lista) * arancel / 1e6
    : 0;

  // KPIs — estructura neutral del contrato
  const kpis_raw = [
    {
      key:   'throughput',
      label: 'throughput',      // Shell usa labelMap para texto final
      val:   cx,
      unit:  'u/period',
      state: coverage >= 1 ? 'good' : coverage >= 0.9 ? 'warn' : 'bad',
    },
    {
      key:   'backlog',
      label: 'backlog',
      val:   (r.delta_lista > 0 ? '+' : '') + Math.round(r.delta_lista),
      unit:  'u/period',
      state: r.delta_lista < 0 ? 'good' : r.delta_lista === 0 ? 'warn' : 'bad',
    },
    {
      key:   'result',
      label: 'result_period',
      val:   result_period.toFixed(1),
      unit:  'M CLP',
      state: result_period >= 5 ? 'good' : result_period >= 0 ? 'warn' : 'bad',
    },
    {
      key:   'bottleneck',
      label: 'bottleneck',
      val:   r.cuello_de_botella,
      unit:  '',
      state: 'warn',
    },
  ];

  // Alertas — texto sigue siendo español; el vertical lo gestiona
  const alerts_raw = [];
  if (sobreproduccion > 0) {
    alerts_raw.push({
      type: 'warn',
      msg:  `Sobreproducción: ${Math.round(sobreproduccion)} u sobre umbral. Ingreso adicional al ${Math.round(a.factor_pago_sobreproduccion * 100)}% — diferencia no financiada: ${((sobreproduccion * arancel * (1 - a.factor_pago_sobreproduccion)) / 1e6).toFixed(1)}M CLP/mes.`,
    });
  }
  if (subejercicio > 0) {
    alerts_raw.push({
      type: a.factor_penalidad_subejercicio > 0 ? 'alert' : 'warn',
      msg:  `Subejecución: ${Math.round(subejercicio)} u bajo umbral comprometido. ${a.factor_penalidad_subejercicio > 0 ? `Penalidad: ${(penalidad_subej / 1e6).toFixed(1)}M CLP/mes.` : 'Sin penalidad directa.'}`,
    });
  }
  if (result_period < 0) {
    alerts_raw.push({
      type: 'alert',
      msg:  `Resultado operacional negativo: ${result_period.toFixed(1)}M CLP/mes.`,
    });
  }

  // Waterfall — FRICCIÓN: valores + estructura presentación mezclados
  // Se expone waterfall_raw con valores puros; colores son responsabilidad del Shell
  const toM = v => v / 1e6;
  const waterfall_raw = [
    { id: 'base_budget',   label: 'Presupuesto base', value:  toM(r.presupuesto_base), positive: true  },
    { id: 'revenue_var',   label: 'Ingreso variable', value:  toM(revenue),            positive: revenue >= 0 },
    { id: 'cost_fixed',    label: 'Costo fijo',       value: -toM(cost_fixed),          positive: false },
    { id: 'cost_variable', label: 'Costo variable',   value: -toM(cost_variable),       positive: false },
    { id: 'result',        label: 'Resultado',         value:  result_period,            positive: result_period >= 0 },
  ];

  return {
    result_period,
    revenue:           revenue / 1e6,
    cost_fixed:        cost_fixed / 1e6,
    cost_variable:     cost_variable / 1e6,
    cost_total:        cost_total / 1e6,
    margin_unit:       (revenue - cost_total) / Math.max(cx, 1),
    opportunity_cost,
    kpis_raw,
    alerts_raw,
    waterfall_raw,
    // Campos extra del vertical público (no en el contrato base)
    _health: { sobreproduccion, subejercicio, coverage },
  };
}

/**
 * Economía privada.
 * ORIGEN: calculatePrivateEconomics() en index.html línea 2976.
 * ADAPTACIÓN: mismo patrón que _calculatePublicEconomics.
 */
function _calculatePrivateEconomics(r, inputs, a) {
  const cx = r.cirugias_mes;

  const ingreso_promedio = (a.mix_isapre * a.precio_isapre)
    + (a.mix_fonasa_le * a.precio_fonasa_le)
    + (a.mix_particular * a.precio_particular);

  const revenue       = cx * ingreso_promedio;
  const cost_variable = cx * (a.costo_hora_pabellon * a.duracion_promedio_horas);
  const cost_fixed    = a.costo_rrhh_fijo_mes;
  const cost_total    = cost_fixed + cost_variable;
  const result_period = parseFloat(((revenue - cost_total) / 1e6).toFixed(2));

  const horas_totales     = Math.max(r.h_efectivas, 1);
  const revenue_per_hour  = revenue / horas_totales;
  const margin_unit       = ingreso_promedio - (a.costo_hora_pabellon * a.duracion_promedio_horas);
  const demand            = inputs.demand || 0;
  const opportunity_cost  = Math.max(0, demand - cx) * ingreso_promedio / 1e6;

  const kpis_raw = [
    { key: 'throughput', label: 'throughput', val: cx,                               unit: 'u/period', state: 'good' },
    { key: 'rev_hour',   label: 'rev_per_hour', val: Math.round(revenue_per_hour / 1000) + 'K', unit: '$/h', state: 'good' },
    { key: 'margin',     label: 'margin_unit', val: Math.round(margin_unit / 1000) + 'K', unit: '$/u', state: margin_unit > 0 ? 'good' : 'bad' },
    { key: 'result',     label: 'result_period', val: parseFloat(result_period.toFixed(1)), unit: 'M CLP', state: result_period > 0 ? 'good' : 'bad' },
  ];

  const alerts_raw = [
    ...(margin_unit < 0
      ? [{ type: 'alert', msg: 'Margen por unidad negativo — costo de proceso supera ingreso promedio.' }]
      : []),
    ...(opportunity_cost > 0
      ? [{ type: 'warn', msg: `Backlog sin atender → ${opportunity_cost.toFixed(1)}M en ingreso no capturado.` }]
      : []),
  ];

  const waterfall_raw = [
    { id: 'revenue',       label: 'Ingresos',      value:  revenue / 1e6,       positive: true  },
    { id: 'cost_fixed',    label: 'Costo fijo',    value: -cost_fixed / 1e6,    positive: false },
    { id: 'cost_variable', label: 'Costo variable', value: -cost_variable / 1e6, positive: false },
    { id: 'result',        label: 'Resultado',      value:  result_period,       positive: result_period >= 0 },
  ];

  return {
    result_period,
    revenue:      revenue / 1e6,
    cost_fixed:   cost_fixed / 1e6,
    cost_variable: cost_variable / 1e6,
    cost_total:   cost_total / 1e6,
    margin_unit,
    opportunity_cost,
    kpis_raw,
    alerts_raw,
    waterfall_raw,
    _health: { revenue_per_hour, ingreso_promedio },
  };
}

/**
 * CAPA 4: ViewModel — ensamblado para consumo UI.
 * ORIGEN: buildViewModel() + applyContext() en index.html líneas 3079-3212.
 * ADAPTACIÓN: firma ajustada al contrato; modo recibido como config.mode.
 *
 * FRICCIÓN DETECTADA:
 *   applyContext() en el original depende de isPrivado() que lee APP_MODE global.
 *   Aquí se recibe mode como parámetro de config — sin estado global.
 */
function buildViewModel(simResult, economics, constraintsResult, inputs, assumptions, config = {}) {
  const mode = config.mode ?? 'public';

  // Labels — mapa dependiente del modo institucional
  const labelMap = mode === 'private'
    ? {
        throughput:   'Producción',
        backlog:      'Revenue no capturado',
        result:       'Margen mensual',
        resource_a:   'Capacidad de proceso',
        resource_b:   'Capacidad de alojamiento',
        bottleneck:   'Cuello de proceso',
      }
    : {
        throughput:   'Producción',
        backlog:      'Δ Lista',
        result:       'Resultado Op.',
        resource_a:   'Cap. Proceso',
        resource_b:   'Cap. Alojamiento',
        bottleneck:   'Cuello',
      };

  // KPIs — aplicar labels del vertical
  const kpis = economics.kpis_raw.map(k => ({
    ...k,
    label: labelMap[k.label] ?? k.label,
    color: coreStateColor(k.state),
  }));

  // Waterfall — colores asignados aquí (boundary presentación)
  const waterfall = economics.waterfall_raw.map(w => ({
    ...w,
    color: w.positive
      ? (w.id === 'result' ? 'var(--color-warn, #d29922)' : 'var(--color-good, #3fb950)')
      : 'var(--color-bad, #f85149)',
  }));

  // Flags
  const flags = {
    is_mode_private:  mode === 'private',
    has_backlog:      simResult.backlog > 0,
    is_bottleneck_a:  constraintsResult.bottleneck === 'resource_a',
    is_bottleneck_b:  constraintsResult.bottleneck === 'resource_b',
    result_negative:  economics.result_period < 0,
  };

  // Resumen ejecutivo (derivado del ViewModel, no del engine)
  const summary = {
    throughput:       simResult.throughput,
    backlog:          simResult.backlog,
    result_period:    economics.result_period,
    bottleneck:       constraintsResult.bottleneck_label,
    opportunity_cost: economics.opportunity_cost,
  };

  return {
    kpis,
    alerts: economics.alerts_raw,
    visuals: {
      waterfall,
      charts_config: [],  // placeholder para futuras visualizaciones
    },
    labels:  labelMap,
    flags,
    summary,
  };
}

/**
 * Análisis de sensibilidad (datos para Tornado).
 * ORIGEN: runSensitivityAnalysis() en index.html línea 3538.
 * ADAPTACIÓN: inputs neutrales → internos; output → SensitivityItem[].
 */
function runSensitivityAnalysis(inputs, assumptions, config = {}) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const internal = toInternalInputs(inputs);
  const r_base   = _simulateInternal(internal, a);
  const eco_base = calculateEconomics(toSimResult(r_base), inputs, a, config);

  const LEVERS_SENS = [
    { key: 'resource_count',        internalKey: 'pabellones_activos', pct: true,  risk_direction: 'down' },
    { key: 'waste_pct',             internalKey: 'suspension',         pct: true,  risk_direction: 'up'   },
    { key: 'unit_duration',         internalKey: 'duracion_media',     pct: true,  risk_direction: 'up'   },
    { key: 'changeover_time',       internalKey: 'recambio',           pct: true,  risk_direction: 'up'   },
    { key: 'resource_b_count',      internalKey: 'camas_disponibles',  pct: true,  risk_direction: 'down' },
    { key: 'demand',                internalKey: 'demanda_mes',        pct: true,  risk_direction: 'up'   },
  ];

  return LEVERS_SENS.map(lev => {
    const baseVal = inputs[lev.key] ?? internal[lev.internalKey];
    const delta   = lev.pct ? baseVal * 0.10 : 1;

    const inUp   = { ...inputs, [lev.key]: baseVal + delta };
    const inDown = { ...inputs, [lev.key]: baseVal - delta };

    const rUp   = _simulateInternal(toInternalInputs(inUp),   a);
    const rDown = _simulateInternal(toInternalInputs(inDown), a);

    const eco_up   = calculateEconomics(toSimResult(rUp),   inUp,   a, config);
    const eco_down = calculateEconomics(toSimResult(rDown), inDown, a, config);

    const delta_result_up    = eco_up.result_period   - eco_base.result_period;
    const delta_result_down  = eco_down.result_period - eco_base.result_period;
    const delta_tp_up        = rUp.cirugias_mes   - r_base.cirugias_mes;
    const delta_tp_down      = rDown.cirugias_mes - r_base.cirugias_mes;

    return {
      lever:               lev.key,
      label:               LEVERS_META.find(m => m.id === lev.key)?.label ?? lev.key,
      delta_result_up,
      delta_result_down,
      delta_throughput_up:  delta_tp_up,
      delta_throughput_down: delta_tp_down,
      range_result:         Math.abs(delta_result_up - delta_result_down),
      risk_direction:       lev.risk_direction,
    };
  }).sort((a, b) => b.range_result - a.range_result);
}

/**
 * Impactos marginales — base del Plan de Acción.
 * ORIGEN: calculateMarginalImpacts() en index.html línea 1947.
 * ADAPTACIÓN: output → ActionItem[].
 *
 * FRICCIÓN DETECTADA:
 *   LEVER_COSTS tiene naming hospitalario interno (suspension, ocupacion, etc.)
 *   Se preserva internamente y se mapea al output neutral.
 */
function calculateMarginalImpacts(inputs, assumptions, config = {}) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };

  // Costos de implementación por palanca — específico del vertical HealthEye
  const LEVER_COSTS = {
    waste_pct:            { cost_impl: 500_000,     cost_per_period: 150_000,  horizon: 'quick_win',   horizon_days: 30  },
    utilization_pct:      { cost_impl: 1_200_000,   cost_per_period: 400_000,  horizon: 'quick_win',   horizon_days: 60  },
    unit_duration:        { cost_impl: 2_000_000,   cost_per_period: 300_000,  horizon: 'structural',  horizon_days: 90  },
    changeover_time:      { cost_impl: 1_500_000,   cost_per_period: 500_000,  horizon: 'quick_win',   horizon_days: 45  },
    resource_b_count:     { cost_impl: 18_000_000,  cost_per_period: 3_500_000, horizon: 'structural', horizon_days: 180 },
    resource_count:       { cost_impl: 120_000_000, cost_per_period: 12_000_000, horizon: 'structural', horizon_days: 180 },
  };

  const LEVERS_DEF = [
    { key: 'waste_pct',        dir: -1, step: 1, limit: 0   },
    { key: 'utilization_pct',  dir:  1, step: 1, limit: 98  },
    { key: 'resource_b_count', dir:  1, step: 1, limit: 100 },
    { key: 'unit_duration',    dir: -1, step: 1, limit: 20  },
    { key: 'changeover_time',  dir: -1, step: 1, limit: 0   },
    { key: 'resource_count',   dir:  1, step: 1, limit: 12  },
  ];

  const internal_base = toInternalInputs(inputs);
  const r_base   = _simulateInternal(internal_base, a);
  const eco_base = calculateEconomics(toSimResult(r_base), inputs, a, config);

  const cnstr    = constraints(toSimResult(r_base), inputs, a);
  const is_bottleneck_b = cnstr.bottleneck === 'resource_b';

  const results = LEVERS_DEF.map(lev => {
    // findMinDelta equivalente — busca el mínimo cambio que mejora throughput
    let found = null;
    const cur = inputs[lev.key];
    if (cur === undefined) return null;

    const maxSteps = Math.ceil(Math.abs(lev.limit - cur) / lev.step) + 1;
    for (let n = 1; n <= maxSteps; n++) {
      const candidate = cur + lev.dir * lev.step * n;
      if (lev.dir > 0 && candidate > lev.limit) break;
      if (lev.dir < 0 && candidate < lev.limit) break;
      const trial_in  = { ...inputs, [lev.key]: candidate };
      const trial_r   = _simulateInternal(toInternalInputs(trial_in), a);
      if (trial_r.cirugias_mes > r_base.cirugias_mes) {
        const trial_eco = calculateEconomics(toSimResult(trial_r), trial_in, a, config);
        found = { delta: candidate - cur, inputs: trial_in, sim: trial_r, eco: trial_eco };
        break;
      }
    }

    const costs     = LEVER_COSTS[lev.key] ?? { cost_impl: 0, cost_per_period: 0, horizon: 'structural', horizon_days: 90 };
    const d_result  = found ? found.eco.result_period - eco_base.result_period : 0;
    const d_tp      = found ? found.sim.cirugias_mes  - r_base.cirugias_mes    : 0;
    const blocked   = !found || Math.abs(d_tp) < 0.5;

    // ROI y payback
    const d_result_clp = d_result * 1_000_000;
    const roi       = costs.cost_per_period > 0 ? d_result_clp / costs.cost_per_period : null;
    const payback   = d_result_clp > 0 ? costs.cost_impl / d_result_clp : null;

    const meta_lever = LEVERS_META.find(m => m.id === lev.key);

    return {
      rank:             0, // se asigna post-sort
      lever:            lev.key,
      label:            meta_lever?.label ?? lev.key,
      delta_result:     d_result,
      delta_throughput: d_tp,
      horizon:          costs.horizon,
      horizon_days:     costs.horizon_days,
      blocked,
      cost_impl:        costs.cost_impl,
      roi,
      payback_months:   payback,
    };
  })
  .filter(Boolean)
  .sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    const roiA = a.roi ?? -Infinity;
    const roiB = b.roi ?? -Infinity;
    return roiB !== roiA ? roiB - roiA : Math.abs(b.delta_result) - Math.abs(a.delta_result);
  })
  .map((item, i) => ({ ...item, rank: i + 1 }));

  return results;
}

/**
 * Monte Carlo.
 * ORIGEN: runMonteCarlo() en index.html línea 2609.
 * ADAPTACIÓN: output → MonteCarloResult del contrato.
 */
function runMonteCarlo(inputs, assumptions, options = {}, config = {}) {
  const a          = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const iterations = options.iterations ?? 1000;
  const ebitdas    = [];
  const throughputs = [];
  const backlogs   = [];

  for (let i = 0; i < iterations; i++) {
    const noisy = {
      ...inputs,
      demand:               Math.max(1,  inputs.demand          * (1 + 0.15 * coreRandNormal())),
      waste_pct:            Math.min(45, Math.max(0, inputs.waste_pct     * (0.8 + Math.random() * 0.7))),
      utilization_pct:      Math.min(98, Math.max(40, inputs.utilization_pct * (1 + 0.04 * coreRandNormal()))),
      unit_duration:        Math.max(20, inputs.unit_duration    * (1 + 0.08 * coreRandNormal())),
      changeover_time:      Math.max(0,  inputs.changeover_time  * (1 + 0.08 * coreRandNormal())),
      resource_b_usage_rate: Math.max(0.5, inputs.resource_b_usage_rate * (1 + 0.05 * coreRandNormal())),
    };
    const r   = _simulateInternal(toInternalInputs(noisy), a);
    const eco = calculateEconomics(toSimResult(r), noisy, a, config);
    ebitdas.push(eco.result_period);
    throughputs.push(r.cirugias_mes);
    backlogs.push(r.delta_lista);
  }

  const hist = coreHistogram(ebitdas, 20);

  return {
    p10:           corePercentile(ebitdas, 10),
    p50:           corePercentile(ebitdas, 50),
    p90:           corePercentile(ebitdas, 90),
    prob_negative: ebitdas.filter(v => v < 0).length / iterations,
    bins:          hist.bins,
    iterations,
    drivers_used:  ['demand', 'waste_pct', 'utilization_pct', 'unit_duration', 'changeover_time', 'resource_b_usage_rate'],
    // Extensiones health-specific
    _health: {
      throughput_p10: corePercentile(throughputs, 10),
      throughput_p50: corePercentile(throughputs, 50),
      throughput_p90: corePercentile(throughputs, 90),
      hist_min:       hist.min,
      hist_max:       hist.max,
    },
  };
}

/**
 * Comparación de escenarios.
 * ORIGEN: compareScenarios() en index.html línea 2055.
 * ADAPTACIÓN: output → ScenarioResult[].
 */
function compareScenarios(scenarios, assumptions, config = {}) {
  const a       = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const base_sc = scenarios.find(s => s.name === 'base') ?? scenarios[0];
  const base_r  = _simulateInternal(toInternalInputs(base_sc.inputs), a);
  const base_eco = calculateEconomics(toSimResult(base_r), base_sc.inputs, a, config);

  return scenarios.map(sc => {
    const r    = _simulateInternal(toInternalInputs(sc.inputs), a);
    const sim  = toSimResult(r);
    const eco  = calculateEconomics(sim, sc.inputs, a, config);
    const cns  = constraints(sim, sc.inputs, a);
    return {
      name:         sc.name,
      inputs:       sc.inputs,
      sim,
      eco,
      constraints:  cns,
      delta_vs_base: eco.result_period - base_eco.result_period,
    };
  });
}

/**
 * Proyección del backlog — health-specific.
 * ORIGEN: projectWaitlist() en index.html línea 1735.
 * NOTA: Esta función NO es parte del core — solo HealthEye la implementa.
 */
function projectBacklog(inputs, periods = 24, assumptions) {
  const a      = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  let stock    = a.lista_espera_inicial;
  const series = [];

  for (let m = 0; m <= periods; m++) {
    const r = _simulateInternal(toInternalInputs(inputs), a);
    if (m > 0) stock = Math.max(0, stock + r.delta_lista);
    series.push({ period: m, backlog: stock });
    if (stock <= 0) return { series, closes_at: m, converges: true };
  }
  return { series, closes_at: null, converges: false };
}

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 6 — EXPORTACIÓN DEL VERTICAL
// ═══════════════════════════════════════════════════════════════════

export const VerticalHealth = {
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
  projectBacklog,
  estimateRiskBand: () => null, // No implementado en HealthEye
};
