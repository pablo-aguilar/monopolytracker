import React from 'react';
import { Link } from 'react-router-dom';

export default function Setup(): JSX.Element {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Monopoly Tracker</h1>
        <p className="text-sm opacity-80">Milestone 1: Setup players (nickname, color, avatar) – placeholder</p>
        <div className="flex gap-3">
          <Link
            to="/play"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Continue to Play
          </Link>
        </div>
      </div>
    </div>
  );
} 