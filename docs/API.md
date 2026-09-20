# Documentation API e-VACCIN

## Base URL

- **Development** : `http://localhost:3001/api`
- **Production** : `https://api.evaccin.com/api`

## Authentification

Toutes les API endpoints (sauf authentification) nécessitent un token JWT dans le header :

```
Authorization: Bearer <token>
```

## Endpoints

### Authentification

#### POST /auth/register
Inscription d'un nouvel utilisateur.

**Body**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "Jean",
  "lastName": "Dupont",
  "phone": "+22812345678",
  "role": "PARENT"
}
```

**Response**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "PARENT"
  }
}
```

#### POST /auth/login
Connexion d'un utilisateur.

**Body**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "PARENT",
    "firstName": "Jean",
    "lastName": "Dupont"
  }
}
```

#### POST /auth/refresh
Rafraîchissement du token.

**Body**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/logout
Déconnexion.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "message": "Successfully logged out"
}
```

### Enfants

#### GET /children
Liste des enfants (filtres par rôle).

**Headers**
```
Authorization: Bearer <token>
```

**Query Parameters**
- `page` : Page number (default: 1)
- `limit` : Items per page (default: 10)
- `search` : Search term (name, uniqueId)

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "uniqueId": "EV-2026-000001",
      "firstName": "Kévin",
      "lastName": "Dupont",
      "dateOfBirth": "2025-01-15",
      "gender": "MALE",
      "qrCode": "base64_qr_code",
      "healthCenter": {
        "id": "uuid",
        "name": "Centre de Santé A"
      }
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

#### POST /children
Création d'un nouvel enfant.

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "firstName": "Kévin",
  "lastName": "Dupont",
  "dateOfBirth": "2025-01-15",
  "placeOfBirth": "Lomé",
  "gender": "MALE",
  "bloodType": "O+",
  "healthCenterId": "uuid"
}
```

**Response**
```json
{
  "id": "uuid",
  "uniqueId": "EV-2026-000001",
  "firstName": "Kévin",
  "lastName": "Dupont",
  "dateOfBirth": "2025-01-15",
  "gender": "MALE",
  "bloodType": "O+",
  "qrCode": "base64_qr_code",
  "createdAt": "2026-08-25T10:00:00Z"
}
```

#### GET /children/:id
Détails d'un enfant.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "id": "uuid",
  "uniqueId": "EV-2026-000001",
  "firstName": "Kévin",
  "lastName": "Dupont",
  "dateOfBirth": "2025-01-15",
  "placeOfBirth": "Lomé",
  "gender": "MALE",
  "bloodType": "O+",
  "photoUrl": "https://storage.example.com/photo.jpg",
  "qrCode": "base64_qr_code",
  "parent": {
    "id": "uuid",
    "firstName": "Jean",
    "lastName": "Dupont",
    "phone": "+22812345678"
  },
  "healthCenter": {
    "id": "uuid",
    "name": "Centre de Santé A",
    "address": "123 Rue Principale",
    "phone": "+22898765432"
  },
  "vaccinations": [...],
  "upcomingVaccinations": [...]
}
```

#### PUT /children/:id
Mise à jour d'un enfant.

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "firstName": "Kévin",
  "lastName": "Dupont",
  "bloodType": "O+"
}
```

**Response**
```json
{
  "id": "uuid",
  "uniqueId": "EV-2026-000001",
  "firstName": "Kévin",
  "lastName": "Dupont",
  "updatedAt": "2026-08-25T10:30:00Z"
}
```

### Vaccinations

#### GET /children/:childId/vaccinations
Historique des vaccinations d'un enfant.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "vaccine": {
        "id": "uuid",
        "name": "BCG",
        "code": "BCG"
      },
      "doseNumber": 1,
      "batchNumber": "BCG-2026-001",
      "vaccinationDate": "2025-01-15",
      "nextDueDate": "2025-03-15",
      "status": "COMPLETED",
      "healthCenter": {
        "name": "Centre de Santé A"
      },
      "healthWorker": {
        "firstName": "Marie",
        "lastName": "Kouassi"
      }
    }
  ]
}
```

#### POST /vaccinations
Enregistrement d'une vaccination.

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "childId": "uuid",
  "vaccineId": "uuid",
  "doseNumber": 1,
  "batchNumber": "BCG-2026-001",
  "healthCenterId": "uuid",
  "vaccinationDate": "2025-01-15",
  "notes": "Vaccination effectuée sans incident"
}
```

**Response**
```json
{
  "id": "uuid",
  "childId": "uuid",
  "vaccine": {
    "name": "BCG"
  },
  "doseNumber": 1,
  "batchNumber": "BCG-2026-001",
  "vaccinationDate": "2025-01-15",
  "nextDueDate": "2025-03-15",
  "status": "COMPLETED",
  "createdAt": "2026-08-25T11:00:00Z"
}
```

#### GET /children/:childId/upcoming-vaccinations
Prochaines vaccinations prévues.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "data": [
    {
      "vaccine": {
        "name": "DTC-HepB-Hib",
        "code": "DTC"
      },
      "doseNumber": 2,
      "dueDate": "2025-03-15",
      "status": "SCHEDULED",
      "daysUntilDue": 30
    }
  ]
}
```

### Vaccins

