import type { ParentDisplayStatus, TestStatus } from './models';

export const STATUS_LABELS: Record<TestStatus, string> = {
  not_tested: 'Не проверено',
  passed: 'Пройдено',
  failed: 'Не пройдено',
  remark: 'Замечание',
  blocked: 'Заблокировано',
  skipped: 'Пропущено',
};

export const STATUS_ICONS: Record<TestStatus, string> = {
  not_tested: '○',
  passed: '✓',
  failed: '✕',
  remark: '⚠',
  blocked: '⛔',
  skipped: '⏭',
};

export const PARENT_STATUS_LABELS: Record<ParentDisplayStatus, string> = {
  not_tested: 'Не проверено',
  passed: 'Пройдено',
  failed: 'Не пройдено',
  partial: 'Частично',
  remark: 'Замечание',
  blocked: 'Заблокировано',
  skipped: 'Пропущено',
  has_issues: 'Есть проблемы',
};

export const PARENT_STATUS_ICONS: Record<ParentDisplayStatus, string> = {
  not_tested: '○',
  passed: '✓',
  failed: '✕',
  partial: '⚠',
  remark: '⚠',
  blocked: '⛔',
  skipped: '⏭',
  has_issues: '⚠',
};

export const RUN_STATUS_LABELS = {
  in_progress: 'В процессе',
  completed: 'Завершено',
} as const;
