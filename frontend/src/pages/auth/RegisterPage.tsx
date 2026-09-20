import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { HealthCenter, UserRole } from '../../types';
import { AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [role, setRole] = useState<UserRole>('PARENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [healthCenterId, setHealthCenterId] = useState('');
  const [centers, setCenters] = useState<HealthCenter[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'HEALTH_WORKER') {
      api.get('/health-centers')
        .then((res) => {
          setCenters(res.data);
          if (res.data.length > 0) {
            setHealthCenterId(res.data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        email,
        password,
        firstName,
        lastName,
        phone: phone || undefined,
        role,
      };

      if (role === 'HEALTH_WORKER') {
        payload.licenseNumber = licenseNumber;
        payload.healthCenterId = healthCenterId;
      }

      const response = await api.post('/auth/register', payload);
      login(response.data);

      if (role === 'PARENT') {
        navigate('/parent/dashboard');
      } else {
        navigate('/agent/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Une erreur est survenue lors de l’inscription. Veuillez réessayer.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-lg w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-3">
            <UserCheck className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Inscription à e-VACCIN</h2>
          <p className="mt-1 text-sm text-gray-500">
            Créez votre compte pour suivre les vaccinations
          </p>
        </div>

        {/* Role toggle */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setRole('PARENT')}
            className={`py-2 text-sm font-semibold rounded-lg transition ${
              role === 'PARENT'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Parent / Tuteur
          </button>
          <button
            type="button"
            onClick={() => setRole('HEALTH_WORKER')}
            className={`py-2 text-sm font-semibold rounded-lg transition ${
              role === 'HEALTH_WORKER'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Agent de Santé
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-3 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jean"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dupont"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jean.dupont@exemple.com"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+228 90 00 00 00"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {role === 'HEALTH_WORKER' && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de Licence / Matricule Professionnel
                </label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="ex: HW-TG-2026-999"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centre de Santé d'affectation
                </label>
                <select
                  required
                  value={healthCenterId}
                  onChange={(e) => setHealthCenterId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code} - {c.region})
                    </option>
                  ))}
                  {centers.length === 0 && (
                    <option value="">Aucun centre disponible (sélection par défaut)</option>
                  )}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-2.5 px-4 mt-6 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
          >
            {loading ? 'Inscription en cours...' : 'Créer mon compte'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>

          <div className="text-center text-sm text-gray-600 pt-2">
            Déjà inscrit ?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
