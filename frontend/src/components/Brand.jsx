const NAME = import.meta.env.VITE_ESTABLISHMENT_NAME || 'Barzinho CPN';

export default function Brand({ size = 'md', subtitle = 'Cardápio' }) {
  return (
    <div className={`brand brand--${size}`}>
      <span className="brand__sparks" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="brand__name">{NAME}</span>
      {subtitle && <span className="brand__subtitle">{subtitle}</span>}
    </div>
  );
}

export const ESTABLISHMENT_NAME = NAME;
