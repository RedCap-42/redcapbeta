'use client';

import { useState } from 'react';
import type { PrivateAliment } from '@/types/aliment';
import AddAlimentModal from './AddAlimentModal';
import AlimentDetailModal from './AlimentDetailModal';

interface AlimentListMinimalProps {
  title: string;
  aliments: PrivateAliment[];
  onAlimentAdded: () => void;
  onAlimentDeleted?: (alimentId: number) => Promise<void>;
}

export default function AlimentListMinimal({ title, aliments, onAlimentAdded, onAlimentDeleted }: AlimentListMinimalProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAliment, setSelectedAliment] = useState<PrivateAliment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrer les aliments selon le terme de recherche
  const filteredAliments = aliments.filter(aliment =>
    aliment.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (aliment.type_aliment && aliment.type_aliment.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleAlimentAdded = () => {
    onAlimentAdded();
  };
  const handleAlimentClick = (aliment: PrivateAliment) => {
    setSelectedAliment(aliment);
  };

  const handleCloseDetailModal = () => {
    setSelectedAliment(null);
  };  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border-2 p-6 hover:shadow-xl transition-shadow duration-300 border-blue-100 bg-gradient-to-br from-blue-50/30 to-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            {title}
            <span className="px-3 py-1 text-xs rounded-full font-medium shadow-sm bg-blue-100 text-blue-800 border border-blue-200">
              Privé
            </span>
          </h3>
          
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            title="Ajouter un aliment privé"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter
          </button>
        </div>{/* Barre de recherche */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>            <input
              type="text"
              placeholder={`Rechercher dans ${title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors border-blue-200 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Compteur de résultats */}
          {searchTerm && (
            <div className="mt-2 text-xs text-gray-500">
              {filteredAliments.length} résultat{filteredAliments.length > 1 ? 's' : ''} trouvé{filteredAliments.length > 1 ? 's' : ''}
              {aliments.length > 0 && ` sur ${aliments.length} aliment${aliments.length > 1 ? 's' : ''}`}
            </div>
          )}
        </div>
      
        {filteredAliments.length === 0 ? (
          <div className="text-center py-8">
            {searchTerm ? (
              <>
                <div className="text-gray-400 text-4xl mb-2">🔍</div>
                <p className="text-gray-500 italic">Aucun aliment trouvé pour &ldquo;{searchTerm}&rdquo;</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Effacer la recherche
                </button>
              </>
            ) : (
              <>
                <div className="text-gray-400 text-4xl mb-2">🍽️</div>
                <p className="text-gray-500 italic">Aucun aliment dans cette liste</p>
              </>
            )}
          </div>
        ) : (          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredAliments.map((aliment) => (
              <div 
                key={aliment.id} 
                onClick={() => handleAlimentClick(aliment)}
                className="flex items-center justify-between p-4 border-2 rounded-xl hover:shadow-md transition-all cursor-pointer group border-blue-100 bg-blue-50/20 hover:bg-blue-50/40 hover:border-blue-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-400 to-blue-600">
                    <span className="text-white text-sm font-bold">
                      {aliment.nom.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium transition-colors text-gray-900 group-hover:text-blue-700">
                      {aliment.nom}
                    </h4>
                    {aliment.type_aliment && (
                      <span className="text-xs text-gray-500 capitalize">
                        {aliment.type_aliment}
                      </span>
                    )}
                  </div>
                </div>
                  <div className="flex items-center gap-3">
                  {aliment.calories_kcal && (
                    <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium border border-orange-200">
                      {aliment.calories_kcal} kcal
                    </div>
                  )}
                  <svg 
                    className="w-5 h-5 transition-colors text-gray-400 group-hover:text-blue-500"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>      {/* Modal pour ajouter un aliment */}
      <AddAlimentModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onAlimentAdded={handleAlimentAdded}
        isPrivate={true}
      />      {/* Modal pour afficher les détails d'un aliment */}
      <AlimentDetailModal
        aliment={selectedAliment}
        isOpen={selectedAliment !== null}
        onClose={handleCloseDetailModal}
        onDelete={onAlimentDeleted}
      />
    </>
  );
}
