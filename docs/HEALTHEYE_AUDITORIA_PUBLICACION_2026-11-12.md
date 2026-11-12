# Auditoría de publicación HealthEye — 12/11/2026

## Lo comprobado directamente
- Versión candidata: **v0.5-rc**, commit exacto `bf0de6b21900afb2de1723ad32175236c506e96f`.
- GitHub Actions build https://github.com/CarlosVergaraChile/gl-strategic-engine/actions/runs/43275270019 : **71 pruebas pasadas, 0 fallidas**, build **success**.
- Artefacto https://github.com/CarlosVergaraChile/gl-strategic-engine/actions/runs/43275270019/artifacts/13970510824 (`healtheye-preview`, ZIP de GitHub Actions que contiene un **segundo ZIP** `healtheye-preview.zip`). Debe extraerse DOS VECES si se descarga el artefacto por GitHub web.
- ZIP interior contiene `healtheye/index.html`, `semanal.html`, `compromisos.html`, `verificar.html`, `version.json` y módulos importados bajo `adapters/health/`.
- Verificación CI de empaquetado: cuatro páginas, diez imports válidos y SHA exacto.
- Verifiqué localmente con `node --check` el JavaScript incrustado de las cuatro páginas: **4 de 4 sintaxis correcta**.
- Verificación estática del ZIP: todos los imports de sus cuatro páginas y dependencias indirectas tienen archivo físico en el artefacto.
- No se alteraron `main` ni el despliegue Hostinger mediante estos cambios; trabajo en rama separada.
- **No pude abrir la URL pública** desde herramientas de este entorno (errores de acceso/DNS), de modo que NO está certificada la publicación ni la ejecución del navegador remoto. Es una limitación del ambiente de verificación; no implica por sí sola caída del sitio.

## Autoprueba disponible en la candidata
`https://ingenieriadegestion.cl/healtheye/verificar.html` solo existirá tras publicar **v0.5-rc** y debe mostrar:
- Versión `HealthEye v0.5-rc` + commit completo.
- Prueba de carga módulos, 28 jornadas, cuatro semanas, acuerdos/evidencia, respaldo, rutas de las tres pantallas.
- Resultados sin fallas; la autoprueba **no sustituye** comprobación visual, interacción y permisos con navegador real.

## Protocolo seguro de Kodee/Code
1. Identificar el document root **real** de `ingenieriadegestion.cl`; no asumir que es `public_html`.
2. Comprobar `/healtheye/` y conservar copia de su versión actual, junto con URL de reversión.
3. Descargar del artefacto GitHub indicado (u obtener la carpeta `healtheye` del ZIP interior). Si no accede al artefacto, construir el paquete **desde el mismo commit**, conservando imports y `version.json`.
4. Publicar primero `/healtheye-qa/` para **no interrumpir la versión existente**. Verificar autoprueba en `/healtheye-qa/verificar.html`. El programa es estático y sus imports relativos deben servir también bajo `/healtheye-qa/`.
5. Interacciones manuales: en vista diaria cambiar semilla y obtener 28 filas; descargar CSV; en semanal cambiar semana y generar acuerdo desde una alerta; en compromisos guardar, recargar el navegador y restaurar; cerrar con evidencia y rechazar cierre sin evidencia; exportar CSV y respaldo JSON.
6. Verificar consola sin errores, respuesta HTTP y MIME JavaScript válido; probar Chrome móvil y escritorio. No subir datos hospitalarios.
7. Solo si pasa el QA, reemplazar **exclusivamente** `/healtheye/`, preservando `/cartera/`, `/hys/`, `/serviteca/`, sitio principal y `glstrategic.cl`. Validar versión real y las interacciones otra vez.
8. Configurar despliegue GitHub **con versión/commit fijado** y estrategia de reversión. No hacer un deploy automático de cualquier push de rama de desarrollo sin pruebas.
9. Si hay cualquier fallo, mantener la versión actual; informar error y evidencia, sin declarar el trabajo completo.

## Límites de producto
- Datos DEMO sintéticos, no hospitalarios.
- `localStorage` y respaldo JSON **no tienen cifrado ni autenticación**; solo para demostración, nunca datos personales, pacientes o información confidencial.
- No se han validado modelos con pacientes, censos reales, ni procesos asistenciales.
- 71 pruebas Node cubren lógica y validaciones. La prueba remota en navegador requiere Kodee.
