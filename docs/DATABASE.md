# Documentation Base de Données e-VACCIN

## Schéma de Base de Données

Cette documentation décrit le schéma de base de données utilisé par e-VACCIN.

## Tables Principales

### User
Table des utilisateurs du système.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| email | String | Email unique |
| phone | String | Téléphone unique (optionnel) |
| password | String | Mot de passe hashé |
| role | Enum | Rôle (ADMIN, CENTER_MANAGER, HEALTH_WORKER, PARENT) |
| isActive | Boolean | Compte actif |
| isEmailVerified | Boolean | Email vérifié |
| isPhoneVerified | Boolean | Téléphone vérifié |
| lastLoginAt | DateTime | Dernière connexion |
| failedLoginAttempts | Int | Tentatives échouées |
| lockedUntil | DateTime | Verrouillage jusqu'à |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### RefreshToken
Tokens de rafraîchissement JWT.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| token | String | Token JWT |
| userId | UUID | Référence à User |
| expiresAt | DateTime | Date d'expiration |
| createdAt | DateTime | Date de création |
| revokedAt | DateTime | Date de révocation |

### HealthCenter
Centres de santé.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| name | String | Nom du centre |
| code | String | Code unique |
| address | String | Adresse |
| region | String | Région |
| district | String | District |
| phone | String | Téléphone |
| email | String | Email (optionnel) |
| latitude | Float | Latitude GPS |
| longitude | Float | Longitude GPS |
| isActive | Boolean | Centre actif |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### HealthWorker
Agents de santé.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| userId | UUID | Référence à User |
| licenseNumber | String | Numéro de licence unique |
| firstName | String | Prénom |
| lastName | String | Nom |
| healthCenterId | UUID | Référence à HealthCenter |
| specialization | String | Spécialisation (optionnel) |
| isActive | Boolean | Agent actif |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### Parent
Parents/Tuteurs.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| userId | UUID | Référence à User |
| firstName | String | Prénom |
| lastName | String | Nom |
| dateOfBirth | DateTime | Date de naissance (optionnel) |
| address | String | Adresse (optionnel) |
| city | String | Ville (optionnel) |
| region | String | Région (optionnel) |
| preferredLanguage | String | Langue préférée (défaut: fr) |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### Child
Enfants.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| uniqueId | String | Identifiant unique public |
| firstName | String | Prénom |
| lastName | String | Nom |
| dateOfBirth | DateTime | Date de naissance |
| placeOfBirth | String | Lieu de naissance (optionnel) |
| gender | Enum | Genre (MALE, FEMALE) |
| bloodType | String | Groupe sanguin (optionnel) |
| photoUrl | String | URL de la photo (optionnel) |
| qrCode | String | QR Code (optionnel) |
| parentId | UUID | Référence à Parent |
| healthCenterId | UUID | Référence à HealthCenter |
| isActive | Boolean | Enfant actif |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### Vaccine
Vaccins disponibles.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| name | String | Nom du vaccin |
| code | String | Code unique |
| description | String | Description (optionnel) |
| manufacturer | String | Fabricant (optionnel) |
| type | String | Type (optionnel) |
| requiredDoses | Int | Nombre de doses requises |
| minAgeDays | Int | Âge minimum en jours |
| maxAgeDays | Int | Âge maximum en jours |
| intervalDays | Int | Intervalle entre doses |
| isActive | Boolean | Vaccin actif |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### VaccineSchedule
Calendrier vaccinal.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| vaccineId | UUID | Référence à Vaccine |
| doseNumber | Int | Numéro de dose |
| minAgeDays | Int | Âge minimum en jours |
| maxAgeDays | Int | Âge maximum en jours |
| intervalFromPreviousDose | Int | Intervalle depuis dose précédente |
| description | String | Description (optionnel) |
| isActive | Boolean | Calendrier actif |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### Vaccination
Enregistrements de vaccinations.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| childId | UUID | Référence à Child |
| vaccineId | UUID | Référence à Vaccine |
| doseNumber | Int | Numéro de dose |
| batchNumber | String | Numéro de lot |
| healthCenterId | UUID | Référence à HealthCenter |
| healthWorkerId | UUID | Référence à HealthWorker |
| vaccinationDate | DateTime | Date de vaccination |
| nextDueDate | DateTime | Prochaine date prévue |
| status | Enum | Statut (COMPLETED, SCHEDULED, OVERDUE, CANCELLED) |
| notes | String | Notes (optionnel) |
| adverseReaction | String | Réaction adverse (optionnel) |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### Appointment
Rendez-vous de vaccination.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| childId | UUID | Référence à Child |
| vaccineId | UUID | Référence à Vaccine |
| doseNumber | Int | Numéro de dose |
| healthCenterId | UUID | Référence à HealthCenter |
| healthWorkerId | UUID | Référence à HealthWorker (optionnel) |
| scheduledDate | DateTime | Date planifiée |
| status | Enum | Statut (COMPLETED, SCHEDULED, OVERDUE, CANCELLED) |
| notes | String | Notes (optionnel) |
| reminderSent | Boolean | Rappel envoyé |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### VaccineBatch
Lots de vaccins.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| batchNumber | String | Numéro de lot unique |
| vaccineId | UUID | Référence à Vaccine |
| healthCenterId | UUID | Référence à HealthCenter |
| manufacturingDate | DateTime | Date de fabrication |
| expirationDate | DateTime | Date d'expiration |
| initialQuantity | Int | Quantité initiale |
| currentQuantity | Int | Quantité actuelle |
| receivedDate | DateTime | Date de réception |
| supplier | String | Fournisseur (optionnel) |
| lotNumber | String | Numéro de lot (optionnel) |
| isActive | Boolean | Lot actif |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### StockMovement
Mouvements de stock.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| vaccineBatchId | UUID | Référence à VaccineBatch |
| healthCenterId | UUID | Référence à HealthCenter |
| movementType | String | Type (IN, OUT, ADJUSTMENT, EXPIRED) |
| quantity | Int | Quantité |
| reason | String | Raison (optionnel) |
| performedBy | String | Effectué par (optionnel) |
| createdAt | DateTime | Date de création |

