import type { TestRun } from '@/domain/models';

export function buildExportFilename(testRun: TestRun, ext: 'json' | 'txt'): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = testRun.title
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `qa-test-run-${safeTitle || 'export'}-${date}.${ext}`;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
