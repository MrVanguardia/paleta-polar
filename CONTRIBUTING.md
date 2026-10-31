# Cómo contribuir

Gracias por querer ayudar con Paleta Polar.

## Reportar un error o proponer una idea

Abre un [issue](https://github.com/MrVanguardia/paleta-polar/issues/new/choose) con la plantilla que corresponda. Para un error, di el modelo del teléfono, la versión de Android, la versión del juego (aparece en Ajustes) y los pasos para que ocurra.

## Pull requests

1. Haz un fork y crea una rama desde `main` (`arreglo/joystick`, `nivel/21`…).
2. Haz tus cambios. El juego entero está en `web-src/game.html`.
3. Pasa las pruebas: `npm test`.
4. Prueba en el navegador abriendo `www/index.html` después de `python3 tools/build-www.py`, y si puedes en un teléfono.
5. Añade una línea a `CHANGELOG.md`, en "Sin publicar".
6. Abre el pull request y rellena la plantilla.

### Estilo

- Sin librerías nuevas en el juego salvo que sea imprescindible: todo se dibuja en canvas y el sonido se sintetiza.
- Los textos que ve el jugador van en español.
- Los mapas de nivel miden 15 × 13 caracteres; la leyenda está encima de `LEVELS` en `game.html`.
- Usa la configuración de `.editorconfig`.

## Derechos sobre las contribuciones

El juego no es de código abierto (ver [LICENSE](LICENSE)). Al enviar un pull request confirmas que el trabajo es tuyo y aceptas que el autor del proyecto pueda usarlo, modificarlo y publicarlo como parte de Paleta Polar, también en Google Play, sin compensación.

## Convivencia

Este proyecto sigue un [código de conducta](CODE_OF_CONDUCT.md). Al participar te comprometes a respetarlo.
