#!/bin/sh
# Compila Paleta Polar sin Gradle:
#   PaletaPolar.apk  -> instalación directa para pruebas (firma de depuración)
#   PaletaPolar.aab  -> paquete para Google Play (firmado con tu llave de subida)
#
# Dos formas de conseguir las herramientas:
#   1. Android SDK (recomendado, es lo que usa GitHub Actions): define ANDROID_HOME
#      con "platforms;android-36" y "build-tools;36.0.0" instalados, y BUNDLETOOL con
#      la ruta a bundletool-all.jar.
#   2. Herramientas sueltas (sin SDK): TOOLS (android33.jar, bundletool.jar,
#      dex-tools-v2.4/, signer.jar) y AAPT2.
#
# Variables opcionales: KEYSTORE, KS_PASS, KS_ALIAS (por defecto "upload"),
#                       VERSION_CODE, VERSION_NAME
set -e
cd "$(dirname "$0")"
VC=${VERSION_CODE:-9}
VN=${VERSION_NAME:-1.5.1}
MIN_SDK=24
TARGET_SDK=36
ALIAS=${KS_ALIAS:-upload}

if [ ! -d ../www ]; then
  echo "Falta la carpeta www/. Ejecuta primero: python3 tools/build-www.py" >&2; exit 1
fi

BT_VER=${BUILD_TOOLS_VERSION:-36.0.0}
if [ -n "$ANDROID_HOME" ] && [ -x "$ANDROID_HOME/build-tools/$BT_VER/aapt2" ]; then
  MODE=sdk
  BT=$ANDROID_HOME/build-tools/$BT_VER
  AAPT2=$BT/aapt2
  ANDROID_JAR=$ANDROID_HOME/platforms/android-$TARGET_SDK/android.jar
  BUNDLETOOL=${BUNDLETOOL:?Define BUNDLETOOL con la ruta a bundletool-all.jar}
else
  MODE=tools
  T=${TOOLS:-/tmp/abt}
  AAPT2=${AAPT2:-/tmp/ab/x-aaptjs3-2.0.2.tgz/package/bin/x64/linux/aapt2}
  ANDROID_JAR=$T/android33.jar
  BUNDLETOOL=${BUNDLETOOL:-$T/bundletool.jar}
fi
[ -f "$ANDROID_JAR" ] || { echo "No encuentro android.jar en $ANDROID_JAR" >&2; exit 1; }
echo "Compilando con modo '$MODE' (versión $VN, código $VC)"

rm -rf build && mkdir -p build/classes build/assets
cp -r ../www build/assets/www

# recursos + manifiesto
$AAPT2 compile --dir res -o build/res.zip
LINK="-I $ANDROID_JAR --manifest AndroidManifest.xml -A build/assets build/res.zip --min-sdk-version $MIN_SDK --target-sdk-version $TARGET_SDK --version-code $VC --version-name $VN --auto-add-overlay"
$AAPT2 link -o build/unsigned.apk $LINK
$AAPT2 link --proto-format -o build/proto.apk $LINK

# código Java -> dex
javac -source 8 -target 8 -nowarn -bootclasspath "$ANDROID_JAR" -cp "$ANDROID_JAR" -d build/classes src/com/paletapolar/juego/*.java
(cd build/classes && jar cf ../classes.jar .)
if [ "$MODE" = sdk ]; then
  mkdir -p build/dexout
  "$BT/d8" --release --min-api $MIN_SDK --lib "$ANDROID_JAR" --output build/dexout build/classes.jar
  cp build/dexout/classes.dex build/classes.dex
else
  sh $T/dex-tools-v2.4/d2j-jar2dex.sh -f -o build/classes.dex build/classes.jar >/dev/null
fi

# APK para instalar directo (firma de depuración)
(cd build && zip -q -j unsigned.apk classes.dex)
if [ "$MODE" = sdk ]; then
  DEBUG_KS=${DEBUG_KEYSTORE:-$HOME/.android/debug.keystore}
  if [ ! -f "$DEBUG_KS" ]; then
    mkdir -p "$(dirname "$DEBUG_KS")"
    keytool -genkeypair -keystore "$DEBUG_KS" -storepass android -keypass android -alias androiddebugkey \
      -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
  fi
  "$BT/zipalign" -p -f 4 build/unsigned.apk build/aligned.apk
  "$BT/apksigner" sign --ks "$DEBUG_KS" --ks-pass pass:android --key-pass pass:android \
    --ks-key-alias androiddebugkey --out PaletaPolar.apk build/aligned.apk
else
  java -jar $T/signer.jar -a build/unsigned.apk -o build/out --allowResign >/dev/null
  cp build/out/*.apk PaletaPolar.apk
fi

# AAB para Google Play: módulo base = manifest/ dex/ res/ assets/ resources.pb
mkdir -p build/base/manifest build/base/dex
(cd build/base && unzip -q ../proto.apk)
mv build/base/AndroidManifest.xml build/base/manifest/AndroidManifest.xml
cp build/classes.dex build/base/dex/classes.dex
(cd build/base && zip -q -r ../base.zip .)
rm -f PaletaPolar.aab
java -jar "$BUNDLETOOL" build-bundle --modules=build/base.zip --output=PaletaPolar.aab
if [ -n "$KEYSTORE" ]; then
  jarsigner -keystore "$KEYSTORE" -storepass "$KS_PASS" -keypass "$KS_PASS" -sigalg SHA256withRSA -digestalg SHA-256 PaletaPolar.aab "$ALIAS" >/dev/null
  echo "AAB firmado con la llave de subida."
else
  echo "AVISO: AAB sin firmar. Define KEYSTORE y KS_PASS para firmarlo."
fi
echo "Listo: $(pwd)/PaletaPolar.apk y $(pwd)/PaletaPolar.aab (versión $VN, código $VC, API $TARGET_SDK)"
