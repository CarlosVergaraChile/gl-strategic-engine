# ADR-004 — Reutilización primero: GitHub, necesidades de negocio y Chile

**Fecha:** 2026-11-12  
**Decisión:** para cada funcionalidad nueva de HealthEye, **primero buscar repositorios reconocidos en GitHub y productos líderes**. Solo desarrollar código propio si los activos disponibles no cumplen los requisitos operativos, de licencia, seguridad o compatibilidad.

## Secuencia obligatoria ANTES de programar
1. **Problema verificable:** identificar usuario que toma la decisión, frecuencia, fuente de datos, acción concreta, costo/tiempo que podría ahorrar, mecanismo de seguimiento y evidencia de resultado.
2. **Repositorios existentes:** buscar en GitHub (organizaciones de salud, stars, forks, actividad reciente, comunidad, issues, pruebas, documentación, releases, seguridad, compatibilidad, licencia) y en la industria. No elegir por estrellas solamente.
3. **Decisión de reutilización:** `usar-componente`, `integrar-API`, `adaptar-fork`, `aprender-patrón`, `no-usar`; justificar en 1 párrafo y registrar versión/commit/licencia. Revisar avisos de copyright, redistribución, marcas y dependencias. No copiar código propietario.
4. **Ajuste a Chile:** requisitos MINSAL/DEIS/FONASA, interoperabilidad HL7 FHIR R4, requisitos de seguridad y tratamiento de datos, procesos de sector público, compras públicas, hospitales con recursos limitados. El producto NO debe depender de reemplazar la ficha clínica del establecimiento.
5. **Piloto de valor en 2–4 semanas:** mínimo conjunto de datos autorizado (sin identificadores de pacientes), usuario/dueño, una decisión real y una medida de adopción y resultado; comparar contra línea base antes de cuantificar beneficio.
6. **Después** construir solo el diferencial de HealthEye. No construir un ERP hospitalario ni una ficha clínica completa.

## Mercado meta y propuesta
**1.º hospitales públicos chilenos / Servicio de Salud / MINSAL; 2.º clínicas y redes privadas chilenas.**

La venta inicial NO es inteligencia artificial abstracta ni un dashboard adicional. Es una **rutina operativa con capacidad diaria, gestión semanal de restricciones, acuerdos, trazabilidad y medición de cumplimiento**. Inicio independiente y por CSV agregado; conectores interoperables solo cuando hay sistema y autorización.

- Usuarios compradores/influenciadores públicos: Dirección, Subdirección de Gestión Asistencial y de Gestión del Cuidado, Gestión de Camas, Pabellones, Control de Gestión, TI y seguridad.
- Usuarios privados: dirección de operaciones, jefatura médica, enfermería, pabellones y control de gestión; agregar efectividad de capacidad, utilización y costos siempre con fuentes auditables.
- No afirmar ahorro económico sin línea base local ni atribución causal. Evitar procedimientos clínicos autónomos.

## Benchmark de GitHub: datos consultados directamente API de GitHub el 12/11/2026
Las cifras de stars y forks son instantáneas variables, **no evidencia de adopción ni calidad clínica**. `pushed_at` verifica actividad reciente pero no el mantenimiento de un módulo concreto. Confirmar licencia en repositorio y dependencias antes de reutilizar.

