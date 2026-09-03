import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { AppStore } from '../hooks/useAppStore';
import { findItem } from '@/domain/test-item';
import { Checklist } from './Checklist';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  store: AppStore;
}

export function EditMode({ store }: Props) {
  const run = store.activeRun;
  const [addingRoot, setAddingRoot] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [subParentId, setSubParentId] = useState<string | null>(null);
  const [subTitle, setSubTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; hasChildren: boolean } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const subInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingRoot) inputRef.current?.focus();
  }, [addingRoot]);

  useEffect(() => {
    if (subParentId) subInputRef.current?.focus();
  }, [subParentId]);

  if (!run) return null;

  const current = store.currentItemId ? findItem(run.items, store.currentItemId) : null;

  const submitRoot = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!newTitle.trim()) return;
    await store.addItem(newTitle);
    setNewTitle('');
    setAddingRoot(true);
    queueMicrotask(() => inputRef.current?.focus());
  };

  const onRootKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submitRoot();
    }
    if (e.key === 'Escape') {
      setAddingRoot(false);
      setNewTitle('');
    }
  };

  const submitSub = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!subParentId || !subTitle.trim()) return;
    await store.addSubItem(subParentId, subTitle);
    setSubTitle('');
    queueMicrotask(() => subInputRef.current?.focus());
  };

  const startEdit = () => {
    if (!current) return;
    setEditingId(current.id);
    setEditTitle(current.title);
    setEditDescription(current.description ?? '');
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    await store.patchItem(editingId, {
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
    setEditingId(null);
  };

  return (
    <div className="mode-panel">
      <Checklist
        run={run}
        currentItemId={store.currentItemId}
        onSelect={store.selectItem}
        showMeta={false}
      />

      {!addingRoot ? (
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setAddingRoot(true)}
        >
          + Добавить пункт
        </button>
      ) : (
        <form className="inline-form" onSubmit={(e) => void submitRoot(e)}>
          <label className="field">
            <span>Название</span>
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={onRootKeyDown}
              placeholder="Проверить авторизацию"
            />
          </label>
          <div className="row-actions">
            <button type="submit" className="btn btn-primary">
              Добавить
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setAddingRoot(false);
                setNewTitle('');
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {current && (
        <div className="item-panel">
          <h3>Пункт</h3>
          {editingId === current.id ? (
            <div className="form">
              <label className="field">
                <span>Название</span>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </label>
              <label className="field">
                <span>Описание</span>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Необязательно"
                />
              </label>
              <div className="row-actions">
                <button type="button" className="btn btn-primary" onClick={() => void saveEdit()}>
                  Сохранить
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="item-title">{current.title}</p>
              {current.description && <p className="muted">{current.description}</p>}
              <div className="btn-grid">
                <button type="button" className="btn btn-ghost" onClick={startEdit}>
                  Редактировать
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSubParentId(current.id);
                    setSubTitle('');
                  }}
                >
                  Добавить подпункт
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void store.moveUp(current.id)}>
                  Вверх
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void store.moveDown(current.id)}>
                  Вниз
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void store.outdent(current.id)}>
                  ← Уровень
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void store.indent(current.id)}>
                  Уровень →
                </button>
                <button
                  type="button"
                  className="btn btn-danger-ghost"
                  onClick={() =>
                    setDeleteTarget({
                      id: current.id,
                      hasChildren: current.children.length > 0,
                    })
                  }
                >
                  Удалить
                </button>
              </div>
            </>
          )}

          {subParentId && (
            <form className="inline-form" onSubmit={(e) => void submitSub(e)}>
              <label className="field">
                <span>Подпункт</span>
                <input
                  ref={subInputRef}
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitSub();
                    }
                    if (e.key === 'Escape') {
                      setSubParentId(null);
                      setSubTitle('');
                    }
                  }}
                  placeholder="У ученика"
                />
              </label>
              <div className="row-actions">
                <button type="submit" className="btn btn-primary">
                  Добавить
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSubParentId(null);
                    setSubTitle('');
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={
            deleteTarget.hasChildren
              ? 'Удалить пункт вместе со всеми подпунктами?'
              : 'Удалить пункт?'
          }
          message={
            deleteTarget.hasChildren
              ? 'Будут удалены пункт и все вложенные подпункты.'
              : 'Пункт будет удалён из чек-листа.'
          }
          confirmLabel="Удалить"
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            void store.deleteItem(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
