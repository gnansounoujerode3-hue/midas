# Backend local MIDAS-Bénin

Backend de démonstration académique : Fastify + TypeScript + SQLite.

**Prérequis : Node.js 24 ou version plus récente.** Le backend utilise le module SQLite intégré à Node.js 24 et ne requiert plus `better-sqlite3`, node-gyp ou Visual Studio C++.

## Exécution

```bash
npm install
npm run check
# PowerShell Windows : définir les chemins du certificat avant le démarrage
$env:TLS_KEY_FILE="$PWD/certs/server.key"
$env:TLS_CERT_FILE="$PWD/certs/server.crt"
$env:PORT="3443"
npm run start
```

Le serveur écoute désormais en **HTTPS obligatoire** sur `https://0.0.0.0:3443` et crée `data/midas.db`. Générez un certificat de démonstration avec OpenSSL (SAN contenant l'adresse IP du PC).

## FIDO2/WebAuthn (démonstration)

Le backend expose les cérémonies passkey :

- `POST /api/v1/auth/webauthn/register/options`
- `POST /api/v1/auth/webauthn/register/verify`
- `POST /api/v1/auth/webauthn/login/options`
- `POST /api/v1/auth/webauthn/login/verify`

Seules les clés publiques, les compteurs et les défis temporaires sont stockés dans SQLite. L'intégration Android Credential Manager et l'interface React restent à connecter à ces routes. Paramètres optionnels : `WEBAUTHN_RP_ID` et `WEBAUTHN_ORIGIN`.

## Connexion depuis le téléphone Android

- **Émulateur Android** : conservez `https://10.0.2.2:3443` dans `midas-android/app/build.gradle.kts`.
- **Téléphone physique** : PC et téléphone doivent être sur le même Wi-Fi. L’application MIDAS essaie automatiquement `192.168.1.199` puis `192.168.1.200` et mémorise celle qui répond.
- Le fichier `Lancer_MIDAS_Backend.bat` détecte et affiche l’adresse IPv4 actuelle du PC au démarrage.
- Autorisez le port TCP `3000` dans le pare-feu Windows pour le réseau privé.

> Données synthétiques uniquement. Ce projet ne vérifie pas réellement un NPI auprès de l'ANIP et ne doit pas être déployé comme service public.
