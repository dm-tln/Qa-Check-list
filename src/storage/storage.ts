import type { AppPersistedState, TestRun } from '@/domain/models';

const STORAGE_KEY = 'qa_check_list_v1';

const EMPTY_STATE: AppPersistedState = {
  testRuns: [],
};

function isExtensionStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

export async function loadState(): Promise<AppPersistedState> {
  if (!isExtensionStorage()) {
    return EMPTY_STATE;
  }
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] as AppPersistedState | undefined;
  if (!raw || !Array.isArray(raw.testRuns)) {
    return EMPTY_STATE;
  }
  return {
    testRuns: raw.testRuns,
    activeTestRunId: raw.activeTestRunId,
  };
}

export async function saveState(state: AppPersistedState): Promise<void> {
  if (!isExtensionStorage()) {
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export async function upsertTestRun(
  state: AppPersistedState,
  testRun: TestRun,
): Promise<AppPersistedState> {
  const index = state.testRuns.findIndex((r) => r.id === testRun.id);
  const testRuns =
    index >= 0
      ? state.testRuns.map((r, i) => (i === index ? testRun : r))
      : [...state.testRuns, testRun];
  const next: AppPersistedState = {
    ...state,
    testRuns,
    activeTestRunId: testRun.id,
  };
  await saveState(next);
  return next;
}

export async function deleteTestRun(
  state: AppPersistedState,
  id: string,
): Promise<AppPersistedState> {
  const next: AppPersistedState = {
    testRuns: state.testRuns.filter((r) => r.id !== id),
    activeTestRunId:
      state.activeTestRunId === id ? undefined : state.activeTestRunId,
  };
  await saveState(next);
  return next;
}

export function getTestRun(
  state: AppPersistedState,
  id: string,
): TestRun | undefined {
  return state.testRuns.find((r) => r.id === id);
}
