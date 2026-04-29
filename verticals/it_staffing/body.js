/**
 * IT Staffing Vertical Body
 * UI Configuration and Layout
 */

export const body = {
    theme: {
        primary: '#1e293b', // Slate 800
        accent: '#3b82f6',  // Blue 500
        risk_high: '#ef4444',
        risk_low: '#22c55e',
        background: '#f8fafc',
        text: '#0f172a'
    },

    kpis: [
        { key: 'ebitda', label: 'EBITDA Final', unit: 'USD', format: 'currency' },
        { key: 'tasa_utilizacion', label: 'Utilización', unit: '%', format: 'percentage' },
        { key: 'attrition_mensual', label: 'Churn Rate', unit: '%', format: 'percentage' },
        { key: 'ingreso_operacional', label: 'Ingresos', unit: 'USD', format: 'currency' }
    ],

    actionFeed: [
        {
            id: 'fidelizacion',
            label: 'Plan de Fidelización',
            impact: { inversion_retencion: 10000, attrition_mensual: -0.8 },
            description: 'Incrementar presupuesto de bienestar para bajar el attrition.'
        },
        {
            id: 'eficiencia_comercial',
            label: 'Optimización de Bench',
            impact: { tasa_utilizacion: 5 },
            description: 'Mejorar el matching de perfiles para reducir el tiempo en banca.'
        },
        {
            id: 'ajuste_tarifario',
            label: 'Ajuste de Fee Anual',
            impact: { fee_hora_promedio: 3 },
            description: 'Negociar incremento de tarifas con clientes clave.'
        }
    ]
};
