/**
 * vertical-contract.js
 * GL Strategic — Contrato técnico de verticales
 *
 * Define la interfaz que toda implementación vertical debe cumplir.
 * Naming 100% neutral: sin términos de dominio (hospitales, salmón, etc.)
 *
 * ARQUITECTURA DE CAPAS:
 *
 *   Inputs + Assumptions
 *         │
 *         ▼
 *   simulate()  ──────────────────────► SimResult
 *         │                                │
 *         ▼                                ▼
 *   constraints()                   calculateEconomics()
 *         │                                │
 *         └──────────┬─────────────────────┘
 *                    ▼
 *             buildViewModel()
 *                    │
 *                    ▼
 *              ViewModel  (único objeto que consume la UI)
 *
 * REGLA CRÍTICA:
 *   simulate()         → SOLO lógica operativa. Sin dinero.
 *   calculateEconomics → SOLO lógica financiera. Sin operación.
 *   constraints()      → SOLO lógica de cuellos y límites.
 *   buildViewModel()   → SOLO ensamblado de salida para UI.
 *   UI/Shell           → SOLO consume ViewModel. Sin cálculos.
 */

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 1 — TIPOS DE DATOS (documentación como JSDoc)
// ═══════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} VerticalInputs
 * Valores operativos controlables — palancas del modelo.
 * El vertical define sus propias claves; el contrato solo exige
 * que el objeto sea serializable (JSON-safe) y que las mismas
 * claves usadas en simulate() estén presentes aquí.
 *
 * Ejemplo HealthEye:  { resource_count, suspension_pct, duration_avg, ... }
 * Ejemplo AquaEye:    { fcr, mortality_pct, pest_index, yield_pct, price, fx }
 */

/**
 * @typedef {Object} VerticalAssumptions
 * Supuestos fijos del modelo — no controlables por el usuario final.
 * Calibrados por cliente o por defecto.
 *
 * Ejemplo HealthEye:  { hours_per_shift, working_days_month, base_budget, ... }
 * Ejemplo AquaEye:    { biomass_initial_ton, feed_cost_per_kg, sanitary_cost_base, ... }
 */

/**
 * @typedef {Object} SimResult
 * Output PURO del motor operativo. Sin dinero.
 *
 * @property {number}   throughput        - Unidades producidas en el período (cx/mes, ton, etc.)
 * @property {number}   throughput_cap_a  - Capacidad según recurso A (pabellones, jaulas, etc.)
 * @property {number}   throughput_cap_b  - Capacidad según recurso B (camas, alimentación, etc.)
 * @property {number}   backlog           - Unidades pendientes acumuladas (Δ lista, stock diferido)
 * @property {number}   backlog_stock     - Stock total acumulado de unidades pendientes
 * @property {Object}   resource_usage    - Uso de recursos clave: { resource_a: number, resource_b: number, ... }
 * @property {Object}   constraints_raw   - Datos crudos de capacidad para que constraints() los interprete
 * @property {Object}   [drivers]         - Variables intermedias opcionales (para grafo causal, debug)
 */

/**
 * @typedef {Object} ConstraintsResult
 * Lógica de cuellos de botella y violaciones de límites.
 * Responde: ¿qué está limitando el sistema ahora mismo?
 *
 * @property {string}   bottleneck        - Identificador del cuello activo ('resource_a' | 'resource_b' | 'none')
 * @property {string}   bottleneck_label  - Texto legible del cuello para UI (provisto por vertical)
 * @property {Object}   capacity_limits   - Límites físicos: { resource_a: number, resource_b: number }
 * @property {Array}    violations        - Lista de violaciones: [{ resource, limit, actual, severity }]
 */

/**
 * @typedef {Object} Economics
 * Output PURO de la capa financiera. Sin operación.
 *
 * @property {number}   result_period     - Resultado operacional del período (en unidad monetaria del vertical)
 * @property {number}   revenue           - Ingresos totales del período
 * @property {number}   cost_fixed        - Costos fijos del período
 * @property {number}   cost_variable     - Costos variables del período
 * @property {number}   cost_total        - Suma costo_fixed + cost_variable
 * @property {number}   margin_unit       - Margen por unidad producida
 * @property {number}   opportunity_cost  - Costo de no actuar (ingresos no capturados por backlog)
 * @property {Array}    kpis_raw          - KPIs financieros crudos antes de formateo UI
 * @property {Array}    alerts_raw        - Alertas financieras crudas antes de formateo UI
 * @property {Array}    waterfall_raw     - Estructura waterfall cruda: [{ id, label, value, cumulative }]
 */

