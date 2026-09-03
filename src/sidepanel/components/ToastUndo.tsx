import type { AppStore } from '../hooks/useAppStore';

interface Props {
  store: AppStore;
}

export function ToastUndo({ store }: Props) {
  if (!store.undo) return null;
  return (
    <div className="toast">
      <span>{store.undo.message}</span>
      <button type="button" className="btn btn-ghost" onClick={() => void store.undoDelete()}>
        Отменить
      </button>
    </div>
  );
}
