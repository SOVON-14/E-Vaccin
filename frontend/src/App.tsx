import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/layout/Navbar';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ParentDashboard } from './pages/parent/ParentDashboard';
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { SchedulePage } from './pages/SchedulePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/schedule" element={<SchedulePage />} />

              {/* Parent Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['PARENT', 'ADMIN']} />}>
                <Route path="/parent/dashboard" element={<ParentDashboard />} />
              </Route>

              {/* Health Worker / Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['HEALTH_WORKER', 'ADMIN', 'CENTER_MANAGER']} />}>
                <Route path="/agent/dashboard" element={<AgentDashboard />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
