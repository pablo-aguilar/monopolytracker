import React from 'react';

export interface RailroadDepotControlProps {
  installed: boolean;
  canAfford: boolean;
  onInstall: () => void;
  onRemove: () => void;
}

export default function RailroadDepotControl({ installed, canAfford, onInstall, onRemove }: RailroadDepotControlProps): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {installed ? (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold border border-stone-500 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900/30"
          onClick={onRemove}
        >
          Remove Depot
        </button>
      ) : (
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold border border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-900/30 ${
            canAfford ? '' : 'opacity-60 cursor-not-allowed'
          }`}
          disabled={!canAfford}
          onClick={onInstall}
        >
          Install Depot ($100)
        </button>
      )}
    </div>
  );
}