| Repositorio | Stars | Forks | Última actividad (UTC) | Licencia API | Qué aprovechar | Resolución inicial |
|---|---:|---:|---|---|---|---|
| [google/or-tools](https://github.com/google/or-tools) | 14.370 | 2.550 | 2026-11-12 | Apache-2.0 | Optimización de asignación de capacidad y horarios con restricciones | **Candidato fuerte** para fase de programación de recursos, no imprescindible en MVP estático; su instalación exige backend adecuado |
| [medplum/medplum](https://github.com/medplum/medplum) | 2.791 | 1.013 | 2026-11-12 | Apache-2.0 | Tipos FHIR, APIs e integraciones healthcare; permisos y trazabilidad | **Candidato** para integración institucional, evaluar complejidad y costo de operación |
| [openmrs/openmrs-core](https://github.com/openmrs/openmrs-core) | 1.992 | 4.478 | 2026-11-12 | NOASSERTION (API) | Flujos de hospitalización y datos clínicos; observar patrón de dominio | **Aprender patrón**, sin copiar por ahora; licencia debe revisarse |
| [openmrs/openmrs-esm-patient-management](https://github.com/openmrs/openmrs-esm-patient-management) | 93 | 440 | 2026-11-12 | NOASSERTION (API) | Bandejas de trabajo, listas, colas y gestión de turnos | **Aprender patrón** de UI; no interpretar menos stars como bajo valor si hay ecosistema institucional |
| [openmrs/openmrs-module-bedmanagement](https://github.com/openmrs/openmrs-module-bedmanagement) | 11 | 79 | 2026-10-13 | NOASSERTION (API) | Modelo de camas, admisiones y ubicaciones por servicio | **Revisar diseño de datos** antes de definir nuestro contrato de camas; repositorio pequeño pero estrechamente relevante |
| [openemr/openemr](https://github.com/openemr/openemr) | 5.596 | 3.131 | 2026-11-12 | GPL-3.0 | Agenda, flujo de atención, gestión ambulatoria y permisos | **No copiar módulos por defecto**: fuerte obligación copyleft y alcance clínico mayor que nuestro producto |
| [bahmni/bahmni-core](https://github.com/bahmni/bahmni-core) | 178 | 279 | 2026-11-12 | NOASSERTION (API) | Integración de hospital, laboratorio y ERP | **Aprender arquitectura**; no llevar su stack completo a Hostinger |
| [hapifhir/hapi-fhir](https://github.com/hapifhir/hapi-fhir) | 2.437 | 1.516 | 2026-11-12 | Apache-2.0 | Interoperabilidad FHIR robusta | **Candidato API** cuando haya necesidad y hosting apto, no para demo HTML |
| [apache/superset](https://github.com/apache/superset) | 75.499 | 18.610 | 2026-11-12 | Apache-2.0 | Filtros, drill-down, datasets, SQL y experiencia de análisis | **Aprender interfaz**, sin desplegar toda la plataforma para cuatro indicadores |
| [metabase/metabase](https://github.com/metabase/metabase) | 50.301 | 7.005 | 2026-11-12 | NOASSERTION (API) | Preguntas self-service, dashboards y alertas | **Aprender interfaz** y evaluar licencias según modo comercial; no redistribuir sin revisar |
 
### Repositorios que descartamos como base inmediata
- Repositorios estudiantiles «hospital-management-system» sin despliegues demostrables, cobertura de pruebas o mantenimiento; la cantidad de estrellas no compensa riesgo.
- Productos EHR completos como base de un asistente de decisiones de gestión: exceden el problema, aumentan requisitos de datos personales, hosting y seguridad.
- Instalar de golpe OpenEMR/OpenMRS/Bahmni/ERP: alto costo de adopción, integración, soporte y cambio organizacional.
- Suites BI completas si basta una interfaz rápida con evidencia y compromisos; evitar costo operacional innecesario.

### Funcionalidades con mayor valor **por adoptar del mundo real**
| Orden | Función requerida | Patrón de referencia | Datos mínimos | Beneficio verificable | Complejidad |
|---|---|---|---|---|---|
| P0 | Lista diaria de camas efectivas y bloqueos, por servicio y turno | OpenMRS bedmanagement + NHS SitRep | Censo agregado/capacidad dotada | Menos tiempo para detectar brechas de capacidad | Baja-media |
| P0 | Reunión breve de coordinación con acuerdos, dueño, vencimiento, evidencia, cierre | OpenMRS bandejas de trabajo + patrones task list | Actas/compromisos | % acuerdos cerrados a tiempo, días de atraso, causas repetidas | Baja |
| P0 | Revisión semanal de restricciones recurrentes | Actual HealthEye v0.4 + operación hospitalaria | 5–7 cortes diarios | Reducción de tiempo de preparación y mejor seguimiento | Baja |
| P1 | Pabellones: programación real vs efectiva y motivos de suspensión | iQueue/LeanTaaS como patrón funcional, no fuente de código | Agenda, disponibilidad, personal y suspensión | Utilización validada, suspensión evitable, minutos de inicio | Media |
| P1 | Alertas de calidad del dato | Patrones observabilidad/validación | Estado de fuentes, fechas, faltantes | Menos decisiones basadas en datos incompletos | Baja |
| P2 | Optimización de turnos/programación | OR-Tools cuando exista suficiente historial y restricciones explícitas | Capacidad por turno y tipo de procedimiento | Mejoras de utilización medidas con línea base | Alta |
| P2 | FHIR R4 con HIS existente | Medplum/HAPI FHIR + MINSAL | APIs autorizadas + perfiles reales | Disminución de digitación duplicada | Alta |

**Regla:** no implementar una función P1/P2 hasta demostrar que P0 se usa en reuniones reales y tiene un dueño. No agregar un «score de IA» sin evidencia.

## Consideraciones regulatorias chilenas
- MINSAL declara **HL7 FHIR R4** en su arquitectura: https://interoperabilidad.minsal.cl/docs/especificacion-de-la-arquitectura/estandares-perfiles.html
- Revisar guía nacional FHIR R4 y perfiles vigentes: https://interoperabilidad.minsal.cl/fhir/ig/eis/
- Seguridad y arquitectura MINSAL (incluye Resolución Exenta N°1249/2026 sobre gobernanza de IA): https://www.minsal.cl/seguridad_de_la_informacion/
- Ley N.º 21.668 sobre interoperabilidad de fichas; verificar reglamentación aplicable antes de integraciones reales. **Ningún módulo actual afirma cumplimiento regulatorio automático.**

## Criterios de aceptación comercial para siguiente incremento
1. Piloto de compromisos usable sin integración HIS, sin datos sensibles, en navegador móvil y PC.
2. Responsables explícitos, estado/fecha/evidencia y exportación; sin declarar cierre automático.
3. Persistencia durable y multiusuario **solo en backend con autenticación**: para la demo estática no prometer conservación entre dispositivos.
4. Comparación «antes/después» de tiempo administrativo de reunión y % acuerdos efectivamente cerrados, con fuente y fecha.
5. Decisión go/no-go con usuario comprador público y luego ajuste del producto para clínica privada.

## Estado del producto al redactar
v0.4 prueba 59 tests, incluye revisión semanal y exportación CSV sintético. Todo este catálogo es una **decisión de selección y producto**, no una integración efectuada con OpenMRS/Medplum/OR-Tools ni licencia de terceros incorporada. Salud real de repositorios debe reevaluarse antes de conectar dependencias.
