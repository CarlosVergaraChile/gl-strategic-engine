// body.js - Vertical: FINOPS (Banca y Scoring de Riesgo)
// GL Strategic Engine v3.0 - Corporate Financial Interface

export const body = {
  title: "FinOps Strategic Control",
  subtitle: "Decision Intelligence para Gestión de Activos y Riesgo Crediticio",
  theme: "#1b4f72", // Azul Marino Corporativo

  // 1. KPIs PRIORITARIOS: Los indicadores que aparecen en el encabezado
  kpis: [
    { id: "ebitda", label: "EBITDA Operacional", unit: "usd" },
    { id: "probabilidad_default", label: "Riesgo NPL", unit: "percent" },
    { id: "volumen_colocaciones", label: "Cartera Total", unit: "usd" }
  ],

  // 2. ACTION FEED (Decision Intelligence):
  // El motor rankea estas acciones por su impacto marginal en el EBITDA
  actionFeed: [
    { 
      label: "Endurecer Scoring", 
      description: "Bajar tasa de aprobación para reducir NPL y provisiones", 
      impact: { tasa_aprobacion: -5 } 
    },
    { 
      label: "Campaña Expansión Prime", 
      description: "Aumentar límites de crédito para mejorar volumen de colocaciones", 
      impact: { limite_credito_promedio: 1500 } 
    },
    { 
      label: "Blindaje Regulatorio", 
      description: "Inversión en Compliance y Ciberseguridad para mitigar multas", 
      impact: { presupuesto_compliance_aml: 30000, inversion_ciberseguridad: 25000 } 
    }
  ],

  // 3. LAYOUT DEL GRAFO: Coordenadas visuales para el renderizado
  graph: {
    layout: {
      // Inputs (Palancas en la izquierda)
      tasa_interes_activa: { x: 50, y: 100 },
      limite_credito_promedio: { x: 50, y: 200 },
      tasa_aprobacion: { x: 50, y: 300 },
      presupuesto_compliance_aml: { x: 50, y: 450 },
      inversion_ciberseguridad: { x: 50, y: 550 },

      // Nodos Intermedios (Capa lógica en el centro)
      volumen_colocaciones: { x: 300, y: 250 },
      probabilidad_default: { x: 300, y: 150 },
      provisiones_riesgo: { x: 550, y: 150 },
      riesgo_sancion_cmf: { x: 300, y: 450 },
      impacto_brecha_datos: { x: 300, y: 550 },

      // Resultado Final (EBITDA en la derecha)
      ebitda: { x: 850, y: 325 }
    }
  }
};