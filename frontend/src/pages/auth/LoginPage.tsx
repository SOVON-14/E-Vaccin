import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { Syringe, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data);

      const role = response.data.user.role;
      if (role === 'PARENT') {
        navigate('/parent/dashboard');
      } else if (role === 'HEALTH_WORKER' || role === 'ADMIN' || role === 'CENTER_MANAGER') {
        navigate('/agent/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Identifiants invalides. Veuillez vérifier votre email et mot de passe.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-3">
            <Syringe className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Connexion à e-VACCIN</h2>
          <p className="mt-2 text-sm text-gray-500">
            Accédez à votre carnet de vaccination numérique ou à votre espace santé
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-3 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center text-sm text-gray-600">
            Vous n'avez pas encore de compte ?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Créer un compte
            </Link>
          </div>

          {/* Quick login hint for testing */}
          <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800 space-y-1">
            <p className="font-semibold">💡 Comptes de test (après exécution du seed) :</p>
            <p>• Parent : <code>parent@evaccin.com</code> / <code>Parent@2026!</code></p>
            <p>• Agent de santé : <code>agent@evaccin.com</code> / <code>Worker@2026!</code></p>
            <p>• Administrateur : <code>admin@evaccin.com</code> / <code>Admin@2026!</code></p>
          </div>
        </form>
      </div>
    </div>
  );
};
