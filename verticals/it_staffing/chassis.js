// chassis.js - Vertical: IT Staff Augmentation (Kibernum/Noviscorp Style)
// GL Strategic Engine v3.0 - Talent Profitability Model

export const chassis = {
  id: "it_staffing",
  
  // 1. PALANCAS (Inputs)
  inputs: {
    dotacion_total: { value: 200, min: 10, max: 1000, step: 10, label: "Consultores Totales", unit: "qty", distribution: { type: 'normal', stdDev: 15 } },
    tasa_utilizacion: { value: 82, min: 60, max: 100, step: 1, label: "Tasa de Utilización", unit: "percent", distribution: { type: 'betaPert' } },
    attrition_mensual: { value: 2.5, min: 0.5, max: 15, step: 0.1, label: "Tasa de Deserción (Monthly Attrition)", unit: "percent", distribution: { type: 'logNormal', stdDev: 0.5 } },
    fee_hora_promedio: { value: 45, min: 25, max: 120, step: 1, label: "Fee Promedio Hora (USD)", unit: "usd", distribution: { type: 'normal', stdDev: 2 } },
    inversion_retencion: { value: 5000, min: 0, max: 50000, step: 500, label: "Presupuesto Bienestar/Retención", unit: "usd" }
  },

  // 2. GRAFO CAUSAL (Nodes)
  nodes: {
    // --- Capa de Producción Inteléctica ---
    horas_disponibles: {
      label: "HH Totales Disponibles",
      unit: "qty",
      formula: (v) => v.dotacion_total * 168 // 168 horas mensuales por consultor
    },
    horas_facturables: {
      label: "HH Facturadas",
      unit: "qty",
      formula: (v) => v.horas_disponibles * (v.tasa_utilizacion / 100)
    },
    productivity_index: {
      label: "Índice de Productividad",
      unit: "ratio",
      formula: (v) => v.horas_disponibles > 0 ? (v.horas_facturables / v.horas_disponibles).toFixed(2) : 0
    },

    // --- Capa de Costos y Talento ---
    ingreso_operacional: {
      label: "Ingresos por Servicios",
      unit: "usd",
      formula: (v) => v.horas_facturables * v.fee_hora_promedio
    },
    costo_directo_sueldos: {
      label: "Costo de Consultores",
      unit: "usd",
      formula: (v) => v.dotacion_total * 3200 // Sueldo promedio base + beneficios
    },
    costo_reclutamiento: {
      label: "Fuga por Reclutamiento",
      unit: "usd",
      formula: (v) => (v.dotacion_total * (v.attrition_mensual / 100)) * 4500 // Cost per hire promedio
    },

    // --- Capa de Riesgo Normativo (Ley 20.123 Chile) ---
    // Riesgo por subcontratación y fiscalización de la Dirección del Trabajo
    riesgo_multas_dt: {
      label: "Riesgo Multas Subcontratación",
      unit: "usd",
      formula: (v) => (v.attrition_mensual > 8 ? 15000 : 0) // Alta rotación dispara fiscalizaciones
    },

    // --- RESULTADO FINAL ---
    gastos_administracion: {
      label: "G&A y Soporte",
      unit: "usd",
      formula: (v) => v.ingreso_operacional * 0.12
    },
    ebitda: {
      label: "EBITDA Final",
      unit: "usd",
      formula: (v) => 
        v.ingreso_operacional - 
        (v.costo_directo_sueldos + v.costo_reclutamiento + v.inversion_retencion + v.riesgo_multas_dt + v.gastos_administracion)
    }
  },

  // 3. CONEXIONES (Edges)
  edges: [
    ["dotacion_total", "horas_disponibles"],
    ["tasa_utilizacion", "horas_facturables"],
    ["horas_disponibles", "horas_facturables"],
    ["horas_facturables", "ingreso_operacional"],
    ["fee_hora_promedio", "ingreso_operacional"],
    ["dotacion_total", "costo_directo_sueldos"],
    ["attrition_mensual", "costo_reclutamiento"],
    ["attrition_mensual", "riesgo_multas_dt"],
    ["ingreso_operacional", "ebitda"],
    ["costo_directo_sueldos", "ebitda"],
    ["costo_reclutamiento", "ebitda"]
  ],

  // 4. ESCENARIOS
  scenarios: {
    base: {
      label: "Operación Estándar",
      values: { 
        dotacion_total: 200,
        tasa_utilizacion: 82, 
        attrition_mensual: 2.5, 
        fee_hora_promedio: 45,
        inversion_retencion: 5000
      }
    },
    crisis_talento: {
      label: "Fuga de Consultores",
      values: { 
        dotacion_total: 200,
        tasa_utilizacion: 70, 
        attrition_mensual: 12.0, 
        fee_hora_promedio: 45,
        inversion_retencion: 5000
      }
    },
    maxima_eficiencia: {
      label: "High Performance",
      values: { 
        dotacion_total: 200,
        tasa_utilizacion: 94, 
        attrition_mensual: 1.2, 
        fee_hora_promedio: 55,
        inversion_retencion: 15000
      }
    }
  },

  // 5. ENGINE INTEGRATION
  // This model function allows the chassis to be used by StrategicEngine
  model: (state) => {
    const next = { ...state };
    
    // We apply formulas for each node. 
    // Since the engine iterates, dependencies will converge.
    Object.keys(chassis.nodes).forEach(key => {
      try {
        const result = chassis.nodes[key].formula(next);
        next[key] = isNaN(result) ? 0 : result;
      } catch (e) {
        next[key] = next[key] || 0;
      }
    });
    
    return next;
  }
};
