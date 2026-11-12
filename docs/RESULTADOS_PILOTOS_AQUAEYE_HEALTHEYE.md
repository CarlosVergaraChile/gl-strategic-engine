# Resultado de pilotos del núcleo común — AquaEye y HealthEye

## Estado de código
Rama: `arquitectura-nucleo-compartido-v3`. NO fusionada ni desplegada en producción.

### Criterios comprobados mediante GitHub Actions
1. Módulo Monte Carlo genérico con semilla: misma entrada y semilla => misma salida.
2. Métrica explícita: el núcleo no presupone EBITDA ni una moneda específica.
3. Validación de distribuciones y entradas inválidas.
4. AquaEye: adaptador conserva resultados de `simulate` y `calculateEconomics` de escenarios predefinidos del snapshot de `gl-portal`.
5. HealthEye: adaptador conserva resultados operativos y económicos de los escenarios predefinidos, incluyendo modos público y privado.
6. Horizontes y unidades diferenciados: AquaEye `cycle / million USD`; HealthEye `month / CLP`.
7. Ejecuciones intercaladas sin contaminación entre verticales.
8. GitHub Actions: `node --test tests/*.test.js` (Node 22).

### Qué NO prueban estas pruebas
- Que las fórmulas originales sean correctas o estén calibradas con datos del cliente.
- Que todas las distribuciones supuestas sean adecuadas.
- Que existan dependencias estadísticas o causales acreditadas.
- Equivalencia de distribuciones Monte Carlo antiguas con el nuevo RNG (no se espera igualdad aleatoria bit a bit).
- Confiabilidad productiva o desempeño bajo carga.
- Adaptación directa al código publicado en Hostinger; no hubo despliegue.

## Deuda técnica observable
- Snapshot temporal del contrato duplicado en `adapters/salmon/vertical-contract.js` y `adapters/health/vertical-contract.js`. Después de validar, consolidar en un paquete versionado único y construir pruebas de contrato; no replicar definitivamente.
- HealthEye incorpora supuestos sanitarios y económicos ilustrativos de `gl-portal`; adecuarlos al ámbito contractual de cada hospital antes de presentar escenarios como predicciones.
- El nodo `backlog` en AquaEye representa pérdidas y no una cola de espera; no sumarlos en UI multisectorial.
- Los ciclos de cálculo y el grafo causal requieren un solucionador formal / detección de no convergencia, independiente de Monte Carlo.
- Datos de entrada: incluir trazabilidad temporal, validaciones, unidades y calidad antes de proponer decisiones tácticas semanales.
- Integración futura NovisEye/EquifaxEye: revisar permisos, secret fallback y modelos heurísticos antes de migrar.

## Siguiente paso propuesto
Validar con datasets anonimizados un escenario por vertical y comparar contra cálculo externo independiente. Solo entonces sustituir los módulos Monte Carlo internos de cada producto a través de una interfaz versionada.
