# HealthEye — paquete de demostración Hostinger + REM20

## Compilación verificada (2026-11-12)
- Acción de GitHub: https://github.com/CarlosVergaraChile/gl-strategic-engine/actions/runs/43250032221
- Resultado: **52 pruebas, 52 aprobadas, 0 fallidas**.
- Artefacto ZIP: https://github.com/CarlosVergaraChile/gl-strategic-engine/actions/runs/43250032221/artifacts/13957328923
- Contenido del ZIP: `healtheye/index.html`, `healtheye/adapters/health/{daily-flow,surgical-flow,integrated-flow,synthetic-source}.js`, `README.txt`.
- Destino recomendado en Hostinger: `public_html/healtheye/` si esa es la raíz efectiva del dominio (confirmar en hPanel antes de publicar). No sobrescribir `/cartera/` ni aplicaciones existentes.
- El ZIP es una **demostración con datos sintéticos**, no un producto clínico desplegado.
- GitHub Actions crea un archivo que debe descargarse o ser subido por un operador/servicio autorizado. Que el artefacto exista en GitHub **no significa** que se publicó en Hostinger.
- `demos/health/integrado.html` se copia como `index.html` y se reescriben las rutas de imports relativas al ZIP; se comprobó el empaquetado con éxito en CI.

## REM20 — importador de referencia
- Archivo: `adapters/health/rem20-import.js`. Pruebas: `tests/health-rem20-import.test.js`.
- Requiere mapeo explícito de columnas contra el diccionario real, que aún **no se ha descargado ni cotejado** en esta revisión.
- Ocupación = 100 × suma de días-cama ocupados / suma de días-cama disponibles; nunca promedio simple de porcentajes.
- Filas con cero días-cama disponibles se preservan y se reportan como excluidas del cálculo, no se inventa denominador.
- Filas con ocupación superior a 100 % quedan visibles con alerta; nunca se recortan a 100 %.
- Mensual y agregado, **no censo diario, dotación o camas efectivas a una hora dada**.
- La comprobación del código se hizo con archivos CSV **sintéticos de prueba**, no con registros REM20 descargados.

## Mejores prácticas recuperadas del ecosistema chileno
Referente independiente: https://www.govlab.cl/proyecto/que-tan-llenos-estan-los-hospitales-publicos
- Resolver la URL actual de MINSAL desde CKAN `package_show`, en vez de fijar el nombre fechado del CSV.
- Usar códigos estables de establecimiento y área y consultar glosas de catálogos, pues las denominaciones cambian.
- Verificar duplicados por clave de establecimiento/área/mes; algunas filas pueden ser complementarias y deben auditarse antes de agregarse.
- Distinguir datos no reportados de cero y de establecimiento cerrado.
- No dibujar meses faltantes como ocupación cero.
- Mantener ocupaciones mayores a 100 %, que pueden reflejar sobrecupo.
- Revisar denominador antes de interpretar mortalidad o letalidad; no usar mortalidad cruda para ranking de calidad entre hospitales.

## Próximos puntos de desarrollo
1. Ingesta real REM20 desde CSV con definición de versión, código de establecimiento y área, sin entregar datos de pacientes.
2. Adaptar importador a claves estables, duplicados complementarios y ausencia de reporte, tras validar diccionario.
3. Conectar el benchmark mensual a una vista de contexto **separada** del tablero diario sintético.
4. Acordar la mínima carga operacional diaria agregada para una eventual prueba institucional autorizada.
5. Publicar ZIP en URL independiente de las aplicaciones en producción, revisar en móvil y escritorio.