/**
 * @typedef {Object} KPI
 * Estructura normalizada de KPI para consumo UI.
 *
 * @property {string}  key      - Identificador interno único
 * @property {string}  label    - Texto UI (provisto por vertical vía labelMap)
 * @property {*}       val      - Valor formateado (string o number)
 * @property {string}  unit     - Unidad legible
 * @property {string}  state    - 'good' | 'warn' | 'bad' | 'neutral'
 * @property {string}  [color]  - Color CSS opcional (si el vertical lo provee)
 */

/**
 * @typedef {Object} Alert
 * Estructura normalizada de alerta para consumo UI.
 *
 * @property {string}  type  - 'info' | 'warn' | 'alert'
 * @property {string}  msg   - Texto de la alerta (provisto por vertical)
 */

/**
 * @typedef {Object} WaterfallBar
 * Un segmento del waterfall financiero.
 *
 * @property {string}  id         - Identificador interno
 * @property {string}  label      - Etiqueta UI
 * @property {number}  value      - Valor del segmento
 * @property {boolean} [positive] - true si es ingreso/positivo
 * @property {string}  [color]    - Color CSS opcional
 */

/**
 * @typedef {Object} ViewModel
 * Único objeto consumido por la UI/Shell.
 * Ensamblado por buildViewModel() en el vertical.
 *
 * @property {Array<KPI>}          kpis          - Strip de KPIs principales
 * @property {Array<Alert>}        alerts        - Alertas activas ordenadas por severidad
 * @property {Object}              visuals        - Sub-bloque de visualizaciones
 * @property {Array<WaterfallBar>} visuals.waterfall  - Datos para gráfico waterfall
 * @property {Array}               visuals.charts_config  - Config adicional de charts (opcional)
 * @property {Object}              labels         - Mapa de etiquetas UI del vertical
 * @property {Object}              flags          - Flags booleanos de estado { is_mode_b, has_backlog, ... }
 * @property {Object}              [summary]      - Resumen ejecutivo opcional { title, message, action }
 */

/**
 * @typedef {Object} SensitivityItem
 * Un ítem del análisis de sensibilidad (Tornado).
 *
 * @property {string}  lever              - Clave del input
 * @property {string}  label              - Etiqueta UI
 * @property {number}  delta_result_up    - Δ resultado si lever sube
 * @property {number}  delta_result_down  - Δ resultado si lever baja
 * @property {number}  delta_throughput_up
 * @property {number}  delta_throughput_down
 * @property {number}  range_result       - Amplitud total del impacto financiero
 * @property {string}  risk_direction     - 'up' | 'down' (dirección de riesgo real)
 */

/**
 * @typedef {Object} ActionItem
 * Una palanca del plan de acción.
 *
 * @property {number}  rank              - Posición en el ranking
 * @property {string}  lever             - Clave del input
 * @property {string}  label             - Etiqueta UI
 * @property {number}  delta_result      - Δ resultado_period si se aplica la acción
 * @property {number}  delta_throughput  - Δ throughput si se aplica la acción
 * @property {string}  horizon           - Horizonte de implementación ('quick_win' | 'structural')
 * @property {number}  horizon_days      - Días estimados de implementación
 * @property {boolean} blocked           - true si el cuello de botella bloquea esta palanca
 * @property {number}  [cost_impl]       - Costo de implementación (opcional, vertical-specific)
 * @property {number}  [roi]             - ROI mensual (opcional, vertical-specific)
 * @property {number}  [payback_months]  - Payback en meses (opcional, vertical-specific)
 */

/**
 * @typedef {Object} MonteCarloResult
 * Distribución de probabilidad del resultado operacional.
 *
 * @property {number}  p10               - Percentil 10 del resultado
 * @property {number}  p50               - Mediana del resultado
 * @property {number}  p90               - Percentil 90 del resultado
 * @property {number}  prob_negative     - Probabilidad de resultado negativo [0,1]
 * @property {Array}   bins              - Histograma de distribución para sparkline
 * @property {number}  iterations        - Número de iteraciones ejecutadas
 * @property {Array}   [drivers_used]    - Variables estocásticas usadas en la simulación
 */

