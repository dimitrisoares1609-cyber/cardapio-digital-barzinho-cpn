import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Spinner from '../../components/Spinner.jsx';
import Switch from '../../components/Switch.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';

export default function CategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newError, setNewError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api('/api/categories');
      setCategories(data.categories);
    } catch (err) {
      toast.show(err.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (category, patch) => {
    const body = { name: category.name, sortOrder: category.sortOrder, active: category.active, ...patch };
    const data = await api(`/api/categories/${category.id}`, { method: 'PUT', body, auth: true });
    setCategories((list) => list.map((c) => (c.id === category.id ? { ...c, ...data.category } : c)));
    return data.category;
  };

  const create = async (e) => {
    e.preventDefault();
    if (newName.trim().length < 2) {
      setNewError('O nome deve ter pelo menos 2 caracteres');
      return;
    }
    setNewError(null);
    try {
      const { category } = await api('/api/categories', { method: 'POST', body: { name: newName.trim() }, auth: true });
      setCategories((list) => [...list, category]);
      setNewName('');
      toast.show(`Categoria ${category.name} criada`);
    } catch (err) {
      setNewError(err.message);
    }
  };

  const rename = async (category) => {
    if (editName.trim().length < 2) {
      toast.show('O nome deve ter pelo menos 2 caracteres', { type: 'error' });
      return;
    }
    try {
      await save(category, { name: editName.trim() });
      setEditingId(null);
      toast.show('Categoria renomeada');
    } catch (err) {
      toast.show(err.message, { type: 'error' });
    }
  };

  const toggleActive = async (category, active) => {
    try {
      await save(category, { active });
      toast.show(active ? `${category.name} visível no cardápio` : `${category.name} oculta do cardápio`);
    } catch (err) {
      toast.show(err.message, { type: 'error' });
    }
  };

  // Troca a ordem com o vizinho
  const move = async (index, direction) => {
    const a = categories[index];
    const b = categories[index + direction];
    if (!a || !b) return;
    try {
      await Promise.all([save(a, { sortOrder: b.sortOrder }), save(b, { sortOrder: a.sortOrder })]);
      setCategories((list) => [...list].sort((x, y) => x.sortOrder - y.sortOrder));
    } catch (err) {
      toast.show(err.message, { type: 'error' });
      load();
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api(`/api/categories/${deleting.id}`, { method: 'DELETE', auth: true });
      setCategories((list) => list.filter((c) => c.id !== deleting.id));
      toast.show('Categoria excluída');
      setDeleting(null);
    } catch (err) {
      toast.show(err.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Carregando categorias..." />;

  return (
    <div className="admin-page admin-page--narrow">
      <div className="admin-page__head">
        <div>
          <h1>Categorias</h1>
          <p className="muted">A ordem aqui é a ordem das abas no cardápio do cliente.</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={create} noValidate>
        <label className={`field ${newError ? 'field--error' : ''}`}>
          <span className="sr-only">Nome da nova categoria</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova categoria" maxLength={60} />
          {newError && <span className="field__error">{newError}</span>}
        </label>
        <button type="submit" className="btn btn--primary">
          <Plus size={18} /> Adicionar
        </button>
      </form>

      {categories.length === 0 ? (
        <EmptyState icon={Tags} title="Nenhuma categoria" />
      ) : (
        <ul className="category-list">
          {categories.map((category, index) => (
            <li key={category.id} className="category-row">
              <div className="category-row__order">
                <button type="button" className="icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir">
                  <ArrowUp size={16} />
                </button>
                <button type="button" className="icon-btn" onClick={() => move(index, 1)} disabled={index === categories.length - 1} aria-label="Descer">
                  <ArrowDown size={16} />
                </button>
              </div>

              {editingId === category.id ? (
                <form
                  className="category-row__edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    rename(category);
                  }}
                >
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60} autoFocus aria-label="Nome da categoria" />
                  <button type="submit" className="icon-btn" aria-label="Salvar">
                    <Check size={18} />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => setEditingId(null)} aria-label="Cancelar">
                    <X size={18} />
                  </button>
                </form>
              ) : (
                <div className="category-row__name">
                  <strong>{category.name}</strong>
                  <span className="muted">{category.itemCount} itens</span>
                </div>
              )}

              <Switch checked={category.active} onChange={(active) => toggleActive(category, active)} label={category.active ? 'Visível' : 'Oculta'} />

              <div className="category-row__actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    setEditingId(category.id);
                    setEditName(category.name);
                  }}
                  aria-label={`Renomear ${category.name}`}
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => setDeleting(category)}
                  disabled={category.itemCount > 0}
                  title={category.itemCount > 0 ? 'Remova ou mova os itens antes de excluir' : 'Excluir'}
                  aria-label={`Excluir ${category.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir categoria"
        message={deleting ? `Excluir a categoria "${deleting.name}"?` : ''}
        confirmLabel="Excluir"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
