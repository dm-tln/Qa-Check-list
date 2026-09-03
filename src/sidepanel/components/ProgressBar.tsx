import type { ProgressStats } from '@/domain/models';

interface Props {
  stats: ProgressStats;
}

export function ProgressBar({ stats }: Props) {
  const pct = stats.total === 0 ? 0 : Math.round((stats.checked / stats.total) * 100);
  return (
    <div className="progress">
      <div className="progress-label">
        Проверено: {stats.checked} из {stats.total}
      </div>
      <div className="progress-track" aria-hidden>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-stats">
        <span className="status-passed">✓ {stats.passed}</span>
        <span className="status-failed">✕ {stats.failed}</span>
        <span className="status-remark">⚠ {stats.remark}</span>
        <span className="status-pending">○ {stats.notTested}</span>
      </div>
    </div>
  );
}
