# Compilar Paleta Polar

Hay tres formas de obtener el APK y el AAB. Todas parten de `web-src/game.html`, que se convierte en la carpeta `www/` con `python3 tools/build-www.py`.

## Opción 1: GitHub lo compila por ti

No necesitas instalar nada.

- **Cada cambio** que subes a `main` pasa las pruebas y compila un APK. Entra en **Actions → Compilación**, abre la última ejecución con check verde y descarga **PaletaPolar-apk** al final de la página.
- **Para publicar una versión**, crea una etiqueta con el número de versión:
  ```sh
  git tag v1.5.2
  git push origin v1.5.2
  ```
  También puedes hacerlo desde la web: **Releases → Draft a new release → Choose a tag → escribe `v1.5.2` → Create new tag → Publish release**. En unos minutos aparecerán el APK y el AAB en esa versión.

El código de versión de Android se calcula solo a partir de la etiqueta (`v1.5.2` → `10502`), así que siempre sube.

### Firmar en GitHub

Para que el AAB de las versiones salga firmado y listo para Google Play, guarda tu llave de subida como secretos del repositorio. La llave nunca se sube al código.

1. En tu computadora, convierte la llave a texto:
   - Linux o macOS: `base64 -w0 upload-keystore.jks > llave.txt` (en macOS: `base64 -i upload-keystore.jks -o llave.txt`)
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks")) > llave.txt`
2. En GitHub ve a **Settings → Secrets and variables → Actions → New repository secret** y crea:
   - `UPLOAD_KEYSTORE_BASE64`: el contenido de `llave.txt`.
   - `UPLOAD_KEYSTORE_PASSWORD`: la contraseña de la llave (está en `CLAVES-FIRMA.txt`).
3. Borra `llave.txt`.

Sin esos secretos la versión se publica igual, pero el AAB queda sin firmar (`PaletaPolar-sin-firmar.aab`) y no sirve para Play.

## Opción 2: en tu computadora con el Android SDK

Necesitas Java 17+, Python 3, Node.js 18+ (solo para las pruebas) y el Android SDK. Si tienes Android Studio, el SDK ya está en `~/Android/Sdk` (Linux), `~/Library/Android/sdk` (macOS) o `%LOCALAPPDATA%\Android\Sdk` (Windows).

1. Instala los paquetes del SDK:
   ```sh
   sdkmanager "platforms;android-36" "build-tools;36.0.0"
   ```
2. Descarga `bundletool-all-*.jar` desde [github.com/google/bundletool/releases](https://github.com/google/bundletool/releases).
3. Compila:
   ```sh
   npm test
   python3 tools/build-www.py
   ANDROID_HOME=~/Android/Sdk BUNDLETOOL=~/bundletool-all.jar \
   KEYSTORE=~/llaves/upload-keystore.jks KS_PASS='tu-contraseña' \
   VERSION_CODE=10502 VERSION_NAME=1.5.2 \
   sh native/build-apk.sh
   ```
4. Resultado: `native/PaletaPolar.apk` (instalación directa, firma de depuración) y `native/PaletaPolar.aab` (Google Play, firmado con tu llave de subida).

En Windows ejecuta el script dentro de [WSL](https://learn.microsoft.com/windows/wsl/) o Git Bash.

| Variable | Para qué |
| --- | --- |
| `ANDROID_HOME` | Carpeta del Android SDK |
| `BUILD_TOOLS_VERSION` | Versión de build-tools (por defecto `36.0.0`) |
| `BUNDLETOOL` | Ruta a `bundletool-all.jar` |
| `KEYSTORE`, `KS_PASS`, `KS_ALIAS` | Llave de subida, contraseña y alias (por defecto `upload`) |
| `VERSION_CODE`, `VERSION_NAME` | Código y nombre de versión |
| `DEBUG_KEYSTORE` | Llave de depuración para el APK (se crea sola si falta) |

## Opción 3: Android Studio con Capacitor

La carpeta `android/` es un proyecto de Capacitor que se abre en Android Studio. Sirve para probar y depurar en un teléfono conectado, pero apunta a la API 34: para Google Play usa la opción 1 o 2, o sube `compileSdk` y `targetSdk` a 36 en `android/variables.gradle`.

```sh
npm install
python3 tools/build-www.py
npx cap sync android
npx cap open android
```

En Android Studio, conecta el teléfono con la depuración USB activada y toca ▶.

## Probar en el navegador

Después de `python3 tools/build-www.py` abre `www/index.html`, o sirve la carpeta con `python3 -m http.server -d www 8080` y entra en <http://localhost:8080>. El multijugador necesita internet.

## Pruebas automáticas

`npm test` valida los 20 mapas (tamaño, inicio, puerta, oleadas, portales y que todo sea alcanzable), juega cada nivel con entradas al azar y comprueba el estado de red del multijugador. Se ejecutan solas en cada cambio.

## Cambiar iconos y pantalla de carga

`python3 tools/make-icons.py` vuelve a generar los iconos y la pantalla de carga en `android/app/src/main/res/` (necesita Pillow: `pip install pillow`). Después copia las carpetas `mipmap-*` y `drawable*` a `native/res/` para la app ligera.
