import { useCallback, useEffect, useState } from 'react';

import ChatLayout from './components/ChatLayout';
import LoginForm from './components/LoginForm';
import { useApi } from './hooks/useApi';

export default function App() {
  const { request } = useApi();
  const [user, setUser] = useState(null);
  const [initialising, setInitialising] = useState(true);
  const [error, setError] = useState(null);
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const profile = await request('/api/auth/session/');
        setUser(profile);
      } catch (err) {
        setUser(null);
      } finally {
        setInitialising(false);
      }
    };
    bootstrap();
  }, [request]);

  const handleLogin = useCallback(
    async ({ username, password }) => {
      try {
        setError(null);
        setAuthMode('login');
        const profile = await request('/api/auth/login/', {
          method: 'POST',
          body: { username, password },
        });
        setUser(profile);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [request],
  );

  const handleRegister = useCallback(
    async ({ username, password }) => {
      try {
        setError(null);
        const profile = await request('/api/auth/register/', {
          method: 'POST',
          body: { username, password },
        });
        setUser(profile);
      } catch (err) {
        const message = err?.message ?? 'Registration failed';
        if (message.toLowerCase().includes('username already taken')) {
          setError('Account already exists. Please sign in.');
          setAuthMode('login');
          return;
        }
        setError(message);
        throw err;
      }
    },
    [request],
  );

  const handleModeChange = useCallback((nextMode) => {
    setAuthMode(nextMode);
    setError(null);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await request('/api/auth/logout/', { method: 'POST' });
    } finally {
      setUser(null);
      setAuthMode('login');
    }
  }, [request]);

  if (initialising) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <LoginForm
        mode={authMode}
        onModeChange={handleModeChange}
        onLogin={handleLogin}
        onRegister={handleRegister}
        error={error}
      />
    );
  }

  return <ChatLayout user={user} onLogout={handleLogout} onUserUpdate={setUser} />;
}


