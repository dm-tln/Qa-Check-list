import { useAppStore } from './hooks/useAppStore';
import { HomeScreen } from './components/HomeScreen';
import { CreateTestRunForm } from './components/CreateTestRunForm';
import { TestRunShell } from './components/TestRunShell';
import { ExportPanel } from './components/ExportPanel';

export function App() {
  const store = useAppStore();

  if (!store.ready) {
    return (
      <div className="screen center">
        <p>Загрузка…</p>
      </div>
    );
  }

  switch (store.currentView) {
    case 'create':
      return <CreateTestRunForm store={store} />;
    case 'edit':
    case 'run':
      return <TestRunShell store={store} />;
    case 'export':
      return <ExportPanel store={store} />;
    case 'home':
    default:
      return <HomeScreen store={store} />;
  }
}
