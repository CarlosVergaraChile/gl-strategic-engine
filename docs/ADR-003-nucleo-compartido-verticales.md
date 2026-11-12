# ADR-003 — Núcleo compartido, verticales autónomas

**Fecha:** 2026-11-11  
**Estado:** DECISIÓN ARQUITECTÓNICA PROPUESTA (no desplegada)  
**Revisión:** repositorios `gl-strategic-engine`, `gl-portal`, `NovisEye`, `gl-finanzas`, `strategic-finance-navigator`, `AquaEye`, `idiem-decision-intelligence`.

## Decisión

**Arquitectura híbrida:** un paquete común de métodos numéricos y contratos verificables, reutilizado por **modelos sectoriales independientes y aplicaciones comerciales autónomas**. No unificar todas las UI ni bases de datos y no convertir una sola fórmula de EBITDA en un motor universal.

### Tres tipos de componentes

1. **Core metodológico versionado** (sin conceptos de salud, crédito, salmonicultura, etc.). Ingesta y validación, tiempo/unidades, grafo de dependencias dirigido, resolución acíclica (y tratamiento explícito de ciclos), escenarios, incertidumbre Monte Carlo reproducible, sensibilidad, restricciones, trazabilidad de premisas, resultados y alertas. Utilidades genéricas de optimización solo cuando haya casos y pruebas.
2. **Adaptadores o modelos verticales**: variables, unidades, horizonte, ecuaciones, políticas, capacidades, datos, supuestos, acciones admisibles y límites regulatorios. Ejemplos: HealthEye flujo camas-pabellones-lista de espera; AquaEye FCR-mortalidad-biomasa; EquifaxEye decisiones de crédito/compliance/API; NovisEye productividad, ahorro, ROI y operaciones.
3. **Apps/experiencias independientes**: identidad, permisos, reportes, interface, identidad comercial, métricas, datasets y despliegue por cliente; no obligar a todas a un mismo frontend.

No alojar datos sensibles de diferentes clientes en un mismo almacén por conveniencia de desarrollo. El núcleo puede funcionar como paquete en navegador/Node (actual stack JavaScript) y exponer contratos interoperables para Python/PHP donde corresponda. No copiar un runtime JS a aplicaciones PHP sin definir frontera HTTP o implementación certificada.

## Evidencia específica revisada

- `gl-portal/vertical-contract.js`: ya separa `simulate`, `constraints`, `calculateEconomics`, `buildViewModel` y provee utilidades de percentil y muestreo. Reutilizar y fortalecer, no reescribir todo.
- `gl-portal/vertical-health.js` y `vertical-salmon.js`: ambos contienen Monte Carlo y sensibilidad verticales, con lógica que puede encapsularse; requieren pruebas de equivalencia antes de migrar.
- `gl-strategic-engine/core/simulation.js`: código de Monte Carlo con `Math.random`, resultado forzado a `mcState.ebitda || 0`, tres iteraciones fijas del grafo y distribuciones sin validaciones exhaustivas. No usarlo directamente como estándar de producción.
- `gl-strategic-engine/engine.js`: compara estados con igualdad exacta y repite el modelo hasta 1000 veces; no detecta ni resuelve formalmente ciclos matemáticos.
- `gl-strategic-engine/verticals/finops/chassis.js`: supuestos ilustrativos y umbrales de multas/regulación codificados como constantes, no normas verificadas.
- `gl-finanzas/equifax/index.html`: EquifaxEye como tablero de riesgo/compliance, APIs y simulaciones de eventos ilustrativos. No asumir que es un modelo real de score crediticio operacional.
- `gl-finanzas/novis/novis_v16.html`: NovisEye v16 contiene demos, decisiones operacionales, escenarios, KPI y grafo causal visual; alta deuda de lógica y UI en único HTML.
- `NovisEye/api.php` y `schema.sql`: backend PHP/MySQL para eventos ROI, no mismo runtime ni mismo alcance que el simulador.
- `strategic-finance-navigator/src/components/Simulator.tsx`: simulación económica interactiva relacionada, pero focalizada en adopción/operaciones TI; no mezclar por coincidencia de nombre.
- `AquaEye`: landing comercial distinta del motor detallado de `gl-portal/vertical-salmon.js`.
- `idiem-decision-intelligence`: demo institucional con datos simulados, no un piloto validado.

## NovisEye versus EquifaxEye: relación correcta

**Comparten infraestructura de análisis y gestión de decisiones, no la semántica de negocio.**

