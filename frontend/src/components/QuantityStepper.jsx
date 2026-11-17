import { Minus, Plus, Trash2 } from 'lucide-react';

export default function QuantityStepper({ value, onChange, min = 1, max = 50, size = 'md', allowRemove = false, label = 'Quantidade' }) {
  const atMin = value <= min;
  return (
    <div className={`stepper stepper--${size}`} role="group" aria-label={label}>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(value - 1)}
        disabled={atMin && !allowRemove}
        aria-label={atMin && allowRemove ? 'Remover item' : 'Diminuir quantidade'}
      >
        {atMin && allowRemove ? <Trash2 size={16} /> : <Minus size={16} />}
      </button>
      <span className="stepper__value" aria-live="polite">
        {value}
      </span>
      <button type="button" className="stepper__btn" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Aumentar quantidade">
        <Plus size={16} />
      </button>
    </div>
  );
}
