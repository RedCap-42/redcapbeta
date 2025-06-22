'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';

interface PersonalData {
  id: string;
  height: number | null;
  weight: number | null;
  gender: 'Homme' | 'Femme' | 'Autre' | null;
  age: number | null;
  created_at: string;
  updated_at: string;
}

interface UserInfoFormData {
  height: string;
  weight: string;
  gender: 'Homme' | 'Femme' | 'Autre' | '';
  age: string;
}

export default function UserInfoWidget() {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  const [personalData, setPersonalData] = useState<PersonalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<UserInfoFormData>({
    height: '',
    weight: '',
    gender: '',
    age: ''
  });
  // Charger les données personnelles
  const fetchPersonalData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('personal_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors du chargement des données');
      } else if (data) {
        setPersonalData(data);
        setFormData({
          height: data.height?.toString() || '',
          weight: data.weight?.toString() || '',
          gender: data.gender || '',
          age: data.age?.toString() || ''
        });
      }
    } catch (err) {
      console.error('Erreur inattendue:', err);
      setError('Erreur inattendue');
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);
  useEffect(() => {
    fetchPersonalData();
  }, [fetchPersonalData]);

  // Gérer les changements de formulaire
  const handleInputChange = (field: keyof UserInfoFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Sauvegarder les données
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const dataToSubmit = {
        user_id: user.id,
        height: formData.height ? parseInt(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        gender: formData.gender || null,
        age: formData.age ? parseInt(formData.age) : null,
      };

      const { error } = personalData
        ? await supabase
            .from('personal_data')
            .update(dataToSubmit)
            .eq('user_id', user.id)
        : await supabase
            .from('personal_data')
            .insert(dataToSubmit);

      if (error) {
        throw error;
      }

      await fetchPersonalData();
      setIsEditing(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde des données');
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 w-80 h-80">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-4/5"></div>
            <div className="h-3 bg-gray-200 rounded w-3/5"></div>
          </div>
        </div>
      </div>
    );
  }  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 w-80 h-80 flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-gray-900">
          Informations générales
        </h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {personalData ? 'Modifier' : 'Ajouter'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-xs">
          {error}
        </div>
      )}      {isEditing ? (
        <div className="flex-1 flex flex-col">
          <form onSubmit={handleSubmit} className="space-y-2 flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Taille (cm)
                </label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="175"
                  min="100"
                  max="250"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Poids (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="70.5"
                  min="30"
                  max="300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sexe
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value as 'Homme' | 'Femme' | 'Autre' | '')}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  <option value="Homme">Homme</option>
                  <option value="Femme">Femme</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Âge
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="30"
                  min="1"
                  max="150"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 mt-auto">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                  // Réinitialiser le formulaire avec les données actuelles
                  if (personalData) {
                    setFormData({
                      height: personalData.height?.toString() || '',
                      weight: personalData.weight?.toString() || '',
                      gender: personalData.gender || '',
                      age: personalData.age?.toString() || ''
                    });
                  }
                }}
                className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>      ) : personalData ? (
        <div className="flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Taille</div>
              <div className="font-semibold text-sm text-gray-800">
                {personalData.height ? `${personalData.height} cm` : '-'}
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Poids</div>
              <div className="font-semibold text-sm text-gray-800">
                {personalData.weight ? `${personalData.weight} kg` : '-'}
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Sexe</div>
              <div className="font-semibold text-sm text-gray-800">
                {personalData.gender || '-'}
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Âge</div>
              <div className="font-semibold text-sm text-gray-800">
                {personalData.age ? `${personalData.age} ans` : '-'}
              </div>
            </div>
          </div>
        </div>) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Aucune donnée personnelle</p>
          <p className="text-xs text-gray-500">Cliquez sur &ldquo;Ajouter&rdquo;</p>
        </div>
      )}
    </div>
  );
}
