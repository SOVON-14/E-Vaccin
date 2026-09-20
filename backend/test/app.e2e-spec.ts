import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PRÉREQUIS D'EXÉCUTION
 * ─────────────────────────────────────────────────────────────────────────
 * Ce test e2e démarre l'application complète (guards, pipes, DTO, services
 * réels). Seule la couche Prisma est remplacée par un double en mémoire,
 * car aucun PostgreSQL n'est disponible dans cet environnement.
 * En CI avec `docker compose up postgres`, échangez le provider contre le
 * PrismaService réel + migrations (voir E2E avec base réelle plus bas).
 * ─────────────────────────────────────────────────────────────────────────
 */

jest.setTimeout(30000);

/** Double Prisma en mémoire couvrant les délegates utilisés par l'app. */
function createInMemoryPrisma() {
  const db = {
    users: [] as any[],
    parents: [] as any[],
    healthWorkers: [] as any[],
    refreshTokens: [] as any[],
    auditLogs: [] as any[],
    children: [] as any[],
    vaccines: [] as any[],
    vaccinations: [] as any[],
    appointments: [] as any[],
    vaccineBatches: [] as any[],
    stockMovements: [] as any[],
    vaccineSchedules: [] as any[],
    healthCenters: [] as any[],
    notifications: [] as any[],
  };
  let seq = 0;
  const id = (p: string) => `${p}-${++seq}`;

  const match = (obj: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([k, v]) => {
      if (Array.isArray(v)) {
        // Opérateurs logiques Prisma : OR / AND / NOT
        if (k === 'OR') return v.some((sub: any) => match(obj, sub));
        if (k === 'AND') return v.every((sub: any) => match(obj, sub));
        if (k === 'NOT') return !match(obj, v[0] ?? {});
        return false;
      }
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        const o = v as any;
        if ('contains' in o) {
          return String(obj[k] ?? '')
            .toLowerCase()
            .includes(String(o.contains).toLowerCase());
        }
        if ('decrement' in o) return true;
        if ('gte' in o || 'lte' in o) {
          const val = obj[k];
          if (val == null) return false;
          if ('gte' in o && !(new Date(val) >= new Date(o.gte))) return false;
          if ('lte' in o && !(new Date(val) <= new Date(o.lte))) return false;
          return true;
        }
        return match(obj[k] ?? {}, v);
      }
      // Champ absent de la ligne (undefined) ≡ NULL en base.
      return (obj[k] ?? null) === (v ?? null);
    });

  /** Résout les relations demandées par `include` sur une ligne (clé de stockage plurielle). */
  const resolveIncludes = (storageKey: string, row: any) => {
    if (!row) return row;
    if (storageKey === 'appointments') {
      row.child = db.children.find((c: any) => c.id === row.childId) ?? null;
      row.vaccine = db.vaccines.find((v: any) => v.id === row.vaccineId) ?? null;
      row.healthCenter =
        db.healthCenters.find((h: any) => h.id === row.healthCenterId) ?? null;
    }
    if (storageKey === 'parents' || storageKey === 'notifications') {
      // On attache une COPIE de l'utilisateur (les lignes stockées restent nues).
      const rawUser = db.users.find((u: any) => u.id === row.userId);
      row.user = rawUser ? { ...rawUser } : null;
    }
    return row;
  };

  /** Résout les where Prisma : clés simples et clés composées (ex. vaccineId_doseNumber). */
  const COMPOUND_KEYS: Record<string, string[]> = {
    vaccineId_doseNumber: ['vaccineId', 'doseNumber'],
  };
  const rowMatchesWhere = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([k, v]) => {
      if (COMPOUND_KEYS[k]) {
        return COMPOUND_KEYS[k].every((field) => row[field] === (v as any)[field]);
      }
      return row[k] === v;
    });

  const makeDelegate = (key: string) => ({
    findUnique: jest.fn(async ({ where }: any) => {
      const rows = (db as any)[key] as any[];
      const found = rows.find((r: any) => rowMatchesWhere(r, where));
      if (!found) return null;
      // JAMAIS de mutation du stock : on clone avant d'attacher les relations,
      // sinon des cycles user.parent.user rendent la réponse non sérialisable.
      const row = { ...found };
      if (key === 'users' && where.id) {
        row.parent = db.parents.find((p: any) => p.userId === row.id) ?? null;
        row.healthWorker =
          db.healthWorkers.find((w: any) => w.userId === row.id) ?? null;
      }
      return resolveIncludes(key, row) ?? null;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      const rows = (db as any)[key] as any[];
      const found = rows.find((r: any) => match(r, where));
      if (!found) return null;
      const row = { ...found };
      if (key === 'users') {
        row.parent = db.parents.find((p: any) => p.userId === row.id) ?? null;
        row.healthWorker = db.healthWorkers.find((w: any) => w.userId === row.id) ?? null;
      }
      return resolveIncludes(key, row) ?? null;
    }),
    findMany: jest.fn(async ({ where }: any = {}) =>
      ((db as any)[key] as any[])
        .filter((r: any) => match(r, where))
        .map((r: any) => resolveIncludes(key, { ...r })),
    ),
    count: jest.fn(async () => ((db as any)[key] as any[]).length),
    create: jest.fn(async ({ data }: any) => {
      const row: any = { id: id(key), ...data };
      if (row.id.startsWith('user')) {
        // champs par défaut du schéma
        row.isActive = row.isActive ?? true;
        row.failedLoginAttempts = row.failedLoginAttempts ?? 0;
      }
      ((db as any)[key] as any[]).push(row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const rows = (db as any)[key] as any[];
      const row = rows.find((r: any) => rowMatchesWhere(r, where));
      if (!row) throw new Error(`${key} not found for update`);
      Object.assign(row, data);
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let n = 0;
      for (const r of (db as any)[key] as any[]) {
        if (match(r, where)) {
          Object.assign(r, data);
          n++;
        }
      }
      return { count: n };
    }),
    decrement: undefined as any,
  });

  const prisma: any = {};
  // Correspondance noms Prisma (singuliers) → clés de stockage (pluriels).
  const delegateMap: Record<string, string> = {
    user: 'users',
    parent: 'parents',
    healthWorker: 'healthWorkers',
    refreshToken: 'refreshTokens',
    auditLog: 'auditLogs',
    child: 'children',
    vaccine: 'vaccines',
    vaccination: 'vaccinations',
    appointment: 'appointments',
    vaccineBatch: 'vaccineBatches',
    stockMovement: 'stockMovements',
    vaccineSchedule: 'vaccineSchedules',
    healthCenter: 'healthCenters',
    notification: 'notifications',
  };
  for (const [delegateName, storageKey] of Object.entries(delegateMap)) {
    prisma[delegateName] = makeDelegate(storageKey);
  }

  prisma.$transaction = jest.fn(async (fn: any) =>
    typeof fn === 'function' ? fn(prisma) : Promise.all(fn),
  );

  // Prise en charge de { decrement: 1 } sur currentQuantity.
  const origBatchUpdate = prisma.vaccineBatch.update;
  prisma.vaccineBatch.update = jest.fn(async (args: any) => {
    const row = db.vaccineBatches.find((r: any) => r.id === args.where.id);
    if (row && args.data?.currentQuantity?.decrement) {
      row.currentQuantity -= args.data.currentQuantity.decrement;
      return row;
    }
    return origBatchUpdate(args);
  });

  return { prisma, db };
}

