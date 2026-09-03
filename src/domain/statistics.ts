import type { ParentDisplayStatus, ProgressStats, TestItem, TestStatus } from './models';
import { collectLeaves } from './test-item';

const CHECKED: ReadonlySet<TestStatus> = new Set([
  'passed',
  'failed',
  'remark',
  'blocked',
  'skipped',
]);

export function computeProgress(items: TestItem[]): ProgressStats {
  const leaves = collectLeaves(items);
  const stats: ProgressStats = {
    total: leaves.length,
    checked: 0,
    passed: 0,
    failed: 0,
    remark: 0,
    blocked: 0,
    skipped: 0,
    notTested: 0,
  };

  for (const leaf of leaves) {
    switch (leaf.status) {
      case 'passed':
        stats.passed += 1;
        break;
      case 'failed':
        stats.failed += 1;
        break;
      case 'remark':
        stats.remark += 1;
        break;
      case 'blocked':
        stats.blocked += 1;
        break;
      case 'skipped':
        stats.skipped += 1;
        break;
      default:
        stats.notTested += 1;
    }
    if (CHECKED.has(leaf.status)) {
      stats.checked += 1;
    }
  }

  return stats;
}

export function getDisplayStatus(item: TestItem): ParentDisplayStatus {
  if (item.children.length === 0) {
    return item.status;
  }

  const leaves = collectLeaves([item]);
  if (leaves.length === 0) {
    return item.status;
  }

  const allPassed = leaves.every((l) => l.status === 'passed');
  if (allPassed) return 'passed';

  const hasFailed = leaves.some((l) => l.status === 'failed');
  if (hasFailed) return 'has_issues';

  const allNotTested = leaves.every((l) => l.status === 'not_tested');
  if (allNotTested) return 'not_tested';

  const allSkipped = leaves.every((l) => l.status === 'skipped');
  if (allSkipped) return 'skipped';

  const allBlocked = leaves.every((l) => l.status === 'blocked');
  if (allBlocked) return 'blocked';

  const allRemark = leaves.every((l) => l.status === 'remark');
  if (allRemark) return 'remark';

  return 'partial';
}
