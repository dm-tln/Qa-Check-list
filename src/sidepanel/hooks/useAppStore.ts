import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppView, TestRun, TestStatus } from '@/domain/models';
import type { RemovedSubtree } from '@/domain/test-item';
import {
  addChildItem,
  addRootItem,
  indentItem,
  moveItemDown,
  moveItemUp,
  outdentItem,
  removeItem,
  restoreItem,
  updateItem,
  flattenItems,
  collectLeaves,
} from '@/domain/test-item';
import {
  addBug,
  addQuestion,
  addRemark,
  completeTestRun,
  createTestRun,
  deleteBug,
  deleteQuestion,
  deleteRemark,
  updateBug,
  updateQuestion,
  updateRemark,
  withItems,
  type CreateTestRunInput,
} from '@/domain/test-run';
import {
  deleteTestRun as deleteTestRunStorage,
  loadState,
  saveState,
  upsertTestRun,
} from '@/storage/storage';
import {
  buildBackupFilename,
  createBackup,
  parseBackup,
  serializeBackup,
} from '@/export/backup';
import { downloadTextFile } from '@/export/download';
import type { AppPersistedState } from '@/domain/models';

export interface UndoState {
  message: string;
  removed: RemovedSubtree;
  runId: string;
}

export interface AppStore {
  ready: boolean;
  testRuns: TestRun[];
  activeTestRunId: string | undefined;
  currentView: AppView;
  currentItemId: string | null;
  undo: UndoState | null;
  activeRun: TestRun | null;
  setView: (view: AppView) => void;
  selectItem: (itemId: string | null) => void;
  openCreate: () => void;
  createRun: (input: CreateTestRunInput) => Promise<void>;
  openRun: (id: string, view?: AppView) => void;
  goHome: () => void;
  deleteRun: (id: string) => Promise<void>;
  persistRun: (run: TestRun) => Promise<void>;
  addItem: (title: string) => Promise<string | null>;
  addSubItem: (parentId: string, title: string) => Promise<string | null>;
  patchItem: (
    itemId: string,
    patch: Partial<{ title: string; description: string; status: TestStatus; comment: string; url: string }>,
  ) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  undoDelete: () => Promise<void>;
  clearUndo: () => void;
  moveUp: (itemId: string) => Promise<void>;
  moveDown: (itemId: string) => Promise<void>;
  indent: (itemId: string) => Promise<void>;
  outdent: (itemId: string) => Promise<void>;
  createRemark: (itemId: string, text: string) => Promise<void>;
  createQuestion: (itemId: string, text: string) => Promise<void>;
  createBug: (
    itemId: string,
    data: {
      title: string;
      steps: string[];
      actual: string;
      expected: string;
      comment?: string;
      url?: string;
    },
  ) => Promise<void>;
  updateRemark: (remarkId: string, text: string) => Promise<void>;
  updateQuestion: (questionId: string, text: string) => Promise<void>;
  updateBug: (
    bugId: string,
    data: {
      title: string;
      steps: string[];
      actual: string;
      expected: string;
      comment?: string;
      url?: string;
    },
  ) => Promise<void>;
  removeRemark: (remarkId: string) => Promise<void>;
  removeQuestion: (questionId: string) => Promise<void>;
  removeBug: (bugId: string) => Promise<void>;
  finishRun: () => Promise<void>;
  goNextItem: () => void;
  goPrevItem: () => void;
  downloadBackup: () => void;
  restoreBackup: (jsonText: string) => Promise<number>;
}

