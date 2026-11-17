import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import ItemImage from '../../components/ItemImage.jsx';
import Switch from '../../components/Switch.jsx';
import { api, uploadImage } from '../../lib/api.js';
import { slugify } from '../../lib/format.js';

const MAX_IMAGE_MB = 5;

const emptyForm = (categoryId) => ({
  categoryId: categoryId ?? '',
  name: '',
  shortDescription: '',
  description: '',
  ingredients: '',
  price: '',
  imageUrl: null,
  available: true,
  options: [],
});

function toForm(item) {
  return {
    categoryId: item.categoryId,
    name: item.name,
    shortDescription: item.shortDescription ?? '',
    description: item.description ?? '',
    ingredients: item.ingredients ?? '',
    price: Number(item.price).toFixed(2).replace('.', ','),
    imageUrl: item.imageUrl,
    available: item.available,
    options: (item.options ?? []).map((g) => ({
      ...g,
      choices: g.choices.map((c) => ({ ...c, priceDelta: c.priceDelta ? Number(c.priceDelta).toFixed(2).replace('.', ',') : '' })),
    })),
  };
}

// Aceita "42,90", "42.90" e "1.042,90"
const parseMoney = (value) => {
  let text = String(value).trim();
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  const n = Number(text);
  return text !== '' && Number.isFinite(n) ? n : NaN;
};

// Gera ids estáveis a partir do nome (mantém os ids que já existiam)
function uniqueId(base, used) {
  let id = slugify(base) || 'opcao';
  for (let n = 2; used.has(id); n += 1) id = `${slugify(base) || 'opcao'}-${n}`;
  used.add(id);
  return id;
}

function buildPayload(form) {
  const groupIds = new Set();
  return {
    categoryId: Number(form.categoryId),
    name: form.name.trim(),
    shortDescription: form.shortDescription.trim() || null,
    description: form.description.trim() || null,
    ingredients: form.ingredients.trim() || null,
    price: parseMoney(form.price),
    imageUrl: form.imageUrl || null,
    available: form.available,
    options: form.options.map((g) => {
      const choiceIds = new Set();
      return {
        id: g.id && !groupIds.has(g.id) ? (groupIds.add(g.id), g.id) : uniqueId(g.name, groupIds),
        name: g.name.trim(),
        type: g.type,
        required: g.required,
        choices: g.choices.map((c) => ({
          id: c.id && !choiceIds.has(c.id) ? (choiceIds.add(c.id), c.id) : uniqueId(c.name, choiceIds),
          name: c.name.trim(),
          priceDelta: c.priceDelta === '' ? 0 : parseMoney(c.priceDelta),
        })),
      };
    }),
  };
}

// Mesmas regras da API, para avisar antes de enviar
function validate(form) {
  const errors = {};
  if (!form.categoryId) errors.categoryId = 'Selecione a categoria';
  if (form.name.trim().length < 2) errors.name = 'O nome deve ter pelo menos 2 caracteres';
  const price = parseMoney(form.price);
  if (form.price === '' || Number.isNaN(price)) errors.price = 'Informe o preço';
  else if (price < 0) errors.price = 'O preço não pode ser negativo';
  else if (form.available && price <= 0) errors.price = 'Item disponível precisa ter preço maior que zero';
  if (form.shortDescription.length > 160) errors.shortDescription = 'Use no máximo 160 caracteres';
  form.options.forEach((g, gi) => {
    if (!g.name.trim()) errors[`options.${gi}.name`] = 'Informe o nome do grupo';
    if (g.choices.length === 0) errors[`options.${gi}.choices`] = 'Adicione pelo menos uma opção';
    g.choices.forEach((c, ci) => {
      if (!c.name.trim()) errors[`options.${gi}.choices.${ci}.name`] = 'Informe o nome';
      if (c.priceDelta !== '' && (Number.isNaN(parseMoney(c.priceDelta)) || parseMoney(c.priceDelta) < 0)) {
        errors[`options.${gi}.choices.${ci}.priceDelta`] = 'Valor inválido';
      }
    });
  });
  return errors;
}

