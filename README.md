# GL Strategic Engine

Motor en **JavaScript/Node.js** que alimenta los servicios y verticales del ecosistema GL Strategic.

## Arquitectura

- `engine.js` / `chassis.js` / `body.js` — Núcleo modular del motor
- `core/` — Lógica central
- `verticals/` — Verticales de negocio
- `server.js` — Servidor Node
- Páginas de servicio: `finops.html`, `health.html`, `it_staffing.html`, `retail.html`

## Uso

```bash
npm install
node server.js
```

## Repositorios relacionados

- [GLStrategic](https://github.com/CarlosVergaraChile/GLStrategic) — Sitio web corporativo
- [maquina-orquestadora-gl-strategic](https://github.com/CarlosVergaraChile/maquina-orquestadora-gl-strategic) — Orquestador de IA
