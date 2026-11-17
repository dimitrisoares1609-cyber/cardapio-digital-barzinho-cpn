import { LoaderCircle } from 'lucide-react';

export default function Spinner({ label = 'Carregando...', inline = false }) {
  return (
    <div className={inline ? 'spinner spinner--inline' : 'spinner'} role="status">
      <LoaderCircle className="spin" size={inline ? 16 : 28} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
