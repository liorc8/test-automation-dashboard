import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RecentFailuresPage from './pages/Recentfailurespage';
import AreaHealthPage from './pages/AreaHealthPage';
import CommonFailuresPage from './pages/CommonFailuresPage';
import TestHistoryPage from './pages/TestHistoryPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/failures/:areaName" element={<RecentFailuresPage />} />
        <Route path="/health/:areaName/:bucket" element={<AreaHealthPage />} />
        <Route path="/common-failures" element={<CommonFailuresPage />} />
        <Route path="/area/:areaName/test/:testName/history" element={<TestHistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;