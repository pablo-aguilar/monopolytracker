// #index
// - //#imports: SetupForm organism wrapper

import React from 'react';
import SetupForm from '@/components/organisms/SetupForm';
import SettingsGear from '@/components/molecules/SettingsGear';

export default function Setup(): JSX.Element {
  return (
    <div data-qa="setup-page" className="relative min-h-dvh flex items-center justify-center p-6 bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <SettingsGear className="absolute top-4 right-4" />
      <SetupForm />
    </div>
  );
} 