# HealthEye v0.2 — Flujo integrado urgencia/camas/pabellones, con evidencia pública

**Fecha:** 2026-11-12. **Estado:** experimento de software, validación exclusivamente técnica. No desplegado en Hostinger ni alimentado por censo real.

## Descubrimiento de datos (catálogo verificado; descarga directa NO lograda)

1. **MINSAL, REM20 Indicadores del proceso de hospitalización de establecimientos públicos.** Recurso CSV, ~27 MB, actualización indicada 27/10/2026, CC0:
   https://datos.gob.cl/dataset/indicadores-hospitalarios-rem20/resource/657cc933-eac8-4bfc-b004-c4d6dcd988a8
   Diccionario XLSX:
   https://datos.gob.cl/es/dataset/indicadores-hospitalarios-rem20/resource/6c7c8a9d-204d-4947-9c8e-82a893fc3f2e
   URL del recurso CSV publicada:
   https://datos.gob.cl/dataset/a756323f-85ba-4759-87dc-f5d5e63868cc/resource/657cc933-eac8-4bfc-b004-c4d6dcd988a8/download/indicadores_rem20_20260825.csv
   **No se descargó ni inspeccionó el esquema** desde este entorno: no se asignan columnas inventadas ni se atribuyen cifras a hospitales específicos.
2. **DEIS MINSAL:** bases de egresos, atención de urgencia, REM BS (intervenciones quirúrgicas), REM A08 (urgencias): https://deis.minsal.cl/faqs/ . Útiles para frecuencias y contexto; requieren diccionario y no entregan necesariamente la instantánea de camas, personal, alta y PACU diaria.
3. **FONASA GRD:** portal estatal destaca base GRD de hospitales con mecanismo de financiamiento. Ver catálogo:
   https://datos.gob.cl/ . Pertinente para producción, complejidad, estancia y financiamiento; no asumir disponibilidad de personal/pabellones a cada hora.
4. **NHS England, SitRep diario 2026-27:** https://www.england.nhs.uk/statistics/statistical-work-areas/bed-availability-and-occupancy/critical-care-and-general-acute-beds-urgent-and-emergency-care-daily-situation-reports/critical-care-and-general-acute-beds-urgent-and-emergency-care-daily-situation-reports-2026-27/
   Datos CSV reales de camas disponibles/ocupadas y categorías, pero NO calibran automáticamente un hospital chileno.
5. **Egresos y datos públicos no son una foto diaria local.** Se usará censo local autorizado cuando exista (por servicio, turno, categoría de cama y especialidad), sin RUT, nombres ni diagnósticos en GitHub.

## Implementación en rama de pruebas
- `adapters/health/daily-flow.js`: urgencia–cama–alta (serie agregada).
- `adapters/health/surgical-flow.js`: pabellones dotados, instrumental, recuperación PACU y camas postoperatorias. Límite estimado = mínimo entre demanda programada y recursos disponibles.
- `adapters/health/integrated-flow.js`: compara los dos flujos por fecha sin sumar sus camas, muestra cuellos y propuestas de coordinación.
- `adapters/health/synthetic-source.js`: 28 fechas ficticias, PRNG con semilla; fuente explícita `SYNTHETIC_HEALTHEYE_V1`.
- `demos/health/integrado.html`: página interactiva con regeneración y exportación CSV sintético; no envía datos a ningún servidor.
- `tests/health-surgical-flow.test.js` y `tests/health-integrated-flow.test.js`: restricciones de recursos, privacidad, consistencia temporal y reproducibilidad.

## Alertas de semántica / límites metodológicos
- **NO** contar altas previstas como camas efectivas disponibles.
- **NO** tratar plazas de recuperación postanestésica como camas de hospitalización.
- **NO** suponer que todas las camas de urgencia/hospitalización general son transferibles a cirugía: el piloto mantiene grupos independientes. Se requeriría mapa de recursos compartidos y reglas de compatibilidad para un modelo integrado real.
- Un límite diario de `upperBoundCases` **NO es producción real ni pronóstico de cirugías realizadas**. Para ello faltan duraciones de casos, especialidades, turnos, cancelaciones, personal, insumos, urgencias quirúrgicas y restricciones clínicas.
- La suma diaria de brechas **NO representa pacientes únicos** y no debe interpretarse como lista de espera.
- Variables del modelo fuente son **sintéticas e ilustrativas**, sin calibración de frecuencia ni distribución desde MINSAL.
- Si una regla o contrato no puede cumplirse, el software debe mostrar el error en lugar de fabricar datos.
- Ninguna propuesta es orden clínica, decisión de alta o indicación de operación.

## Adaptación futura a REM20 y FONASA
1. Descargar CSV y diccionario, registrar huella SHA256, fecha de consulta, licencia, codificación y cobertura.
2. Leer esquema auténtico y período de cada fila. El recurso puede tener datos agregados por hospital/mes; NO transformarlo artificialmente a censos diarios.
3. Diseñar tabla independiente de `externalBenchmarks` con `source, unit, establishment, period, value, observedAt, accessAt, licence, quality`.
4. Agregar contrato de `dailyOperationalCensus` solamente desde fuentes autorizadas de gestión hospitalaria, con fecha/hora de corte y responsable.
5. Comparar tendencia y rango con benchmarks públicos **sin forzar igualdad de valores**; revisar variaciones del modelo con datos observados.
6. Restringir el uso comercial de cualquier marca, benchmarking o dato hospitalario según licencia y confidencialidad.

## Primer piloto útil
**Reunión diaria de flujo**: vista del censo agregado, capacidad habilitada y dotada, altas verificadas y transferencias que requieren coordinación; segunda vista de pabellones-PACU-cama postoperatoria; semanalmente comparar alternativas y registrar resultados reales antes de añadir Monte Carlo calibrado.

## Comprobación técnica
GitHub Actions ejecuta `node --test tests/*.test.js` en la rama. La superación de pruebas confirma consistencia de contratos, no eficacia en decisiones clínicas, predicción hospitalaria ni cumplimiento regulatorio.
