// #index
// - //#imports: SetupForm organism wrapper

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { IoBookOutline } from 'react-icons/io5';
import SetupForm from '@/components/organisms/SetupForm';
import AccountMenu from '@/components/molecules/AccountMenu';
import RulesModal from '@/components/molecules/RulesModal';

export default function Setup(): JSX.Element {
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <div data-qa="setup-page" className="relative min-h-dvh flex items-center justify-center p-6 bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Link
          to="/leaderboard"
          className="inline-flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Leaderboard
        </Link>
        <Link
          to="/admin"
          className="inline-flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Admin
        </Link>
        <button
          type="button"
          data-qa="btn-rules"
          aria-label="Rules"
          onClick={() => setRulesOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 px-2 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 sm:px-3"
        >
          <IoBookOutline className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" aria-hidden />
        </button>
        <AccountMenu />
      </div>
      <SetupForm />
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
