import type { TestItem, TestRun } from '@/domain/models';
import { STATUS_LABELS } from '@/domain/labels';
import { formatBugSteps } from '@/domain/bug-steps';
import { withChecklistItemRef } from '@/domain/item-ref';
import { computeProgress } from '@/domain/statistics';
import { getItemNumber } from '@/domain/test-item';

function formatItemBlock(item: TestItem, number: string): string {
  const lines: string[] = [];
  lines.push(`${number}. ${item.title}`);
  lines.push(`Статус: ${STATUS_LABELS[item.status].toUpperCase()}`);
  if (item.comment?.trim()) {
    lines.push('');
    lines.push('Комментарий:');
    lines.push(item.comment.trim());
  }
  if (item.url?.trim()) {
    lines.push('');
    lines.push(`URL: ${item.url.trim()}`);
  }
  if (item.description?.trim()) {
    lines.push('');
    lines.push('Описание:');
    lines.push(item.description.trim());
  }
  return lines.join('\n');
}

function walkItems(items: TestItem[], parentNumber = ''): string[] {
  const blocks: string[] = [];
  items.forEach((item, index) => {
    const number = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
    blocks.push(formatItemBlock(item, number));
    if (item.children.length > 0) {
      blocks.push(...walkItems(item.children, number));
    }
  });
  return blocks;
}

export function exportToJira(testRun: TestRun): string {
  const stats = computeProgress(testRun.items);
  const parts: string[] = [];

  parts.push('РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ');
  parts.push('');
  if (testRun.jiraIssue) {
    parts.push(`Задача: ${testRun.jiraIssue}`);
    parts.push('');
  }
  parts.push(`Название: ${testRun.title}`);
  if (testRun.environment) parts.push(`Окружение: ${testRun.environment}`);
  if (testRun.version) parts.push(`Версия: ${testRun.version}`);
  parts.push('');
  parts.push('Статистика:');
  parts.push(`Пройдено: ${stats.passed}`);
  parts.push(`Не пройдено: ${stats.failed}`);
  parts.push(`Замечаний: ${stats.remark}`);
  parts.push(`Заблокировано: ${stats.blocked}`);
  parts.push(`Пропущено: ${stats.skipped}`);
  parts.push(`Не проверено: ${stats.notTested}`);
  parts.push('');
  parts.push('---');
  parts.push('');

  const itemBlocks = walkItems(testRun.items);
  parts.push(itemBlocks.join('\n\n---\n\n'));

  if (testRun.remarks.length > 0) {
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push('ЗАМЕЧАНИЯ');
    parts.push('');
    testRun.remarks.forEach((remark, i) => {
      const num = getItemNumber(testRun.items, remark.itemId) ?? '?';
      parts.push(`${i + 1}. ${withChecklistItemRef(num, remark.text)}`);
      parts.push('');
    });
  }

  if (testRun.questions.length > 0) {
    parts.push('---');
    parts.push('');
    parts.push('ВОПРОСЫ');
    parts.push('');
    testRun.questions.forEach((q, i) => {
      const num = getItemNumber(testRun.items, q.itemId) ?? '?';
      parts.push(`${i + 1}. ${withChecklistItemRef(num, q.text)}`);
      parts.push('');
    });
  }

  if (testRun.bugs.length > 0) {
    parts.push('---');
    parts.push('');
    parts.push('НАЙДЕННЫЕ БАГИ');
    parts.push('');
    testRun.bugs.forEach((bug, i) => {
      const num = getItemNumber(testRun.items, bug.itemId) ?? '?';
      parts.push(`Баг ${i + 1}`);
      parts.push(`Название: ${withChecklistItemRef(num, bug.title)}`);
      parts.push('');
      parts.push('Шаги воспроизведения:');
      parts.push(formatBugSteps(bug.steps));
      parts.push('');
      parts.push('Фактический результат:');
      parts.push(bug.actual);
      parts.push('');
      parts.push('Ожидаемый результат:');
      parts.push(bug.expected);
      if (bug.comment?.trim()) {
        parts.push('');
        parts.push('Комментарий:');
        parts.push(bug.comment.trim());
      }
      if (bug.url?.trim()) {
        parts.push('');
        parts.push(`URL: ${bug.url.trim()}`);
      }
      parts.push('');
    });
  }

  return parts.join('\n').trim() + '\n';
}
