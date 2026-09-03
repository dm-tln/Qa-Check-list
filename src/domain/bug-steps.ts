/** Форматирует шаги с нумерацией 1. 2. 3. … */
export function formatBugSteps(steps: string[]): string {
  return steps
    .map((step) => step.trim())
    .filter(Boolean)
    .map((step, index) => `${index + 1}. ${step}`)
    .join('\n');
}

export function normalizeBugSteps(steps: string[]): string[] {
  return steps.map((step) => step.trim()).filter(Boolean);
}
