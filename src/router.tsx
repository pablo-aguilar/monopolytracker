import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Setup from './pages/Setup';
import Play from './pages/Play';
import Spectate from './pages/Spectate';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Lobby from './pages/Lobby';
import RequireAuth from '@/components/auth/RequireAuth';

export default function AppRouter(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/setup" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/setup" element={<RequireAuth><Setup /></RequireAuth>} />
      <Route path="/lobby/:inviteCode" element={<RequireAuth><Lobby /></RequireAuth>} />
      <Route path="/play" element={<RequireAuth><Play /></RequireAuth>} />
      <Route path="/g/:shareCode" element={<RequireAuth><Spectate /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/setup" replace />} />
    </Routes>
  );
} 