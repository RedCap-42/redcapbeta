'use client';

import { useEffect, useState } from 'react';
import type { PrivateAliment } from '@/types/aliment';

interface AlimentDetailModalProps {
  aliment: PrivateAliment | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (alimentId: number) => Promise<void>;
}

export default function AlimentDetailModal({ aliment, isOpen, onClose, onDelete }: AlimentDetailModalProps) {  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!aliment || !onDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete(aliment.id);
      onClose(); // Fermer la modal après suppression
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      // L'erreur sera gérée par le hook useAliments
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Réinitialiser les états quand la modal se ferme
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setIsDeleting(false);
    }
  }, [isOpen]);
  // Gérer l'échappement avec la touche Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !aliment) return null;
  const nutritionData = [
    { label: 'Protéines', value: aliment.proteines_g, unit: 'g', color: 'blue' },
    { label: 'Glucides', value: aliment.glucides_g, unit: 'g', color: 'yellow' },
    { label: 'dont sucres', value: aliment.dont_sucres_g, unit: 'g', color: 'orange' },
    { label: 'Lipides', value: aliment.lipides_g, unit: 'g', color: 'red' },
    { label: 'dont saturés', value: aliment.dont_satures_g, unit: 'g', color: 'pink' },
    { label: 'Fibres', value: aliment.fibres_g, unit: 'g', color: 'green' },
    { label: 'Sel/Sodium', value: aliment.sel_sodium_g, unit: 'g', color: 'gray' },
  ].filter(item => item.value !== null && item.value !== undefined);
  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50/70 text-blue-700 border-blue-200/50',
      yellow: 'bg-yellow-50/70 text-yellow-700 border-yellow-200/50',
      orange: 'bg-orange-50/70 text-orange-700 border-orange-200/50',
      red: 'bg-red-50/70 text-red-700 border-red-200/50',
      pink: 'bg-pink-50/70 text-pink-700 border-pink-200/50',
      green: 'bg-green-50/70 text-green-700 border-green-200/50',
      gray: 'bg-gray-50/70 text-gray-700 border-gray-200/50',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay avec effet de flou subtil comme les graphiques */}
      <div 
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-200/30 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            {/* En-tête épuré */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  aliment.type_aliment === 'fruit' ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                  aliment.type_aliment === 'legume' ? 'bg-gradient-to-br from-green-400 to-emerald-600' :
                  aliment.type_aliment === 'viande' ? 'bg-gradient-to-br from-red-400 to-pink-600' :
                  aliment.type_aliment === 'poisson' ? 'bg-gradient-to-br from-blue-400 to-cyan-600' :
                  aliment.type_aliment === 'cereale' ? 'bg-gradient-to-br from-amber-400 to-yellow-600' :
                  aliment.type_aliment === 'produit_laitier' ? 'bg-gradient-to-br from-blue-300 to-indigo-500' :
                  'bg-gradient-to-br from-gray-400 to-gray-600'
                } shadow-lg`}>
                  <span className="text-white text-xl font-bold">
                    {aliment.nom.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {aliment.nom}
                  </h3>
                  {aliment.type_aliment && (
                    <span className="inline-block px-3 py-1 text-sm bg-gray-100/80 text-gray-700 rounded-full capitalize font-medium">
                      {aliment.type_aliment.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>            {/* Calories - Design épuré */}
            {aliment.calories_kcal && (
              <div className="mb-8 text-center">
                <div className="inline-flex items-baseline gap-2 px-6 py-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
                  <span className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                    {aliment.calories_kcal}
                  </span>
                  <span className="text-sm text-orange-600 font-medium">kcal / 100g</span>
                </div>
              </div>
            )}

            {/* Informations nutritionnelles - Grid moderne */}
            {nutritionData.length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Valeurs nutritionnelles</h4>
                <div className="grid grid-cols-2 gap-3">
                  {nutritionData.map((nutrition, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-2xl border backdrop-blur-sm ${getColorClasses(nutrition.color)}`}
                    >
                      <div className="text-center">
                        <p className="text-lg font-bold mb-1">{nutrition.value}{nutrition.unit}</p>
                        <p className="text-xs font-medium opacity-80">{nutrition.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}            {/* Informations supplémentaires - Style card épuré */}
            <div className="space-y-4">
              {/* Micronutriments */}
              {aliment.micronutriments_principaux && (
                <div className="p-5 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 rounded-2xl border border-purple-100/50 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Micronutriments principaux
                  </h4>
                  <p className="text-sm text-purple-700 leading-relaxed">
                    {aliment.micronutriments_principaux}
                  </p>
                </div>
              )}

              {/* Vitamines */}
              {aliment.vitamines && (
                <div className="p-5 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-2xl border border-indigo-100/50 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Vitamines
                  </h4>
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    {aliment.vitamines}
                  </p>
                </div>
              )}

              {/* Note supplémentaire */}
              {aliment.note_supplementaire && (
                <div className="p-5 bg-gradient-to-r from-gray-50/50 to-slate-50/50 rounded-2xl border border-gray-100/50 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                    Note
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {aliment.note_supplementaire}
                  </p>
                </div>
              )}
            </div>            {/* Boutons d'action */}
            <div className="mt-8 flex justify-center gap-3">
              {/* Bouton de suppression si onDelete est fourni */}
              {onDelete && !showDeleteConfirm && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-100/80 hover:bg-red-200/80 text-red-700 rounded-xl transition-all font-medium backdrop-blur-sm border border-red-200/50 hover:scale-105 flex items-center gap-2"
                  disabled={isDeleting}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </button>
              )}

              {/* Confirmation de suppression */}
              {showDeleteConfirm && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 font-medium">Êtes-vous sûr ?</span>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Suppression...
                      </>
                    ) : (
                      'Confirmer'
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 rounded-xl transition-all font-medium"
                    disabled={isDeleting}
                  >
                    Annuler
                  </button>
                </div>
              )}

              {/* Bouton de fermeture - affiché seulement si pas en mode suppression */}
              {!showDeleteConfirm && (
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 rounded-2xl transition-all font-medium backdrop-blur-sm border border-gray-200/50 hover:scale-105"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
