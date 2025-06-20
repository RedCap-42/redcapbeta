'use client';

import { useState } from 'react';
import AlimentWidgetMinimal from '@/components/sante/widgetsante/aliment/AlimentWidgetMinimal';
import UserInfoWidget from '@/components/sante/widgetsante/UserInfoWidget';

export default function SantePage() {
  const [activeTab, setActiveTab] = useState('accueil');

  const tabs = [
    { id: 'accueil', label: 'Accueil', icon: '🏠' },
    { id: 'aliments', label: 'Aliments', icon: '🥗' },
    // Vous pourrez ajouter d'autres onglets ici plus tard
  ];  const renderTabContent = () => {
    switch (activeTab) {
      case 'accueil':
        return <UserInfoWidget />;
      case 'aliments':
        return null; // Le composant AlimentWidgetMinimal est maintenant rendu séparément
      default:
        return <UserInfoWidget />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Santé et suivi de nutrition</h1>
        <p className="text-lg text-gray-600">
          Gérez vos aliments et suivez votre nutrition pour optimiser vos performances
        </p>
      </div>

      {/* Navigation des onglets */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>      {/* Contenu de l'onglet actif */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Contenu conditionnel des autres onglets */}
        {activeTab !== 'aliments' && renderTabContent()}
        
        {/* Composant AlimentWidgetMinimal toujours monté mais visible seulement quand actif */}
        <div className={activeTab === 'aliments' ? 'block' : 'hidden'}>
          <AlimentWidgetMinimal />
        </div>
      </div>
    </div>
  );
}
