import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Syringe, ShieldCheck, QrCode, Bell, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-16 py-12">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
          <Syringe className="h-4 w-4" />
          <span>Plateforme Nationale de Suivi Vaccinal</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight max-w-4xl mx-auto">
          Le carnet de vaccination numérique pour protéger chaque enfant.
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          e-VACCIN modernise le suivi médical infantile : dites adieu aux carnets papier égarés, accédez aux QR codes officiels et recevez des rappels automatiques.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
          {isAuthenticated ? (
            <Link
              to={user?.role === 'PARENT' ? '/parent/dashboard' : '/agent/dashboard'}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition"
            >
              Accéder à mon espace ({user?.role === 'PARENT' ? 'Parent' : 'Agent'})
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition"
              >
                Créer un carnet numérique
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl border border-gray-300 shadow-sm transition"
              >
                Espace Professionnel & Connexion
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
              <QrCode className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">QR Code Médical Sécurisé</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Chaque enfant dispose d'un identifiant unique et d'un QR code pour une identification instantanée lors des consultations en centre de santé.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Traçabilité & Gestion des Lots</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Conserve les numéros de lots, dates de péremption et décrémente les stocks en temps réel pour prévenir les ruptures de vaccins vitaux.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Rappels d'Échéances</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Calcul automatique de la prochaine dose requise et programmation de rappels pour éviter tout abandon vaccinal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
