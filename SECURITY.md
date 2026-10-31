# Seguridad

## Versiones con soporte

| Versión | Soporte |
| --- | --- |
| 1.5.x | ✅ |
| < 1.5 | ❌ |

## Reportar una vulnerabilidad

No abras un issue público. Usa **[Report a vulnerability](https://github.com/MrVanguardia/paleta-polar/security/advisories/new)** en la pestaña Security del repositorio. Incluye:

- Qué encontraste y qué permite hacer.
- Pasos para reproducirlo.
- Versión del juego y del teléfono.

Recibirás respuesta en un plazo de 7 días. Si se confirma, se publicará una versión corregida y se te dará crédito si lo deseas.

## Alcance

- La app no tiene servidores propios ni cuentas. El multijugador usa servicios públicos de terceros (PeerJS Cloud y brokers MQTT), descritos en la [política de privacidad](https://mrvanguardia.github.io/paleta-polar/privacidad/).
- Los problemas de esos servicios se reportan a sus responsables.
- El WebView solo carga archivos incluidos en la app y rechaza permisos de cámara, micrófono y ubicación.
