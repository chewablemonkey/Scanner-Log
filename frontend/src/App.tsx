import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { InventoryDashboard } from './components/dashboard/InventoryDashboard';
import { NotificationsPanel } from './components/dashboard/NotificationsPanel';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/toaster';
import { useIsMobile } from './hooks/use-mobile';
import './App.css';

function AppContent() {
  const { isAuthenticated, logout, user } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const isMobile = useIsMobile();

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Scanner Log</h1>
        {showLogin ? (
          <LoginForm
            onSuccess={() => {}}
            onRegisterClick={() => setShowLogin(false)}
          />
        ) : (
          <RegisterForm
            onSuccess={() => setShowLogin(true)}
            onLoginClick={() => setShowLogin(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Scanner Log</h1>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm hidden md:inline-block">
                Welcome, {user.username}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className={`grid gap-8 ${isMobile ? '' : 'grid-cols-[1fr_300px]'}`}>
          {isMobile && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                {showNotifications ? 'Show Inventory' : 'Show Notifications'}
              </Button>
            </div>
          )}

          {(!isMobile || !showNotifications) && <InventoryDashboard />}
          
          {(!isMobile || showNotifications) && (
            <div className="space-y-8">
              <NotificationsPanel />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
