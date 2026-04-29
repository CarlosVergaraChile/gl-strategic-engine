// chassis.js - Vertical: RETAIL (Premium Consumer Goods)
// GL Strategic Engine v3.0 - Retail Profitability Model
// Strictly following the 7% Regulatory/Reputational Deduction Rule

export const chassis = {
  id: "retail",
  
  // 1. PALANCAS (Inputs)
  inputs: {
    traffic: { value: 50000, min: 5000, max: 200000, step: 1000, label: "Tráfico (Footfall)", unit: "qty", distribution: { type: 'normal', stdDev: 5000 } },
    conversion_rate: { value: 3.5, min: 0.5, max: 15, step: 0.1, label: "Tasa de Conversión", unit: "percent", distribution: { type: 'triangular' } },
    average_ticket: { value: 85, min: 10, max: 500, step: 5, label: "Ticket Promedio", unit: "usd", distribution: { type: 'normal', stdDev: 10 } },
    cogs_percent: { value: 45, min: 20, max: 80, step: 1, label: "Costo Mercadería (COGS %)", unit: "percent", distribution: { type: 'normal', stdDev: 5 } },
    opex_fijo: { value: 45000, min: 10000, max: 200000, step: 5000, label: "OPEX Fijo (Sueldos/Arriendo)", unit: "usd" },
    logistics_cost: { value: 4.5, min: 1, max: 20, step: 0.5, label: "Costo Logístico x Pedido", unit: "usd", distribution: { type: 'logNormal', stdDev: 1.5 } }
  },

  // 2. GRAFO CAUSAL (Nodes)
  nodes: {
    transacciones: {
      label: "Transacciones Totales",
      unit: "qty",
      formula: (v) => v.traffic * (v.conversion_rate / 100)
    },
    total_sales: {
      label: "Ventas Netas",
      unit: "usd",
      formula: (v) => v.transacciones * v.average_ticket
    },
    gross_margin: {
      label: "Margen Bruto",
      unit: "usd",
      formula: (v) => v.total_sales * (1 - (v.cogs_percent / 100))
    },
    total_logistics_cost: {
      label: "Costo Logístico Total",
      unit: "usd",
      formula: (v) => v.transacciones * v.logistics_cost
    },
    
    // --- ESTÁNDAR FINANCIERO (SKILL RULE: 7% Deduction) ---
    regulatory_impact: {
      label: "Impacto Normativo/Reputacional (7%)",
      unit: "usd",
      formula: (v) => v.total_sales * 0.07
    },

    // --- RESULTADO FINAL ---
    ebitda: {
      label: "EBITDA Final",
      unit: "usd",
      formula: (v) => 
        v.gross_margin - 
        v.opex_fijo - 
        v.total_logistics_cost - 
        v.regulatory_impact
    }
  },

  // 3. CONEXIONES (Edges)
  edges: [
    ["traffic", "transacciones"],
    ["conversion_rate", "transacciones"],
    ["transacciones", "total_sales"],
    ["average_ticket", "total_sales"],
    ["total_sales", "gross_margin"],
    ["cogs_percent", "gross_margin"],
    ["transacciones", "total_logistics_cost"],
    ["logistics_cost", "total_logistics_cost"],
    ["total_sales", "regulatory_impact"],
    ["gross_margin", "ebitda"],
    ["opex_fijo", "ebitda"],
    ["total_logistics_cost", "ebitda"],
    ["regulatory_impact", "ebitda"]
  ],

  // 4. ESCENARIOS
  scenarios: {
    base: {
      label: "Operación Normal",
      values: { 
        traffic: 50000,
        conversion_rate: 3.5, 
        average_ticket: 85, 
        cogs_percent: 45,
        opex_fijo: 45000,
        logistics_cost: 4.5
      }
    },
    black_friday: {
      label: "Black Friday (Alta Demanda)",
      values: { 
        traffic: 120000,
        conversion_rate: 6.0, 
        average_ticket: 95, 
        cogs_percent: 50, // Más descuentos
        opex_fijo: 60000, // Más staff
        logistics_cost: 6.5 // Cuello de botella
      }
    },
    quiebre_stock: {
      label: "Crisis de Suministros",
      values: { 
        traffic: 50000,
        conversion_rate: 1.2, 
        average_ticket: 85, 
        cogs_percent: 60, // Costos suben
        opex_fijo: 45000,
        logistics_cost: 8.0
      }
    }
  },

  // 5. ENGINE INTEGRATION
  model: (state) => {
    const next = { ...state };
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
