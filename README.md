# e-VACCIN 🏥💉

Plateforme numérique de suivi de vaccination des enfants

## 📋 Description

e-VACCIN est une plateforme web/mobile permettant de digitaliser le carnet de vaccination des enfants et de faciliter le suivi des vaccinations par les parents, les agents de santé et les responsables des centres de vaccination.

## 🎯 Objectifs

- Remplacer le carnet papier par un système numérique sécurisé
- Enregistrer les enfants et leurs vaccinations
- Suivre les doses reçues et identifier les prochaines vaccinations
- Conserver les numéros de lot des vaccins
- Envoyer des rappels automatiques aux parents
- Permettre aux agents de santé de gérer les vaccinations
- Produire des statistiques et des rapports
- Fonctionner avec une connexion Internet limitée

## 👥 Utilisateurs

- **Parent/Tuteur** : Gère le carnet de vaccination de ses enfants
- **Agent de santé** : Enregistre les vaccinations et gère les patients
- **Responsable de centre** : Gère les agents, les stocks et les statistiques
- **Administrateur** : Gestion globale du système

## 🛠️ Technologies

### Backend
- **Framework** : NestJS (Node.js + TypeScript)
- **Base de données** : PostgreSQL
- **ORM** : Prisma
- **Cache** : Redis
- **Authentification** : JWT + Passport
- **Documentation API** : Swagger/OpenAPI

### Frontend
- **Framework** : React + TypeScript
- **Build tool** : Vite
- **Routing** : React Router
- **State management** : TanStack Query + Zustand
- **UI** : Tailwind CSS
- **Forms** : React Hook Form + Zod
- **Charts** : Recharts

### Infrastructure
- **Conteneurisation** : Docker + Docker Compose
- **Base de données** : PostgreSQL 15
- **Cache** : Redis 7
- **CI/CD** : GitHub Actions (à configurer)

## 📁 Structure du Projet

```
e-vaccin/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── auth/           # Authentification
│   │   ├── users/          # Gestion des utilisateurs
│   │   ├── children/       # Gestion des enfants
│   │   ├── vaccines/       # Gestion des vaccins
│   │   ├── vaccinations/   # Enregistrement des vaccinations
│   │   ├── appointments/   # Gestion des rendez-vous
│   │   ├── notifications/  # Système de notifications
│   │   ├── health-centers/ # Gestion des centres de santé
│   │   ├── stock/          # Gestion des stocks
│   │   ├── reports/        # Rapports et statistiques
│   │   ├── audit/          # Journalisation
│   │   └── common/         # Utilitaires partagés
│   ├── prisma/             # Schéma de base de données
│   └── test/               # Tests
├── frontend/               # Application React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages de l'application
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Services API
│   │   ├── utils/          # Utilitaires
│   │   ├── types/          # Types TypeScript
│   │   └── styles/         # Styles globaux
│   └── public/             # Fichiers statiques
├── mobile/                 # Application mobile (React Native)
├── database/               # Scripts de base de données
├── docs/                   # Documentation
├── tests/                  # Tests intégrés
├── infrastructure/         # Configuration infrastructure
├── scripts/                # Scripts utilitaires
└── .github/               # Configuration GitHub
```

## 🚀 Démarrage Rapide

### Prérequis

- Docker et Docker Compose
- Node.js 18+
- npm ou yarn

### Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd e-vaccin
```

2. **Configurer les variables d'environnement**
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

3. **Démarrer les services Docker**
```bash
# Windows
scripts\dev.bat

# Linux/Mac
chmod +x scripts/dev.sh
./scripts/dev.sh
```

4. **Configurer la base de données**
```bash
# Windows
scripts\setup-db.bat

