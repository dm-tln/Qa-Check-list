export type TestStatus =
  | 'not_tested'
  | 'passed'
  | 'failed'
  | 'remark'
  | 'blocked'
  | 'skipped';

export type TestRunStatus = 'in_progress' | 'completed';

export type AppView = 'home' | 'create' | 'edit' | 'run' | 'export';

export interface TestItem {
  id: string;
  title: string;
  description?: string;
  status: TestStatus;
  comment?: string;
  url?: string;
  children: TestItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Remark {
  id: string;
  itemId: string;
  text: string;
  createdAt: string;
}

export interface Question {
  id: string;
  itemId: string;
  text: string;
  createdAt: string;
}

export interface Bug {
  id: string;
  itemId: string;
  title: string;
  /** Шаги воспроизведения без номеров в данных; нумерация при отображении/экспорте */
  steps: string[];
  actual: string;
  expected: string;
  comment?: string;
  url?: string;
  createdAt: string;
}

export interface TestRun {
  id: string;
  title: string;
  jiraIssue?: string;
  environment?: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
  status: TestRunStatus;
  items: TestItem[];
  remarks: Remark[];
  questions: Question[];
  bugs: Bug[];
}

export interface AppPersistedState {
  testRuns: TestRun[];
  activeTestRunId?: string;
}

export type ParentDisplayStatus =
  | 'not_tested'
  | 'passed'
  | 'failed'
  | 'partial'
  | 'remark'
  | 'blocked'
  | 'skipped'
  | 'has_issues';

export interface FlatItem {
  item: TestItem;
  number: string;
  depth: number;
  parentId: string | null;
}

export interface ProgressStats {
  total: number;
  checked: number;
  passed: number;
  failed: number;
  remark: number;
  blocked: number;
  skipped: number;
  notTested: number;
}
