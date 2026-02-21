import { useState } from 'react';
import type { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTabId?: string;
}

/**
 * Tabs component - navigation between content sections
 */
export function Tabs({ tabs, defaultTabId }: TabsProps) {
  const [activeTabId, setActiveTabId] = useState(
    defaultTabId || tabs[0]?.id || ''
  );

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div>
      {/* Tab buttons - modern underline style */}
      <div className="flex border-b-2 border-border mb-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`px-xl py-md text-sm font-semibold transition-all duration-200 border-b-3 -mb-0.5 ${
              activeTabId === tab.id
                ? 'text-brand-blue border-brand-blue'
                : 'text-text-muted border-transparent hover:text-brand-blue hover:bg-brand-blue-soft'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab && (
        <div className="transition-opacity duration-300">
          {activeTab.content}
        </div>
      )}
    </div>
  );
}
