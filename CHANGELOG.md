# Historial de cambios

Todos los cambios importantes de Paleta Polar. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido
- Repositorio público con pruebas automáticas, compilación en GitHub Actions y publicación de versiones por etiqueta.
- El script de compilación funciona con el Android SDK oficial (aapt2, d8, zipalign y apksigner).
- Web del juego y política de privacidad en GitHub Pages.

## [1.5.1] - 2026-10-30 (código 9)

### Corregido
- Un toque es una acción en todos los botones: sin dobles activaciones.
- Las salas no se duplican al tocar dos veces "Crear sala".
- El hielo no se crea y rompe a la vez por un toque doble.
- Pausa y botón atrás sin rebotes.
- El joystick ya no se queda pegado al perder el dedo.
- Los botones no se quedan resaltados en pantallas táctiles.

### Añadido
- Aviso cuando el anfitrión no responde.

### Cambiado
- Dibujo del tablero más ligero para teléfonos modestos.

## [1.5.0] - 2026-10-30 (código 8)

### Añadido
- Paquete AAB firmado para Google Play.
- Nuevo motor de sonido con música por capítulo, reverberación y ajustes de música y efectos.

### Cambiado
- API objetivo 36, borde a borde y gesto atrás predictivo.
- Adaptación a teléfonos de todos los tamaños y a tabletas.

## [1.4.0] - 2026-10-30 (código 7)

### Añadido
- Controles táctiles nuevos: deslizar y cruceta fija, además del joystick.
- Pantalla de Ajustes con tamaño de controles, modo zurdo y vibración.

### Cambiado
- Joystick más ágil; los giros rápidos ya no se pierden.

## [1.3.0] - 2026-10-30 (código 6)

### Añadido
- Multijugador online con respaldo por servidor.

### Cambiado
- Los controles táctiles se ocultan al usar mando.

## [1.2.0] - 2026-10-30 (código 5)

### Añadido
- Mando en los menús y teclado en pantalla.
- Vidas y dificultad configurables en multijugador.
- Capítulo dos con 8 niveles nuevos.

### Cambiado
- La sala se mantiene después de perder.

## [1.1.0] - 2026-10-30

### Cambiado
- Menús rediseñados con estilo editorial.

## [1.0.0] - 2026-10-30

### Añadido
- Primera versión: 12 niveles, 6 personajes, 7 enemigos, multijugador, puerta de salida y soporte de mando.

[Sin publicar]: https://github.com/MrVanguardia/paleta-polar/compare/v1.5.1...HEAD
[1.5.1]: https://github.com/MrVanguardia/paleta-polar/releases/tag/v1.5.1