/**
 * @typedef {Object} ScenarioResult
 * Resultado de un escenario nombrado para comparación.
 *
 * @property {string}  name              - Nombre del escenario
 * @property {Object}  inputs            - VerticalInputs del escenario
 * @property {SimResult}  sim            - Resultado operativo
 * @property {Economics}  eco            - Resultado financiero
 * @property {number}  delta_vs_base     - Δ result_period vs escenario base
 */

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 2 — INTERFAZ DEL CONTRATO
// ═══════════════════════════════════════════════════════════════════

/**
 * VerticalContract
 *
 * Interfaz que toda implementación vertical debe satisfacer.
 * Un vertical es un objeto que expone estas funciones.
 * El core y la UI dependen SOLO de esta interfaz — nunca de implementaciones concretas.
 *
 * Invariantes:
 *   - simulate()           no accede a DOM. No tiene estado global.
 *   - calculateEconomics() no accede a DOM. No llama a simulate().
 *   - constraints()        no accede a DOM. Solo interpreta SimResult.
 *   - buildViewModel()     no accede a DOM. Solo ensambla salida.
 *   - Todas las funciones son PURAS dado (inputs, assumptions).
 *   - El estado (currentInputs, mode, activeAssumptions) lo gestiona el Shell.
 */
export const VerticalContract = {

  /**
   * Metadatos del vertical.
   * Requeridos para registro e identificación.
   */
  meta: {
    id:          'string',   // 'health' | 'salmon' | 'logistics' | ...
    name:        'string',   // Nombre legible
    version:     'string',   // Versión semántica
    currency:    'string',   // 'CLP' | 'USD' | 'EUR'
    period:      'string',   // 'month' | 'quarter' | 'year'
    throughput_unit: 'string', // 'procedures' | 'tons' | 'units'
  },

  /**
   * Assumptions por defecto del vertical.
   * El Shell puede sobrescribirlas vía calibración de cliente.
   *
   * @type {VerticalAssumptions}
   */
  DEFAULT_ASSUMPTIONS: {},

  /**
   * Escenarios predefinidos del vertical.
   * Mínimo: { base: VerticalInputs }
   * El Shell usa esto para el selector de escenarios.
   *
   * @type {{ base: VerticalInputs, [key: string]: VerticalInputs }}
   */
  SCENARIOS: {},

  /**
   * Metadatos de las palancas (levers).
   * Usados por el Shell para construir sliders/inputs.
   *
   * @type {Array<{ id: string, label: string, unit: string, min: number, max: number, step: number, base: number }>}
   */
  LEVERS_META: [],

  // ─── CAPA 1: MOTOR OPERATIVO ─────────────────────────────────────

  /**
   * Motor de simulación. SOLO lógica operativa. Sin dinero.
   *
   * Recibe inputs controlables y assumptions fijos.
   * Devuelve throughput, backlog, resource_usage y constraints_raw.
   * NO devuelve costos, ingresos ni resultado financiero.
   *
   * @param {VerticalInputs}    inputs
   * @param {VerticalAssumptions} assumptions
   * @returns {SimResult}
   */
  simulate(inputs, assumptions) {
    throw new Error('[VerticalContract] simulate() no implementado');
  },

  // ─── CAPA 2: RESTRICCIONES ───────────────────────────────────────

  /**
   * Analiza el SimResult e identifica cuellos de botella y violaciones.
   *
   * El vertical define qué resources existen y cómo se llaman.
   * El core solo sabe que existe un `bottleneck` y `violations[]`.
   *
   * @param {SimResult}           simResult
   * @param {VerticalInputs}      inputs
   * @param {VerticalAssumptions} assumptions
   * @returns {ConstraintsResult}
   */
  constraints(simResult, inputs, assumptions) {
    throw new Error('[VerticalContract] constraints() no implementado');
  },

  // ─── CAPA 3: ECONOMÍA ────────────────────────────────────────────

  /**
   * Calcula la capa financiera a partir del SimResult.
   * NO vuelve a ejecutar lógica operativa.
   *
   * El vertical puede tener modos (público/privado, spot/contrato).
   * El modo se pasa como parámetro — nunca como variable global.
   *
   * @param {SimResult}           simResult
   * @param {VerticalInputs}      inputs
   * @param {VerticalAssumptions} assumptions
   * @param {Object}              [config]         - { mode: string } u otros flags de contexto
   * @returns {Economics}
   */
  calculateEconomics(simResult, inputs, assumptions, config) {
    throw new Error('[VerticalContract] calculateEconomics() no implementado');
  },

  // ─── CAPA 4: VIEWMODEL ───────────────────────────────────────────

  /**
   * Ensambla el ViewModel para consumo UI.
   * Único punto de salida hacia el Shell.
   *
   * Recibe los tres resultados de capas anteriores y produce
   * una estructura completamente formateada y lista para render.
   *
   * @param {SimResult}           simResult
   * @param {Economics}           economics
   * @param {ConstraintsResult}   constraints
   * @param {VerticalInputs}      inputs
   * @param {VerticalAssumptions} assumptions
   * @param {Object}              [config]         - Contexto: { mode, locale }
   * @returns {ViewModel}
   */
  buildViewModel(simResult, economics, constraints, inputs, assumptions, config) {
    throw new Error('[VerticalContract] buildViewModel() no implementado');
  },

  // ─── CAPA 5: ANÁLISIS AVANZADO ────────────────────────────────────

  /**
   * Análisis de sensibilidad (datos para Tornado chart).
   * Evalúa el impacto de mover cada palanca ±delta sobre resultado y throughput.
   *
   * @param {VerticalInputs}      inputs
   * @param {VerticalAssumptions} assumptions
   * @param {Object}              [config]
   * @returns {Array<SensitivityItem>}
   */
  runSensitivityAnalysis(inputs, assumptions, config) {
    throw new Error('[VerticalContract] runSensitivityAnalysis() no implementado');
  },

  /**
   * Impactos marginales ordenados — base del Plan de Acción.
   * Para cada palanca: mínimo delta necesario para mejorar throughput o resultado.
   *
   * @param {VerticalInputs}      inputs
   * @param {VerticalAssumptions} assumptions
   * @param {Object}              [config]
   * @returns {Array<ActionItem>}
   */
  calculateMarginalImpacts(inputs, assumptions, config) {
    throw new Error('[VerticalContract] calculateMarginalImpacts() no implementado');
  },

  /**
   * Simulación Monte Carlo sobre el motor simulate().
   *
   * @param {VerticalInputs}      inputs          - Centro de distribuciones
   * @param {VerticalAssumptions} assumptions
   * @param {Object}              [options]        - { iterations, variables: { [key]: { min, mode, max } } }
   * @param {Object}              [config]
   * @returns {MonteCarloResult}
   */
  runMonteCarlo(inputs, assumptions, options, config) {
    throw new Error('[VerticalContract] runMonteCarlo() no implementado');
  },

  /**
   * Comparación de escenarios.
   * Ejecuta simulate() + calculateEconomics() para cada escenario
   * y devuelve resultados normalizados para comparación tabular.
   *
   * @param {Array<{ name: string, inputs: VerticalInputs }>} scenarios
   * @param {VerticalAssumptions} assumptions
   * @param {Object}              [config]
   * @returns {Array<ScenarioResult>}
   */
  compareScenarios(scenarios, assumptions, config) {
    throw new Error('[VerticalContract] compareScenarios() no implementado');
  },

  // ─── OPCIONAL: EXTENSIONES VERTICAL-SPECIFIC ─────────────────────

  /**
   * Proyección temporal del backlog.
   * CANDIDATA FUTURA al core — hoy solo implementada en HealthEye.
   * Si el vertical no la implementa, retorna null.
   *
   * @param {VerticalInputs}      inputs
   * @param {number}              periods         - Número de períodos a proyectar
   * @param {VerticalAssumptions} assumptions
   * @returns {{ series: Array<{ period: number, backlog: number }>, closes_at: number|null, converges: boolean }|null}
   */
  projectBacklog(inputs, periods, assumptions) {
    return null; // Implementación opcional
  },

  /**
   * Estimación rápida de banda de riesgo (sin Monte Carlo).
   * CANDIDATA FUTURA al core — hoy solo implementada en AquaEye/Salmon.
   * Si el vertical no la implementa, retorna null.
   *
   * @param {VerticalInputs}      inputs
   * @param {VerticalAssumptions} assumptions
   * @returns {{ risk_level: 'LOW'|'MEDIUM'|'HIGH', drivers: string[] }|null}
   */
  estimateRiskBand(inputs, assumptions) {
    return null; // Implementación opcional
  },

};

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 3 — HELPERS COMPARTIDOS DEL CORE
// ═══════════════════════════════════════════════════════════════════
// Estas funciones son genéricas y pueden ser usadas por cualquier vertical.
// No dependen de dominio. No dependen de DOM.