# Linux/Mac
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh
```

### Accès aux Services

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:3001
- **Documentation API** : http://localhost:3001/api/docs
- **Adminer (DB)** : http://localhost:8080

## 🗄️ Schéma de Base de Données

Le schéma Prisma complet est disponible dans `backend/prisma/schema.prisma`.

### Tables principales

- `User` - Utilisateurs du système
- `Parent` - Parents/Tuteurs
- `Child` - Enfants
- `HealthCenter` - Centres de santé
- `HealthWorker` - Agents de santé
- `Vaccine` - Vaccins
- `VaccineSchedule` - Calendrier vaccinal
- `Vaccination` - Enregistrements de vaccinations
- `Appointment` - Rendez-vous
- `VaccineBatch` - Lots de vaccins
- `StockMovement` - Mouvements de stock
- `Notification` - Notifications
- `AuditLog` - Journal d'audit

## 🔐 Sécurité

- Authentification JWT avec refresh tokens
- Hachage des mots de passe avec Argon2id
- RBAC (Role-Based Access Control)
- Rate limiting
- Validation des entrées
- HTTPS obligatoire en production
- Chiffrement des données sensibles

## 📱 Fonctionnalités

### MVP (Version 1)

- ✅ Inscription/connexion
- ✅ Gestion des parents
- ✅ Gestion des enfants
- ✅ Carnet numérique
- ✅ Gestion des vaccins
- ✅ Enregistrement des doses
- ✅ Calendrier vaccinal configurable
- ✅ Prochaines vaccinations
- ✅ Historique
- ✅ Dashboard parent
- ✅ Dashboard agent
- ✅ Recherche enfant
- ✅ QR Code
- ✅ Notifications/rappels
- ✅ Gestion des rôles
- ✅ Journalisation

### Version 2

- 🔄 Gestion des stocks
- 🔄 Gestion des lots
- 🔄 Notifications SMS
- 🔄 Application mobile
- 🔄 Mode hors connexion
- 🔄 Synchronisation
- 🔄 Statistiques avancées
- 🔄 Export Excel/CSV
- 🔄 Rapports PDF

### Version 3

- 🔄 Gestion régionale/nationale
- 🔄 Cartographie des centres
- 🔄 Analyse des couvertures vaccinales
- 🔄 Système d'alertes avancé
- 🔄 API d'interopérabilité
- 🔄 Architecture hautement disponible

## 🧪 Tests

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e
npm run test:cov

# Frontend tests
cd frontend
npm run test
```

## 📝 Scripts Disponibles

### Développement
```bash
# Démarrer l'environnement de développement
scripts/dev.bat          # Windows
./scripts/dev.sh         # Linux/Mac

# Configurer la base de données
scripts/setup-db.bat     # Windows
./scripts/setup-db.sh    # Linux/Mac
```

### Build
```bash
# Construire pour la production
scripts/build.bat        # Windows
./scripts/build.sh       # Linux/Mac
```

### Docker
```bash
# Démarrer les containers
docker-compose up -d

# Arrêter les containers
docker-compose down

# Voir les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart backend
```

## 🔄 Workflow Git

### Branches

- `main` - Production
- `develop` - Développement
- `feature/*` - Nouvelles fonctionnalités
- `bugfix/*` - Corrections de bugs
- `hotfix/*` - Corrections urgentes

### Commandes

```bash
# Créer une nouvelle branche de fonctionnalité
git checkout -b feature/nom-fonctionnalite

# Commiter les changements
git add .
git commit -m "feat: description de la fonctionnalité"

# Pousser les changements
git push origin feature/nom-fonctionnalite
```

## 📚 Documentation

- [Documentation API](http://localhost:3001/api/docs)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation NestJS](https://docs.nestjs.com)
- [Documentation React](https://react.dev)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commiter les changements (`git commit -m 'feat: Add AmazingFeature'`)
4. Pousser vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.

## 👨‍⚕️ Avertissement Médical

Ce système est un outil de gestion de données médicales et ne remplace pas l'avis d'un professionnel de santé. Les règles vaccinales doivent être validées par l'autorité sanitaire compétente avant toute mise en production.

## 📞 Support

Pour toute question ou support, veuillez contacter l'équipe e-VACCIN.

---

**Développé avec ❤️ pour améliorer la santé des enfants**
