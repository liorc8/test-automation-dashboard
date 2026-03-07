import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RecentFailuresPage from './pages/Recentfailurespage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/failures/:areaName" element={<RecentFailuresPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;