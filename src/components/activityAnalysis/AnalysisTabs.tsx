'use client';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface AnalysisTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: 'general',
    label: 'Vue générale',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'analysis',
    label: 'Analyse',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  }
];

export default function AnalysisTabs({ activeTab, onTabChange, children }: AnalysisTabsProps) {
  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar avec les onglets */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            Aperçu
          </h3>
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500 font-medium shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                {tab.icon && (
                  <span className={activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}>
                    {tab.icon}
                  </span>
                )}
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        {/* Section Segments (pour plus tard) */}
        <div className="px-4 py-2">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Segments
          </h3>
          <div className="text-xs text-gray-400 italic">
            Meilleurs efforts
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
