import type { TestRun } from '@/domain/models';
import {
  PARENT_STATUS_ICONS,
  PARENT_STATUS_LABELS,
  STATUS_ICONS,
} from '@/domain/labels';
import { getDisplayStatus } from '@/domain/statistics';
import { flattenItems } from '@/domain/test-item';

interface Props {
  run: TestRun;
  currentItemId: string | null;
  onSelect: (itemId: string) => void;
  showMeta?: boolean;
}

export function Checklist({ run, currentItemId, onSelect, showMeta = true }: Props) {
  const flat = flattenItems(run.items);

  if (flat.length === 0) {
    return <p className="muted">Пока нет пунктов. Добавьте первый пункт чек-листа.</p>;
  }

  return (
    <ul className="checklist">
      {flat.map(({ item, number, depth }) => {
        const display = getDisplayStatus(item);
        const icon =
          item.children.length > 0
            ? PARENT_STATUS_ICONS[display]
            : STATUS_ICONS[item.status];
        const hasComment = !!item.comment?.trim();
        const hasBug = run.bugs.some((b) => b.itemId === item.id);
        const hasQuestion = run.questions.some((q) => q.itemId === item.id);

        return (
          <li key={item.id}>
            <button
              type="button"
              className={`checklist-item depth-${Math.min(depth, 4)} ${
                currentItemId === item.id ? 'is-active' : ''
              } status-${display}`}
              onClick={() => onSelect(item.id)}
              style={{ paddingLeft: `${8 + depth * 12}px` }}
            >
              <span className="checklist-icon" title={PARENT_STATUS_LABELS[display]}>
                {icon}
              </span>
              <span className="checklist-text">
                <span className="checklist-number">{number}.</span> {item.title}
              </span>
              {showMeta && (
                <span className="checklist-meta">
                  {hasComment && <span title="Есть комментарий">💬</span>}
                  {hasBug && <span title="Есть баг">🐞</span>}
                  {hasQuestion && <span title="Есть вопрос">❓</span>}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
