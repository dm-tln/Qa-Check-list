import type { AppPersistedState, Bug, TestItem, TestRun } from '@/domain/models';
import { normalizeBugSteps } from '@/domain/bug-steps';

export const BACKUP_FORMAT = 'qa-check-list-backup' as const;
export const BACKUP_VERSION = 1 as const;

export interface QaBackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  state: AppPersistedState;
}

export function buildBackupFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `qa-check-list-backup-${date}.json`;
}

export function createBackup(state: AppPersistedState): QaBackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state: {
      testRuns: state.testRuns,
      activeTestRunId: state.activeTestRunId,
    },
  };
}

export function serializeBackup(backup: QaBackupFile): string {
  return JSON.stringify(backup, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeItem(raw: unknown): TestItem | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') {
    return null;
  }
  const childrenRaw = Array.isArray(raw.children) ? raw.children : [];
  const children = childrenRaw
    .map((child) => normalizeItem(child))
    .filter((child): child is TestItem => child !== null);

  return {
    id: raw.id,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    status:
      raw.status === 'passed' ||
      raw.status === 'failed' ||
      raw.status === 'remark' ||
      raw.status === 'blocked' ||
      raw.status === 'skipped' ||
      raw.status === 'not_tested'
        ? raw.status
        : 'not_tested',
    comment: typeof raw.comment === 'string' ? raw.comment : undefined,
    url: typeof raw.url === 'string' ? raw.url : undefined,
    children,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

function normalizeBug(raw: unknown): Bug | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.itemId !== 'string') {
    return null;
  }
  if (typeof raw.title !== 'string' || typeof raw.actual !== 'string' || typeof raw.expected !== 'string') {
    return null;
  }
  const steps = Array.isArray(raw.steps)
    ? normalizeBugSteps(raw.steps.filter((s): s is string => typeof s === 'string'))
    : [];

  return {
    id: raw.id,
    itemId: raw.itemId,
    title: raw.title,
    steps,
    actual: raw.actual,
    expected: raw.expected,
    comment: typeof raw.comment === 'string' ? raw.comment : undefined,
    url: typeof raw.url === 'string' ? raw.url : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  };
}

function normalizeTestRun(raw: unknown): TestRun | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') {
    return null;
  }
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items = itemsRaw
    .map((item) => normalizeItem(item))
    .filter((item): item is TestItem => item !== null);

  const remarks = Array.isArray(raw.remarks)
    ? raw.remarks.filter(
        (r): r is TestRun['remarks'][number] =>
          isRecord(r) &&
          typeof r.id === 'string' &&
          typeof r.itemId === 'string' &&
          typeof r.text === 'string',
      )
    : [];

  const questions = Array.isArray(raw.questions)
    ? raw.questions.filter(
        (q): q is TestRun['questions'][number] =>
          isRecord(q) &&
          typeof q.id === 'string' &&
          typeof q.itemId === 'string' &&
          typeof q.text === 'string',
      )
    : [];

  const bugs = Array.isArray(raw.bugs)
    ? raw.bugs.map((b) => normalizeBug(b)).filter((b): b is Bug => b !== null)
    : [];

  return {
    id: raw.id,
    title: raw.title,
    jiraIssue: typeof raw.jiraIssue === 'string' ? raw.jiraIssue : undefined,
    environment: typeof raw.environment === 'string' ? raw.environment : undefined,
    version: typeof raw.version === 'string' ? raw.version : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    status: raw.status === 'completed' ? 'completed' : 'in_progress',
    items,
    remarks,
    questions,
    bugs,
  };
}

export function parseBackup(jsonText: string): AppPersistedState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Файл повреждён или это не JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('Неверный формат backup-файла');
  }

  // Full backup wrapper
  if (parsed.format === BACKUP_FORMAT) {
    if (parsed.version !== BACKUP_VERSION) {
      throw new Error(`Неподдерживаемая версия backup: ${String(parsed.version)}`);
    }
    if (!isRecord(parsed.state) || !Array.isArray(parsed.state.testRuns)) {
      throw new Error('В backup нет данных тестирований');
    }
    const stateRaw = parsed.state;
    const testRunsRaw = stateRaw.testRuns as unknown[];
    const testRuns = testRunsRaw
      .map((run: unknown) => normalizeTestRun(run))
      .filter((run): run is TestRun => run !== null);
    const activeCandidate = stateRaw.activeTestRunId;
    const activeTestRunId =
      typeof activeCandidate === 'string' &&
      testRuns.some((r: TestRun) => r.id === activeCandidate)
        ? activeCandidate
        : undefined;
    return { testRuns, activeTestRunId };
  }

  // Plain AppPersistedState
  if (Array.isArray(parsed.testRuns)) {
    const testRuns = (parsed.testRuns as unknown[])
      .map((run: unknown) => normalizeTestRun(run))
      .filter((run): run is TestRun => run !== null);
    const activeCandidate = parsed.activeTestRunId;
    const activeTestRunId =
      typeof activeCandidate === 'string' &&
      testRuns.some((r: TestRun) => r.id === activeCandidate)
        ? activeCandidate
        : undefined;
    return { testRuns, activeTestRunId };
  }

  throw new Error('Это не backup QA Check List');
}
