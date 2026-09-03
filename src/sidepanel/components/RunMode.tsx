import { useEffect, useState } from 'react';
import type { AppStore } from '../hooks/useAppStore';
import type { TestStatus } from '@/domain/models';
import { STATUS_LABELS } from '@/domain/labels';
import { findItem, getItemNumber } from '@/domain/test-item';
import { computeProgress } from '@/domain/statistics';
import { Checklist } from './Checklist';
import { ProgressBar } from './ProgressBar';
import { CommentField } from './CommentField';
import { RemarkForm } from './RemarkForm';
import { QuestionForm } from './QuestionForm';
import { BugForm } from './BugForm';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  store: AppStore;
}

type EditorPanel =
  | { type: 'none' }
  | { type: 'remark'; editId?: string }
  | { type: 'question'; editId?: string }
  | { type: 'bug'; editId?: string };

const PRIMARY_STATUSES: Array<{ status: TestStatus; label: string }> = [
  { status: 'passed', label: '✓ Пройдено' },
  { status: 'failed', label: '✕ Не пройдено' },
  { status: 'remark', label: '⚠ Замечание' },
  { status: 'skipped', label: '⏭ Пропустить' },
];

export function RunMode({ store }: Props) {
  const run = store.activeRun;
  const [panel, setPanel] = useState<EditorPanel>({ type: 'none' });
  const [showComplete, setShowComplete] = useState(false);
  const [flash, setFlash] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'remark'; id: string }
    | { kind: 'question'; id: string }
    | { kind: 'bug'; id: string }
    | null
  >(null);

  useEffect(() => {
    if (!run || store.currentView !== 'run') return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (!store.currentItemId) return;

      const map: Record<string, TestStatus> = {
        '1': 'passed',
        '2': 'failed',
        '3': 'remark',
        '4': 'skipped',
      };
      const status = map[e.key];
      if (status) {
        e.preventDefault();
        void store.patchItem(store.currentItemId, { status });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, store]);

  useEffect(() => {
    setPanel({ type: 'none' });
    setDeleteTarget(null);
  }, [store.currentItemId]);

  if (!run) return null;

  const item = store.currentItemId ? findItem(run.items, store.currentItemId) : null;
  const number = store.currentItemId ? getItemNumber(run.items, store.currentItemId) : null;
  const stats = computeProgress(run.items);
  const itemRemarks = item ? run.remarks.filter((r) => r.itemId === item.id) : [];
  const itemQuestions = item ? run.questions.filter((q) => q.itemId === item.id) : [];
  const itemBugs = item ? run.bugs.filter((b) => b.itemId === item.id) : [];

  const editingRemark =
    panel.type === 'remark' && panel.editId
      ? itemRemarks.find((r) => r.id === panel.editId)
      : undefined;
  const editingQuestion =
    panel.type === 'question' && panel.editId
      ? itemQuestions.find((q) => q.id === panel.editId)
      : undefined;
  const editingBug =
    panel.type === 'bug' && panel.editId
      ? itemBugs.find((b) => b.id === panel.editId)
      : undefined;

  const addUrl = async () => {
    if (!item) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url;
      if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        setFlash('Не удалось получить URL активной вкладки');
        return;
      }
      await store.patchItem(item.id, { url });
      setFlash('URL добавлен');
      setTimeout(() => setFlash(''), 2000);
    } catch {
      setFlash('Ошибка получения URL');
    }
  };

  return (
    <div className="mode-panel">
      <ProgressBar stats={stats} />

      <Checklist
        run={run}
        currentItemId={store.currentItemId}
        onSelect={store.selectItem}
      />

      <div className="divider" />

      {item ? (
        <section className="current-item">
          <h3>ТЕКУЩИЙ ПУНКТ</h3>
          <p className="item-title">
            {number}. {item.title}
          </p>
          {item.description && <p className="muted">{item.description}</p>}
          {item.url && (
            <p className="url-line">
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.url}
              </a>
            </p>
          )}

          <div className="status-buttons">
            {PRIMARY_STATUSES.map(({ status, label }) => (
              <button
                key={status}
                type="button"
                className={`btn status-btn status-${status} ${
                  item.status === status ? 'is-selected' : ''
                }`}
                onClick={() => void store.patchItem(item.id, { status })}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className={`btn status-btn status-blocked ${
                item.status === 'blocked' ? 'is-selected' : ''
              }`}
              onClick={() => void store.patchItem(item.id, { status: 'blocked' })}
            >
              Заблокировано
            </button>
          </div>

          <p className="muted small">Сейчас: {STATUS_LABELS[item.status]} · горячие клавиши 1–4</p>

          <CommentField
            key={item.id}
            value={item.comment ?? ''}
            onChange={(comment) => void store.patchItem(item.id, { comment })}
          />

          <div className="row-actions wrap">
            <button type="button" className="btn btn-ghost" onClick={() => void addUrl()}>
              Добавить URL
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPanel({ type: 'remark' })}
            >
              + Добавить замечание
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPanel({ type: 'question' })}
            >
              + Добавить вопрос
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPanel({ type: 'bug' })}
            >
              🐞 Добавить баг
            </button>
          </div>

          {flash && <p className="flash">{flash}</p>}

          {panel.type === 'remark' && (
            <RemarkForm
              key={panel.editId ?? 'new-remark'}
              initialText={editingRemark?.text}
              submitLabel={editingRemark ? 'Сохранить замечание' : 'Добавить замечание'}
              onCancel={() => setPanel({ type: 'none' })}
              onSubmit={async (text) => {
                if (editingRemark) {
                  await store.updateRemark(editingRemark.id, text);
                } else {
                  await store.createRemark(item.id, text);
                }
                setPanel({ type: 'none' });
              }}
            />
          )}
          {panel.type === 'question' && (
            <QuestionForm
              key={panel.editId ?? 'new-question'}
              initialText={editingQuestion?.text}
              submitLabel={editingQuestion ? 'Сохранить вопрос' : 'Добавить вопрос'}
              onCancel={() => setPanel({ type: 'none' })}
              onSubmit={async (text) => {
                if (editingQuestion) {
                  await store.updateQuestion(editingQuestion.id, text);
                } else {
                  await store.createQuestion(item.id, text);
                }
                setPanel({ type: 'none' });
              }}
            />
          )}
          {panel.type === 'bug' && (
            <BugForm
              key={panel.editId ?? 'new-bug'}
              initial={
                editingBug ?? {
                  url: item.url,
                }
              }
              titleLabel={editingBug ? 'Редактировать баг' : 'Новый баг'}
              submitLabel={editingBug ? 'Сохранить баг' : 'Добавить баг'}
              onCancel={() => setPanel({ type: 'none' })}
              onSubmit={async (data) => {
                if (editingBug) {
                  await store.updateBug(editingBug.id, data);
                } else {
                  await store.createBug(item.id, data);
                }
                setPanel({ type: 'none' });
              }}
            />
          )}

          {(itemRemarks.length > 0 || itemQuestions.length > 0 || itemBugs.length > 0) && (
            <div className="linked-notes">
              {itemRemarks.map((r) => (
                <div key={r.id} className="note-card note-remark">
                  <strong>⚠ Замечание</strong>
                  <p>{r.text}</p>
                  <div className="note-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setPanel({ type: 'remark', editId: r.id })}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-ghost"
                      onClick={() => setDeleteTarget({ kind: 'remark', id: r.id })}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
              {itemQuestions.map((q) => (
                <div key={q.id} className="note-card note-question">
                  <strong>❓ Вопрос</strong>
                  <p>{q.text}</p>
                  <div className="note-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setPanel({ type: 'question', editId: q.id })}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-ghost"
                      onClick={() => setDeleteTarget({ kind: 'question', id: q.id })}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
              {itemBugs.map((b) => (
                <div key={b.id} className="note-card note-bug">
                  <strong>🐞 Баг</strong>
                  <p>
                    <span className="muted">Название:</span> {b.title}
                  </p>
                  {b.steps.length > 0 && (
                    <>
                      <p className="muted small">Шаги воспроизведения:</p>
                      <ol className="bug-steps-preview">
                        {b.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </>
                  )}
                  <p>
                    <span className="muted">Фактически:</span> {b.actual}
                  </p>
                  <div className="note-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setPanel({ type: 'bug', editId: b.id })}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-ghost"
                      onClick={() => setDeleteTarget({ kind: 'bug', id: b.id })}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="nav-row">
            <button type="button" className="btn btn-ghost" onClick={store.goPrevItem}>
              ← Назад
            </button>
            <button type="button" className="btn btn-ghost" onClick={store.goNextItem}>
              Следующий →
            </button>
          </div>
        </section>
      ) : (
        <p className="muted">Выберите пункт в списке или добавьте пункты в режиме редактирования.</p>
      )}

      {run.status === 'in_progress' && (
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setShowComplete(true)}
        >
          Завершить тестирование
        </button>
      )}

      {run.status === 'completed' && (
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => store.setView('export')}
        >
          Перейти к экспорту
        </button>
      )}

      {showComplete && (
        <ConfirmDialog
          title="Завершить тестирование?"
          message={`Проверено: ${stats.checked} из ${stats.total}`}
          confirmLabel="Завершить"
          onCancel={() => setShowComplete(false)}
          onConfirm={() => {
            setShowComplete(false);
            void store.finishRun();
          }}
        >
          <ul className="stats-list">
            <li>✓ Пройдено: {stats.passed}</li>
            <li>✕ Не пройдено: {stats.failed}</li>
            <li>⚠ Замечаний: {stats.remark}</li>
            <li>○ Не проверено: {stats.notTested}</li>
          </ul>
          {stats.notTested > 0 && (
            <p className="muted">Есть непроверенные пункты — завершение всё равно возможно.</p>
          )}
        </ConfirmDialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={
            deleteTarget.kind === 'remark'
              ? 'Удалить замечание?'
              : deleteTarget.kind === 'question'
                ? 'Удалить вопрос?'
                : 'Удалить баг?'
          }
          message="Это действие нельзя отменить."
          confirmLabel="Удалить"
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            void (async () => {
              if (deleteTarget.kind === 'remark') {
                await store.removeRemark(deleteTarget.id);
              } else if (deleteTarget.kind === 'question') {
                await store.removeQuestion(deleteTarget.id);
              } else {
                await store.removeBug(deleteTarget.id);
              }
              setDeleteTarget(null);
              setPanel({ type: 'none' });
            })();
          }}
        />
      )}
    </div>
  );
}
