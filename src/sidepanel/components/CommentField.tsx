import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function CommentField({ value, onChange }: Props) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const schedule = (next: string) => {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 400);
  };

  return (
    <label className="field">
      <span>Комментарий</span>
      <textarea
        rows={3}
        value={local}
        placeholder="Score не отображается у преподавателя"
        onChange={(e) => schedule(e.target.value)}
        onBlur={() => {
          if (timer.current) clearTimeout(timer.current);
          onChange(local);
        }}
      />
    </label>
  );
}
