import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { assetUrl } from '../lib/api.js';

export default function ItemImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  const url = assetUrl(src);

  if (!url || failed) {
    return (
      <div className={`item-image item-image--empty ${className}`} aria-hidden="true">
        <UtensilsCrossed size={28} />
      </div>
    );
  }
  return <img className={`item-image ${className}`} src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
