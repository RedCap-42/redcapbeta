'use client';

import { useState } from 'react';
import type { PrivateAliment, PublicAliment } from '@/types/aliment';
import AddAlimentModal from './AddAlimentModal';

interface AlimentListProps {
  title: string;
  aliments: (PrivateAliment | PublicAliment)[];
  isPrivate: boolean;
  onAlimentAdded: () => void;
}

export default function AlimentList({ title, aliments, isPrivate, onAlimentAdded }: AlimentListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAlimentAdded = () => {
    onAlimentAdded();
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            {title}
            <span className={`px-2 py-1 text-xs rounded-full ${
              isPrivate ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              {isPrivate ? 'Privé' : 'Public'}
            </span>
          </h3>
          
          <button
            onClick={handleOpenModal}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isPrivate 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            title={`Ajouter un aliment ${isPrivate ? 'privé' : 'public'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter
          </button>
        </div>
      
      {aliments.length === 0 ? (
        <p className="text-gray-500 italic">Aucun aliment dans cette liste</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {aliments.map((aliment) => (
            <div key={aliment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{aliment.nom}</h4>
                  {aliment.type_aliment && (
                    <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {aliment.type_aliment}
                    </span>
                  )}
                </div>
                {aliment.calories_kcal && (
                  <div className="text-right">
                    <span className="text-sm font-medium text-orange-600">
                      {aliment.calories_kcal} kcal
                    </span>
                    <p className="text-xs text-gray-500">pour 100g</p>
                  </div>
                )}
              </div>
              
              {/* Informations nutritionnelles principales */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {aliment.proteines_g && (
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <p className="font-medium text-blue-700">{aliment.proteines_g}g</p>
                    <p className="text-blue-600">Protéines</p>
                  </div>
                )}
                {aliment.glucides_g && (
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <p className="font-medium text-yellow-700">{aliment.glucides_g}g</p>
                    <p className="text-yellow-600">Glucides</p>
                  </div>
                )}
                {aliment.lipides_g && (
                  <div className="text-center p-2 bg-red-50 rounded">
                    <p className="font-medium text-red-700">{aliment.lipides_g}g</p>
                    <p className="text-red-600">Lipides</p>
                  </div>
                )}
                {aliment.fibres_g && (
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="font-medium text-green-700">{aliment.fibres_g}g</p>
                    <p className="text-green-600">Fibres</p>
                  </div>
                )}
              </div>

              {aliment.note_supplementaire && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  <strong>Note:</strong> {aliment.note_supplementaire}
                </div>              )}
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Modal pour ajouter un aliment */}
      <AddAlimentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAlimentAdded={handleAlimentAdded}
        isPrivate={isPrivate}
      />
    </>
  );
}
