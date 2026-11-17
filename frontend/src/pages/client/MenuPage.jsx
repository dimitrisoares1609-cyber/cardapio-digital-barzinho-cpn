import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, Search, SearchX, X } from 'lucide-react';
import ItemImage from '../../components/ItemImage.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Spinner from '../../components/Spinner.jsx';
import { useMenu } from '../../context/MenuContext.jsx';
import { formatPrice } from '../../lib/format.js';
import { hasPriceVariation, startingPrice } from '../../lib/pricing.js';
import ItemSheet from './ItemSheet.jsx';

const normalize = (text = '') =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function ItemCard({ item, onOpen }) {
  const variable = hasPriceVariation(item);
  return (
    <li>
      <button type="button" className="menu-item" onClick={() => onOpen(item.id)}>
        <ItemImage src={item.imageUrl} alt="" className="menu-item__image" />
        <span className="menu-item__info">
          <span className="menu-item__name">{item.name}</span>
          {item.shortDescription && <span className="menu-item__desc">{item.shortDescription}</span>}
          <span className="menu-item__price">
            {variable && <small>a partir de </small>}
            {formatPrice(startingPrice(item))}
          </span>
        </span>
        <span className="menu-item__add" aria-hidden="true">
          <Plus size={20} />
        </span>
      </button>
    </li>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="section-title">
      <span>{children}</span>
    </h2>
  );
}

export default function MenuPage() {
  const { categories, loading, error, reload } = useMenu();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const tabsRef = useRef(null);

  const activeSlug = params.get('categoria') || categories[0]?.slug;
  const openItemId = Number(params.get('item')) || null;
  const active = categories.find((c) => c.slug === activeSlug) ?? categories[0];

  // Mantém a aba ativa visível na barra de categorias
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeSlug]);

  const results = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return null;
    return categories
      .map((c) => ({ ...c, items: c.items.filter((i) => normalize(`${i.name} ${i.shortDescription ?? ''}`).includes(term)) }))
      .filter((c) => c.items.length > 0);
  }, [categories, search]);

  // Troca de categoria sem recarregar a página (SPA): só muda o parâmetro da URL
  const selectCategory = (slug) => {
    const next = new URLSearchParams(params);
    next.set('categoria', slug);
    next.delete('item');
    setParams(next, { replace: true });
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openItem = (id) => {
    const next = new URLSearchParams(params);
    next.set('item', String(id));
    setParams(next); // entra no histórico: o botão "voltar" do celular fecha os detalhes
  };

  const closeItem = () => {
    const next = new URLSearchParams(params);
    next.delete('item');
    setParams(next, { replace: true });
  };

  if (loading && categories.length === 0) return <Spinner label="Carregando o cardápio..." />;

  if (error && categories.length === 0) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Não foi possível carregar o cardápio"
        action={
          <button type="button" className="btn btn--primary" onClick={() => reload()}>
            Tentar novamente
          </button>
        }
      >
        {error.message}
      </EmptyState>
    );
  }

  return (
    <div className="menu">
      <div className="menu-toolbar">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar no cardápio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar no cardápio"
          />
          {search && (
            <button type="button" className="search__clear" onClick={() => setSearch('')} aria-label="Limpar busca">
              <X size={16} />
            </button>
          )}
        </label>

        <div className="tabs" role="tablist" aria-label="Categorias" ref={tabsRef}>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={!results && c.slug === active?.slug}
              className="tab"
              onClick={() => selectCategory(c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {results ? (
        results.length === 0 ? (
          <EmptyState icon={SearchX} title="Nada encontrado">
            Nenhum item com “{search}”.
          </EmptyState>
        ) : (
          results.map((c) => (
            <section key={c.id} className="menu-section">
              <SectionTitle>{c.name}</SectionTitle>
              <ul className="menu-list">
                {c.items.map((item) => (
                  <ItemCard key={item.id} item={item} onOpen={openItem} />
                ))}
              </ul>
            </section>
          ))
        )
      ) : (
        active && (
          <section className="menu-section" role="tabpanel" aria-label={active.name} key={active.id}>
            <SectionTitle>{active.name}</SectionTitle>
            <ul className="menu-list">
              {active.items.map((item) => (
                <ItemCard key={item.id} item={item} onOpen={openItem} />
              ))}
            </ul>
          </section>
        )
      )}

      <ItemSheet itemId={openItemId} onClose={closeItem} />
    </div>
  );
}
