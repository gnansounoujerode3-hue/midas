# MIDAS-Bénin — application Android de démonstration

Cette application Android embarque **directement la maquette React fournie** dans les fichiers uploadés. Cela garantit une fidélité visuelle exacte : mêmes composants, données, couleurs, icônes, modales, tableaux et parcours utilisateur.

## Couche Android native

- `MainActivity.kt` est un conteneur Android Kotlin natif.
- Le déverrouillage initial utilise l'API biométrique du téléphone (`AndroidX Biometric`).
- Android ne lit, ne stocke et ne transmet aucune empreinte digitale ou donnée faciale.
- L'interface est compilée localement dans l'APK sous `app/src/main/assets/midas/index.html`.

## Important

Le projet est un prototype académique : les données sont synthétiques et aucune connexion ANIP, APDP, ASIN, Iroha ou e-service public réel n'existe.

## Compilation

- JDK 17
- Gradle 8.9
- Android Studio récent
- Android 12 / API 31 minimum

Ouvrir `midas-android` dans Android Studio et lancer `Build > Rebuild Project`.
