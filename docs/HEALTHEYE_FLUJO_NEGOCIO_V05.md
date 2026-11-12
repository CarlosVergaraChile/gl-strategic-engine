# HealthEye v0.5 — del hallazgo al acuerdo verificable

## Problema que resuelve
Una alerta sin dueño se olvida. El valor de HealthEye es pasar del seguimiento de capacidad diaria a la revisión semanal y desde allí a un **compromiso con responsable, fecha y evidencia**. No necesita reemplazar ficha clínica ni sumar usuarios con datos sensibles para mostrar un flujo comercial.

## Flujo implementado
1. `/healtheye/`: revisa capacidad ficticia diaria y restricciones.
2. `/healtheye/semanal.html`: identifica problemas recurrentes y propone preguntas de coordinación.
3. Por cada señal semanal existe enlace **Crear compromiso para esta señal**. El enlace preselecciona motivo, equipo responsable y pregunta. No crea un compromiso automáticamente: el usuario lo confirma y le fija plazo.
4. `/healtheye/compromisos.html`: conserva temporalmente compromisos DEMO en `localStorage` de **ese navegador**; permite actualizar estado, ingresar evidencia y ver vencimientos.
5. Exportación CSV para usar en reunión; respaldo e importación JSON validado para trasladar un demo manualmente.
6. No se cargan pacientes, RUT, ficha clínica ni datos institucionales reales. No hay autenticación, backend ni sincronización entre personas.

## Valor que debe probarse con cliente
- Tiempo de preparación de revisión semanal (minutos, línea base y tras piloto).
- Proporción de señales convertidas en acuerdos de gestión.
- % acuerdos con responsable y plazo.
- % acuerdos cerrados dentro de plazo con evidencia.
- Días de retraso y problemas reiterados.
- **No prometer** que el prototipo reduce estancias, cirugías suspendidas ni gasto, sin validación hospitalaria.

## Infraestructura / seguridad
La persistencia local es exclusivamente para ensayos no sensibles, **NO** es una solución hospitalaria. `localStorage` puede ser visible a quien use el mismo navegador y los respaldos JSON no van cifrados. Nunca subir pacientes, personal real, datos confidenciales, informes ni contraseñas. Para producción: HTTPS, acceso por usuario/rol, sesiones protegidas, segregación de establecimientos, trazabilidad auditada, respaldos, expiración y política de retención. Puede evaluarse PHP/MySQL del hosting actual con backend autenticado si cumple los requisitos institucionales, o un servicio administrado según el cliente; no asegurar cumplimiento de MINSAL hasta validarlo.

## Checklist para piloto de venta
- Un director/subdirector y dueño de proceso confirman utilidad en menos de 30 minutos.
- Capturar 2-4 semanas de datos agregados autorizados.
- Probar 10 acuerdos sin información clínica individual; medir usabilidad y tiempo.
- Decidir si conviene servicio institucional mensual por establecimiento o contrato de despliegue/soporte, sin inventar precio.
- Evaluar repositorios de referencia antes de programar nuevas funciones, según `docs/ADR-004-REUTILIZACION-GITHUB-PRIMERO-CHILE.md`.

## Aislamiento del despliegue
Rama `healtheye-flujo-compromisos-v05`, independiente de `arquitectura-nucleo-compartido-v3` que Kodee usa para demo anterior. No fusionar a esa rama hasta confirmar publicación existente y dar luz verde a nueva entrega. Mantener paquete ZIP autocontenido de GitHub Actions.
