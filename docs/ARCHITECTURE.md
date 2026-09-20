# Architecture e-VACCIN

## Vue d'ensemble

e-VACCIN utilise une architecture microservices avec NestJS pour le backend et React pour le frontend. Le système est conçu pour être évolutif, sécurisé et capable de fonctionner avec une connexion limitée.

## Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    CDN (Cloudflare)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Load Balancer + SSL Termination                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │    │   Backend    │    │   Mobile     │
│   (PWA)      │    │   (NestJS)   │    │   (React     │
│              │    │              │    │   Native)    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        │                     ▼                     │
        │         ┌─────────────────────┐             │
        │         │   API Gateway      │             │
        │         │   (Kong/Nginx)     │             │
        │         └─────────────────────┘             │
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Auth Svc   │    │  Core Svc    │    │  Notify Svc  │
└──────────────┘    └──────────────┘    └──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Message Broker (RabbitMQ)                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ PostgreSQL   │    │    Redis     │    │  S3/MinIO    │
│ (Primary)    │    │   (Cache)    │    │  (Storage)   │
└──────────────┘    └──────────────┘    └──────────────┘
        │
        ▼
┌──────────────┐
│ PostgreSQL   │
│ (Replica)    │
└──────────────┘
```

## Architecture Backend

### Modules NestJS

```
src/
├── auth/              # Authentification et autorisation
│   ├── dto/          # Data Transfer Objects
│   ├── guards/       # Guards de protection
│   └── strategies/   # Stratégies Passport
├── users/            # Gestion des utilisateurs
├── children/         # Gestion des enfants
├── vaccines/         # Gestion des vaccins
├── vaccinations/     # Enregistrement des vaccinations
├── appointments/     # Gestion des rendez-vous
├── notifications/    # Système de notifications
├── health-centers/   # Gestion des centres de santé
├── stock/            # Gestion des stocks
├── reports/          # Rapports et statistiques
├── audit/            # Journalisation
└── common/           # Utilitaires partagés
```

### Patterns Utilisés

- **Repository Pattern** : Pour l'accès aux données
- **DTO Pattern** : Pour la validation des données
- **Guard Pattern** : Pour la protection des routes
- **Interceptor Pattern** : Pour le logging et la transformation
- **Decorator Pattern** : Pour les métadonnées

## Architecture Frontend

### Structure React

```
src/
├── components/       # Composants réutilisables
│   ├── ui/          # Composants UI de base
│   ├── forms/       # Composants de formulaire
│   └── layout/      # Composants de layout
├── pages/           # Pages de l'application
│   ├── public/      # Pages publiques
│   ├── parent/      # Pages parents
│   ├── agent/       # Pages agents
│   ├── manager/     # Pages responsables
│   └── admin/       # Pages admin
├── hooks/           # Custom hooks React
├── services/        # Services API
├── utils/           # Utilitaires
├── types/           # Types TypeScript
└── styles/          # Styles globaux
```

### State Management

- **TanStack Query** : Pour la gestion des données serveur
- **Zustand** : Pour l'état global client
- **React Context** : Pour le thème et l'authentification

## Architecture de Base de Données

### Schéma Principal

- **Users** : Utilisateurs du système
- **Parents** : Parents/Tuteurs
- **Children** : Enfants
- **HealthCenters** : Centres de santé
- **HealthWorkers** : Agents de santé
- **Vaccines** : Vaccins
- **VaccineSchedules** : Calendrier vaccinal
- **Vaccinations** : Enregistrements de vaccinations
- **Appointments** : Rendez-vous
- **VaccineBatches** : Lots de vaccins
- **StockMovements** : Mouvements de stock
- **Notifications** : Notifications
- **AuditLogs** : Journal d'audit

### Optimisations

- **Index** : Sur les colonnes fréquemment recherchées
- **Partitionnement** : Pour les grandes tables (vaccinations)
- **Connection Pooling** : Via Prisma
- **Read Replicas** : Pour les lectures intensives

## Architecture de Sécurité

### Couches de Sécurité

1. **Réseau** : Firewall, SSL/TLS
2. **Application** : Rate limiting, validation, sanitization
3. **Authentification** : JWT, MFA, session management
4. **Autorisation** : RBAC, permissions granulaires
5. **Données** : Encryption at-rest et in-transit

### Mesures de Sécurité

- Password hashing avec Argon2id
- JWT avec refresh tokens
- CSRF protection
- XSS protection
- SQL injection prevention
- File upload validation
- Security headers
- Audit logging

## Architecture Offline-First

### Stratégie PWA

```
App PWA
  ↓
Service Worker (cache stratégie)
  ↓
IndexedDB (stockage local)
  ↓
Sync Queue (synchronisation différée)
  ↓
Background Sync API
```

### Gestion des Conflits

- **Last-Write-Wins** : Pour les données simples
- **Manual Resolution** : Pour les données critiques
- **Versioning** : Pour traçabilité

## Architecture de Scalabilité

### Horizontal Scaling

- Conteneurs Docker
- Kubernetes orchestration
- Auto-scaling basé sur la charge
- Load balancing

### Vertical Scaling

- Database indexing
- Query optimization
- Caching aggressif
- Connection pooling

## Architecture de Monitoring

### Outils

- **Prometheus** : Métriques
- **Grafana** : Visualisation
- **ELK Stack** : Logs
- **Jaeger** : Distributed tracing
- **Sentry** : Error tracking

### Métriques Clés

- Performance des API
- Utilisation des ressources
- Taux d'erreur
- Temps de réponse
- Uptime

## Architecture de Déploiement

### Environnements

- **Development** : Local avec Docker Compose
- **Staging** : Cloud avec données de test
- **Production** : Cloud haute disponibilité

### CI/CD

- GitHub Actions
- Tests automatiques
- Builds automatisés
- Deploys automatisés
- Rollback automatique

## Architecture de Communication

### APIs

- **REST** : Pour les opérations CRUD
- **WebSocket** : Pour les notifications en temps réel
- **GraphQL** : (Optionnel) Pour les requêtes complexes

### Events

- **Message Broker** : RabbitMQ/Kafka
- **Event Sourcing** : Pour certains services
- **CQRS** : Pour les opérations complexes

## Bonnes Pratiques

### Code

- TypeScript strict
- Linting avec ESLint
- Formatting avec Prettier
- Tests unitaires et d'intégration
- Code reviews

### Infrastructure

- Infrastructure as Code
- GitOps
- Monitoring continu
- Backup automatique
- Disaster recovery plan

### Sécurité

- Principe du moindre privilège
- Defense in depth
- Security by design
- Regular audits
- Penetration testing
