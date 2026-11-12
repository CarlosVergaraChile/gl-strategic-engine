# Benchmark internacional y fuentes verificables — revisión 2026-11-11

## Alcance
Investigación externa en páginas oficiales de proveedores, organismos públicos y documentación de proyectos abiertos. **No autoriza copiar código propietario, interfaz idéntica, marcas, datasets restringidos ni afirmar resultados de clientes no verificados.** La tabla distingue referentes, datos reales accesibles y nuestra inferencia técnica.

## Sistemas y mejores prácticas útiles

| Sistema | Patrón constatado | Aplicación propuesta | Fuente oficial |
|---|---|---|---|
| Palantir Foundry / Ontology | Aplicación orientada a decisiones: contexto vigente, escenarios, acciones autorizadas, registro y realimentación | DecisionRecord común: dato → escenario → aprobación → resultado posterior | https://www.palantir.com/docs/foundry/app-building/operational-apps |
| o9 Digital Brain | Data/knowledge graph y ciclo sense-model-simulate-decide-execute-learn, planificación entre horizontes | Estados diarios, decisiones semanales, resultados y actualización | https://o9solutions.com/digital-brain |
| Kinaxis Maestro | Planeación concurrente, what-if y propagación de restricciones entre áreas | Detectar efectos de alterar demanda/capacidad y registrar alternativas | https://investors.kinaxis.com/news-releases/news-release-details/2026/MANE-Selects-Kinaxis-to-Strengthen-Global-Planning-Capabilities/default.aspx |
| FICO Platform | Reglas, modelos predictivos, optimización y productos verticales | Políticas versionadas y validación financiera separada del core numérico | https://www.sec.gov/Archives/edgar/data/814547/000081454726000042/fico-20260930.htm |
| Great Expectations | Suites de reglas explícitas sobre datos y verificación por lotes | Contratos de calidad para entradas y datasets de referencia | https://docs.greatexpectations.io/docs/core/define_expectations/organize_expectation_suites/ |
| OpenLineage | Metadatos de linaje dataset, job, run | Trazar origen, ejecución, modelo, fecha y evidencia | https://openlineage.io/docs/1.49.0/ |

**Posicionamiento:** reproducir patrones de buenas prácticas por implementación propia, NO declarar equivalencia funcional con estos productos empresariales.

## Datos públicos reales por vertical

### AquaEye — prioridad alta
- Chile, SERNAPESCA: https://www.sernapesca.cl/manuales_y_publicaciones/informacion-para-la-transparencia-en-la-acuicultura/ . Ofrece descargas de mortalidades, cosechas y tratamientos con períodos 2023–2025.
- Informe sanitario 2025: https://www.sernapesca.cl/informes-y-datos/resultados-de-gestion/ ; informe oficial registra **mortalidad total anual nacional de 9,7% en 2025**. Se permite mostrarla como **referencia externa nacional**, no sustituir con ella `loss_pct` de un centro/ciclo específico.
- Noruega, Dirección de Pesca: https://www.fiskeridir.no/english/aquaculture/statistics-for-aquaculture/atlantic-salmon-and-rainbow-trout . Historias nacionales/regionales de ventas, pérdidas, existencias, 1994–2025 según serie.
- BarentsWatch Fishhealth: https://www.barentswatch.no/en/articles/open-data-via-barentswatch/ . Salud, enfermedades, piojos y piscicultura; verificar requisitos de API/licencia.

**Primer test empírico:** alinear mortalidad por especie, región y período, distinguir número peces y biomasa, comparar distribuciones temporales, comprobar consistencia unidades; estimar umbrales solo cuando el nivel de desagregación corresponda al modelo.

### HealthEye — prioridad alta
- CMS: https://data.cms.gov/provider-data/topics/hospitals y https://data.cms.gov/provider-data/dataset/xubh-q36u . Dataset público de establecimientos y comparaciones de calidad. **No contiene necesariamente el flujo diario de camas/pabellones** requerido para calibrar nuestro simulador.
- MIMIC-IV: https://physionet.org/content/mimiciv/ . Datos de detalle sujetos a credentialing, capacitación CITI y Data Use Agreement; NO descargarlos ni copiarlos sin autorización. Tampoco inferir que datos estadounidenses representan hospitales chilenos.
- Para flujo HEC/Chile: priorizar datasets propios de gestión de camas, pabellones, urgencia y listas de espera si la institución autoriza uso; no subir registros clínicos o identificatorios a repositorios GitHub.

