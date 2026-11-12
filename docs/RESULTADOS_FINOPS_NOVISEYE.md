# Continuación cuarta fase: finanzas y calidad de evidencia

## Resultados comprobados — CI
- GitHub Actions run `43141375484`: **22 tests, 22 pass, 0 fail**.
- Incluye AquaEye, HealthEye, núcleo Monte Carlo, aislamiento sectorial, grafo dirigido, FinOps DEMO y agregación NovisEye.
- Este resultado solo cubre comportamiento técnico de prototipos, **no calidad predictiva ni seguridad productiva**.

## FinOps / EquifaxEye
- Fuente observada: `verticals/finops/chassis.js` del propio repositorio.
- Nuevo `core/graph-v3.js`: evaluación de DAG con detección de ciclos, nodos faltantes y resultados no finitos; NO infiere causalidad. Las dependencias se declaran explícitamente.
- Nuevo `adapters/finops/index.js`: ejecuta las fórmulas ilustrativas existentes, reutiliza incertidumbre compartida. Etiquetado `illustrative-model`.
- El cálculo original de multas CMF y el efecto de inversión en cumplimiento son **hipótesis codificadas**, no evidencia normativa. No llevar a una oferta como predicción validada.
- `gl-finanzas/equifax/index.html` es una presentación de continuidad/operaciones y riesgo con métricas demostrativas. No constituye una conexión ni validación oficial con Equifax.

## NovisEye
- Fuente observada: repositorio archivado `NovisEye` con backend PHP/MySQL `api.php`, `index.php`, `schema.sql`, y variantes HTML en `gl-finanzas/novis/`.
- Nuevo `adapters/novis/index.js`: procesa eventos operacionales declarando si son `synthetic` u `observed`; impide mezclar ambas procedencias, monedas y eventos no confirmados como ahorro efectivo.
- Lo anterior es **interfaz técnica** para un futuro ingreso de datos, no una integración con la base MySQL actualmente desplegada.

## Seguridad — acciones requeridas antes de conectar a Hostinger
1. **Eliminar clave API de respaldo** en `NovisEye/api.php`. No copiarla a otro repositorio ni mostrarla en documentación. Exigir un secreto desde configuración segura y **rotar** credenciales si pudo ser utilizado.
2. Revisar endpoints `GET kpis` y `GET events` que en el código observado responden sin `authCheck()`: considerar autenticación por tenant y permisos de acceso, incluso para lecturas.
3. Restringir CORS por dominio; evitar la combinación de `Access-Control-Allow-Origin: *` con exposición de información privada.
4. No incluir trazas SQL y excepciones internas completas en respuestas públicas.
5. Revisar almacenamiento de logs, protección de archivos bajo el webroot, controles de tasa de concurrencia, y gestión de datos de clientes.
6. Separar datos de ejemplo sembrados en `schema.sql` de los datos de producción, y mostrar siempre `DEMOSTRACIÓN` cuando corresponda.
7. Los repositorios `NovisEye` y `gl-finanzas` están archivados, por tanto sus archivos **no han sido modificados**; este documento no equivale a un parche desplegado.

## Próxima integración recomendada
- Crear un adaptador HTTP **solo lectura, autenticado** hacia NovisEye, que normalice ROI events al contrato común.
- Validar el algoritmo de alertas y reglas de calidad con datos anonimizados y un caso de uso real.
- Migrar fórmulas financieras solo después de identificar unidades, horizonte temporal y fuentes empíricas.
- Separar claramente vertical financiero interno de servicios contratados por instituciones y productos PYME.
- Agregar regresión cruzada de versiones históricas de `novis_v12` a `novis_v16` después de comparar las funciones efectivas; no suponer que v16 contiene todo.
