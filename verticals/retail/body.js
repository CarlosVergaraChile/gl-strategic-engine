/**
 * Retail Vertical Body
 * UI Configuration and Layout
 */

export const body = {
    theme: {
        primary: '#4c1d95', // Deep Purple 900
        accent: '#fbbf24',  // Amber 400 (Golden)
        risk_high: '#dc2626',
        risk_low: '#059669',
        background: '#fdfcfe',
        text: '#1e1b4b'
    },

    kpis: [
        { key: 'ebitda', label: 'EBITDA Final', unit: 'USD', format: 'currency' },
        { key: 'total_sales', label: 'Ventas Netas', unit: 'USD', format: 'currency' },
        { key: 'conversion_rate', label: 'Tasa Conversión', unit: '%', format: 'percentage' },
        { key: 'gross_margin', label: 'Margen Bruto', unit: 'USD', format: 'currency' }
    ],

    actionFeed: [
        {
            id: 'loyalty_program',
            label: 'Programa de Fidelidad',
            impact: { traffic: 5000, conversion_rate: 0.5, average_ticket: 10, opex_fijo: 5000 },
            description: 'Lanzar membresía VIP para aumentar frecuencia y gasto promedio.'
        },
        {
            id: 'logistics_automation',
            label: 'Automatización de Bodega',
            impact: { logistics_cost: -1.5, opex_fijo: 2000 },
            description: 'Implementar robots de picking para reducir costo por pedido.'
        },
        {
            id: 'private_label',
            label: 'Marca Propia (Private Label)',
            impact: { cogs_percent: -8, conversion_rate: -0.2 },
            description: 'Desarrollar productos propios con mayor margen, sacrificando levemente conversión.'
        }
    ]
};
