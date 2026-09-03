import { useState, type FormEvent } from 'react';

interface Props {
  initialText?: string;
  submitLabel?: string;
  onSubmit: (text: string) => Promise<void>;
  onCancel: () => void;
}

export function QuestionForm({
  initialText = '',
  submitLabel = 'Добавить вопрос',
  onSubmit,
  onCancel,
}: Props) {
  const [text, setText] = useState(initialText);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await onSubmit(text.trim());
  };

  return (
    <form className="inline-form" onSubmit={(e) => void submit(e)}>
      <h4>❓ Вопрос</h4>
      <label className="field">
        <span>Текст</span>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Нужно ли отображать score в этом режиме?"
          autoFocus
        />
      </label>
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
