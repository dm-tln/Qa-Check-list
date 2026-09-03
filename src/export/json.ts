import type { TestRun } from '@/domain/models';

export function exportToJson(testRun: TestRun): string {
  return JSON.stringify(testRun, null, 2);
}
