import { statusLabel } from '../lib/format.js';

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status}`}>{statusLabel(status)}</span>;
}
