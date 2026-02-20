import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RULES, type Rule, type RuleSource, type RuleSection } from '@/data/rules';

export interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'mega' | 'home';

const SECTION_ORDER: RuleSection[] = ['Setup', 'Movement', 'Teleports', 'GO & Money', 'Cards', 'Jail', 'Property'];

function normalizeBody(body: Rule['body']): string[] {
  return Array.isArray(body) ? body : [body];
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold border transition-colors ${
        active
          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
          : 'bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  );
}

function RuleRow({ rule }: { rule: Rule }) {
  const lines = normalizeBody(rule.body);
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{rule.title}</div>
        </div>
        {rule.source === 'home' && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 text-[11px] font-semibold">
            Home rule
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
        {lines.length === 1 ? (
          <p className="leading-snug">{lines[0]}</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {lines.map((t, i) => (
              <li key={i} className="leading-snug">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function RulesModal({ open, onClose }: RulesModalProps): JSX.Element | null {
  const [tab, setTab] = React.useState<Tab>('mega');

  React.useEffect(() => {
    if (!open) return;
    setTab('mega');
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const source: RuleSource = tab === 'mega' ? 'mega' : 'home';
  const filtered = RULES.filter((r) => r.source === source);

  const bySection = new Map<RuleSection, Rule[]>();
  for (const r of filtered) bySection.set(r.section, [...(bySection.get(r.section) ?? []), r]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="rules-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            // close when clicking the backdrop (not the panel)
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Rules"
        >
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-neutral-900 p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-sm font-semibold">Rules</div>
              <button type="button" onClick={onClose} className="text-sm opacity-70 hover:opacity-100">
                Close
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="inline-flex items-center gap-2">
                <TabButton active={tab === 'mega'} onClick={() => setTab('mega')}>
                  Mega rules
                </TabButton>
                <TabButton active={tab === 'home'} onClick={() => setTab('home')}>
                  Home rules
                </TabButton>
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Tip: press <span className="font-semibold">Esc</span> to close
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto space-y-4 pr-1">
              {SECTION_ORDER.map((section) => {
                const rules = bySection.get(section) ?? [];
                if (rules.length === 0) return null;
                return (
                  <div key={section} className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{section}</div>
                    <div className="space-y-2">
                      {rules.map((r) => (
                        <RuleRow key={r.id} rule={r} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-sm text-neutral-600 dark:text-neutral-300">No rules found.</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

