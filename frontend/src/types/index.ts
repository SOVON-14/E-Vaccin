export type UserRole = 'ADMIN' | 'CENTER_MANAGER' | 'HEALTH_WORKER' | 'PARENT';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  healthCenterId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface HealthCenter {
  id: string;
  name: string;
  code: string;
  address: string;
  region: string;
  district: string;
  phone: string;
  email?: string;
}

export interface Vaccine {
  id: string;
  name: string;
  code: string;
  description?: string;
  manufacturer?: string;
  requiredDoses: number;
  minAgeDays?: number;
  maxAgeDays?: number;
  isActive: boolean;
}

export interface VaccineSchedule {
  id: string;
  vaccineId: string;
  doseNumber: number;
  minAgeDays: number;
  maxAgeDays: number;
  intervalFromPreviousDose?: number;
  description?: string;
  vaccine?: Vaccine;
}

export interface Vaccination {
  id: string;
  childId: string;
  vaccineId: string;
  doseNumber: number;
  batchNumber: string;
  healthCenterId: string;
  healthWorkerId: string;
  vaccinationDate: string;
  nextDueDate?: string;
  status: 'COMPLETED' | 'SCHEDULED' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
  adverseReaction?: string;
  vaccine?: Vaccine;
  healthCenter?: { name: string; code: string };
  healthWorker?: { firstName: string; lastName: string; licenseNumber: string };
}

export interface Child {
  id: string;
  uniqueId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth?: string;
  gender: 'MALE' | 'FEMALE';
  bloodType?: string;
  photoUrl?: string;
  qrCode?: string;
  parentId: string;
  healthCenterId: string;
  parent?: { firstName: string; lastName: string; user?: { email: string; phone?: string } };
  healthCenter?: { id: string; name: string; code: string };
  vaccinations?: Vaccination[];
  appointments?: any[];
  _count?: { vaccinations: number; appointments: number };
}

export interface UpcomingVaccination {
  vaccine: Vaccine;
  doseNumber: number;
  dueDate: string;
  description?: string;
  status: 'SCHEDULED' | 'OVERDUE';
  daysRemaining: number;
}
