import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ApiError, api } from '../../lib/api.js';

const empty = { currentPassword: '', newPassword: '', confirm: '' };

/** Troca da senha do painel. Os outros aparelhos conectados saem da conta. */
export default function ChangePasswordModal({ open, onClose }) {
  const { updateSession } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const close = () => {
    setForm(empty);
    setErrors({});
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Informe a senha atual';
    if (form.newPassword.length < 10) next.newPassword = 'Use pelo menos 10 caracteres';
    if (form.confirm !== form.newPassword) next.confirm = 'As senhas não conferem';
    if (Object.keys(next).length) return setErrors(next);

    setSaving(true);
    try {
      const data = await api('/api/auth/password', {
        method: 'POST',
        auth: true,
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      updateSession(data.token, data.admin);
      toast.show('Senha alterada. Os outros aparelhos vão precisar entrar de novo.');
      close();
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setErrors(err.fieldErrors());
      else toast.show(err.message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, autoComplete) => (
    <div className={`field ${errors[key] ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={`pw-${key}`}>
        {label}
      </label>
      <input id={`pw-${key}`} type="password" value={form[key]} onChange={set(key)} autoComplete={autoComplete} aria-invalid={!!errors[key]} />
      {errors[key] && <span className="field__error">{errors[key]}</span>}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title="Trocar senha"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={close}>
            Cancelar
          </button>
          <button type="submit" form="change-password" className="btn btn--primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </>
      }
    >
      <form id="change-password" className="printer-settings" onSubmit={submit} noValidate>
        {field('currentPassword', 'Senha atual', 'current-password')}
        {field('newPassword', 'Nova senha (mínimo 10 caracteres)', 'new-password')}
        {field('confirm', 'Repita a nova senha', 'new-password')}
        <p className="muted small">Depois de trocar, quem estiver conectado em outro computador ou celular vai precisar entrar com a senha nova.</p>
      </form>
    </Modal>
  );
}