- NovisEye: seguimiento de eventos, productividad, ahorros, ROI, eficacia de automatizaciones y decisiones tácticas empresariales.
- EquifaxEye: operaciones y riesgo de APIs de información/score, cumplimiento y continuidad de servicio en un caso de uso financiero. El dashboard Equifax observado es principalmente ilustrativo.
- Un tercer producto de **liquidez PYME / evaluación de crédito** puede usar el mismo núcleo, pero no equivale a EquifaxEye. Debe catalogarse aparte y verificarse la titularidad y alcance de sus fuentes antes de presentarlo como software de Equifax.

Propuesta: mantener fichas comerciales y modelos separados; compartir contratos de escenarios, evaluación económica, explicación y registro de evidencia.

## Horizon temporal (clave de diseño)

**Diario → semanal → mensual** sin colapsar frecuencias:
- Dato observado incluye fuente, fecha efectiva, fecha de carga, calidad, unidad y tratamiento de ausencias.
- Estado operativo diario: inventario, colas, camas, demanda, precios, etc.
- Decisión táctica semanal: restricción activa, acción disponible, costo, efecto esperado e incertidumbre.
- Evaluación mensual: efectos acumulados, forecast vs observado y cambio de políticas.

Las simulaciones deben exponer `as_of`, `horizon`, `model_version`, `assumptions_version`, `seed`, `sample_count`, `source_lineage` y `limitations`. Prohibido presentar extrapolación causal por mera correlación.

## Contrato mínimo

```text
validateData(observations, dataContract) -> qualityReport
simulate(operationalInputs, assumptions, context) -> operationalResult
constraints(operationalResult, context) -> bottlenecks/violations
calculateEconomics(operationalResult, assumptions, context) -> outcomes
runUncertainty({model, inputs, distributions, outputSelector, seed, iterations}) -> result
rankActions({actions, constraints, outcome, confidence}) -> candidateActions
buildViewModel(...) -> sector-specific presentation
```

Gráficos, lenguaje y apariencia **no** dentro del núcleo numérico. Grafo estructural no prueba causalidad estadística: cada relación debe declarar si es identidad, supuesto, estimación empírica o hipótesis.

## Secuencia de migración (strangler / no big bang)

1. **Freeze y pruebas basales:** capturar resultados actuales con inputs fijos para cada vertical; documentar unidades y defectos existentes. Inventariar credenciales y datasets.
2. **Core genérico sin despliegue:** módulo Monte Carlo con RNG sembrado, selección explícita de métrica y metadatos; tests. No reemplazar funciones de las apps todavía.
3. **Piloto primera vertical AquaEye o HealthEye:** adaptador, pruebas de regresión y comparar resultados contra baseline. Preferir AquaEye por demos de simulación existentes y sensibilidad relativamente acotada.
4. **NovisEye y EquifaxEye por separado:** identificar módulos realmente reusables; migrar solo cálculos validados. Resolver API/auth de NovisEye antes de producción.
5. **Versionado semántico:** `core 0.x` hasta pruebas, con apps fijadas a versiones; no updates automáticos sin pruebas.
6. **Consolidación editorial:** una ficha por producto y catálogo interno de repositorios/variantes. No archivar originales hasta confirmar dependencias, datos y deployments.

## Hallazgos de seguridad que bloquean exposición pública
- `NovisEye/api.php` contiene una **clave API por defecto codificada en código** si falta variable de entorno. Eliminar el fallback, exigir secreto configurado, rotar la clave y revisar endpoints sin auth.
- CORS `Access-Control-Allow-Origin: *` puede ser inadecuado para operaciones autenticadas; definir origen permitido y autorización por recurso.
- Datos demo de `NovisEye/schema.sql` están sembrados como ejemplos de ROI, no evidencia de ahorros reales.
- `EquifaxEye` es prototipo asociado a marca ajena, y debe evitar afirmar datos o métricas reales sin sustento.
- Modelos de impacto regulatorio de `finops/chassis.js` son heurísticos y no fórmulas reguladoras verificadas.

## Criterios de aceptación del núcleo
- Reproducibilidad exacta con seed fijo y entrada idéntica.
- Errores claros para parámetros/distribuciones inválidas.
- Selección de resultado (no solo EBITDA).
- Respeto de restricciones/unidades/horizonte y prueba de no contaminación entre verticales.
- Pruebas de calibración e incertidumbre, análisis de sensibilidad y contraste con datos observados.
- Referencia de fuentes y clasificación de relaciones (hipótesis versus estimado).
- No cambios a producción hasta completar pruebas.
