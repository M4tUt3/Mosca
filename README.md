# MOSCA — Cuaderno de tiro y recarga

App web gratuita y libre para tiradores, cazadores y recargadores. Funciona **sin señal** y guarda todo **en el teléfono**: no hay cuentas, ni servidores, ni suscripciones.

## Qué hace

- **Armas:** fusil, mira, altura de mira, torretas (MOA/MRAD), cero y conteo de disparos automático.
- **Cargas:** punta, BC (G1/G7), pólvora, fulminante, vainas y cuántas veces se recargaron, COAL/CBTO, velocidad medida y estado (en prueba / aprobada / descartada).
- **Sesiones de tiro:** grupos en mm convertidos a MOA, velocidades con promedio, desvío estándar y dispersión extrema, clima, correcciones y fotos de los blancos.
- **Fundición:** lotes de puntas fundidas con aleación, peso, dureza y recubrimiento.
- **Calculadora balística:** modelo de punto-masa con tablas de arrastre G1 y G7, corrección atmosférica, viento y ángulo de tiro. Da caída, corrección en MOA o MRAD, clicks, deriva, velocidad, energía y tiempo de vuelo.
- **Exportar / importar** en JSON, para hacer copias de seguridad, pasar los datos a otro teléfono o analizarlos con una IA.
- **Modo noche** en rojo, para no perder la visión nocturna.

## Instalar en el celular

1. Abrí la página publicada (GitHub Pages) en Chrome.
2. Menú ⋮ → **Agregar a la pantalla principal** o **Instalar app**.
3. Listo: se abre como una app y funciona sin conexión.

## Publicarla en GitHub Pages

1. Subí estos archivos a la raíz de un repositorio: `index.html`, `balistica.js`, `sw.js`, `manifest.webmanifest` y los íconos.
2. Andá a **Settings → Pages → Deploy from a branch → main / (root)**.
3. En un par de minutos queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

Cada vez que subas una versión nueva, cambiá `CACHE` en `sw.js` (por ejemplo `mosca-v2`) para que los teléfonos la tomen.

## Sobre los datos de recarga

MOSCA **no trae datos de carga** y no recomienda cargas. Lo que anotás es tuyo. Los datos de partida salen siempre de un manual de recarga del fabricante: empezá por la carga mínima publicada y subí de a poco, atento a las señales de presión.

La calculadora balística es una estimación. Verificá siempre la tabla en el polígono antes de usarla en el campo.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | La app completa |
| `balistica.js` | Motor balístico (también se puede usar desde Node.js) |
| `sw.js` | Service worker para el uso sin conexión |
| `manifest.webmanifest`, `icon*.png`, `icon.svg` | Instalación como app |

## Licencia

MIT. Usala, copiala y mejorala.
