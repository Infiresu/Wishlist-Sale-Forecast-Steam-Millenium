#!/bin/sh
# Builds the plugin and packs build/wishlist-sale-forecast-<version>.zip from the fresh output.
set -e
cd "$(dirname "$0")"
npm run typecheck
npm run build
VER=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' plugin.json)
STAGE=build/stage/wishlist-sale-forecast
rm -rf build/stage build/wishlist-sale-forecast "build/wishlist-sale-forecast-$VER.zip"
mkdir -p "$STAGE/.millennium"
cp -r backend docs plugin.json README.md README.ru.md CHANGELOG.md LICENSE "$STAGE/"
cp -r .millennium/Dist "$STAGE/.millennium/"
(cd build/stage && zip -qr "../wishlist-sale-forecast-$VER.zip" wishlist-sale-forecast)
rm -rf build/stage
echo "packed build/wishlist-sale-forecast-$VER.zip"
