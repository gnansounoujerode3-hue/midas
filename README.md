# MIDAS-Bénin — démonstration académique

Portefeuille citoyen Android/WebView et backend local pour le prototype décrit au chapitre 3 du mémoire. Le projet utilise exclusivement des données synthétiques et ne constitue pas un déploiement institutionnel.

## Composants

- `uploads/` : source React/TypeScript et build Vite single-file de la maquette.
- `midas-android/` : application Android native Kotlin, biométrie AndroidX et pont BLE AMIS Watch5GTR.
- `midas-backend/` : API Fastify/TypeScript avec SQLite natif Node 24 et simulation de capteurs.
- `Chapitre_4_MIDAS_Benin_Final.docx` : compte rendu expérimental final.

## Vérifications

```bash
cd uploads
npm ci --no-audit --no-fund
npx tsc --noEmit
npm run build
cp dist/index.html ../midas-android/app/src/main/assets/midas/index.html

cd ../midas-backend
npm install --no-audit --no-fund
npm run check
```

Le backend requiert Node.js 24 ou supérieur (`node:sqlite`). Les adresses réseau et les scénarios institutionnels sont des paramètres de démonstration uniquement.
