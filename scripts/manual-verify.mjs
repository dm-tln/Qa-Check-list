import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensionPath = path.resolve(root, 'dist');
const userDataDir = path.resolve(root, '.tmp-chrome-profile');

function ok(name, pass) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  return pass;
}

async function getExtensionId(context) {
  const existing = context.serviceWorkers()[0];
  if (existing) return new URL(existing.url()).host;

  try {
    const worker = await context.waitForEvent('serviceworker', { timeout: 20000 });
    return new URL(worker.url()).host;
  } catch {
    // continue to fallback
  }

  const page = await context.newPage();
  await page.goto('chrome://extensions');
  await page.waitForTimeout(1500);
  const id = await page.evaluate(() => {
    const manager = document.querySelector('extensions-manager');
    if (!manager?.shadowRoot) return null;
    const list = manager.shadowRoot.querySelector('extensions-item-list');
    const items = list?.shadowRoot?.querySelectorAll('extensions-item') ?? [];
    for (const item of items) {
      const name = item.shadowRoot?.querySelector('#name')?.textContent?.trim() ?? '';
      if (name.includes('QA Check List')) return item.getAttribute('id');
    }
    return items[0]?.getAttribute('id') ?? null;
  });
  await page.close();
  if (!id) throw new Error('Could not resolve extension id');
  return id;
}

