import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RecentFailuresPage from './pages/Recentfailurespage';
import AreaHealthPage from './pages/AreaHealthPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/failures/:areaName" element={<RecentFailuresPage />} />
        <Route path="/health/:areaName/:bucket" element={<AreaHealthPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;