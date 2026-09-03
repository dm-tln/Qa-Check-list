import { defineManifest } from '@crxjs/vite-plugin';
import packageJson from './package.json' with { type: 'json' };

const { version } = packageJson;

export default defineManifest({
  manifest_version: 3,
  name: 'QA Check List',
  description:
    'Локальный чек-лист для QA в Chrome Side Panel. Создание пунктов, прохождение тестирования и экспорт в Excel/Jira.',
  version,
  icons: {
    '16': 'public/icons/icon-16.png',
    '32': 'public/icons/icon-32.png',
    '48': 'public/icons/icon-48.png',
    '128': 'public/icons/icon-128.png',
  },
  action: {
    default_title: 'QA Check List',
    default_icon: {
      '16': 'public/icons/icon-16.png',
      '32': 'public/icons/icon-32.png',
      '48': 'public/icons/icon-48.png',
    },
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  permissions: ['sidePanel', 'storage', 'tabs'],
  offline_enabled: true,
});