export function useAppStore(): AppStore {
  const [ready, setReady] = useState(false);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [activeTestRunId, setActiveTestRunId] = useState<string | undefined>();
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void (async () => {
      const state = await loadState();
      setTestRuns(state.testRuns);
      setActiveTestRunId(state.activeTestRunId);
      setReady(true);
    })();
  }, []);

  const activeRun = useMemo(
    () => testRuns.find((r) => r.id === activeTestRunId) ?? null,
    [testRuns, activeTestRunId],
  );

  const saveRun = useCallback(async (run: TestRun) => {
    setTestRuns((prev) => {
      const next = prev.some((r) => r.id === run.id)
        ? prev.map((r) => (r.id === run.id ? run : r))
        : [...prev, run];
      void upsertTestRun({ testRuns: next, activeTestRunId: run.id }, run);
      return next;
    });
    setActiveTestRunId(run.id);
  }, []);

  const updateActive = useCallback(
    async (updater: (run: TestRun) => TestRun) => {
      setTestRuns((prev) => {
        const current = prev.find((r) => r.id === activeTestRunId);
        if (!current) return prev;
        const nextRun = updater(current);
        const next = prev.map((r) => (r.id === nextRun.id ? nextRun : r));
        void upsertTestRun({ testRuns: next, activeTestRunId: nextRun.id }, nextRun);
        return next;
      });
    },
    [activeTestRunId],
  );

  const setView = useCallback((view: AppView) => {
    setCurrentView(view);
  }, []);

  const selectItem = useCallback((itemId: string | null) => {
    setCurrentItemId(itemId);
  }, []);

  const openCreate = useCallback(() => {
    setCurrentView('create');
  }, []);

  const goHome = useCallback(() => {
    setCurrentView('home');
    setCurrentItemId(null);
  }, []);

  const createRun = useCallback(async (input: CreateTestRunInput) => {
    const run = createTestRun(input);
    setTestRuns((prev) => {
      const next = [...prev, run];
      void upsertTestRun({ testRuns: next, activeTestRunId: run.id }, run);
      return next;
    });
    setActiveTestRunId(run.id);
    setCurrentItemId(null);
    setCurrentView('edit');
  }, []);

  const openRun = useCallback((id: string, view: AppView = 'edit') => {
    setActiveTestRunId(id);
    setCurrentView(view);
    setTestRuns((prev) => {
      const run = prev.find((r) => r.id === id);
      if (run) {
        const leaves = collectLeaves(run.items);
        const firstUnchecked =
          leaves.find((l) => l.status === 'not_tested')?.id ?? leaves[0]?.id ?? null;
        setCurrentItemId(firstUnchecked);
        void upsertTestRun({ testRuns: prev, activeTestRunId: id }, run);
      }
      return prev;
    });
  }, []);

  const deleteRun = useCallback(async (id: string) => {
    setTestRuns((prev) => {
      const next = prev.filter((r) => r.id !== id);
      void deleteTestRunStorage({ testRuns: next }, id);
      return next;
    });
    setActiveTestRunId((cur) => (cur === id ? undefined : cur));
    setCurrentView('home');
    setCurrentItemId(null);
  }, []);

  const addItem = useCallback(
    async (title: string) => {
      let newId: string | null = null;
      await updateActive((run) => {
        const { items, item } = addRootItem(run.items, title);
        newId = item.id;
        setCurrentItemId(item.id);
        return withItems(run, items);
      });
      return newId;
    },
    [updateActive],
  );

  const addSubItem = useCallback(
    async (parentId: string, title: string) => {
      let newId: string | null = null;
      await updateActive((run) => {
        const { items, item } = addChildItem(run.items, parentId, title);
        if (item) {
          newId = item.id;
          setCurrentItemId(item.id);
        }
        return withItems(run, items);
      });
      return newId;
    },
    [updateActive],
  );

  const patchItem = useCallback(
    async (
      itemId: string,
      patch: Partial<{ title: string; description: string; status: TestStatus; comment: string; url: string }>,
    ) => {
      await updateActive((run) => withItems(run, updateItem(run.items, itemId, patch)));
    },
    [updateActive],
  );

  const clearUndo = useCallback(() => {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setUndo(null);
  }, []);

  const deleteItem = useCallback(
    async (itemId: string) => {
      await updateActive((run) => {
        const { items, removed } = removeItem(run.items, itemId);
        if (removed) {
          if (undoTimer.current) clearTimeout(undoTimer.current);
          setUndo({
            message: 'Пункт удалён',
            removed,
            runId: run.id,
          });
          undoTimer.current = setTimeout(() => setUndo(null), 5000);
        }
        if (currentItemId === itemId) {
          setCurrentItemId(null);
        }
        return withItems(run, items);
      });
    },
    [updateActive, currentItemId],
  );

  const undoDelete = useCallback(async () => {
    if (!undo) return;
    const snapshot = undo;
    clearUndo();
    await updateActive((run) => {
      if (run.id !== snapshot.runId) return run;
      return withItems(run, restoreItem(run.items, snapshot.removed));
    });
  }, [undo, clearUndo, updateActive]);

  const moveUp = useCallback(
    async (itemId: string) => {
      await updateActive((run) => withItems(run, moveItemUp(run.items, itemId)));
    },
    [updateActive],
  );

  const moveDown = useCallback(
    async (itemId: string) => {
      await updateActive((run) => withItems(run, moveItemDown(run.items, itemId)));
    },
    [updateActive],
  );

  const indent = useCallback(
    async (itemId: string) => {
      await updateActive((run) => withItems(run, indentItem(run.items, itemId)));
    },
    [updateActive],
  );

  const outdent = useCallback(
    async (itemId: string) => {
      await updateActive((run) => withItems(run, outdentItem(run.items, itemId)));
    },
    [updateActive],
  );

  const createRemark = useCallback(
    async (itemId: string, text: string) => {
      await updateActive((run) => {
        let next = addRemark(run, itemId, text);
        next = withItems(next, updateItem(next.items, itemId, { status: 'remark' }));
        return next;
      });
    },
    [updateActive],
  );

  const createQuestion = useCallback(
    async (itemId: string, text: string) => {
      await updateActive((run) => addQuestion(run, itemId, text));
    },
    [updateActive],
  );

  const createBug = useCallback(
    async (
      itemId: string,
      data: {
        title: string;
        steps: string[];
        actual: string;
        expected: string;
        comment?: string;
        url?: string;
      },
    ) => {
      await updateActive((run) => {
        let next = addBug(run, { itemId, ...data });
        next = withItems(next, updateItem(next.items, itemId, { status: 'failed' }));
        return next;
      });
    },
    [updateActive],
  );

  const patchRemark = useCallback(
    async (remarkId: string, text: string) => {
      await updateActive((run) => updateRemark(run, remarkId, text));
    },
    [updateActive],
  );

  const patchQuestion = useCallback(
    async (questionId: string, text: string) => {
      await updateActive((run) => updateQuestion(run, questionId, text));
    },
    [updateActive],
  );

  const patchBug = useCallback(
    async (
      bugId: string,
      data: {
        title: string;
        steps: string[];
        actual: string;
        expected: string;
        comment?: string;
        url?: string;
      },
    ) => {
      await updateActive((run) => updateBug(run, bugId, data));
    },
    [updateActive],
  );

  const removeRemark = useCallback(
    async (remarkId: string) => {
      await updateActive((run) => deleteRemark(run, remarkId));
    },
    [updateActive],
  );

  const removeQuestion = useCallback(
    async (questionId: string) => {
      await updateActive((run) => deleteQuestion(run, questionId));
    },
    [updateActive],
  );

  const removeBug = useCallback(
    async (bugId: string) => {
      await updateActive((run) => deleteBug(run, bugId));
    },
    [updateActive],
  );

  const finishRun = useCallback(async () => {
    await updateActive((run) => completeTestRun(run));
    setCurrentView('export');
  }, [updateActive]);

  const goNextItem = useCallback(() => {
    const flat = activeRun ? flattenItems(activeRun.items) : [];
    if (!currentItemId || flat.length === 0) {
      if (flat[0]) setCurrentItemId(flat[0].item.id);
      return;
    }
    const idx = flat.findIndex((f) => f.item.id === currentItemId);
    if (idx >= 0 && idx < flat.length - 1) {
      setCurrentItemId(flat[idx + 1]!.item.id);
    }
  }, [currentItemId, activeRun]);

  const goPrevItem = useCallback(() => {
    const flat = activeRun ? flattenItems(activeRun.items) : [];
    const idx = flat.findIndex((f) => f.item.id === currentItemId);
    if (idx > 0) {
      setCurrentItemId(flat[idx - 1]!.item.id);
    }
  }, [activeRun, currentItemId]);

  const downloadBackup = useCallback(() => {
    const state: AppPersistedState = {
      testRuns,
      activeTestRunId,
    };
    const backup = createBackup(state);
    downloadTextFile(
      buildBackupFilename(),
      serializeBackup(backup),
      'application/json',
    );
  }, [testRuns, activeTestRunId]);

  const restoreBackup = useCallback(async (jsonText: string) => {
    const state = parseBackup(jsonText);
    await saveState(state);
    setTestRuns(state.testRuns);
    setActiveTestRunId(state.activeTestRunId);
    setCurrentView('home');
    setCurrentItemId(null);
    setUndo(null);
    return state.testRuns.length;
  }, []);

  return {
    ready,
    testRuns,
    activeTestRunId,
    currentView,
    currentItemId,
    undo,
    activeRun,
    setView,
    selectItem,
    openCreate,
    createRun,
    openRun,
    goHome,
    deleteRun,
    persistRun: saveRun,
    addItem,
    addSubItem,
    patchItem,
    deleteItem,
    undoDelete,
    clearUndo,
    moveUp,
    moveDown,
    indent,
    outdent,
    createRemark,
    createQuestion,
    createBug,
    updateRemark: patchRemark,
    updateQuestion: patchQuestion,
    updateBug: patchBug,
    removeRemark,
    removeQuestion,
    removeBug,
    finishRun,
    goNextItem,
    goPrevItem,
    downloadBackup,
    restoreBackup,
  };
}
