import type { TestRun } from '@/domain/models';
import { STATUS_LABELS } from '@/domain/labels';
import { flattenItems, getItemNumber } from '@/domain/test-item';
import { formatBugSteps } from '@/domain/bug-steps';
import { withChecklistItemRef } from '@/domain/item-ref';

function escapeTsvCell(value: string): string {
  if (/[\t\n\r"]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowsToTsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeTsvCell).join('\t')).join('\n');
}

export function exportToExcel(testRun: TestRun): string {
  const sections: string[] = [];

  const itemRows: string[][] = [['Номер', 'Название', 'Статус', 'Комментарий']];
  for (const { item, number } of flattenItems(testRun.items)) {
    itemRows.push([
      number,
      item.title,
      STATUS_LABELS[item.status],
      item.comment ?? '',
    ]);
  }
  sections.push(rowsToTsv(itemRows));

  if (testRun.remarks.length > 0) {
    const remarkRows: string[][] = [['№', 'Замечание']];
    testRun.remarks.forEach((remark, index) => {
      const num = getItemNumber(testRun.items, remark.itemId) ?? '?';
      remarkRows.push([String(index + 1), withChecklistItemRef(num, remark.text)]);
    });
    sections.push('ЗАМЕЧАНИЯ');
    sections.push(rowsToTsv(remarkRows));
  }

  if (testRun.questions.length > 0) {
    const questionRows: string[][] = [['№', 'Вопрос']];
    testRun.questions.forEach((question, index) => {
      const num = getItemNumber(testRun.items, question.itemId) ?? '?';
      questionRows.push([String(index + 1), withChecklistItemRef(num, question.text)]);
    });
    sections.push('ВОПРОСЫ');
    sections.push(rowsToTsv(questionRows));
  }

  if (testRun.bugs.length > 0) {
    const bugRows: string[][] = [
      [
        '№',
        'Название',
        'Шаги воспроизведения',
        'Фактический результат',
        'Ожидаемый результат',
        'Комментарий',
        'URL',
      ],
    ];
    testRun.bugs.forEach((bug, index) => {
      const num = getItemNumber(testRun.items, bug.itemId) ?? '?';
      bugRows.push([
        String(index + 1),
        withChecklistItemRef(num, bug.title),
        formatBugSteps(bug.steps),
        bug.actual,
        bug.expected,
        bug.comment ?? '',
        bug.url ?? '',
      ]);
    });
    sections.push('НАЙДЕННЫЕ БАГИ');
    sections.push(rowsToTsv(bugRows));
  }

  return sections.join('\n\n');
}
