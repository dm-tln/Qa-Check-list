import { useState } from 'react';
import type { AppStore } from '../hooks/useAppStore';
import { computeProgress } from '@/domain/statistics';
import { exportToExcel } from '@/export/excel';
import { exportToJira } from '@/export/jira';
import { exportFull } from '@/export/full';
import { exportToJson } from '@/export/json';
import { buildExportFilename, downloadTextFile } from '@/export/download';
import { copyToClipboard } from '@/export/clipboard';

interface Props {
  store: AppStore;
}

export function ExportPanel({ store }: Props) {
  const run = store.activeRun;
  const [message, setMessage] = useState('');

  if (!run) return null;

  const stats = computeProgress(run.items);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  };

  const copy = async (text: string, ok: string) => {
    try {
      await copyToClipboard(text);
      flash(ok);
    } catch {
      flash('Не удалось скопировать в буфер обмена');
    }
  };

  return (
    <div className="screen">
      <header className="app-header">
        <button type="button" className="btn btn-ghost" onClick={store.goHome}>
          ← К списку
        </button>
        <h1>Результат тестирования</h1>
        <p className="run-meta">
          <strong>{run.title}</strong>
          {run.jiraIssue && <span>{run.jiraIssue}</span>}
        </p>
      </header>

      <div className="result-stats">
        <p>✓ Пройдено: {stats.passed}</p>
        <p>✕ Не пройдено: {stats.failed}</p>
        <p>⚠ Замечаний: {stats.remark}</p>
        <p>○ Не проверено: {stats.notTested}</p>
      </div>

      <div className="divider" />

      <h2>Экспорт</h2>
      <div className="export-actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => void copy(exportToExcel(run), 'Скопировано для Excel / Google Sheets')}
        >
          Копировать для Excel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => void copy(exportToJira(run), 'Скопировано для Jira')}
        >
          Копировать для Jira
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => void copy(exportFull(run), 'Полный отчёт скопирован')}
        >
          Копировать всё
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => {
            downloadTextFile(
              buildExportFilename(run, 'json'),
              exportToJson(run),
              'application/json',
            );
            flash('JSON скачан');
          }}
        >
          Скачать JSON
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => {
            downloadTextFile(buildExportFilename(run, 'txt'), exportToJira(run));
            flash('TXT скачан');
          }}
        >
          Скачать TXT
        </button>
      </div>

      {message && <p className="flash">{message}</p>}

      <div className="row-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-ghost" onClick={() => store.setView('run')}>
          Вернуться к тестированию
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => store.setView('edit')}>
          Редактировать чек-лист
        </button>
      </div>
    </div>
  );
}
