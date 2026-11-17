import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, LayoutGrid, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ItemImage from '../../components/ItemImage.jsx';
import Spinner from '../../components/Spinner.jsx';
import Switch from '../../components/Switch.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatPrice } from '../../lib/format.js';
import { hasPriceVariation } from '../../lib/pricing.js';
import ItemFormModal from './ItemFormModal.jsx';
import { useAdmin } from './AdminLayout.jsx';

/**
 * Gestão dos itens do cardápio (RF006): cadastrar, editar, remover e marcar como esgotado.
 * Cada operação faz a API emitir "menu:updated", que atualiza o cardápio aberto nos celulares.
 */
export default function MenuAdminPage() {
  const toast = useToast();
  const { socket } = useAdmin();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState(null); // null = fechado, {} = novo, item = edição
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [itemsData, categoriesData] = await Promise.all([api('/api/items', { auth: true }), api('/api/categories')]);
      setItems(itemsData.items);
      setCategories(categoriesData.categories);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Outro administrador alterou o cardápio? recarrega a lista
  useEffect(() => {
    if (!socket) return undefined;
    socket.on('menu:updated', load);
    return () => socket.off('menu:updated', load);
  }, [socket, load]);

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories
      .filter((c) => !categoryFilter || String(c.id) === categoryFilter)
      .map((c) => ({
        ...c,
        items: items.filter(
          (i) => i.categoryId === c.id && (!term || i.name.toLowerCase().includes(term) || i.shortDescription?.toLowerCase().includes(term)),
        ),
      }))
      .filter((c) => c.items.length > 0 || (!term && categoryFilter));
  }, [categories, items, search, categoryFilter]);

  const toggleAvailability = async (item, available) => {
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, available } : i)));
    try {
      await api(`/api/items/${item.id}/availability`, { method: 'PATCH', body: { available }, auth: true });
      toast.show(available ? `${item.name} voltou ao cardápio` : `${item.name} marcado como indisponível`);
    } catch (err) {
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, available: !available } : i)));
      toast.show(err.message, { type: 'error' });
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api(`/api/items/${deleting.id}`, { method: 'DELETE', auth: true });
      setItems((list) => list.filter((i) => i.id !== deleting.id));
      toast.show(`${deleting.name} removido do cardápio`);
      setDeleting(null);
    } catch (err) {
      toast.show(err.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onSaved = (saved, created) => {
    setItems((list) => (created ? [...list, saved] : list.map((i) => (i.id === saved.id ? saved : i))));
    toast.show(created ? `${saved.name} cadastrado` : 'Alterações salvas');
    setEditing(null);
  };

  if (loading) return <Spinner label="Carregando cardápio..." />;
  if (error) return <EmptyState icon={LayoutGrid} title="Erro ao carregar o cardápio">{error.message}</EmptyState>;

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <h1>Cardápio</h1>
          <p className="muted">
            {items.length} itens · {items.filter((i) => !i.available).length} indisponíveis
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing({})}>
          <Plus size={18} /> Novo item
        </button>
      </div>

      <div className="admin-toolbar">
        <label className="search search--light">
          <Search size={18} aria-hidden="true" />
          <input type="search" placeholder="Buscar item" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar item" />
        </label>
        <label className="select-inline">
          <span className="sr-only">Filtrar por categoria</span>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={Search} title="Nenhum item encontrado" />
      ) : (
        groups.map((group) => (
          <section key={group.id} className="admin-group">
            <h2 className="admin-group__title">
              {group.name} <span>{group.items.length}</span>
            </h2>
            <ul className="admin-items">
              {group.items.map((item) => (
                <li key={item.id} className={`admin-item ${item.available ? '' : 'admin-item--off'}`}>
                  <ItemImage src={item.imageUrl} alt="" className="admin-item__image" />
                  <div className="admin-item__info">
                    <p className="admin-item__name">{item.name}</p>
                    <p className="admin-item__desc">{item.shortDescription || '—'}</p>
                    {item.options.length > 0 && (
                      <p className="admin-item__opts">{item.options.map((g) => `${g.name}: ${g.choices.length}`).join(' · ')}</p>
                    )}
                  </div>
                  <span className="admin-item__price">
                    {item.price > 0 ? (
                      <>
                        {hasPriceVariation(item) && <small>a partir de</small>}
                        {formatPrice(item.price)}
                      </>
                    ) : (
                      'Sem preço'
                    )}
                  </span>
                  <Switch
                    checked={item.available}
                    onChange={(checked) => toggleAvailability(item, checked)}
                    label={item.available ? 'Disponível' : 'Indisponível'}
                  />
                  <div className="admin-item__actions">
                    <button type="button" className="icon-btn" onClick={() => setEditing(item)} aria-label={`Editar ${item.name}`} title="Editar">
                      <Pencil size={18} />
                    </button>
                    <button type="button" className="icon-btn icon-btn--danger" onClick={() => setDeleting(item)} aria-label={`Remover ${item.name}`} title="Remover">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ItemFormModal
        open={editing !== null}
        item={editing?.id ? editing : null}
        categories={categories}
        defaultCategoryId={categoryFilter ? Number(categoryFilter) : undefined}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Remover item"
        message={deleting ? `"${deleting.name}" será excluído permanentemente do cardápio. Pedidos antigos não são afetados.` : ''}
        confirmLabel="Remover"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
