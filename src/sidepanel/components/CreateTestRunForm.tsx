import { useState, type FormEvent } from 'react';
import type { AppStore } from '../hooks/useAppStore';

interface Props {
  store: AppStore;
}

export function CreateTestRunForm({ store }: Props) {
  const [title, setTitle] = useState('');
  const [jiraIssue, setJiraIssue] = useState('');
  const [environment, setEnvironment] = useState('');
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Укажите название тестирования');
      return;
    }
    void store.createRun({ title, jiraIssue, environment, version });
  };

  return (
    <div className="screen">
      <header className="app-header">
        <button type="button" className="btn btn-ghost" onClick={store.goHome}>
          ← Назад
        </button>
        <h1>QA CHECK LIST</h1>
        <p className="muted">Создайте новое тестирование</p>
      </header>

      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Название тестирования *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Проверка нового плеера"
            autoFocus
          />
        </label>
        <label className="field">
          <span>Jira-задача</span>
          <input
            value={jiraIssue}
            onChange={(e) => setJiraIssue(e.target.value)}
            placeholder="TE-29654"
          />
        </label>
        <label className="field">
          <span>Окружение</span>
          <input
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            placeholder="Stage"
          />
        </label>
        <label className="field">
          <span>Версия</span>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.24.3"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block">
          Создать тестирование
        </button>
      </form>
    </div>
  );
}
