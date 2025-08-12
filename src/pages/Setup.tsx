// #index
// - //#imports: SetupForm organism wrapper

import React from 'react';
import SetupForm from '@/components/organisms/SetupForm';

export default function Setup(): JSX.Element {
  return (
    <div data-qa="setup-page" className="min-h-dvh flex items-center justify-center p-6 bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <SetupForm />
    </div>
  );
} 