function OptionsEditor({ options, errors, onChange }) {
  const updateGroup = (gi, patch) => onChange(options.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const updateChoice = (gi, ci, patch) =>
    updateGroup(gi, { choices: options[gi].choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

  return (
    <div className="options-editor">
      <div className="options-editor__head">
        <span className="field__label">Opções do item</span>
        <span className="muted">Tamanhos, sabores, adicionais... (opcional)</span>
      </div>

      {options.map((group, gi) => (
        <div key={gi} className="option-editor">
          <div className="option-editor__row">
            <label className={`field ${errors[`options.${gi}.name`] ? 'field--error' : ''}`}>
              <span className="field__label">Nome do grupo</span>
              <input value={group.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} placeholder="Ex.: Tamanho" maxLength={60} />
              {errors[`options.${gi}.name`] && <span className="field__error">{errors[`options.${gi}.name`]}</span>}
            </label>
            <label className="field field--small">
              <span className="field__label">Tipo</span>
              <select value={group.type} onChange={(e) => updateGroup(gi, { type: e.target.value })}>
                <option value="single">Escolhe uma</option>
                <option value="multiple">Escolhe várias</option>
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={group.required} onChange={(e) => updateGroup(gi, { required: e.target.checked })} />
              Obrigatório
            </label>
            <button type="button" className="icon-btn" onClick={() => onChange(options.filter((_, i) => i !== gi))} aria-label="Remover grupo">
              <Trash2 size={18} />
            </button>
          </div>

          <ul className="option-editor__choices">
            {group.choices.map((choice, ci) => (
              <li key={ci}>
                <input
                  className={errors[`options.${gi}.choices.${ci}.name`] ? 'input--error' : ''}
                  value={choice.name}
                  onChange={(e) => updateChoice(gi, ci, { name: e.target.value })}
                  placeholder="Nome da opção"
                  maxLength={60}
                  aria-label="Nome da opção"
                />
                <span className="money-input">
                  <span>+ R$</span>
                  <input
                    className={errors[`options.${gi}.choices.${ci}.priceDelta`] ? 'input--error' : ''}
                    value={choice.priceDelta}
                    onChange={(e) => updateChoice(gi, ci, { priceDelta: e.target.value })}
                    placeholder="0,00"
                    inputMode="decimal"
                    aria-label="Acréscimo no preço"
                  />
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => updateGroup(gi, { choices: group.choices.filter((_, i) => i !== ci) })}
                  aria-label="Remover opção"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
          {errors[`options.${gi}.choices`] && <span className="field__error">{errors[`options.${gi}.choices`]}</span>}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => updateGroup(gi, { choices: [...group.choices, { id: '', name: '', priceDelta: '' }] })}
          >
            <Plus size={16} /> Opção
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn btn--outline btn--sm"
        onClick={() => onChange([...options, { id: '', name: '', type: 'single', required: true, choices: [{ id: '', name: '', priceDelta: '' }] }])}
      >
        <Plus size={16} /> Adicionar grupo de opções
      </button>
    </div>
  );
}

/**
 * Cadastro e edição de item (RF006) com validação e upload da imagem.
 */
export default function ItemFormModal({ open, item, categories, defaultCategoryId, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [upload, setUpload] = useState({ progress: null, error: null });
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(item ? toForm(item) : emptyForm(defaultCategoryId ?? categories[0]?.id));
    setErrors({});
    setSubmitError(null);
    setUpload({ progress: null, error: null });
  }, [open, item, categories, defaultCategoryId]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(({ [field]: _removed, ...rest }) => rest);
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUpload({ progress: null, error: 'Formato não suportado. Envie JPG, PNG ou WEBP.' });
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setUpload({ progress: null, error: `A imagem deve ter no máximo ${MAX_IMAGE_MB} MB.` });
      return;
    }
    setUpload({ progress: 0, error: null });
    try {
      const { url } = await uploadImage(file, (progress) => setUpload({ progress, error: null }));
      setForm((f) => ({ ...f, imageUrl: url }));
      setUpload({ progress: null, error: null });
    } catch (err) {
      setUpload({ progress: null, error: err.message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setSubmitError('Confira os campos destacados.');
      return;
    }

    setSaving(true);
    try {
      const body = buildPayload(form);
      const data = item
        ? await api(`/api/items/${item.id}`, { method: 'PUT', body: { ...body, sortOrder: item.sortOrder }, auth: true })
        : await api('/api/items', { method: 'POST', body, auth: true });
      onSaved(data.item, !item);
    } catch (err) {
      if (err.details?.length) setErrors(err.fieldErrors());
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploading = upload.progress !== null;

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={item ? 'Editar item' : 'Novo item'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="item-form" className="btn btn--primary" disabled={saving || uploading}>
            {saving ? 'Salvando...' : item ? 'Salvar alterações' : 'Cadastrar item'}
          </button>
        </>
      }
    >
      <form id="item-form" className="item-form" onSubmit={submit} noValidate>
        <div className="item-form__image">
          <div
            className={`dropzone ${uploading ? 'dropzone--busy' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            {form.imageUrl ? (
              <ItemImage src={form.imageUrl} alt="Pré-visualização" className="dropzone__preview" />
            ) : (
              <div className="dropzone__empty">
                <ImagePlus size={32} aria-hidden="true" />
                <span>Arraste uma foto ou clique para escolher</span>
                <small>JPG, PNG ou WEBP até {MAX_IMAGE_MB} MB</small>
              </div>
            )}
            {uploading && (
              <div className="dropzone__progress">
                <span style={{ width: `${upload.progress}%` }} />
                <small>Enviando... {upload.progress}%</small>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files?.[0])}
              aria-label="Escolher imagem do item"
              disabled={uploading}
            />
          </div>
          {form.imageUrl && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}>
              <Trash2 size={16} /> Remover imagem
            </button>
          )}
          {upload.error && <span className="field__error">{upload.error}</span>}
        </div>

        <div className="item-form__fields">
          <label className={`field ${errors.name ? 'field--error' : ''}`}>
            <span className="field__label">Nome *</span>
            <input value={form.name} onChange={set('name')} maxLength={120} placeholder="Ex.: Batata Completa" />
            {errors.name && <span className="field__error">{errors.name}</span>}
          </label>

          <div className="field-row">
            <label className={`field ${errors.categoryId ? 'field--error' : ''}`}>
              <span className="field__label">Categoria *</span>
              <select value={form.categoryId} onChange={set('categoryId')}>
                <option value="">Selecione</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <span className="field__error">{errors.categoryId}</span>}
            </label>
            <label className={`field field--small ${errors.price ? 'field--error' : ''}`}>
              <span className="field__label">Preço (R$) *</span>
              <input value={form.price} onChange={set('price')} inputMode="decimal" placeholder="0,00" />
              {errors.price ? (
                <span className="field__error">{errors.price}</span>
              ) : (
                form.options.length > 0 && <span className="field__hint">Preço base; as opções somam ao valor</span>
              )}
            </label>
          </div>

          <label className={`field ${errors.shortDescription ? 'field--error' : ''}`}>
            <span className="field__label">Descrição resumida</span>
            <input value={form.shortDescription} onChange={set('shortDescription')} maxLength={160} placeholder="Aparece na lista do cardápio" />
            <span className="field__hint">{form.shortDescription.length}/160</span>
            {errors.shortDescription && <span className="field__error">{errors.shortDescription}</span>}
          </label>

          <label className={`field ${errors.description ? 'field--error' : ''}`}>
            <span className="field__label">Descrição completa</span>
            <textarea rows={3} value={form.description} onChange={set('description')} maxLength={1000} placeholder="Aparece nos detalhes do item" />
          </label>

          <label className={`field ${errors.ingredients ? 'field--error' : ''}`}>
            <span className="field__label">Ingredientes</span>
            <input value={form.ingredients} onChange={set('ingredients')} maxLength={500} placeholder="Separados por vírgula" />
          </label>

          <Switch checked={form.available} onChange={(available) => setForm((f) => ({ ...f, available }))} label="Disponível no cardápio" />
        </div>

        <OptionsEditor options={form.options} errors={errors} onChange={(options) => setForm((f) => ({ ...f, options }))} />

        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </Modal>
  );
}
