'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';
import type { AlimentType } from '@/types/aliment';

interface AddAlimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlimentAdded: () => void;
  isPrivate: boolean;
}

interface AlimentFormData {
  nom: string;
  calories_kcal: string;
  proteines_g: string;
  glucides_g: string;
  dont_sucres_g: string;
  lipides_g: string;
  dont_satures_g: string;
  fibres_g: string;
  sel_sodium_g: string;
  type_aliment: AlimentType | '';
  vitamines: string;
  note_supplementaire: string;
}

export default function AddAlimentModal({ 
  isOpen, 
  onClose, 
  onAlimentAdded, 
  isPrivate 
}: AddAlimentModalProps) {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  const [formData, setFormData] = useState<AlimentFormData>({
    nom: '',
    calories_kcal: '',
    proteines_g: '',
    glucides_g: '',
    dont_sucres_g: '',
    lipides_g: '',
    dont_satures_g: '',
    fibres_g: '',
    sel_sodium_g: '',
    type_aliment: '',
    vitamines: '',
    note_supplementaire: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alimentTypes: { value: AlimentType; label: string }[] = [
    { value: 'fruit', label: 'Fruit' },
    { value: 'legume', label: 'Légume' },
    { value: 'viande', label: 'Viande' },
    { value: 'poisson', label: 'Poisson' },
    { value: 'cereale', label: 'Céréale' },
    { value: 'legumineuse', label: 'Légumineuse' },
    { value: 'produit_laitier', label: 'Produit laitier' },
    { value: 'matiere_grasse', label: 'Matière grasse' },
    { value: 'boisson', label: 'Boisson' },
    { value: 'autre', label: 'Autre' }
  ];

  const handleInputChange = (field: keyof AlimentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      calories_kcal: '',
      proteines_g: '',
      glucides_g: '',
      dont_sucres_g: '',
      lipides_g: '',
      dont_satures_g: '',
      fibres_g: '',
      sel_sodium_g: '',
      type_aliment: '',
      vitamines: '',
      note_supplementaire: ''
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user && isPrivate) {
      setError('Vous devez être connecté pour ajouter un aliment privé');
      return;
    }

    if (!formData.nom.trim()) {
      setError('Le nom de l\'aliment est requis');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Préparer les données pour l'insertion
      const alimentData = {
        nom: formData.nom.trim(),
        calories_kcal: formData.calories_kcal ? parseFloat(formData.calories_kcal) : null,
        proteines_g: formData.proteines_g ? parseFloat(formData.proteines_g) : null,
        glucides_g: formData.glucides_g ? parseFloat(formData.glucides_g) : null,
        dont_sucres_g: formData.dont_sucres_g ? parseFloat(formData.dont_sucres_g) : null,
        lipides_g: formData.lipides_g ? parseFloat(formData.lipides_g) : null,
        dont_satures_g: formData.dont_satures_g ? parseFloat(formData.dont_satures_g) : null,
        fibres_g: formData.fibres_g ? parseFloat(formData.fibres_g) : null,
        sel_sodium_g: formData.sel_sodium_g ? parseFloat(formData.sel_sodium_g) : null,
        type_aliment: formData.type_aliment || null,
        vitamines: formData.vitamines.trim() || null,
        note_supplementaire: formData.note_supplementaire.trim() || null,
        ...(isPrivate && { user_id: user!.id })
      };

      const tableName = isPrivate ? 'private_aliment' : 'public_aliment';
      
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(alimentData);

      if (insertError) {
        throw insertError;
      }

      // Fermer le modal et actualiser la liste
      resetForm();
      onClose();
      onAlimentAdded();
        } catch (err: unknown) {
      console.error('Erreur lors de l\'ajout de l\'aliment:', err);
      setError((err as Error).message || 'Erreur lors de l\'ajout de l\'aliment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Ajouter un aliment {isPrivate ? 'privé' : 'public'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l&apos;aliment *
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: Pomme"
                required
              />
            </div>

            <div>              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type d&apos;aliment
              </label>
              <select
                value={formData.type_aliment}
                onChange={(e) => handleInputChange('type_aliment', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner un type</option>
                {alimentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calories (kcal/100g)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.calories_kcal}
                onChange={(e) => handleInputChange('calories_kcal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="52"
              />
            </div>
          </div>

          {/* Macronutriments */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Macronutriments (g/100g)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Protéines
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.proteines_g}
                  onChange={(e) => handleInputChange('proteines_g', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.3"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Glucides
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.glucides_g}
                  onChange={(e) => handleInputChange('glucides_g', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="14"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  dont Sucres
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.dont_sucres_g}
                  onChange={(e) => handleInputChange('dont_sucres_g', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Lipides
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.lipides_g}
                  onChange={(e) => handleInputChange('lipides_g', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  dont Saturés
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.dont_satures_g}
                  onChange={(e) => handleInputChange('dont_satures_g', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.1"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fibres
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.fibres_g}
                  onChange={(e) => handleInputChange('fibres_g', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2.4"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sel/Sodium
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.sel_sodium_g}
                  onChange={(e) => handleInputChange('sel_sodium_g', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.001"
                />
              </div>
            </div>
          </div>

          {/* Informations supplémentaires */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vitamines et minéraux
              </label>
              <input
                type="text"
                value={formData.vitamines}
                onChange={(e) => handleInputChange('vitamines', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: Vitamine C, Vitamine K"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note supplémentaire
              </label>
              <textarea
                value={formData.note_supplementaire}
                onChange={(e) => handleInputChange('note_supplementaire', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: Riche en fibres et antioxydants"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.nom.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Ajout...' : 'Ajouter l\'aliment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