**Primer test empírico:** conciliación diaria camas efectivas, altas proyectadas, ingresos desde urgencia, ocupación y suspensiones; comparar decisiones sugeridas con decisiones reales bajo revisión profesional.

### Finanzas — prioridad media
- CMF indicadores de mora ≥90 días por banco y cartera: https://www.cmfchile.cl/portal/estadisticas/626/w4-propertyvalue-28914.html ; series históricas y API CMF: https://api.cmfchile.cl/
- FRED: https://fred.stlouisfed.org/docs/api/fred/overview.html . Series tasas, actividad, inflación, históricas y ALFRED. Confirmar API key, frecuencia, revisiones y licencia.
- **No inferir riesgo crediticio PYME individual de mora agregada**: agregados sirven como contexto, no entrenamiento de scoring individual sin datos de crédito legítimos y controles de sesgo.

**Primer test empírico:** escenario de financiamiento/caja usando series económicas observadas y pruebas de estrés, más datos transaccionales propios con autorización.

### IDIEM / compras públicas — oportunidad
- Separar datos abiertos de Mercado Público y reglas de identificación institucional. No asumir que RUT de casa matriz identifica una unidad dependiente.
- Evaluar integridad, fechas, proveedor, unidades compradoras, calidad del matching y auditoría antes de recomendar.

## Arquitectura que conviene construir (versión incremental)
1. `validateEvidence` + `assessCalibrationFit`: prueba procedencia, unidad, geografía, población y período; agregados externos jamás sustituyen observaciones locales automáticamente.
2. `createDecisionRecord`: registra versión de modelo, hipótesis, fecha, horizonte, alternativas y aprobación humana.
3. `appendObservedOutcome`: registra qué ocurrió tras la decisión, para evaluación posterior sin inferir causalidad automáticamente.
4. Retener núcleo Monte Carlo y grafos existente con sus pruebas.
5. Incorporar métricas de precisión por escenario, backtesting temporal y estimación de intervalos, separadamente por vertical.
6. Desacoplar UI y bibliotecas de medición/optimización; no obligar a que cada aplicación use todos los módulos.

## Prioridad de negocio y validación (matriz de decisión preliminar)
| Producto | Datos reales disponibles | Complejidad | Potencial de piloto | Próximo umbral |
|---|---|---|---|---|
| AquaEye | SERNAPESCA + Noruega, agregados públicos | Media | Alto para benchmark | Transformar una serie oficial, validar esquema, documentar representatividad |
| HealthEye | CMS público; datos asistenciales propios sujetos a permisos | Alta | Alto con institución | Obtener set operativo anonimizado y reglas de actualización |
| NovisEye | Eventos ROI deben venir de operaciones de un cliente | Media | Media | Corregir API, ingesta y procedencia antes de conectar producción |
| EquifaxEye / Liquidez PYME | CMF agregados + caja de empresa autorizada | Alta | Media | No presentar umbral regulatorio heurístico como norma ni score como validado |
| AlgoControl | Series de mercado históricas más simulaciones auditables | Alta | Media | Backtests OOS, leakage, drift, fat tails, múltiples regímenes |
| SAM | Pruebas manuscritas anotadas y consentimiento | Alta | Media | Evaluación OCR y acuerdo con docentes, revisión humana |

## Restricciones de marketing y calidad
- Etiquetas uniformes: **demo**, **prototipo**, **validación técnica**, **piloto con datos reales**, **producto comercial**.
- 22 pruebas previas del núcleo verifican corrección técnica parcial, **no** sensibilidad real, calidad financiera, validación clínica o eficacia de decisiones.
- No publicar datos privados de clientes, credenciales, nombres de estudiantes ni información personal.
- Mantener apps verticales independientes y desplegables; core versionado por contrato y migración gradual.
