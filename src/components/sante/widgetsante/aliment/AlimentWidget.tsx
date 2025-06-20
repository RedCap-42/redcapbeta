'use client';

import { useAliments } from '@/hooks/useAliments';
import AlimentList from './AlimentList';

export default function AlimentWidget() {
  const { privateAliments, loading, error, refetch } = useAliments();

  const handleAlimentAdded = () => {
    // Actualiser la liste des aliments après ajout
    refetch();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Aliments</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Chargement des aliments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Aliments</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">
            <strong>Erreur:</strong> {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Gestion des Aliments</h2>      <div className="grid grid-cols-1 gap-6">
        <AlimentList
          title="Mes Aliments"
          aliments={privateAliments}
          isPrivate={true}
          onAlimentAdded={handleAlimentAdded}
        />
      </div>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Information</h3>
        <p className="text-sm text-blue-700">
          • <strong>Aliments privés:</strong> Visibles uniquement par vous, vous pouvez les créer et les modifier.
        </p>
      </div>
    </div>
  );
}
