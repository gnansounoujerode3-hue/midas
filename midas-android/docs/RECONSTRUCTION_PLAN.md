# Reconstruction fidèle — MIDAS-Bénin Android

Ce projet ne sera pas une nouvelle application générique. C'est le portage Android natif du prototype React fourni, augmenté des simulations techniques du chapitre 3.

## Référence fonctionnelle obligatoire
Les écrans et comportements sources sont ceux du dossier `uploads/src` :
1. `pages/Dashboard.tsx`
2. `pages/Identity.tsx`
3. `pages/Consents.tsx`
4. `pages/Devices.tsx`
5. `pages/Services.tsx`
6. `pages/Audit.tsx`
7. `pages/Settings.tsx`
8. `components/Layout.tsx`

Aucun écran ne sera supprimé. Chaque écran Android reprend ses informations, actions, états et messages, en les adaptant aux conventions Android.

## Étapes de réalisation

### 1 — Socle Android et données de démonstration
- Navigation mobile fidèle aux sept rubriques de la maquette.
- Données synthétiques persistantes : citoyen, VC, consentements, objets, services, logs, notifications.
- Charte visuelle MIDAS vert émeraude / turquoise et avertissement académique.

### 2 — Authentification et portefeuille
- Déverrouillage par AndroidX Biometric.
- DID, NPI synthétique, credentials, QR de démonstration.
- Signature Keystore pour les actions sensibles.

### 3 — Consentements
- Cartes, compteurs, détail, choix granulaire, accord, refus, révocation, dates et historique.
- Biometrie avant décision sensible et audit associé.

### 4 — IoT simulé
- Cartes appareil, mesures, batterie, attestation, détail, appairage en étapes, dissociation.
- Génération de mesures synthétiques contrôlée par consentement.

### 5 — E-services et notifications
- Recherche, filtres par catégorie, détails des données requises, demandes d'accès simulées.
- Centre de notifications fonctionnel.

### 6 — Audit, droits et gouvernance
- Recherche et filtres d'audit, détail et export JSON.
- Chaînage SHA-256 et vérification locale.
- Export complet et suppression effective des données de démonstration.

### 7 — Validation
- Compilation Android, tests des scénarios, captures de soutenance et document de limites.

## Règles de sincérité du prototype
- NPI, ANIP, APDP, e-services, IoT, Iroha et attestations sont fictifs et explicitement étiquetés « simulation académique ».
- La biométrie est réelle mais entièrement gérée par Android : aucune empreinte ou image faciale ne transite dans MIDAS.
- Aucune donnée personnelle réelle ne doit être saisie dans le prototype.
