import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Brand from '../../components/Brand.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { unlockAudio } from '../../lib/sound.js';

export default function LoginPage() {
  const { login, isAuthenticated, expired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/admin';
  if (isAuthenticated) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = 'Informe um e-mail válido';
    if (!password) found.password = 'Informe a senha';
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) return;

    unlockAudio(); // libera o som de novos pedidos (o navegador exige um clique antes)
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 400) setErrors(err.fieldErrors());
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit} noValidate>
        <Brand size="lg" subtitle="Painel" />
        <h1 className="login__title">Acesso do administrador</h1>

        {expired && !error && <p className="form-info">Sua sessão expirou. Entre novamente.</p>}

        <div className={`field ${errors.email ? 'field--error' : ''}`}>
          <label className="field__label" htmlFor="login-email">
            E-mail
          </label>
          <span className="input-icon">
            <Mail size={18} aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((er) => ({ ...er, email: undefined }));
              }}
              autoComplete="username"
              autoFocus
              aria-invalid={!!errors.email}
            />
          </span>
          {errors.email && <span className="field__error">{errors.email}</span>}
        </div>

        <div className={`field ${errors.password ? 'field--error' : ''}`}>
          <label className="field__label" htmlFor="login-password">
            Senha
          </label>
          <span className="input-icon">
            <Lock size={18} aria-hidden="true" />
            <input
              id="login-password"
              aria-invalid={!!errors.password}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((er) => ({ ...er, password: undefined }));
              }}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="input-icon__action"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
          {errors.password && <span className="field__error">{errors.password}</span>}
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
