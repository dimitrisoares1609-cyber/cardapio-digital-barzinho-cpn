import Modal from './Modal.jsx';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Aguarde...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm__message">{message}</p>
    </Modal>
  );
}
