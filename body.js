/**
 * Health Vertical Body (Carrocería)
 * UI Configuration and Layout
 */

export const HealthBody = {
    theme: {
        primary: '#2c3e50', // Azul Hospitalario
        accent: '#3498db',
        risk_high: '#e74c3c',
        risk_low: '#27ae60',
        background: '#f4f7f6',
        text: '#2c3e50'
    },

    kpis: [
        { key: 'ebitda', label: 'EBITDA Final', unit: 'M$', format: 'currency' },
        { key: 'ocupacion_camas', label: 'Tasa de Ocupación', unit: '%', format: 'percentage' },
        { key: 'tasa_siniestralidad', label: 'Siniestralidad (Loss Ratio)', unit: '%', format: 'percentage' },
        { key: 'dias_estancia_media', label: 'Días Estancia Media', unit: 'días', format: 'number' }
    ],

    actionFeed: [
        {
            id: 'reduce_siniestralidad',
            label: 'Reducir Siniestralidad',
            impact: { tasa_siniestralidad: -2 },
            description: 'Implementar programas de gestión de pacientes crónicos.'
        },
        {
            id: 'optimize_recambio',
            label: 'Optimizar Recambio de Camas',
            impact: { eficiencia_pabellon: 5 },
            description: 'Reducir tiempos muertos entre cirugías.'
        },
        {
            id: 'mitigate_legal',
            label: 'Mitigar Riesgo Legal',
            impact: { judicializacion_casos: -10 },
            description: 'Protocolos de consentimiento informado preventivo.'
        }
    ],

    layout: {
        columns: [
            {
                id: 'operation',
                title: 'Operación Hospitalaria',
                position: 'left',
                components: ['levers', 'capacity_kpis']
            },
            {
                id: 'compliance',
                title: 'Matriz de Cumplimiento y Riesgo',
                position: 'center',
                components: ['risk_nodes', 'legal_impact']
            },
            {
                id: 'results',
                title: 'Resultados Financieros',
                position: 'right',
                components: ['ebitda_gauge', 'profitability_metrics']
            }
        ]
    }
};
