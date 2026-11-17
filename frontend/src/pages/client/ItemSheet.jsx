import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import ItemImage from '../../components/ItemImage.jsx';
import QuantityStepper from '../../components/QuantityStepper.jsx';
import Spinner from '../../components/Spinner.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useMenu } from '../../context/MenuContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatPrice } from '../../lib/format.js';
import { hasPriceVariation, missingRequired, selectedChoices, startingPrice, unitPrice } from '../../lib/pricing.js';

// Grupos obrigatórios com uma única opção já vêm marcados
function defaultSelection(item) {
  const selected = {};
  for (const g of item.options ?? []) {
    if (g.required && g.type === 'single' && g.choices.length === 1) selected[g.id] = g.choices[0].id;
  }
  return selected;
}

function OptionGroup({ group, value, onChange, basePrice }) {
  const multiple = group.type === 'multiple';
  // Em grupos como "Tamanho" mostramos o preço final de cada opção (mais fácil de comparar)
  const showFinalPrice = group.required && !multiple && group.choices.some((c) => Number(c.priceDelta) > 0);
  const selected = multiple ? value ?? [] : value;

  const toggle = (choiceId) => {
    if (!multiple) return onChange(choiceId);
    const list = selected.includes(choiceId) ? selected.filter((id) => id !== choiceId) : [...selected, choiceId];
    return onChange(list);
  };

  return (
    <fieldset className="option-group">
      <legend>
        <span>{group.name}</span>
        <small className={group.required ? 'tag tag--required' : 'tag'}>
          {group.required ? 'Obrigatório' : multiple ? 'Escolha quantos quiser' : 'Opcional'}
        </small>
      </legend>
      <div className="option-group__choices">
        {group.choices.map((choice) => {
          const checked = multiple ? selected.includes(choice.id) : selected === choice.id;
          return (
            <label key={choice.id} className={`choice ${checked ? 'choice--checked' : ''}`}>
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`opt-${group.id}`}
                checked={checked}
                onChange={() => toggle(choice.id)}
              />
              <span className="choice__mark" aria-hidden="true">
                {checked && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="choice__name">{choice.name}</span>
              {showFinalPrice ? (
                <span className="choice__price">{formatPrice(basePrice + Number(choice.priceDelta || 0))}</span>
              ) : (
                Number(choice.priceDelta) > 0 && <span className="choice__price">+ {formatPrice(choice.priceDelta)}</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Detalhes do item (RF002): imagem ampliada, descrição, ingredientes, preço,
 * opções (tamanho/sabor/adicionais), observação e botão para adicionar ao pedido.
 */
export default function ItemSheet({ itemId, onClose }) {
  const { itemsById } = useMenu();
  const { add } = useCart();
  const toast = useToast();

  const cached = itemId ? itemsById.get(itemId) : null;
  const [item, setItem] = useState(cached);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Mostra na hora o que já veio no cardápio e busca a versão mais recente na API
  useEffect(() => {
    if (!itemId) return undefined;
    const controller = new AbortController();
    const initial = itemsById.get(itemId) ?? null;
    setItem(initial);
    setSelected(initial ? defaultSelection(initial) : {});
    setQuantity(1);
    setNotes('');
    setLoadError(null);

    api(`/api/items/${itemId}`, { signal: controller.signal })
      .then(({ item: fresh }) => {
        setItem(fresh);
        if (!initial) setSelected(defaultSelection(fresh));
      })
      .catch((err) => err.name !== 'AbortError' && !initial && setLoadError(err));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const price = useMemo(() => (item ? unitPrice(item, selected) : 0), [item, selected]);
  const missing = item ? missingRequired(item, selected) : null;
  const ingredients = item?.ingredients?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

  const handleAdd = () => {
    if (!item || missing || !item.available) return;
    add({
      item,
      quantity,
      options: selected,
      notes,
      unitPrice: price,
      optionLabels: selectedChoices(item, selected).map(({ choice }) => choice.name),
    });
    toast.show(`${quantity}× ${item.name} adicionado ao pedido`);
    onClose();
  };

  return (
    <Modal open={!!itemId} onClose={onClose} variant="sheet" size="lg" labelledBy="item-sheet-title">
      {!item && !loadError && <Spinner />}
      {loadError && <p className="form-error">{loadError.message}</p>}
      {item && (
        <div className="item-sheet">
          <div className="item-sheet__media">
            <ItemImage src={item.imageUrl} alt={item.name} className="item-sheet__image" />
            <button type="button" className="item-sheet__close" onClick={onClose} aria-label="Fechar detalhes">
              ×
            </button>
          </div>

          <div className="item-sheet__content">
            <p className="item-sheet__category">{item.categoryName}</p>
            <h2 id="item-sheet-title" className="item-sheet__title">
              {item.name}
            </h2>
            <p className="item-sheet__price">
              {missing && hasPriceVariation(item) ? (
                <>
                  <small>a partir de </small>
                  {formatPrice(startingPrice(item))}
                </>
              ) : (
                formatPrice(price)
              )}
            </p>

            {(item.description || item.shortDescription) && (
              <p className="item-sheet__desc">{item.description || item.shortDescription}</p>
            )}

            {ingredients.length > 0 && (
              <div className="item-sheet__ingredients">
                <h3>Ingredientes</h3>
                <ul>
                  {ingredients.map((ing) => (
                    <li key={ing}>{ing}</li>
                  ))}
                </ul>
              </div>
            )}

            {(item.options ?? []).map((group) => (
              <OptionGroup
                key={group.id}
                group={group}
                basePrice={Number(item.price)}
                value={selected[group.id]}
                onChange={(value) => setSelected((s) => ({ ...s, [group.id]: value }))}
              />
            ))}

            <label className="field">
              <span className="field__label">Observações</span>
              <textarea
                rows={2}
                maxLength={200}
                placeholder="Ex.: sem cebola, bem gelada..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className="item-sheet__footer">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <button type="button" className="btn btn--primary btn--block" onClick={handleAdd} disabled={!!missing || !item.available}>
              {!item.available
                ? 'Indisponível no momento'
                : missing
                  ? `Escolha: ${missing.name.toLowerCase()}`
                  : `Adicionar · ${formatPrice(price * quantity)}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
