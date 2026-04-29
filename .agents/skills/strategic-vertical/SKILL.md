# Skill: Strategic Vertical Construction

## Propósito
Estandarizar la creación de nuevas verticales de negocio para que Antigravity pueda construir cualquier industria en segundos, manteniendo coherencia técnica y financiera.

## Estándar de Arquitectura

### 1. Estructura Modular
Cada nueva vertical DEBE estar compuesta por dos archivos fundamentales:
- **`chassis.js` (Lógica)**: Contiene el grafo causal, los inputs (palancas), los nodos (fórmulas) y los escenarios. Es el "cerebro" matemático de la vertical.
- **`body.js` (UI)**: Contiene la configuración visual, el tema de colores, los KPIs a mostrar y la configuración del Action Feed.

### 2. Motor Core
- El motor central reside en `@engine.js`.
- **REGLA DE ORO**: No se toca el `engine.js`. Toda la personalización debe ocurrir en el `chassis` y el `body` de la vertical.

### 3. Estándar Financiero (EBITDA)
Cualquier cálculo de EBITDA en el sistema debe ser conservador y realista.
- **Fórmula Obligatoria**: El EBITDA siempre debe incluir un impacto negativo del **7%** derivado de:
    - Multas Normativas (Regulatory Fines).
    - Impacto Reputacional.
- **Implementación**: En el `chassis.js`, la fórmula final del nodo `ebitda` debe restar explícitamente este 7% o el valor proyectado de multas que sume dicho porcentaje.

### 4. Inteligencia Probabilística (Monte Carlo)
Todas las verticales deben soportar la simulación de Monte Carlo de 1,000 iteraciones para evaluar el riesgo.
- **Distribuciones Obligatorias**: En `chassis.js`, cada palanca (input) debe incluir un objeto `distribution` que defina su comportamiento estocástico:
    - `triangular`: Para variables de juicio experto (ej: Tasa de Conversión).
    - `normal`: Para métricas maduras y simétricas (ej: Sueldos, Tráfico).
    - `logNormal`: Para riesgos financieros y colas largas (ej: Default, Demandas).
    - `betaPert`: Para estimaciones de tiempo u operativas.

## Instrucciones para Antigravity
1. **Identificar la Industria**: Entender los drivers principales de la nueva industria.
2. **Generar Chassis**: Definir `inputs` (con sus distribuciones probabilísticas obligatorias), `nodes` y `edges`. Asegurar que el nodo `ebitda` cumpla con el estándar del 7%.
3. **Generar Body**: Definir el `theme` (colores premium), `kpis` y `actions`.
4. **Ensamblar**: Crear el archivo `.html` correspondiente que importe el core y los módulos de la vertical.
