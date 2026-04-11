import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Setup from './pages/Setup';
import Play from './pages/Play';
import Spectate from './pages/Spectate';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Lobby from './pages/Lobby';
import WelcomeProfile from './pages/WelcomeProfile';
import RequireAuth from '@/components/auth/RequireAuth';
import RequireOnboarding from '@/components/auth/RequireOnboarding';

export default function AppRouter(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/setup" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/welcome" element={<RequireAuth><WelcomeProfile /></RequireAuth>} />
      <Route path="/setup" element={<RequireAuth><RequireOnboarding><Setup /></RequireOnboarding></RequireAuth>} />
      <Route path="/lobby/:inviteCode" element={<RequireAuth><RequireOnboarding><Lobby /></RequireOnboarding></RequireAuth>} />
      <Route path="/play" element={<RequireAuth><RequireOnboarding><Play /></RequireOnboarding></RequireAuth>} />
      <Route path="/g/:shareCode" element={<RequireAuth><RequireOnboarding><Spectate /></RequireOnboarding></RequireAuth>} />
      <Route path="*" element={<Navigate to="/setup" replace />} />
    </Routes>
  );
} 