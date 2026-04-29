// chassis.js - Vertical: FINOPS (Banca y Scoring de Riesgo)
// GL Strategic Engine v3.0 - Equifax & CMF Compliance Style

export const chassis = {
  id: "finops",
  
  // 1. PALANCAS (Inputs): Control de política crediticia y cumplimiento
  inputs: {
    tasa_interes_activa: { value: 14.5, min: 5, max: 35, step: 0.1, label: "Tasa Interés Anual", unit: "percent", distribution: { type: 'normal', stdDev: 2 } },
    limite_credito_promedio: { value: 2500, min: 500, max: 15000, step: 100, label: "Límite Crédito Promedio", unit: "usd", distribution: { type: 'normal', stdDev: 300 } },
    tasa_aprobacion: { value: 18, min: 5, max: 50, step: 1, label: "Tasa de Aprobación Scoring", unit: "percent", distribution: { type: 'betaPert' } },
    presupuesto_compliance_aml: { value: 15000, min: 0, max: 100000, step: 1000, label: "Inversión en Cumplimiento/AML", unit: "usd" },
    inversion_ciberseguridad: { value: 25000, min: 5000, max: 200000, step: 5000, label: "Presupuesto Ciberseguridad", unit: "usd" }
  },

  // 2. GRAFO CAUSAL (Nodes): Fórmulas de rentabilidad y riesgo financiero
  nodes: {
    // --- Capa de Colocaciones (Activos) ---
    volumen_colocaciones: {
      label: "Cartera Total de Préstamos",
      unit: "usd",
      formula: (v) => (v.tasa_aprobacion / 100) * 150000000 // Pipeline de 150M USD
    },
    ingreso_intereses: {
      label: "Ingresos por Intereses",
      unit: "usd",
      formula: (v) => v.volumen_colocaciones * (v.tasa_interes_activa / 100)
    },

    // --- Capa de Riesgo (NPL y Scoring) ---
    // Según investigación, aumentar el límite de crédito reduce el default por flexibilidad
    probabilidad_default: {
      label: "Tasa de Cartera Vencida (NPL)",
      unit: "percent",
      formula: (v) => 4.5 - (v.limite_credito_promedio / 10000) + (v.tasa_interes_activa / 15)
    },
    provisiones_riesgo: {
      label: "Provisiones por Incumplimiento",
      unit: "usd",
      formula: (v) => v.volumen_colocaciones * (v.probabilidad_default / 100)
    },

    // --- Capa Normativa (CMF & NovisEye) ---
    riesgo_sancion_cmf: {
      label: "Multas Proyectadas CMF",
      unit: "usd",
      formula: (v) => (v.presupuesto_compliance_aml < 40000? 55000 : 0) // Umbral de sanción normativa
    },
    impacto_brecha_datos: {
      label: "Riesgo Reputacional (Data Breach)",
      unit: "usd",
      formula: (v) => v.ingreso_intereses * (v.inversion_ciberseguridad < 50000? 0.07 : 0) // Caída del 7% en reputación
    },

    // --- RESULTADO FINAL (Profitability) ---
    costo_fondos: {
      label: "Costo de Fondeo (Tasa Pasiva)",
      unit: "usd",
      formula: (v) => v.volumen_colocaciones * 0.042 // Tasa de captación fija 4.2%
    },
    ebitda: {
      label: "EBITDA Operacional",
      unit: "usd",
      formula: (v) => 
        v.ingreso_intereses - 
        (v.costo_fondos + v.provisiones_riesgo + v.presupuesto_compliance_aml + v.inversion_ciberseguridad + v.riesgo_sancion_cmf + v.impacto_brecha_datos)
    }
  },

  // 3. CONEXIONES (Edges)
  edges: [
    ["tasa_aprobacion", "volumen_colocaciones"],
    ["volumen_colocaciones", "ingreso_intereses"],
    ["tasa_interes_activa", "ingreso_intereses"],
    ["tasa_interes_activa", "probabilidad_default"],
    ["limite_credito_promedio", "probabilidad_default"],
    ["probabilidad_default", "provisiones_riesgo"],
    ["presupuesto_compliance_aml", "riesgo_sancion_cmf"],
    ["inversion_ciberseguridad", "impacto_brecha_datos"],
    ["ingreso_intereses", "ebitda"],
    ["provisiones_riesgo", "ebitda"],
    ["riesgo_sancion_cmf", "ebitda"]
  ],

  // 4. ESCENARIOS FINANCIEROS
  scenarios: {
    base: {
      label: "Política Conservadora",
      values: { tasa_interes_activa: 12.0, limite_credito_promedio: 2500, tasa_aprobacion: 15 }
    },
    agresivo_scoring: {
      label: "Expansión de Cartera",
      values: { tasa_interes_activa: 18.5, limite_credito_promedio: 5000, tasa_aprobacion: 35 }
    },
    riesgo_regulatorio: {
      label: "Alerta Compliance CMF",
      values: { presupuesto_compliance_aml: 5000, inversion_ciberseguridad: 10000 }
    }
  }
};