#### GET /vaccines
Liste des vaccins disponibles.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "BCG",
      "code": "BCG",
      "description": "Vaccin contre la tuberculose",
      "manufacturer": "Institut Pasteur",
      "requiredDoses": 1,
      "minAgeDays": 0,
      "maxAgeDays": 30,
      "isActive": true
    }
  ]
}
```

#### GET /vaccines/schedule
Calendrier vaccinal.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "data": [
    {
      "vaccine": {
        "name": "BCG",
        "code": "BCG"
      },
      "doseNumber": 1,
      "minAgeDays": 0,
      "maxAgeDays": 30,
      "description": "À la naissance"
    },
    {
      "vaccine": {
        "name": "HepB",
        "code": "HepB"
      },
      "doseNumber": 1,
      "minAgeDays": 0,
      "maxAgeDays": 30,
      "description": "À la naissance"
    }
  ]
}
```

### Rendez-vous

#### POST /appointments
Création d'un rendez-vous.

**Headers**
```
Authorization: Bearer <token>
```

**Body**
```json
{
  "childId": "uuid",
  "vaccineId": "uuid",
  "doseNumber": 2,
  "healthCenterId": "uuid",
  "scheduledDate": "2025-03-15T09:00:00Z",
  "notes": "Rendez-vous de routine"
}
```

**Response**
```json
{
  "id": "uuid",
  "childId": "uuid",
  "vaccine": {
    "name": "DTC-HepB-Hib"
  },
  "doseNumber": 2,
  "healthCenter": {
    "name": "Centre de Santé A"
  },
  "scheduledDate": "2025-03-15T09:00:00Z",
  "status": "SCHEDULED",
  "reminderSent": false,
  "createdAt": "2026-08-25T12:00:00Z"
}
```

#### GET /appointments/upcoming
Rendez-vous à venir.

**Headers**
```
Authorization: Bearer <token>
```

**Query Parameters**
- `startDate` : Date de début
- `endDate` : Date de fin
- `healthCenterId` : Filtre par centre

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "child": {
        "firstName": "Kévin",
        "lastName": "Dupont"
      },
      "vaccine": {
        "name": "DTC-HepB-Hib"
      },
      "scheduledDate": "2025-03-15T09:00:00Z",
      "healthCenter": {
        "name": "Centre de Santé A"
      },
      "status": "SCHEDULED"
    }
  ]
}
```

### Centres de Santé

#### GET /health-centers
Liste des centres de santé.

**Headers**
```
Authorization: Bearer <token>
```

**Query Parameters**
- `region` : Filtre par région
- `isActive` : Filtre par statut

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Centre de Santé A",
      "code": "CSA-001",
      "address": "123 Rue Principale",
      "region": "Maritime",
      "district": "Lomé",
      "phone": "+22898765432",
      "isActive": true
    }
  ]
}
```

### Statistiques

#### GET /statistics/dashboard
Tableau de bord statistiques.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "children": {
    "total": 25480,
    "registeredThisMonth": 1234,
    "active": 24500
  },
  "vaccinations": {
    "total": 125000,
    "today": 1254,
    "thisMonth": 45000
  },
  "coverage": {
    "upToDate": 91,
    "overdue": 9
  },
  "healthCenters": {
    "total": 76,
    "active": 70
  }
}
```

#### GET /statistics/vaccinations/by-vaccine
Statistiques par vaccin.

**Headers**
```
Authorization: Bearer <token>
```

**Query Parameters**
- `startDate` : Date de début
- `endDate` : Date de fin

**Response**
```json
{
  "data": [
    {
      "vaccine": {
        "name": "BCG",
        "code": "BCG"
      },
      "count": 15000,
      "percentage": 12
    },
    {
      "vaccine": {
        "name": "HepB",
        "code": "HepB"
      },
      "count": 14500,
      "percentage": 11.6
    }
  ]
}
```

### Stock

#### GET /stock/:healthCenterId
État du stock d'un centre.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "data": [
    {
      "vaccine": {
        "name": "BCG",
        "code": "BCG"
      },
      "batchNumber": "BCG-2026-001",
      "currentQuantity": 120,
      "expirationDate": "2027-08-01",
      "status": "NORMAL"
    },
    {
      "vaccine": {
        "name": "HepB",
        "code": "HepB"
      },
      "batchNumber": "HB-2026-002",
      "currentQuantity": 15,
      "expirationDate": "2026-12-01",
      "status": "LOW"
    }
  ]
}
```

### Notifications

#### GET /notifications
Liste des notifications de l'utilisateur.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "SMS",
      "title": "Rappel vaccination",
      "message": "La vaccination de votre enfant est prévue dans 3 jours.",
      "status": "DELIVERED",
      "sentAt": "2026-08-22T10:00:00Z"
    }
  ]
}
```

## Codes d'Erreur

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

- **Standard** : 100 requêtes par minute
- **Premium** : 1000 requêtes par minute

## Pagination

Tous les endpoints de liste supportent la pagination :

- `page` : Numéro de page (défaut: 1)
- `limit` : Éléments par page (défaut: 10, max: 100)

## Filtres

Les filtres communs disponibles :

- `search` : Recherche textuelle
- `startDate` : Date de début
- `endDate` : Date de fin
- `status` : Filtre par statut
- `isActive` : Filtre par activité

## Tri

- `sortBy` : Champ de tri
- `sortOrder` : `asc` ou `desc` (défaut: `asc`)

## Webhooks

(À implémenter pour V2)

Endpoints webhook pour les notifications en temps réel :

- `POST /webhooks/vaccination-completed`
- `POST /webhooks/appointment-created`
- `POST /webhooks/stock-low`
