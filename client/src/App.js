import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MatchPage from './pages/MatchPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MatchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
