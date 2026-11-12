# HealthEye v0.4 — revisión táctica semanal (experimento separado)

## Objetivo
Pasar de señales diarias sobre urgencia–cama–alta y pabellones–recuperación a una **agenda semanal de coordinación** que conserve trazabilidad, calidad y responsables. No automatiza decisiones clínicas.

## Diseño
- Entrada: censos diarios agregados verificados por `evaluateIntegratedDay`, separados por establecimiento y semana ISO (lunes-domingo).
- Salida: frecuencias de **días con señales**, con denominador explícito de jornadas reportadas.
- Señales: brecha de cama tras altas confirmadas; altas previstas sin confirmar; espera agregada >=12 h; capacidad quirúrgica teórica inferior a lo programado.
- La agenda incluye pregunta, equipo responsable y evidencia, **sin asignar puntajes automáticos de prioridad ni beneficios cuantificados**.
- Rechaza duplicados diarios, combinación de instituciones, mezcla de series observadas/sintéticas y cruces de semanas.
- Indica fechas sin información. Sin reporte no significa ausencia de problema.
- No suma brechas diarias para presentarlas como pacientes únicos ni cirugías canceladas.
- No permite atribuir causalidad a señales: las relaciones provienen de un modelo demostrativo.

## Archivos
- `adapters/health/weekly-review.js`: contrato de análisis semanal.
- `tests/health-weekly-review.test.js`: 7 pruebas de frecuencias, cobertura, trazabilidad y decisiones.
- `demos/health/semanal.html`: pantalla con semanas, señales y exportación CSV sintético.
- `.github/workflows/package-healtheye.yml`: agrega artefacto con ambas vistas `index.html` y `semanal.html`, exclusivo de la rama de desarrollo `healtheye-revision-semanal-v04`.

## Producto siguiente
Una agenda semanal por subdirección, conectada a la reunión de capacidad operativa. Solo después de implementar registro de decisiones, personas responsables, acuerdos, fechas y resultado observado —con gestión de permisos— se podrá medir ejecución de acciones.

## Datos
El set actual `synthetic-source.js` genera 28 días ficticios. No se ha probado ni calibrado con registros del Hospital El Carmen. REM20 es estadística mensual agregada, no un censo diario de camas/altas/recuperación.

## Gobierno de versiones
**NO fusionar en `arquitectura-nucleo-compartido-v3` mientras Kodee trabaja en el despliegue**. La rama es deliberadamente independiente. No enviar la rama de desarrollo al despliegue automático hasta comprobar la publicación actual y verificar visualmente `semanal.html`.

## Próxima propuesta funcional
Reunión semanal:
1. ¿Cuáles restricciones aparecen reiteradamente? ¿Cuántos días reportados?
2. ¿Qué señales se explican por falta de datos?
3. ¿Qué responsables deben validar la causa y qué coordinación se propone?
4. ¿Se adoptó una decisión formal? ¿Cuál fue el resultado observado la semana siguiente?
5. Solo cuando haya evidencia de impacto y esfuerzo, priorizar acciones mediante matriz impacto–factibilidad.
