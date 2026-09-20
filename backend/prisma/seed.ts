import { PrismaClient, UserRole, Gender, VaccinationStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Default Admin User
  const adminPasswordHash = await argon2.hash('Admin@2026!');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@evaccin.com' },
    update: {},
    create: {
      email: 'admin@evaccin.com',
      phone: '+22890000001',
      password: adminPasswordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });
  console.log(`✅ Admin user ready: ${adminUser.email}`);

  // 2. Create Reference Health Center
  const healthCenter = await prisma.healthCenter.upsert({
    where: { code: 'CHR-LOME-001' },
    update: {},
    create: {
      name: 'Centre Hospitalier Régional de Lomé',
      code: 'CHR-LOME-001',
      address: 'Boulevard du 13 Janvier, Quartier Administratif',
      region: 'Maritime',
      district: 'Lomé',
      phone: '+22822212501',
      email: 'contact@chr-lome.tg',
      latitude: 6.1375,
      longitude: 1.2125,
      isActive: true,
    },
  });
  console.log(`✅ Health Center ready: ${healthCenter.name}`);

  // 3. Create Health Worker User and Profile
  const workerPasswordHash = await argon2.hash('Worker@2026!');
  const workerUser = await prisma.user.upsert({
    where: { email: 'agent@evaccin.com' },
    update: {},
    create: {
      email: 'agent@evaccin.com',
      phone: '+22890112233',
      password: workerPasswordHash,
      role: UserRole.HEALTH_WORKER,
      isEmailVerified: true,
      isPhoneVerified: true,
      healthWorker: {
        create: {
          licenseNumber: 'HW-TG-2026-001',
          firstName: 'Afi',
          lastName: 'Mensah',
          healthCenterId: healthCenter.id,
          specialization: 'Pédiatrie & Vaccination',
        },
      },
    },
  });
  console.log(`✅ Health Worker ready: ${workerUser.email}`);

  // 4. Create Parent User and Profile
  const parentPasswordHash = await argon2.hash('Parent@2026!');
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@evaccin.com' },
    update: {},
    create: {
      email: 'parent@evaccin.com',
      phone: '+22891223344',
      password: parentPasswordHash,
      role: UserRole.PARENT,
      isEmailVerified: true,
      isPhoneVerified: true,
      parent: {
        create: {
          firstName: 'Koffi',
          lastName: 'Dosseh',
          city: 'Lomé',
          region: 'Maritime',
          preferredLanguage: 'fr',
        },
      },
    },
  });
  console.log(`✅ Parent ready: ${parentUser.email}`);

  // 5. Seed PEV Vaccines and Schedules
  const vaccinesData = [
    {
      name: 'BCG (Tuberculose)',
      code: 'BCG',
      description: 'Vaccin contre la tuberculose administré dès la naissance',
      manufacturer: 'Serum Institute of India',
      requiredDoses: 1,
      minAgeDays: 0,
      maxAgeDays: 30,
      schedules: [
        { doseNumber: 1, minAgeDays: 0, maxAgeDays: 30, description: 'Dose unique à la naissance' },
      ],
    },
    {
      name: 'VPO (Polio Oral)',
      code: 'VPO',
      description: 'Vaccin poliomyélitique oral',
      manufacturer: 'Sanofi Pasteur',
      requiredDoses: 4,
      minAgeDays: 0,
      maxAgeDays: 365,
      schedules: [
        { doseNumber: 1, minAgeDays: 0, maxAgeDays: 30, description: 'Dose 0 à la naissance' },
        { doseNumber: 2, minAgeDays: 42, maxAgeDays: 70, intervalFromPreviousDose: 30, description: 'À 6 semaines' },
        { doseNumber: 3, minAgeDays: 70, maxAgeDays: 98, intervalFromPreviousDose: 30, description: 'À 10 semaines' },
        { doseNumber: 4, minAgeDays: 98, maxAgeDays: 126, intervalFromPreviousDose: 30, description: 'À 14 semaines' },
      ],
    },
    {
      name: 'Pentavalent (DTC-HepB-Hib)',
      code: 'PENTA',
      description: 'Vaccin combiné contre la Diphtérie, Tétanos, Coqueluche, Hépatite B et Haemophilus influenzae type b',
      manufacturer: 'Serum Institute of India',
      requiredDoses: 3,
      minAgeDays: 42,
      maxAgeDays: 365,
      schedules: [
        { doseNumber: 1, minAgeDays: 42, maxAgeDays: 70, description: 'Penta 1 à 6 semaines' },
        { doseNumber: 2, minAgeDays: 70, maxAgeDays: 98, intervalFromPreviousDose: 30, description: 'Penta 2 à 10 semaines' },
        { doseNumber: 3, minAgeDays: 98, maxAgeDays: 126, intervalFromPreviousDose: 30, description: 'Penta 3 à 14 semaines' },
      ],
    },
    {
      name: 'Rougeole - Rubéole (RR)',
      code: 'RR',
      description: 'Vaccin combiné contre la rougeole et la rubéole',
      manufacturer: 'Serum Institute of India',
      requiredDoses: 2,
      minAgeDays: 270,
      maxAgeDays: 730,
      schedules: [
        { doseNumber: 1, minAgeDays: 270, maxAgeDays: 365, description: 'RR 1 à 9 mois' },
        { doseNumber: 2, minAgeDays: 450, maxAgeDays: 600, intervalFromPreviousDose: 180, description: 'RR 2 à 15 mois' },
      ],
    },
    {
      name: 'VAA (Fièvre Jaune)',
      code: 'VAA',
      description: 'Vaccin anti-amaril contre la fièvre jaune',
      manufacturer: 'Institut Pasteur de Dakar',
      requiredDoses: 1,
      minAgeDays: 270,
      maxAgeDays: 365,
      schedules: [
        { doseNumber: 1, minAgeDays: 270, maxAgeDays: 365, description: 'Dose unique à 9 mois' },
      ],
    },
  ];

  for (const vData of vaccinesData) {
    const { schedules, ...vaccineFields } = vData;
    const vaccine = await prisma.vaccine.upsert({
      where: { code: vaccineFields.code },
      update: vaccineFields,
      create: vaccineFields,
    });

    for (const sData of schedules) {
      await prisma.vaccineSchedule.upsert({
        where: {
          vaccineId_doseNumber: {
            vaccineId: vaccine.id,
            doseNumber: sData.doseNumber,
          },
        },
        update: sData,
        create: {
          ...sData,
          vaccineId: vaccine.id,
        },
      });
    }

    // 6. Create initial batches for health center
    await prisma.vaccineBatch.upsert({
      where: { batchNumber: `${vaccine.code}-2026-LOT1` },
      update: {},
      create: {
        batchNumber: `${vaccine.code}-2026-LOT1`,
        vaccineId: vaccine.id,
        healthCenterId: healthCenter.id,
        manufacturingDate: new Date('2025-10-01'),
        expirationDate: new Date('2027-10-01'),
        initialQuantity: 500,
        currentQuantity: 480,
        receivedDate: new Date('2026-01-10'),
        supplier: 'Direction Nationale de la Pharmacie',
        isActive: true,
      },
    });
  }

  console.log('✅ Vaccines, schedules, and stock batches seeded successfully.');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
