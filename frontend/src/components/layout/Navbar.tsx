import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Syringe } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'HEALTH_WORKER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CENTER_MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'HEALTH_WORKER':
        return 'Agent de Santé';
      case 'CENTER_MANAGER':
        return 'Responsable Centre';
      default:
        return 'Parent / Tuteur';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2 text-indigo-600 font-bold text-xl tracking-tight">
              <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Syringe className="h-6 w-6" />
              </span>
              <span>e-VACCIN</span>
            </Link>

            {isAuthenticated && (
              <nav className="hidden md:flex ml-8 space-x-4">
                {user?.role === 'PARENT' && (
                  <>
                    <Link
                      to="/parent/dashboard"
                      className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md transition"
                    >
                      Mes Enfants
                    </Link>
                  </>
                )}

                {(user?.role === 'HEALTH_WORKER' || user?.role === 'ADMIN') && (
                  <>
                    <Link
                      to="/agent/dashboard"
                      className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md transition"
                    >
                      Espace Vaccination
                    </Link>
                  </>
                )}

                <Link
                  to="/schedule"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md transition"
                >
                  Calendrier Vaccinal (PEV)
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                  </p>
                  <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full border ${getRoleBadge(user?.role)}`}>
                    {getRoleLabel(user?.role)}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Se déconnecter"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  Créer un compte
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
