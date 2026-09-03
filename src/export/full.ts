import type { TestRun } from '@/domain/models';
import { STATUS_LABELS, RUN_STATUS_LABELS } from '@/domain/labels';
import { formatBugSteps } from '@/domain/bug-steps';
import { withChecklistItemRef } from '@/domain/item-ref';
import { computeProgress } from '@/domain/statistics';
import { flattenItems, getItemNumber } from '@/domain/test-item';

export function exportFull(testRun: TestRun): string {
  const stats = computeProgress(testRun.items);
  const lines: string[] = [];

  lines.push('=== ПОЛНЫЙ ОТЧЁТ ТЕСТИРОВАНИЯ ===');
  lines.push('');
  lines.push(`Название: ${testRun.title}`);
  lines.push(`Статус: ${RUN_STATUS_LABELS[testRun.status]}`);
  if (testRun.jiraIssue) lines.push(`Jira: ${testRun.jiraIssue}`);
  if (testRun.environment) lines.push(`Окружение: ${testRun.environment}`);
  if (testRun.version) lines.push(`Версия: ${testRun.version}`);
  lines.push(`Создано: ${testRun.createdAt}`);
  lines.push(`Обновлено: ${testRun.updatedAt}`);
  lines.push('');
  lines.push('Статистика:');
  lines.push(`Проверено: ${stats.checked} из ${stats.total}`);
  lines.push(`✓ Пройдено: ${stats.passed}`);
  lines.push(`✕ Не пройдено: ${stats.failed}`);
  lines.push(`⚠ Замечаний: ${stats.remark}`);
  lines.push(`⛔ Заблокировано: ${stats.blocked}`);
  lines.push(`⏭ Пропущено: ${stats.skipped}`);
  lines.push(`○ Не проверено: ${stats.notTested}`);
  lines.push('');
  lines.push('--- ПУНКТЫ ---');
  lines.push('');

  for (const { item, number } of flattenItems(testRun.items)) {
    lines.push(`${number}. ${item.title}`);
    lines.push(`   Статус: ${STATUS_LABELS[item.status]}`);
    if (item.description?.trim()) {
      lines.push(`   Описание: ${item.description.trim()}`);
    }
    if (item.comment?.trim()) {
      lines.push(`   Комментарий: ${item.comment.trim()}`);
    }
    if (item.url?.trim()) {
      lines.push(`   URL: ${item.url.trim()}`);
    }
    lines.push('');
  }

  if (testRun.remarks.length > 0) {
    lines.push('--- ЗАМЕЧАНИЯ ---');
    lines.push('');
    for (const remark of testRun.remarks) {
      const num = getItemNumber(testRun.items, remark.itemId) ?? '?';
      lines.push(withChecklistItemRef(num, remark.text));
      lines.push(`Создано: ${remark.createdAt}`);
      lines.push('');
    }
  }

  if (testRun.questions.length > 0) {
    lines.push('--- ВОПРОСЫ ---');
    lines.push('');
    for (const q of testRun.questions) {
      const num = getItemNumber(testRun.items, q.itemId) ?? '?';
      lines.push(withChecklistItemRef(num, q.text));
      lines.push(`Создано: ${q.createdAt}`);
      lines.push('');
    }
  }

  if (testRun.bugs.length > 0) {
    lines.push('--- БАГИ ---');
    lines.push('');
    for (const bug of testRun.bugs) {
      const num = getItemNumber(testRun.items, bug.itemId) ?? '?';
      lines.push(`Название: ${withChecklistItemRef(num, bug.title)}`);
      lines.push('Шаги воспроизведения:');
      lines.push(formatBugSteps(bug.steps));
      lines.push(`Фактически: ${bug.actual}`);
      lines.push(`Ожидалось: ${bug.expected}`);
      if (bug.comment) lines.push(`Комментарий: ${bug.comment}`);
      if (bug.url) lines.push(`URL: ${bug.url}`);
      lines.push(`Создано: ${bug.createdAt}`);
      lines.push('');
    }
  }

  return lines.join('\n').trim() + '\n';
}