### Notification
Notifications envoyées.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| userId | UUID | Référence à User |
| type | Enum | Type (SMS, EMAIL, PUSH, WHATSAPP) |
| status | Enum | Statut (PENDING, SENT, FAILED, DELIVERED) |
| title | String | Titre |
| message | String | Message |
| recipientEmail | String | Email destinataire (optionnel) |
| recipientPhone | String | Téléphone destinataire (optionnel) |
| scheduledAt | DateTime | Date planifiée (optionnel) |
| sentAt | DateTime | Date d'envoi (optionnel) |
| deliveredAt | DateTime | Date de livraison (optionnel) |
| error | String | Erreur (optionnel) |
| metadata | Json | Métadonnées (optionnel) |
| createdAt | DateTime | Date de création |
| updatedAt | DateTime | Date de mise à jour |

### AuditLog
Journal d'audit.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| userId | UUID | Référence à User (optionnel) |
| action | Enum | Action (voir énumération) |
| entityType | String | Type d'entité |
| entityId | String | ID de l'entité |
| oldValue | Json | Ancienne valeur (optionnel) |
| newValue | Json | Nouvelle valeur (optionnel) |
| ipAddress | String | Adresse IP (optionnel) |
| userAgent | String | User agent (optionnel) |
| createdAt | DateTime | Date de création |

## Enums

### UserRole
- `ADMIN` - Administrateur système
- `CENTER_MANAGER` - Responsable de centre
- `HEALTH_WORKER` - Agent de santé
- `PARENT` - Parent/Tuteur

### Gender
- `MALE` - Masculin
- `FEMALE` - Féminin

### VaccinationStatus
- `COMPLETED` - Complétée
- `SCHEDULED` - Planifiée
- `OVERDUE` - En retard
- `CANCELLED` - Annulée

### NotificationType
- `SMS` - SMS
- `EMAIL` - Email
- `PUSH` - Notification push
- `WHATSAPP` - WhatsApp

### NotificationStatus
- `PENDING` - En attente
- `SENT` - Envoyée
- `FAILED` - Échouée
- `DELIVERED` - Livrée

