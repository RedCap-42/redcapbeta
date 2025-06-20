'use client';

import { useAliments } from '@/hooks/useAliments';

export default function AlimentDebugInfo() {
  const { privateAliments, loading, error } = useAliments();

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-yellow-800 mb-3">🔍 Debug Info - Aliments</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-yellow-700 mb-2">État du chargement:</h4>
          <ul className="space-y-1">
            <li>Loading: <span className="font-mono">{loading ? '✅ Oui' : '❌ Non'}</span></li>
            <li>Error: <span className="font-mono">{error || '❌ Aucune'}</span></li>
          </ul>
        </div>
          <div>
          <h4 className="font-medium text-yellow-700 mb-2">Données récupérées:</h4>
          <ul className="space-y-1">
            <li>Aliments privés: <span className="font-mono font-bold">{privateAliments.length}</span></li>
          </ul>
        </div>
      </div>

      {/* Affichage détaillé des aliments */}
      <div className="mt-4 space-y-3">
        <div>
          <h4 className="font-medium text-yellow-700 mb-2">📋 Aliments privés (détail):</h4>
          <div className="bg-white rounded p-2 max-h-32 overflow-y-auto">
            {privateAliments.length === 0 ? (
              <p className="text-gray-500 italic">Aucun aliment privé</p>
            ) : (
              <ul className="text-xs space-y-1">
                {privateAliments.map((aliment, index) => (
                  <li key={aliment.id} className="flex justify-between">
                    <span>{index + 1}. {aliment.nom}</span>
                    <span className="text-gray-500">ID: {aliment.id}</span>
                  </li>
                ))}
              </ul>
            )}          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded">
        <p className="text-xs text-blue-700">
          💡 <strong>Instructions:</strong> Ouvrez la console du navigateur (F12) pour voir les logs détaillés du chargement des aliments.
        </p>
      </div>
    </div>
  );
}
