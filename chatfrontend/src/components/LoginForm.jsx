import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

export default function LoginForm({ mode = 'login', onModeChange, onLogin, onRegister, error }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [pending, setPending] = useState(false);
  const modeLabel = mode === 'login' ? 'Sign In' : 'Create Account';

  useEffect(() => {
    setForm((prev) => ({ ...prev, password: '' }));
  }, [mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      return;
    }
    setPending(true);
    try {
      if (mode === 'login') {
        await onLogin(form);
      } else {
        await onRegister(form);
      }
    } finally {
      setPending(false);
    }
  };

  const toggleMode = () => {
    if (!onModeChange) {
      return;
    }
    onModeChange(mode === 'login' ? 'register' : 'login');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>{modeLabel}</h1>
        {error ? <div className="error">{error}</div> : null}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
            disabled={pending}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={pending}
          />
          <button type="submit" disabled={pending}>
            {pending ? 'Please wait...' : modeLabel}
          </button>
        </form>
        <div style={{ marginTop: '12px', fontSize: '0.9rem' }}>
          {mode === 'login' ? (
            <button
              type="button"
              style={{ border: 'none', background: 'none', color: '#4f86f7', cursor: 'pointer', padding: 0 }}
              onClick={toggleMode}
              disabled={pending}
            >
              Need an account? Sign up
            </button>
          ) : (
            <button
              type="button"
              style={{ border: 'none', background: 'none', color: '#4f86f7', cursor: 'pointer', padding: 0 }}
              onClick={toggleMode}
              disabled={pending}
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

LoginForm.propTypes = {
  mode: PropTypes.oneOf(['login', 'register']),
  onModeChange: PropTypes.func.isRequired,
  onLogin: PropTypes.func.isRequired,
  onRegister: PropTypes.func.isRequired,
  error: PropTypes.string,
};


