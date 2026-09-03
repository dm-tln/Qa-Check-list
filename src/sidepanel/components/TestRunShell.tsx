import type { AppStore } from '../hooks/useAppStore';
import { EditMode } from './EditMode';
import { RunMode } from './RunMode';
import { ToastUndo } from './ToastUndo';

interface Props {
  store: AppStore;
}

export function TestRunShell({ store }: Props) {
  const run = store.activeRun;
  if (!run) {
    return (
      <div className="screen">
        <p>Тестирование не найдено.</p>
        <button type="button" className="btn btn-primary" onClick={store.goHome}>
          На главную
        </button>
      </div>
    );
  }

  const mode = store.currentView === 'run' ? 'run' : 'edit';

  return (
    <div className="screen run-shell">
      <header className="app-header compact">
        <div className="header-row">
          <button type="button" className="btn btn-ghost" onClick={store.goHome}>
            ←
          </button>
          <div className="header-title">
            <h1>QA CHECK LIST</h1>
            <strong>{run.title}</strong>
            {run.jiraIssue && <span className="muted">{run.jiraIssue}</span>}
            {(run.environment || run.version) && (
              <span className="muted">
                {[run.environment, run.version].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>

        <div className="mode-switch" role="tablist">
          <button
            type="button"
            role="tab"
            className={mode === 'edit' ? 'is-active' : ''}
            aria-selected={mode === 'edit'}
            onClick={() => store.setView('edit')}
          >
            Редактирование
          </button>
          <button
            type="button"
            role="tab"
            className={mode === 'run' ? 'is-active' : ''}
            aria-selected={mode === 'run'}
            onClick={() => store.setView('run')}
          >
            Тестирование
          </button>
        </div>
      </header>

      {mode === 'edit' ? <EditMode store={store} /> : <RunMode store={store} />}
      <ToastUndo store={store} />
    </div>
  );
}