### AuditAction
Actions d'audit possibles :
- `USER_CREATED`
- `USER_UPDATED`
- `USER_DELETED`
- `CHILD_CREATED`
- `CHILD_UPDATED`
- `CHILD_DELETED`
- `VACCINATION_CREATED`
- `VACCINATION_UPDATED`
- `VACCINATION_DELETED`
- `APPOINTMENT_CREATED`
- `APPOINTMENT_UPDATED`
- `APPOINTMENT_CANCELLED`
- `STOCK_MOVEMENT`
- `HEALTH_CENTER_CREATED`
- `HEALTH_CENTER_UPDATED`
- `LOGIN`
- `LOGOUT`
- `PASSWORD_CHANGED`
- `PERMISSION_GRANTED`
- `PERMISSION_REVOKED`

## Index

Les index suivants sont définis pour optimiser les performances :

- `User.email`, `User.phone`, `User.role`
- `RefreshToken.token`, `RefreshToken.userId`
- `HealthCenter.code`, `HealthCenter.region`, `HealthCenter.isActive`
- `HealthWorker.userId`, `HealthWorker.licenseNumber`, `HealthWorker.healthCenterId`
- `Parent.userId`
- `Child.uniqueId`, `Child.parentId`, `Child.healthCenterId`, `Child.dateOfBirth`
- `Vaccine.code`, `Vaccine.isActive`
- `VaccineSchedule.vaccineId`
- `Vaccination.childId`, `Vaccination.vaccineId`, `Vaccination.healthCenterId`, `Vaccination.vaccinationDate`, `Vaccination.nextDueDate`, `Vaccination.status`
- `Appointment.childId`, `Appointment.healthCenterId`, `Appointment.scheduledDate`, `Appointment.status`
- `VaccineBatch.batchNumber`, `VaccineBatch.vaccineId`, `VaccineBatch.healthCenterId`, `VaccineBatch.expirationDate`
- `StockMovement.vaccineBatchId`, `StockMovement.healthCenterId`, `StockMovement.createdAt`
- `Notification.userId`, `Notification.status`, `Notification.scheduledAt`
- `AuditLog.userId`, `AuditLog.action`, `AuditLog.entityType`, `AuditLog.entityId`, `AuditLog.createdAt`

## Relations

### Relations Principales

- `User` → `Parent` (1:1)
- `User` → `HealthWorker` (1:1)
- `Parent` → `Child` (1:N)
- `HealthCenter` → `HealthWorker` (1:N)
- `HealthCenter` → `Child` (1:N)
- `HealthCenter` → `Vaccination` (1:N)
- `HealthCenter` → `Appointment` (1:N)
- `HealthCenter` → `VaccineBatch` (1:N)
- `Child` → `Vaccination` (1:N)
- `Child` → `Appointment` (1:N)
- `Vaccine` → `VaccineSchedule` (1:N)
- `Vaccine` → `Vaccination` (1:N)
- `Vaccine` → `VaccineBatch` (1:N)
- `VaccineBatch` → `StockMovement` (1:N)

## Optimisations

### Partitionnement

Pour les grandes tables, envisager le partitionnement par :
- `Vaccination` : par date ou par centre
- `AuditLog` : par date

### Archivage

Tables à archiver régulièrement :
- `AuditLog` (après 1 an)
- `Notification` (après 6 mois)
- `StockMovement` (après 2 ans)

## Backups

### Stratégie de Backup

- **Quotidien** : Backup complet
- **Hebdomadaire** : Backup différentiel
- **Mensuel** : Backup complet avec rétention longue
- **Offsite** : Copie vers cloud storage

### Restauration

- Tester les restaurations mensuellement
- Documenter le processus de restauration
- Avoir un plan de disaster recovery

## Sécurité

### Accès

- Utiliser des comptes DB avec permissions minimales
- Chiffrement des backups
- Accès limité par IP
- Authentication forte

### Chiffrement

- Chiffrement at-rest des données sensibles
- Chiffrement in-transit (SSL/TLS)
- Encryption des mots de passe avec Argon2id

## Maintenance

### Tâches Régulières

- **Quotidien** : Vérification de l'espace disque
- **Hebdomadaire** : Analyse des performances
- **Mensuel** : Rebuild des index
- **Trimestriel** : Review du schéma
- **Annuel** : Audit de sécurité

### Monitoring

- Surveiller les slow queries
- Surveiller l'utilisation des connections
- Surveiller la taille des tables
- Surveiller les locks
