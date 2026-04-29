/**
 * Health Vertical Chassis
 * Logic, Formulas, and Scenarios
 */

export const HealthChassis = {
    // 1. Palancas (Levers)
    levers: [
        { key: 'eficiencia_pabellon', label: 'Eficiencia Pabellón', min: 0, max: 100, step: 1, unit: '%', distribution: { type: 'triangular' } },
        { key: 'tasa_siniestralidad', label: 'Tasa Siniestralidad', min: 0, max: 120, step: 0.5, unit: '%', distribution: { type: 'normal', stdDev: 3 } },
        { key: 'judicializacion_casos', label: 'Judicialización Casos', min: 0, max: 1000, step: 1, unit: 'demandas', distribution: { type: 'logNormal', stdDev: 15 } },
        { key: 'presupuesto_mantenimiento', label: 'Ppto Mantenimiento', min: 0, max: 200, step: 5, unit: '%', distribution: { type: 'betaPert' } }
    ],

    // 2. Modelo Causal (Causal Graph)
    model: (state) => {
        const next = { ...state };

        // Constantes / Supuestos
        const PABELLONES = 12;
        const TASA_SUSPENSION = 15; // %
        const PRIMAS = 5000; // M$
        const PRECIO_PRESTACION = 1.2; // M$
        const COSTOS_OPERATIVOS = 3500; // M$
        const UF = 37000;

        // --- NODOS ---

        // Capacidad Quirúrgica
        next.capacidad_quirurgica = PABELLONES * (next.eficiencia_pabellon / 100) * (1 - TASA_SUSPENSION / 100) * 30; // mensual aprox

        // Margen Aseguradora
        // Tasa siniestralidad ideal < 90%
        next.prestaciones_pagadas = (next.tasa_siniestralidad / 100) * PRIMAS;
        next.sil = next.prestaciones_pagadas * 0.15; // Subsidios Incapacidad Laboral
        next.margen_aseguradora = PRIMAS - (next.prestaciones_pagadas + next.sil);

        // Riesgo Normativo
        // Si el mantenimiento cae bajo el 70%, aumenta la probabilidad_falla.
        next.probabilidad_falla = next.presupuesto_mantenimiento < 70 ? (70 - next.presupuesto_mantenimiento) * 0.5 : 0;
        
        // Multas SuperSalud
        // Variable acumulativa por infracciones reiteradas o fallas
        next.multas = Math.min(4000 * UF / 1e6, next.probabilidad_falla * 10); // En M$

        // Impacto Reputacional (Basado en judicialización)
        next.impacto_reputacional = next.judicializacion_casos * 0.8;

        // EBITDA Final
        next.ebitda = (next.capacidad_quirurgica * PRECIO_PRESTACION) + next.margen_aseguradora - COSTOS_OPERATIVOS - next.multas - next.impacto_reputacional;

        // --- REFERENCIA CIRCULAR (Demostración para el Motor) ---
        // Ocupación Camas <-> Readmisiones
        // A mayor ocupación, más readmisiones (alta precoz), y más readmisiones aumentan la ocupación.
        const base_ocupacion = 80;
        next.readmisiones = (next.ocupacion_camas || base_ocupacion) * 0.05;
        next.ocupacion_camas = base_ocupacion + (next.readmisiones * 0.5);

        return next;
    },

    // 3. Escenarios
    scenarios: {
        base: {
            eficiencia_pabellon: 85,
            tasa_siniestralidad: 92,
            judicializacion_casos: 50,
            presupuesto_mantenimiento: 100,
            ocupacion_camas: 80
        },
        crisis_isapre: {
            eficiencia_pabellon: 75,
            tasa_siniestralidad: 97,
            judicializacion_casos: 450,
            presupuesto_mantenimiento: 60,
            ocupacion_camas: 95
        },
        eficiencia_publica: {
            eficiencia_pabellon: 95,
            tasa_siniestralidad: 88,
            judicializacion_casos: 20,
            presupuesto_mantenimiento: 110,
            ocupacion_camas: 75
        }
    }
};
