# HealthEye — Piloto 1: flujo urgencia–cama–alta (contrato operativo)

Fecha: 2026-11-11. Estado: prototipo técnico, datos de ejemplo no clínicos. No desplegado.

## Decisión de producto
Priorizar la coincidencia de **demanda, cama efectivamente disponible y alta confirmada**. Una cama física no basta: debe estar habilitada, contar con dotación y no estar bloqueada. Una alta prevista no constituye capacidad disponible hasta ser confirmada y operacionalmente habilitada.

El primer resultado debe presentar:
- Censo diario y hora de corte, con fecha efectiva y origen.
- Camas físicas, habilitadas, con personal, bloqueadas, ocupadas y efectivas.
- Pacientes de urgencia esperando cama (conteo agregado) y señal de espera >=12 horas.
- Altas previstas vs confirmadas.
- Capacidad actual y dos escenarios: altas confirmadas; todas las previstas (hipotético).
- Propuestas de coordinación por responsables, siempre para aprobación humana.

## Referencias que fundamentan la definición
- NHS England, 2026-27 UEC bed SitRep: https://www.england.nhs.uk/statistics/statistical-work-areas/bed-availability-and-occupancy/critical-care-and-general-acute-beds-urgent-and-emergency-care-daily-situation-reports/critical-care-and-general-acute-beds-urgent-and-emergency-care-daily-situation-reports-2026-27/
  - corte 8am; camas efectivamente disponibles y con dotación; capacidad planificada no equivale a capacidad disponible.
- DEIS Chile: https://deis.minsal.cl/ ; sistemas https://deis.minsal.cl/sistemas/ . Datos REM, urgencias y egresos disponibles como contexto/benchmark.
- CMS hospitales: https://data.cms.gov/provider-data/topics/hospitals . Datos comparativos de calidad, **no** sustituto de capacidad diaria.
- Documentación de trabajo del programa HEC en Google Drive: «HEC - Informe 03 - Programa de normalización 2026-2027» y «HEC - Informe 04 - Guía operativa de normalización 2026-2027». Los documentos respaldan el foco de flujo, la reunión diaria, altas previstas, capacidad efectiva, restricciones y medidas de proceso/resultado/equilibrio. **No copiar cifras, datos operacionales internos ni detalles de personas desde documentos de cliente al repositorio público**.

## Contrato v0.1 — valores agregados (censo de un establecimiento)
Campos mínimos:
```json
{
  "facility":"Hospital demostrativo",
  "date":"2026-11-11",
  "recordedAt":"2026-11-11T07:00:00Z",
  "source":"synthetic-fixture",
  "physicalBeds":100,
  "enabledBeds":90,
  "staffedBeds":80,
  "blockedBeds":5,
  "occupiedBeds":72,
  "edPatientsAwaitingBed":12,
  "edPatientsAwaitingBedSinceHours":15,
  "expectedDischarges":7,
  "confirmedDischarges":4
}
```
**Estos valores son enteramente inventados para probar el programa.** No representan al HEC.

Reglas: 0 <= habilitadas <= físicas; 0 <= con dotación <= habilitadas; bloqueadas <= con dotación; ocupadas <= efectivas; confirmadas <= previstas <= ocupadas. Ante falta de dato relevante, error visible; **nunca imputación silenciosa**.

Las reglas iniciales son conservadoras. Un hospital con ocupación > capacidad dotada (sobrecupo) requerirá excepción reportada y nueva definición operativa, en vez de fabricar camas disponibles.

## Cálculos v0.1
```
camas_efectivas = camas_con_dotacion - camas_bloqueadas
disponibles_hoy = camas_efectivas - camas_ocupadas
capacidad_si_altas_confirmadas = disponibles_hoy + altas_confirmadas
capacidad_si_todas_previstas = disponibles_hoy + altas_previstas
brecha_confirmada = max(0, espera_urgencia - capacidad_si_altas_confirmadas)
```
No mezclar camas de adultos, pediátricas, críticas, aislamiento ni especialidad en decisiones reales. Se requiere un **segundo contrato por categoría de cama** y compatibilidad paciente-recurso antes de cualquier asignación asistencial.

## Recomendaciones y límites
- Solo se proponen acciones de coordinación (verificar cama, alta, traspaso).
- Las altas deben ser **validadas clínicamente**. Jamás inferirlas de simulación o necesidad de camas.
- No prescribir tratamiento ni indicar movimiento de personas; cada decisión corresponde a responsable local.
- Sin datos de pacientes, RUT, diagnóstico, ficha clínica o datos personales.
- `demos/health/index.html`: interfaz de ejemplo, ejecuta localmente en el navegador con datos sintéticos.
- `adapters/health/daily-flow.js`: funciones puras.
- `tests/health-daily-flow.test.js`: pruebas de capacidad, altas y gobernanza.
- Los datos operacionales reales deben ser consentidos/autorizados, de mínima granularidad, con almacenamiento y autenticación apropiados.

## Validación futura antes de pilotear
1. Definir unidad de observación: hospital / establecimiento / servicio / turno / cama tipo.
2. Confirmar con jefaturas el significado real de «habilitada», «efectiva», «bloqueada», «alta confirmada», «espera» y el corte diario.
3. Recoger 2-4 semanas de series agregadas autorizadas y verificar duplicados, cortes y calidad.
4. Validar manualmente 10-20 reuniones de coordinación: alertas correctas, datos faltantes, acciones ejecutables y tiempos.
5. Pruebas de seguridad, roles, versiones, auditoría, observaciones de resultados y mejora.
6. Solo entonces introducir simulación probabilística semanal calibrada; no utilizar los datos NHS o DEIS como parámetros hospitalarios locales.

## Próximos módulos
- Pabellones: inicio oportuno, suspensiones, dotación y recuperación; dependencia con camas postoperatorias.
- Lista de espera: depuración, contacto, priorización y oferta/producción por especialidad.
- Dotación efectiva y ausentismo: capacidad real por turno.
- Se integra con el núcleo general mediante evidencia versionada, **no** mezclando datos sensibles de clientes.
