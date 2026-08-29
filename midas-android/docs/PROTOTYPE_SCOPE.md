# Périmètre et preuves du prototype MIDAS-Bénin

## Implémenté dans l'application Android
- Authentification native AndroidX Biometric : le système Android traite l'empreinte ou le visage ; MIDAS ne reçoit jamais la donnée biométrique brute.
- Clé de signature P-256 Android Keystore, conditionnée par l'authentification de l'utilisateur.
- DID, credentials, consentements, appareils et données de démonstration persistés localement dans DataStore.
- Décision et révocation de consentement avec signature locale.
- Capteurs IoT virtuels, appairage simulé et mesures synthétiques.
- Journal local chaîné avec SHA-256 ; contrôle de cohérence visible dans l'interface.
- Export JSON via le sélecteur Android et effacement réel des données de démonstration.

## Simulé explicitement
- Vérification ANIP, APDP, e-services publics, BLE/QR physiques, ESP32-S3, HSM, StrongBox garanti et Hyperledger Iroha.
- Le chiffrement de la charge IoT est représenté par une charge chiffrée simulée ; il devra être remplacé par une implémentation ChaCha20-Poly1305/X25519/HKDF pour un prototype cryptographique avancé.

## Démonstration recommandée
1. Déverrouiller le portefeuille par biométrie du téléphone.
2. Consulter le DID et le credential fictif.
3. Accorder ou révoquer un consentement, avec confirmation biométrique.
4. Appairer un capteur virtuel et générer une mesure.
5. Vérifier le journal d'audit chaîné.
6. Exporter puis effacer les données de démonstration.
