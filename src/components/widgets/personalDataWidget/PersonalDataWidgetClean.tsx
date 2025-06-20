'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';

interface PersonalData {
  id?: string;
  user_id: string;
  height?: number;
  weight?: number;
  gender?: 'Homme' | 'Femme' | 'Autre';
  age?: number;
  created_at?: string;
  updated_at?: string;
}

export default function PersonalDataWidget() {
  const { user } = useAuth();
  const [personalData, setPersonalData] = useState<PersonalData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    gender: '',
    age: ''
  });

  const fetchPersonalData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('personal_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching personal data:', error);
        return;
      }

      if (data) {
        setPersonalData(data);
        setFormData({
          height: data.height?.toString() || '',
          weight: data.weight?.toString() || '',
          gender: data.gender || '',
          age: data.age?.toString() || ''
        });
      } else {
        // No data found, prepare for first entry
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPersonalData();
  }, [fetchPersonalData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      
      const dataToSave = {
        user_id: user.id,
        height: formData.height ? parseInt(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        gender: formData.gender || null,
        age: formData.age ? parseInt(formData.age) : null
      };

      let result;
      if (personalData) {
        // Update existing record
        result = await supabase
          .from('personal_data')
          .update(dataToSave)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Insert new record
        result = await supabase
          .from('personal_data')
          .insert(dataToSave)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving personal data:', result.error);
        return;
      }

      setPersonalData(result.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (personalData) {
      setFormData({
        height: personalData.height?.toString() || '',
        weight: personalData.weight?.toString() || '',
        gender: personalData.gender || '',
        age: personalData.age?.toString() || ''
      });
    }
    setIsEditing(false);
  };

  const calculateBMI = () => {
    if (personalData?.height && personalData?.weight) {
      const heightInM = personalData.height / 100;
      const bmi = personalData.weight / (heightInM * heightInM);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Insuffisance pondérale', color: 'text-blue-600' };
    if (bmi < 25) return { text: 'Poids normal', color: 'text-green-600' };
    if (bmi < 30) return { text: 'Surpoids', color: 'text-orange-600' };
    return { text: 'Obésité', color: 'text-red-600' };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-300 rounded"></div>
            <div className="h-3 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Données physiques</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
          >
            {personalData ? 'Modifier' : 'Ajouter'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taille (cm)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="175"
                min="100"
                max="250"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poids (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="70.5"
                min="30"
                max="300"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sexe
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Âge
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="25"
                min="1"
                max="120"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {personalData ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Taille:</span>
                  <span className="ml-2 font-medium">
                    {personalData.height ? `${personalData.height} cm` : 'Non renseigné'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Poids:</span>
                  <span className="ml-2 font-medium">
                    {personalData.weight ? `${personalData.weight} kg` : 'Non renseigné'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Sexe:</span>
                  <span className="ml-2 font-medium">
                    {personalData.gender || 'Non renseigné'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Âge:</span>
                  <span className="ml-2 font-medium">
                    {personalData.age ? `${personalData.age} ans` : 'Non renseigné'}
                  </span>
                </div>
              </div>
              
              {/* BMI Calculation */}
              {personalData.height && personalData.weight && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm">
                    <span className="text-gray-600">IMC:</span>
                    <span className="ml-2 font-medium text-lg">
                      {calculateBMI()}
                    </span>
                    {(() => {
                      const bmi = parseFloat(calculateBMI() || '0');
                      const category = getBMICategory(bmi);
                      return (
                        <span className={`ml-2 text-sm ${category.color}`}>
                          ({category.text})
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Aucune donnée physique renseignée</p>
              <p className="text-sm mt-2">Cliquez sur &ldquo;Ajouter&rdquo; pour commencer</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
