import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RecentFailuresPage from './pages/Recentfailurespage';
import AreaHealthPage from './pages/AreaHealthPage';
import CommonFailuresPage from './pages/CommonFailuresPage';
import TestHistoryPage from './pages/TestHistoryPage';
import AlmaOopsPage from './pages/AlmaOopsPage';
import BackToTopButton from './components/BackToTopButton';
import ThemeModeProvider from './components/ThemeModeProvider';

function App() {
  return (
    <ThemeModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/failures/:areaName" element={<RecentFailuresPage />} />
          <Route path="/health/:areaName/:bucket" element={<AreaHealthPage />} />
          <Route path="/common-failures" element={<CommonFailuresPage />} />
        <Route path="/alma-oops" element={<AlmaOopsPage />} />
          <Route path="/area/:areaName/test/:testName/history" element={<TestHistoryPage />} />
        </Routes>
        <BackToTopButton />
      </BrowserRouter>
    </ThemeModeProvider>
  );
}

export default App;