import type { Bug, Question, Remark, TestItem, TestRun } from './models';
import { createId, nowIso } from './test-item';
import { normalizeBugSteps } from './bug-steps';

export interface CreateTestRunInput {
  title: string;
  jiraIssue?: string;
  environment?: string;
  version?: string;
}

export function createTestRun(input: CreateTestRunInput): TestRun {
  const ts = nowIso();
  return {
    id: createId(),
    title: input.title.trim(),
    jiraIssue: input.jiraIssue?.trim() || undefined,
    environment: input.environment?.trim() || undefined,
    version: input.version?.trim() || undefined,
    createdAt: ts,
    updatedAt: ts,
    status: 'in_progress',
    items: [],
    remarks: [],
    questions: [],
    bugs: [],
  };
}

export function touchTestRun(run: TestRun, patch: Partial<TestRun> = {}): TestRun {
  return {
    ...run,
    ...patch,
    updatedAt: nowIso(),
  };
}

export function withItems(run: TestRun, items: TestItem[]): TestRun {
  return touchTestRun(run, { items });
}

export function addRemark(run: TestRun, itemId: string, text: string): TestRun {
  const remark: Remark = {
    id: createId(),
    itemId,
    text: text.trim(),
    createdAt: nowIso(),
  };
  return touchTestRun(run, { remarks: [...run.remarks, remark] });
}

export function addQuestion(run: TestRun, itemId: string, text: string): TestRun {
  const question: Question = {
    id: createId(),
    itemId,
    text: text.trim(),
    createdAt: nowIso(),
  };
  return touchTestRun(run, { questions: [...run.questions, question] });
}

export function addBug(
  run: TestRun,
  input: Omit<Bug, 'id' | 'createdAt'>,
): TestRun {
  const bug: Bug = {
    ...input,
    id: createId(),
    title: input.title.trim(),
    steps: normalizeBugSteps(input.steps),
    actual: input.actual.trim(),
    expected: input.expected.trim(),
    comment: input.comment?.trim() || undefined,
    url: input.url?.trim() || undefined,
    createdAt: nowIso(),
  };
  return touchTestRun(run, { bugs: [...run.bugs, bug] });
}

export function updateRemark(run: TestRun, remarkId: string, text: string): TestRun {
  return touchTestRun(run, {
    remarks: run.remarks.map((remark) =>
      remark.id === remarkId ? { ...remark, text: text.trim() } : remark,
    ),
  });
}

export function deleteRemark(run: TestRun, remarkId: string): TestRun {
  return touchTestRun(run, {
    remarks: run.remarks.filter((remark) => remark.id !== remarkId),
  });
}

export function updateQuestion(run: TestRun, questionId: string, text: string): TestRun {
  return touchTestRun(run, {
    questions: run.questions.map((question) =>
      question.id === questionId ? { ...question, text: text.trim() } : question,
    ),
  });
}

export function deleteQuestion(run: TestRun, questionId: string): TestRun {
  return touchTestRun(run, {
    questions: run.questions.filter((question) => question.id !== questionId),
  });
}

export function updateBug(
  run: TestRun,
  bugId: string,
  patch: Partial<Omit<Bug, 'id' | 'itemId' | 'createdAt'>>,
): TestRun {
  return touchTestRun(run, {
    bugs: run.bugs.map((bug) => {
      if (bug.id !== bugId) return bug;
      return {
        ...bug,
        title: patch.title !== undefined ? patch.title.trim() : bug.title,
        steps: patch.steps !== undefined ? normalizeBugSteps(patch.steps) : bug.steps,
        actual: patch.actual !== undefined ? patch.actual.trim() : bug.actual,
        expected: patch.expected !== undefined ? patch.expected.trim() : bug.expected,
        comment:
          patch.comment !== undefined
            ? patch.comment.trim() || undefined
            : bug.comment,
        url: patch.url !== undefined ? patch.url.trim() || undefined : bug.url,
      };
    }),
  });
}

export function deleteBug(run: TestRun, bugId: string): TestRun {
  return touchTestRun(run, {
    bugs: run.bugs.filter((bug) => bug.id !== bugId),
  });
}

export function completeTestRun(run: TestRun): TestRun {
  return touchTestRun(run, { status: 'completed' });
}
