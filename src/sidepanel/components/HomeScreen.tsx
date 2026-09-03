import { useRef, useState } from 'react';
import type { AppStore } from '../hooks/useAppStore';
import { computeProgress } from '@/domain/statistics';
import { RUN_STATUS_LABELS } from '@/domain/labels';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  store: AppStore;
}

export function HomeScreen({ store }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingBackupText, setPendingBackupText] = useState<string | null>(null);
  const [flash, setFlash] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inProgress = store.testRuns.filter((r) => r.status === 'in_progress');
  const completed = store.testRuns.filter((r) => r.status === 'completed');

  const showFlash = (text: string) => {
    setFlash(text);
    setTimeout(() => setFlash(''), 3000);
  };

  const onPickBackup = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      setPendingBackupText(text);
      setConfirmRestore(true);
    } catch {
      showFlash('Не удалось прочитать файл');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="screen">
      <header className="app-header">
        <h1>QA CHECK LIST</h1>
        <p className="muted">Мои тестирования</p>
      </header>

      <button type="button" className="btn btn-primary btn-block" onClick={store.openCreate}>
        + Новое тестирование
      </button>

      <section className="section backup-section">
        <h2>Резервная копия</h2>
        <p className="muted small">
          Скачайте backup перед переносом профиля. На другом устройстве восстановите этот файл.
        </p>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              store.downloadBackup();
              showFlash('Backup скачан');
            }}
          >
            Скачать backup
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            Восстановить из backup
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void onPickBackup(e.target.files?.[0] ?? null)}
        />
        {flash && <p className="flash">{flash}</p>}
      </section>

      {store.testRuns.length === 0 && (
        <div className="empty-state">
          <p>Создайте новое тестирование</p>
          <p className="muted">Чек-лист создаётся прямо здесь — без Excel и Google Sheets.</p>
        </div>
      )}

      {inProgress.length > 0 && (
        <section className="section">
          <h2>В процессе</h2>
          <div className="run-list">
            {inProgress.map((run) => {
              const stats = computeProgress(run.items);
              return (
                <article key={run.id} className="run-card">
                  <button
                    type="button"
                    className="run-card-main"
                    onClick={() => store.openRun(run.id, 'run')}
                  >
                    <strong>{run.title}</strong>
                    {run.jiraIssue && <span className="muted">{run.jiraIssue}</span>}
                    <span>
                      {stats.checked} / {stats.total}
                    </span>
                    <span className="badge badge-progress">{RUN_STATUS_LABELS[run.status]}</span>
                  </button>
                  <div className="run-card-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => store.openRun(run.id, 'edit')}>
                      Редактировать
                    </button>
                    <button type="button" className="btn btn-danger-ghost" onClick={() => setDeleteId(run.id)}>
                      Удалить
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="section">
          <h2>Завершённые</h2>
          <div className="run-list">
            {completed.map((run) => {
              const stats = computeProgress(run.items);
              return (
                <article key={run.id} className="run-card">
                  <button
                    type="button"
                    className="run-card-main"
                    onClick={() => store.openRun(run.id, 'export')}
                  >
                    <strong>{run.title}</strong>
                    {run.jiraIssue && <span className="muted">{run.jiraIssue}</span>}
                    <span>
                      {stats.checked} / {stats.total}
                    </span>
                    <span className="badge badge-done">{RUN_STATUS_LABELS[run.status]}</span>
                  </button>
                  <div className="run-card-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => store.openRun(run.id, 'run')}>
                      Открыть
                    </button>
                    <button type="button" className="btn btn-danger-ghost" onClick={() => setDeleteId(run.id)}>
                      Удалить
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Удалить тестирование?"
          message="Все данные этого тестирования будут удалены."
          confirmLabel="Удалить"
          danger
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            void store.deleteRun(deleteId);
            setDeleteId(null);
          }}
        />
      )}

      {confirmRestore && pendingBackupText && (
        <ConfirmDialog
          title="Восстановить из backup?"
          message="Текущие данные в расширении будут полностью заменены содержимым backup-файла."
          confirmLabel="Восстановить"
          danger
          onCancel={() => {
            setConfirmRestore(false);
            setPendingBackupText(null);
          }}
          onConfirm={() => {
            void (async () => {
              try {
                const count = await store.restoreBackup(pendingBackupText);
                showFlash(`Восстановлено тестирований: ${count}`);
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Ошибка восстановления';
                showFlash(message);
              } finally {
                setConfirmRestore(false);
                setPendingBackupText(null);
              }
            })();
          }}
        />
      )}
    </div>
  );
}
