# API MIDAS-Bénin — démonstration locale

Base URL locale : `http://localhost:3000`

> Ces routes sont destinées au prototype académique avec données synthétiques. Elles n'implémentent ni ANIP réelle, ni APDP réelle, ni authentification de production.

## Santé

- `GET /health`

## Enrôlement et identité

- `POST /api/v1/enrollment`
  - corps : `{ "npi": "2301-0458-7892-3456", "did": "optionnel" }`
- `GET /api/v1/citizens/:citizenId`

## Consentements

- `GET /api/v1/consents/:citizenId`
- `POST /api/v1/consents`
- `POST /api/v1/consents/:id/grant`
- `POST /api/v1/consents/:id/deny`
- `POST /api/v1/consents/:id/revoke`

## IoT et montre BLE

- `GET  /api/v1/iot/devices/:citizenId`
- `POST /api/v1/iot/devices`
- `GET  /api/v1/iot/measurements/:citizenId`
- `POST /api/v1/iot/measurements`

Les capteurs de démonstration en ligne génèrent automatiquement une nouvelle mesure toutes les 15 secondes dans SQLite. La montre AMIS réelle est exclue de cette simulation.

Une mesure doit être associée à un consentement actif lorsque `consentId` est renseigné.

## Audit et droits

- `GET /api/v1/audit/:citizenId`
- `GET /api/v1/audit/:citizenId/verify`
- `POST /api/v1/data/:citizenId/export`
- `POST /api/v1/data/:citizenId/erase`

## E-services

- `GET /api/v1/services`
