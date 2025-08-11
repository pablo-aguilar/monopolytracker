import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Setup from './pages/Setup';
import Play from './pages/Play';
import Spectate from './pages/Spectate';

export default function AppRouter(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/setup" replace />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/play" element={<Play />} />
      <Route path="/g/:shareCode" element={<Spectate />} />
      <Route path="*" element={<Navigate to="/setup" replace />} />
    </Routes>
  );
} 