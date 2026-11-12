# HealthEye — Carpeta inicial para financiamiento de innovación (12 noviembre 2026)

## Tesis comercial
**HealthEye: plataforma liviana de coordinación operacional para hospitales públicos chilenos.** Con datos agregados diarios, identifica restricciones de capacidad, prepara revisiones semanales, registra acuerdos con responsable/plazo/evidencia y contrasta resultados. No es ficha clínica ni automatiza decisiones médicas.

**Primer cliente meta:** hospitales públicos, Servicios de Salud y áreas de gestión. **Segundo:** clínicas privadas, adaptando productividad y costos. **Posibilidad posterior de exportación:** otros sistemas sanitarios latinoamericanos, sujeto a adaptación local.

## Problema y propuesta de valor
Los directivos y coordinaciones operacionales reúnen datos de camas, altas, urgencias y pabellones procedentes de sistemas o planillas separadas; se repiten reuniones, alertas sin dueño y compromisos difíciles de verificar.
- Usuario: Dirección, Gestión de Camas, Pabellones, Enfermería y Control de Gestión.
- Actividad P0: revisar capacidad efectiva hoy y generar acuerdos semanales con evidencia.
- Resultado comercial que se debe **medir, no prometer**: tiempo empleado preparando reunión, proporción de compromisos cerrados oportunamente con evidencia, frecuencia de restricciones operacionales persistentes, calidad y oportunidad del dato.
- Diferenciación: despliegue incremental independiente de HIS; enfoque en rutina de gestión y no en sustitución de historia clínica; se reutilizan métodos existentes y repositorios con licencias compatibles.

## Estado real de tecnología
- Núcleo compartido Monte Carlo/grafos, HealthEye urgencia-cama-alta/pabellones, simulador de datos ficticios, revisión semanal: pruebas técnicas automáticas.
- Módulo P0 `adapters/health/commitments.js`: compromisos con responsable, vencimiento, evidencia y exportación, **sin persistencia multiusuario ni integración al HIS**.
- REM20 MINSAL identificado y adaptador CSV probado con datos ficticios; **datos reales REM20 aún no procesados**.
- No tenemos carta de interés firmada ni validación de compra ni contrato atribuible al software. Experiencia profesional en salud no equivale a tracción comercial del producto.
- Kodee está publicando una demo anterior; la rama v0.4 continúa aislada, NO se ha desplegado.

## Convocatoria inmediata — BIG13
Fuentes oficiales (consultadas 12/11/2026):
- Ignite 13: https://www.corfo.gob.cl/sites/cpp/convocatoria/start-up-chile-ignite-13/
- Build 13: https://www.corfo.gob.cl/sites/cpp/convocatoria/start-up-chile-build-13/
- Growth 13: https://www.corfo.gob.cl/sites/cpp/convocatoria/start-up-chile-growth-13/
- Ministerio de Economía: https://www.economia.gob.cl/2026/11/06/start-up-chile-abrio-convocatoria-global-para-startups-tecnologicas-con-financiamiento-de-hasta-75-millones.htm

**Cierre:** 24/11/2026, 13:00 hora Chile.
**Build:** tope $15.000.000 CLP, hasta 90% del costo; fase idea/prototipo. Persona jurídica chilena: inicio actividades no superior a 12 meses al 03/11/2026.
**Ignite:** tope $30.000.000 CLP, hasta 80% (hasta 90% para líder mujer según bases), MVP funcional y validación temprana. Persona jurídica chilena: inicio actividades no superior a 36 meses al 03/11/2026.
**Growth:** hasta $75.000.000 CLP, fase crecimiento con ingresos y requisitos de ventas (2.400-25.000 UF en período definido por bases para la ruta examinada); no calza sin tracción acreditable.
**Importante:** la ruta para persona natural y el líder del equipo tienen condiciones específicas (acciones, dedicación, empresa extranjera y/o constitución), según bases; no asumir que empresa antigua puede postular creando informalmente otra entidad. Revisar requisitos legales, parentescos, financiamientos previos, conflictos, inicio de actividades y dedicación real. El líder Ignite requiere al menos 10% de participación, dedicación conforme a bases y la plataforma indica máximo tres años de desarrollo.

### Decisión preliminar
1. **Ignite** solo si existe MVP funcional, validación temprana y postulante elegible.
2. **Build** si la startup califica como etapa temprana y se acredita su elegibilidad; no usar Build para encubrir que ya se comercializa un producto validado.
3. **Crea y Valida** (CORFO) como vía futura para validación I+D: https://www.corfo.gob.cl/sites/cpp/programa/crea-y-valida/ ; convocatoria 2026 ya cerrada.
4. Una postulación de innovación **no debe presentarse como simple reutilización de open source**. La novedad concreta, validable, será el modelo de coordinación diaria-semanal con evidencia, evaluación de restricciones y aprendizaje de decisiones, integrado a operación pública chilena.
5. No declarar elegibilidad ni iniciar la postulación sin verificar entidad, propiedad del código, IP/licencias, equipo, requisitos financieros, cofinanciamiento y acreditación de tracción.

## Hipótesis a probar en piloto 2–4 semanas
- Preparar un comité de camas o reunión semanal toma menos tiempo que la rutina actual (línea base vs con HealthEye, minutos/semana).
- Mejora la proporción de compromisos con dueño, fecha y evidencia; medir porcentaje y revisión por responsable.
- Disminuye la antigüedad de alertas sin acción; medir días, evitando causalidad sin comparación.
- Usuarios pueden operar con censo agregado autorizado y CSV sin HIS, con protocolo de seguridad.
- Al menos un directivo o dueño de proceso confirma utilidad y disposición a piloto formal (sin tratar interés verbal como venta).

## MVP y límites comerciales
- Demostración diaria, vista semanal, compromisos, exportación CSV, datos sintéticos y etiquetado de fuentes.
- No usar datos de pacientes ni prometer mejoras clínicas.
- Persistencia multiusuario requiere autenticación, roles, auditoría y base de datos por cliente. **No implementada aún**.
- Licencias: revisar OpenMRS, Medplum, OR-Tools, módulos utilizados; catálogo GitHub-first en `docs/ADR-004-REUTILIZACION-GITHUB-PRIMERO-CHILE.md`.
- Para contratación pública, revisar estándares TI, tratamiento de datos, compra pública y autorizaciones. Subsidio a startup no implica contrato con MINSAL ni hospital.

## Producto para evaluación: narrativa sugerida
"HealthEye transforma registros operacionales diarios de camas, urgencias y pabellones en una agenda semanal de coordinación con compromisos verificables. Se implementa gradualmente, sobre los sistemas existentes, y permite comparar hipótesis, acciones y resultados. El piloto chileno buscará demostrar ahorro en tiempo de coordinación y mayor cumplimiento de compromisos, sin procesar información individual de pacientes."

## Documentación mínima antes del envío
- Datos de postulante y constitución/inicio SII, estructura accionaria, edad de negocio y financiamientos previos.
- Líder y equipo; participación accionaria y disponibilidad/dedicación.
- Evidencia demo funcionando (video breve), historial GitHub y propiedad intelectual, licencias.
- Problema y segmento con 2-3 entrevistas al personal de salud; evidencia no identificable.
- Carta de interés no vinculante si se obtiene, con autorización de nombre.
- Presupuesto cofinanciado con soporte de cotizaciones y horas de trabajo; no inventar contratos, costos ni rentabilidad.
- Roadmap 4 meses: (1) entrevistas y línea base, (2) piloto con datos agregados/seguridad, (3) prueba de valor y cambios, (4) empaquetado comercial, validación y pitch.