/**
 * Percentil p (0-100) de un array numérico.
 * Interpolación lineal. Usado por Monte Carlo de ambos verticales.
 *
 * @param {number[]} arr
 * @param {number}   p
 * @returns {number}
 */
export function corePercentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  if (p <= 0)   return sorted[0];
  if (p >= 100) return sorted[n - 1];
  const rank  = (p / 100) * (n - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const frac  = rank - lower;
  return sorted[lower] * (1 - frac) + sorted[upper] * frac;
}

/**
 * Muestra un valor de distribución triangular (min, mode, max).
 * Usado por Monte Carlo de ambos verticales.
 *
 * @param {number} min
 * @param {number} mode
 * @param {number} max
 * @returns {number}
 */
export function coreTriangular(min, mode, max) {
  if (min >= max) return mode;
  const u  = Math.random();
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

/**
 * Muestra un valor de distribución normal estándar (Box-Muller).
 * Alternativa para Monte Carlo de HealthEye.
 *
 * @returns {number} valor ≈ N(0,1)
 */
export function coreRandNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Construye un histograma de n bins a partir de un array de valores.
 * Usado para el sparkline de distribución Monte Carlo.
 *
 * @param {number[]} values
 * @param {number}   n_bins
 * @returns {{ bins: number[], min: number, max: number, bin_width: number }}
 */
export function coreHistogram(values, n_bins = 20) {
  if (!values || values.length === 0) return { bins: [], min: 0, max: 0, bin_width: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bin_width = (max - min) / n_bins || 1;
  const bins = Array(n_bins).fill(0);
  sorted.forEach(v => {
    const idx = Math.min(n_bins - 1, Math.floor((v - min) / bin_width));
    bins[idx]++;
  });
  return { bins, min, max, bin_width };
}

/**
 * Aplica colores semáforo estándar GL Strategic.
 *
 * @param {'good'|'warn'|'bad'|'neutral'} state
 * @returns {string} CSS variable
 */
export function coreStateColor(state) {
  const map = {
    good:    'var(--color-good,    #3fb950)',
    warn:    'var(--color-warn,    #d29922)',
    bad:     'var(--color-bad,     #f85149)',
    neutral: 'var(--color-neutral, #58a6ff)',
  };
  return map[state] || map.neutral;
}

/**
 * Valida que una implementación vertical satisface el contrato.
 * Útil para testing y registro de verticales.
 *
 * @param {Object} vertical  - Implementación del vertical
 * @returns {{ valid: boolean, missing: string[], warnings: string[] }}
 */
export function validateVertical(vertical) {
  const REQUIRED_FNS = [
    'simulate',
    'constraints',
    'calculateEconomics',
    'buildViewModel',
    'runSensitivityAnalysis',
    'calculateMarginalImpacts',
    'runMonteCarlo',
    'compareScenarios',
  ];
  const REQUIRED_DATA = [
    'meta',
    'DEFAULT_ASSUMPTIONS',
    'SCENARIOS',
    'LEVERS_META',
  ];
  const REQUIRED_META = ['id', 'name', 'version', 'currency', 'period', 'throughput_unit'];

  const missing   = [];
  const warnings  = [];

  REQUIRED_FNS.forEach(fn => {
    if (typeof vertical[fn] !== 'function') missing.push(`function: ${fn}`);
  });

  REQUIRED_DATA.forEach(key => {
    if (!vertical[key]) missing.push(`data: ${key}`);
  });

  if (vertical.meta) {
    REQUIRED_META.forEach(k => {
      if (!vertical.meta[k]) missing.push(`meta.${k}`);
    });
  }

  if (!vertical.SCENARIOS?.base) {
    missing.push('SCENARIOS.base (escenario base requerido)');
  }

  if (vertical.LEVERS_META && vertical.LEVERS_META.length === 0) {
    warnings.push('LEVERS_META está vacío — Shell no podrá construir sliders');
  }

  // Detectar contaminación de naming de dominio en keys de meta
  const CONTAMINATED_TERMS = [
    'cirugia', 'cirugias', 'pabellon', 'cama', 'espera',
    'biomasa', 'jaula', 'tonelada', 'salmon', 'caligus',
    'fonasa', 'dipres', 'minsal', 'isapre',
  ];
  const metaStr = JSON.stringify(vertical.meta || {}).toLowerCase();
  CONTAMINATED_TERMS.forEach(term => {
    if (metaStr.includes(term)) {
      warnings.push(`meta contiene término de dominio: "${term}" — considerar naming neutral`);
    }
  });

  return {
    valid:    missing.length === 0,
    missing,
    warnings,
  };
}