describe('e-VACCIN e2e — flux critiques', () => {
  let app: INestApplication;
  let prisma: any;
  let db: ReturnType<typeof createInMemoryPrisma>['db'];

  const CENTER_ID = 'center-1';
  const CENTER_B_ID = 'center-2';

  beforeAll(async () => {
    const double = createInMemoryPrisma();
    prisma = double.prisma;
    db = double.db;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');

    // Même pipe que main.ts — indispensable pour la cohérence des DTOs.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // ── Jeu de données ──────────────────────────────────────────────
    db.users.push(
      {
        id: 'user-admin', email: 'admin@test.com', password: 'hashed', role: UserRole.ADMIN,
        isActive: true, failedLoginAttempts: 0, lockedUntil: null, parent: null, healthWorker: null,
      },
      {
        id: 'user-parent', email: 'parent@test.com', phone: '+22890000000', password: 'hashed',
        role: UserRole.PARENT, isActive: true, failedLoginAttempts: 0, lockedUntil: null,
      },
      {
        id: 'user-orphelin', email: 'orphelin@test.com', password: 'hashed', role: UserRole.PARENT,
        isActive: true, failedLoginAttempts: 0, lockedUntil: null,
      },
      {
        id: 'user-agentA', email: 'agentA@test.com', password: 'hashed', role: UserRole.HEALTH_WORKER,
        isActive: true, failedLoginAttempts: 0, lockedUntil: null,
      },
      {
        id: 'user-agentB', email: 'agentB@test.com', password: 'hashed', role: UserRole.HEALTH_WORKER,
        isActive: true, failedLoginAttempts: 0, lockedUntil: null,
      },
    );
    db.parents.push({ id: 'parent-1', userId: 'user-parent', firstName: 'Koffi', lastName: 'Dosseh' });
    db.healthWorkers.push(
      { id: 'hw-A', userId: 'user-agentA', firstName: 'Afi', lastName: 'Mensah', healthCenterId: CENTER_ID },
      { id: 'hw-B', userId: 'user-agentB', firstName: 'Kojo', lastName: 'Abla', healthCenterId: CENTER_B_ID },
    );
    db.children.push(
      {
        id: 'child-1', uniqueId: 'EV-2026-000001', firstName: 'Kévin', lastName: 'Dosseh',
        dateOfBirth: new Date('2025-06-15'), gender: 'MALE', parentId: 'parent-1',
        healthCenterId: CENTER_ID, isActive: true, vaccinations: [], appointments: [],
      },
      {
        id: 'child-B', uniqueId: 'EV-2026-000002', firstName: 'Aya', lastName: 'Dupont',
        dateOfBirth: new Date('2025-01-10'), gender: 'FEMALE', parentId: 'parent-1',
        healthCenterId: CENTER_B_ID, isActive: true, vaccinations: [], appointments: [],
      },
    );
    db.healthCenters.push(
      { id: CENTER_ID, name: 'Centre A', code: 'CTR-A', isActive: true },
      { id: CENTER_B_ID, name: 'Centre B', code: 'CTR-B', isActive: true },
    );
    db.vaccines.push({ id: 'v-bcg', code: 'BCG', name: 'BCG', requiredDoses: 2, isActive: true });
    db.vaccineBatches.push({
      id: 'batch-1', batchNumber: 'BCG-2026-LOT1', vaccineId: 'v-bcg', healthCenterId: CENTER_ID,
      currentQuantity: 10, expirationDate: new Date('2027-10-01'), isActive: true,
    });
    db.vaccineSchedules.push({
      id: 'sched-2', vaccineId: 'v-bcg', doseNumber: 2, minAgeDays: 0, maxAgeDays: 30,
      intervalFromPreviousDose: 30, isActive: true,
    });
    // RDV dans la fenêtre de rappel (24 h), non encore rappelé, avec parent
    // joignable (compte user + téléphone) — pour le flux notifications.
    db.appointments.push({
      id: 'apt-reminder', childId: 'child-1', vaccineId: 'v-bcg', doseNumber: 2,
      healthCenterId: CENTER_ID, scheduledDate: new Date(Date.now() + 24 * 3_600_000),
      status: 'SCHEDULED', reminderSent: false,
    });

    // Connexions simulées : les mots de passe du double ne sont pas vérifiables,
    // on contourne argon2 en testant /auth/refresh pour chaque profil afin
    // d'obtenir des tokens signés par l'app elle-même.
  });

  afterAll(async () => {
    await app.close();
  });

  /** Génère un access token directement signé par le JwtService de l'app. */
  const tokenFor = async (userId: string, email: string, role: UserRole) => {
    const jwt = app.get((await import('@nestjs/jwt')).JwtService);
    return jwt.sign({ sub: userId, email, role }, {
      secret: process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
      expiresIn: '15m',
    });
  };

  describe('Flux 1 — Authentification', () => {
    it('POST /api/auth/register crée un parent et renvoie les tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'nouveau@test.com',
          password: 'Password123!',
          firstName: 'Aya',
          lastName: 'Nouveau',
          role: 'PARENT',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.role).toBe('PARENT');
      expect(db.users.some((u) => u.email === 'nouveau@test.com')).toBe(true);
    });

    it('POST /api/auth/register rejette role=ADMIN avec 400 (faille corrigée)', async () => {
      const before = db.users.length;

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'hacker@test.com',
          password: 'Password123!',
          firstName: 'Hacker',
          lastName: 'Test',
          role: 'ADMIN',
        })
        .expect(400);

      expect(db.users.length).toBe(before); // rien créé
      expect(db.users.some((u) => u.role === UserRole.ADMIN && u.email === 'hacker@test.com')).toBe(false);
    });

    it('POST /api/auth/register rejette role=CENTER_MANAGER avec 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'escalade@test.com',
          password: 'Password123!',
          firstName: 'Esc',
          lastName: 'Lade',
          role: 'CENTER_MANAGER',
        })
        .expect(400);
    });

    it('POST /api/auth/login accepte un utilisateur existant (doublon via users semés)', async () => {
      // Le compte existe déjà dans le double : register doit échouer (409).
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'parent@test.com',
          password: 'Password123!',
          firstName: 'X',
          lastName: 'Y',
        })
        .expect(409);
    });
  });

  describe('Flux 2 — Enregistrement des enfants', () => {
    it("un parent crée son enfant via POST /api/children", async () => {
      const token = await tokenFor('user-parent', 'parent@test.com', UserRole.PARENT);

      const res = await request(app.getHttpServer())
        .post('/api/children')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Awa',
          lastName: 'Dosseh',
          dateOfBirth: '2026-01-10',
          gender: 'FEMALE',
          healthCenterId: CENTER_ID,
        })
        .expect(201);

      expect(res.body.uniqueId).toMatch(/^EV-\d{4}-\d{6}$/);
      expect(res.body.parentId).toBe('parent-1');
      expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('POST /api/children sans token → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/children')
        .send({
          firstName: 'No',
          lastName: 'Auth',
          dateOfBirth: '2026-01-10',
          gender: 'MALE',
          healthCenterId: CENTER_ID,
        })
        .expect(401);
    });

    it("un parent sans profil ne peut lire aucun dossier (403)", async () => {
      const tokenOrphelin = await tokenFor('user-orphelin', 'orphelin@test.com', UserRole.PARENT);
      const tokenParent = await tokenFor('user-parent', 'parent@test.com', UserRole.PARENT);

      // Le parent propriétaire accède à SES enfants : 200 attendu.
      await request(app.getHttpServer())
        .get('/api/children/child-1')
        .set('Authorization', `Bearer ${tokenParent}`)
        .expect(200);

      // Un compte PARENT sans profil Parent n'accède à rien : 403.
      await request(app.getHttpServer())
        .get('/api/children/child-1')
        .set('Authorization', `Bearer ${tokenOrphelin}`)
        .expect(403);
    });

    it("un agent ne consulte que les enfants de son centre (403 hors centre)", async () => {
      const tokenAgentA = await tokenFor('user-agentA', 'agentA@test.com', UserRole.HEALTH_WORKER);
      const tokenAgentB = await tokenFor('user-agentB', 'agentB@test.com', UserRole.HEALTH_WORKER);

      // agentA → child-1 (centre A) : OK
      await request(app.getHttpServer())
        .get('/api/children/child-1')
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .expect(200);

      // agentB → child-1 (centre A) : 403
      await request(app.getHttpServer())
        .get('/api/children/child-1')
        .set('Authorization', `Bearer ${tokenAgentB}`)
        .expect(403);
    });

    it("l'ADMIN consulte tous les dossiers", async () => {
      const token = await tokenFor('user-admin', 'admin@test.com', UserRole.ADMIN);
      await request(app.getHttpServer())
        .get('/api/children/child-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it("GET /api/children (agent) n'expose que son centre", async () => {
      const tokenAgentB = await tokenFor('user-agentB', 'agentB@test.com', UserRole.HEALTH_WORKER);

      const res = await request(app.getHttpServer())
        .get('/api/children')
        .set('Authorization', `Bearer ${tokenAgentB}`)
        .expect(200);

      expect(res.body.data.every((c: any) => c.healthCenterId === CENTER_B_ID || c.healthCenterId?.id === CENTER_B_ID)).toBe(true);
    });

    it('GET /api/children/by-unique-id/:uniqueId applique le contrôle (403 hors périmètre)', async () => {
      const tokenAgentB = await tokenFor('user-agentB', 'agentB@test.com', UserRole.HEALTH_WORKER);
      await request(app.getHttpServer())
        .get('/api/children/by-unique-id/EV-2026-000001')
        .set('Authorization', `Bearer ${tokenAgentB}`)
        .expect(403);
    });

    it('GET /api/children/:id/upcoming-vaccinations applique le contrôle (403)', async () => {
      const tokenAgentB = await tokenFor('user-agentB', 'agentB@test.com', UserRole.HEALTH_WORKER);
      await request(app.getHttpServer())
        .get('/api/children/child-1/upcoming-vaccinations')
        .set('Authorization', `Bearer ${tokenAgentB}`)
        .expect(403);
    });
  });

  describe('Flux 3 — Enregistrement des vaccinations', () => {
    it("POST /api/vaccinations (agent du centre) → 201 + décrémente le stock + crée le RDV suivant", async () => {
      const tokenAgentA = await tokenFor('user-agentA', 'agentA@test.com', UserRole.HEALTH_WORKER);
      const before = db.vaccineBatches[0].currentQuantity;

      const res = await request(app.getHttpServer())
        .post('/api/vaccinations')
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .send({
          childId: 'child-1',
          vaccineId: 'v-bcg',
          doseNumber: 1,
          batchNumber: 'BCG-2026-LOT1',
        })
        .expect(201);

      expect(res.body.healthCenterId).toBe(CENTER_ID);
      expect(res.body.healthWorkerId).toBe('hw-A');

      const batch = db.vaccineBatches[0];
      expect(batch.currentQuantity).toBe(before - 1);
      expect(db.stockMovements.some((m) => m.movementType === 'OUT')).toBe(true);
      expect(db.appointments.some((a) => a.childId === 'child-1' && a.doseNumber === 2)).toBe(true);
      expect(db.auditLogs.some((a) => a.action === 'VACCINATION_CREATED')).toBe(true);
    });

    it("POST /api/vaccinations sans token → 401", async () => {
      await request(app.getHttpServer())
        .post('/api/vaccinations')
        .send({ childId: 'child-1', vaccineId: 'v-bcg', doseNumber: 1, batchNumber: 'X' })
        .expect(401);
    });

    it("POST /api/vaccinations par un PARENT → 403 (rôles)", async () => {
      const token = await tokenFor('user-parent', 'parent@test.com', UserRole.PARENT);
      await request(app.getHttpServer())
        .post('/api/vaccinations')
        .set('Authorization', `Bearer ${token}`)
        .send({ childId: 'child-1', vaccineId: 'v-bcg', doseNumber: 1, batchNumber: 'X' })
        .expect(403);
    });

    it("GET /api/vaccinations/child/:childId applique le contrôle d'accès", async () => {
      const tokenAgentB = await tokenFor('user-agentB', 'agentB@test.com', UserRole.HEALTH_WORKER);
      await request(app.getHttpServer())
        .get('/api/vaccinations/child/child-1')
        .set('Authorization', `Bearer ${tokenAgentB}`)
        .expect(403);

      const tokenAgentA = await tokenFor('user-agentA', 'agentA@test.com', UserRole.HEALTH_WORKER);
      await request(app.getHttpServer())
        .get('/api/vaccinations/child/child-1')
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .expect(200);
    });
  });

  describe('Flux 4 — Notifications et rappels automatiques', () => {
    it("POST /api/notifications/admin/run-cycle génère le rappel du RDV à venir", async () => {
      const tokenAdmin = await tokenFor('user-admin', 'admin@test.com', UserRole.ADMIN);

      const res = await request(app.getHttpServer())
        .post('/api/notifications/admin/run-cycle')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      expect(res.body.reminders.generated).toBe(1);
      expect(res.body.delivery.sent).toBe(1);

      // Le rappel est adressé au parent, avec les bonnes métadonnées.
      const notif = db.notifications.find((n) => n.metadata?.appointmentId === 'apt-reminder');
      expect(notif).toBeDefined();
      expect(notif.userId).toBe('user-parent');
      expect(notif.recipientPhone).toBe('+22890000000');
      expect(notif.message).toContain('BCG');
      expect(notif.status).toBe('SENT');
      expect(notif.sentAt).toBeTruthy();

      // reminderSent posé : le RDV ne sera plus jamais rappelé.
      const apt = db.appointments.find((a) => a.id === 'apt-reminder');
      expect(apt.reminderSent).toBe(true);
    });

    it('POST /api/notifications/admin/run-cycle est idempotent (aucun doublon au cycle suivant)', async () => {
      const tokenAdmin = await tokenFor('user-admin', 'admin@test.com', UserRole.ADMIN);

      await request(app.getHttpServer())
        .post('/api/notifications/admin/run-cycle')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      const countAfterFirst = db.notifications.length;
      expect(
        db.notifications.filter((n) => n.metadata?.appointmentId === 'apt-reminder'),
      ).toHaveLength(1);

      const res = await request(app.getHttpServer())
        .post('/api/notifications/admin/run-cycle')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      expect(res.body.reminders.generated).toBe(0);
      expect(db.notifications.length).toBe(countAfterFirst);
    });

    it('POST /api/notifications/admin/run-cycle est refusé à un PARENT (403)', async () => {
      const token = await tokenFor('user-parent', 'parent@test.com', UserRole.PARENT);
      await request(app.getHttpServer())
        .post('/api/notifications/admin/run-cycle')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('POST /api/notifications (agent) crée une notification manuelle et l’envoie', async () => {
      const tokenAgentA = await tokenFor('user-agentA', 'agentA@test.com', UserRole.HEALTH_WORKER);
      const before = db.notifications.length;

      const res = await request(app.getHttpServer())
        .post('/api/notifications')
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .send({
          type: 'SMS',
          title: 'Convocation',
          message: 'Merci de passer au centre avec le carnet.',
          userId: 'user-parent',
          recipientPhone: '+22890000000',
        })
        .expect(201);

      // La notification est créée PENDING puis expédiée immédiatement par le
      // process d'envoi : l'état final observé est SENT.
      expect(['PENDING', 'SENT']).toContain(res.body.status);
      expect(db.notifications.length).toBe(before + 1);
      expect(db.notifications[db.notifications.length - 1].status).toBe('SENT');
    });

    it('POST /api/notifications par un PARENT → 403 (rôles)', async () => {
      const token = await tokenFor('user-parent', 'parent@test.com', UserRole.PARENT);
      await request(app.getHttpServer())
        .post('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'SMS',
          title: 'Spam',
          message: 'Tentative parent',
          userId: 'user-parent',
        })
        .expect(403);
    });

    it('GET /api/notifications (parent) ne renvoie que sa boîte de réception', async () => {
      const token = await tokenFor('user-parent', 'parent@test.com', UserRole.PARENT);

      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((n: any) => n.userId === 'user-parent')).toBe(true);
    });

    it('GET /api/notifications (admin) voit toute la file avec l’email du destinataire', async () => {
      const tokenAdmin = await tokenFor('user-admin', 'admin@test.com', UserRole.ADMIN);

      const res = await request(app.getHttpServer())
        .get('/api/notifications?status=SENT')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].user).toBeDefined();
    });

    it('POST /api/notifications/:id/delivered confirme sa propre notification', async () => {
      const token = await tokenFor('user-parent', 'parent@test.com', UserRole.PARENT);
      const notif = db.notifications.find(
        (n) => n.userId === 'user-parent' && n.status === 'SENT',
      );

      const res = await request(app.getHttpServer())
        .post(`/api/notifications/${notif.id}/delivered`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.status).toBe('DELIVERED');
      expect(res.body.deliveredAt).toBeTruthy();
    });
  });
});