async function main() {
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    viewport: { width: 400, height: 820 },
  });

  let failed = 0;
  const extensionId = await getExtensionId(context);
  console.log('EXTENSION_ID', extensionId);
  if (!ok('EXTENSION_LOADED', !!extensionId)) failed += 1;

  const page = await context.newPage();
  await page.setViewportSize({ width: 400, height: 820 });
  await page.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
  await page.waitForSelector('text=QA CHECK LIST', { timeout: 15000 });

  if (!ok('SIDE_PANEL_OPENS', await page.getByText('QA CHECK LIST').first().isVisible())) {
    failed += 1;
  }

  await page.getByRole('button', { name: '+ Новое тестирование' }).click();
  await page.getByPlaceholder('Проверка нового плеера').fill('Проверка нового плеера');
  await page.getByPlaceholder('TE-29654').fill('TE-29654');
  await page.getByPlaceholder('Stage').fill('Stage');
  await page.getByRole('button', { name: 'Создать тестирование' }).click();
  await page.waitForSelector('text=Редактирование');

  if (!ok('TEST_RUN_CREATED', await page.getByText('Проверка нового плеера').first().isVisible())) {
    failed += 1;
  }

  const addExact = () => page.getByRole('button', { name: 'Добавить', exact: true });

  await page.getByRole('button', { name: '+ Добавить пункт' }).click();
  for (const title of ['Открыть плеер', 'Проверить score', 'Проверить домашнее задание']) {
    await page.getByPlaceholder('Проверить авторизацию').fill(title);
    await addExact().click();
    await page.waitForTimeout(200);
  }

  const cancelBtn = page.getByRole('button', { name: 'Отмена' });
  if (await cancelBtn.isVisible().catch(() => false)) {
    await cancelBtn.click();
  }
  await page.waitForTimeout(200);

  await page.locator('.checklist-item', { hasText: 'Проверить score' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Добавить подпункт' }).click();
  await page.getByPlaceholder('У ученика').waitFor({ timeout: 5000 });
  for (const title of ['У ученика', 'У преподавателя']) {
    await page.getByPlaceholder('У ученика').fill(title);
    await addExact().click();
    await page.waitForTimeout(200);
  }

  if (!ok('NESTED_ITEMS', await page.getByText('У преподавателя').first().isVisible())) {
    failed += 1;
  }
  if (!ok('NUMBERING', await page.getByText('2.1.').first().isVisible())) {
    failed += 1;
  }

  await page.getByRole('tab', { name: 'Тестирование' }).click();
  await page.waitForTimeout(300);

  await page.locator('.checklist-item', { hasText: 'Открыть плеер' }).click();
  await page.getByRole('button', { name: '✓ Пройдено' }).click();
  await page.waitForTimeout(150);

  await page.locator('.checklist-item', { hasText: 'У ученика' }).click();
  await page.getByRole('button', { name: '✓ Пройдено' }).click();
  await page.waitForTimeout(150);

  await page.locator('.checklist-item', { hasText: 'У преподавателя' }).click();
  await page.getByRole('button', { name: '✕ Не пройдено' }).click();
  await page.locator('textarea').first().fill('Score не отображается у преподавателя.');
  await page.locator('textarea').first().blur();
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: '🐞 Добавить баг' }).click();
  await page.getByText('Новый баг').waitFor();
  const bugForm = page.locator('form.inline-form').filter({ hasText: 'Новый баг' });
  await bugForm.locator('input').first().fill('Score не отображается у преподавателя');
  await bugForm.locator('.bug-step-row input').nth(0).fill('Открыть плеер под преподавателем');
  await bugForm.getByRole('button', { name: '+ Добавить шаг' }).click();
  await bugForm.locator('.bug-step-row input').nth(1).fill('Перейти к блоку score');
  await bugForm.locator('textarea').nth(0).fill('Score пустой');
  await bugForm.locator('textarea').nth(1).fill('Score виден');
  await bugForm.getByRole('button', { name: 'Добавить баг' }).click();
  await page.waitForTimeout(300);

  await page.locator('.checklist-item', { hasText: 'Проверить домашнее задание' }).click();
  await page.getByRole('button', { name: '✓ Пройдено' }).click();
  await page.waitForTimeout(200);

  if (!ok('PROGRESS_VISIBLE', await page.getByText(/Проверено:/).isVisible())) {
    failed += 1;
  }

  await page.getByRole('button', { name: 'Завершить тестирование' }).click();
  await page.locator('.modal').getByRole('button', { name: 'Завершить' }).click();
  await page.waitForSelector('text=Экспорт');

  if (!ok('EXPORT_SCREEN', await page.getByRole('button', { name: 'Копировать для Excel' }).isVisible())) {
    failed += 1;
  }

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.getByRole('button', { name: 'Копировать для Excel' }).click();
  await page.waitForTimeout(400);
  const excel = await page.evaluate(() => navigator.clipboard.readText());
  if (
    !ok(
      'EXCEL_TSV',
      excel.includes('Номер\tНазвание\tСтатус\tКомментарий') &&
        excel.includes('У преподавателя') &&
        excel.includes('Название\tШаги воспроизведения') &&
        excel.includes('[Пункт чек-листа №'),
    )
  ) {
    failed += 1;
  }

  await page.getByRole('button', { name: 'Копировать для Jira' }).click();
  await page.waitForTimeout(400);
  const jira = await page.evaluate(() => navigator.clipboard.readText());
  if (
    !ok(
      'JIRA_EXPORT',
      jira.includes('РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ') &&
        jira.includes('TE-29654') &&
        jira.includes('НАЙДЕННЫЕ БАГИ') &&
        jira.includes('Название: [Пункт чек-листа №') &&
        jira.includes('Шаги воспроизведения:') &&
        jira.includes('1. Открыть плеер под преподавателем'),
    )
  ) {
    failed += 1;
  }

  await page.getByRole('button', { name: 'Копировать всё' }).click();
  await page.waitForTimeout(400);
  const full = await page.evaluate(() => navigator.clipboard.readText());
  if (!ok('FULL_EXPORT', full.includes('ПОЛНЫЙ ОТЧЁТ') && full.includes('Score не отображается'))) {
    failed += 1;
  }

  await page.reload();
  await page.waitForSelector('text=QA CHECK LIST');
  const homeOrExport =
    (await page.getByText('Мои тестирования').isVisible().catch(() => false)) ||
    (await page.getByText('Результат тестирования').isVisible().catch(() => false));
  if (!ok('RELOAD_UI', homeOrExport)) failed += 1;

  if (await page.getByText('Мои тестирования').isVisible().catch(() => false)) {
    if (!ok('PERSISTED_RUN', await page.getByText('Проверка нового плеера').first().isVisible())) {
      failed += 1;
    }
    await page.getByRole('button', { name: '+ Новое тестирование' }).click();
    await page.getByPlaceholder('Проверка нового плеера').fill('Второе тестирование');
    await page.getByRole('button', { name: 'Создать тестирование' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '←' }).click();
    await page.waitForTimeout(300);
    if (!ok('SECOND_RUN', await page.getByText('Второе тестирование').first().isVisible())) {
      failed += 1;
    }
  }

  await context.close();
  console.log(failed === 0 ? 'ALL_CHECKS_PASSED' : `FAILED_COUNT=${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
