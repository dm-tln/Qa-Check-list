import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Bug } from '@/domain/models';

export interface BugFormData {
  title: string;
  steps: string[];
  actual: string;
  expected: string;
  comment?: string;
  url?: string;
}

interface Props {
  initial?: Partial<BugFormData> | Bug;
  titleLabel?: string;
  submitLabel?: string;
  onSubmit: (data: BugFormData) => Promise<void>;
  onCancel: () => void;
}

export function BugForm({
  initial,
  titleLabel = 'Новый баг',
  submitLabel = 'Добавить баг',
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [steps, setSteps] = useState<string[]>(
    initial?.steps && initial.steps.length > 0 ? [...initial.steps] : [''],
  );
  const [actual, setActual] = useState(initial?.actual ?? '');
  const [expected, setExpected] = useState(initial?.expected ?? '');
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [error, setError] = useState('');
  const stepRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    stepRefs.current = stepRefs.current.slice(0, steps.length);
  }, [steps.length]);

  const fillUrl = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && !tab.url.startsWith('chrome://')) {
        setUrl(tab.url);
      }
    } catch {
      // ignore
    }
  };

  const updateStep = (index: number, value: string) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? value : step)));
  };

  const addStep = (focus = true) => {
    setSteps((prev) => {
      const next = [...prev, ''];
      if (focus) {
        queueMicrotask(() => stepRefs.current[next.length - 1]?.focus());
      }
      return next;
    });
  };

  const removeStep = (index: number) => {
    setSteps((prev) => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  const onStepKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === steps.length - 1) {
        addStep(true);
      } else {
        stepRefs.current[index + 1]?.focus();
      }
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (!title.trim() || !actual.trim() || !expected.trim() || cleanSteps.length === 0) {
      setError('Заполните название, шаги воспроизведения, фактический и ожидаемый результат');
      return;
    }
    await onSubmit({
      title: title.trim(),
      steps: cleanSteps,
      actual: actual.trim(),
      expected: expected.trim(),
      comment: comment.trim() || undefined,
      url: url.trim() || undefined,
    });
  };

  return (
    <form className="inline-form" onSubmit={(e) => void submit(e)}>
      <h4>{titleLabel}</h4>
      <label className="field">
        <span>Название</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>

      <div className="field">
        <span>Шаги воспроизведения *</span>
        <div className="bug-steps">
          {steps.map((step, index) => (
            <div key={index} className="bug-step-row">
              <span className="bug-step-number" aria-hidden>
                {index + 1}.
              </span>
              <input
                ref={(el) => {
                  stepRefs.current[index] = el;
                }}
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                onKeyDown={(e) => onStepKeyDown(index, e)}
                placeholder={index === 0 ? 'Открыть плеер под преподавателем' : 'Следующий шаг'}
                aria-label={`Шаг ${index + 1}`}
              />
              {steps.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost bug-step-remove"
                  onClick={() => removeStep(index)}
                  aria-label="Удалить"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => addStep(true)}>
            + Добавить шаг
          </button>
        </div>
      </div>

      <label className="field">
        <span>Фактический результат</span>
        <textarea rows={2} value={actual} onChange={(e) => setActual(e.target.value)} />
      </label>
      <label className="field">
        <span>Ожидаемый результат</span>
        <textarea rows={2} value={expected} onChange={(e) => setExpected(e.target.value)} />
      </label>
      <label className="field">
        <span>Дополнительный комментарий</span>
        <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <label className="field">
        <span>URL</span>
        <div className="input-with-action">
          <input value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="button" className="btn btn-ghost" onClick={() => void fillUrl()}>
            Добавить URL
          </button>
        </div>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row-actions">
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}
