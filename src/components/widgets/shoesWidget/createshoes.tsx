'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface CreateShoesProps {
  isOpen: boolean;
  onClose: () => void;
  onShoesCreated: () => void;
}

export default function CreateShoes({ isOpen, onClose, onShoesCreated }: CreateShoesProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kilometers, setKilometers] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const supabase = createClientComponentClient();

  // Pour s'assurer que le composant est monté (nécessaire pour les portals)
  useEffect(() => {
    setMounted(true);
  }, []);
  // Gérer la fermeture du modal avec la touche Échap
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Empêcher le scroll de la page quand le modal est ouvert
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Vous devez être connecté pour créer une chaussure');
        return;
      }      const { error: insertError } = await supabase
        .from('shoes')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim(),
          manual_kilometers: parseFloat(kilometers) || 0,
          auto_kilometers: 0 // Toujours 0 au début
        });

      if (insertError) {
        throw insertError;
      }

      // Réinitialiser le formulaire
      setName('');
      setDescription('');
      setKilometers('0');
      
      // Fermer la modal et rafraîchir la liste
      onClose();
      onShoesCreated();
        } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleClose = () => {
    setName('');
    setDescription('');
    setKilometers('0');
    setError('');
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>      {/* Arrière-plan flou qui couvre toute la page */}
      <div 
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-md transition-all duration-300"
        style={{ 
          width: '100vw', 
          height: '100vh', 
          top: 0, 
          left: 0, 
          position: 'fixed' 
        }}
        onClick={handleClose}
      />{/* Contenu du modal centré */}
      <div 
        className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none w-screen h-screen"
      >
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto">
          <form onSubmit={handleSubmit}>
            {/* Header du modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Créer une nouvelle chaussure
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Ajoutez une nouvelle paire à votre collection
                </p>
              </div>
              
              {/* Bouton de fermeture */}
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-50 rounded-full shadow-md transition-all duration-200 hover:scale-105"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Corps du modal */}
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Nom de la chaussure */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom de la chaussure *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Ex: Nike Air Zoom Pegasus 40"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                    placeholder="Décrivez votre chaussure (modèle, couleur, usage, spécificités...)"
                  />
                </div>

                {/* Kilométrage */}
                <div>                  <label htmlFor="kilometers" className="block text-sm font-semibold text-gray-700 mb-2">
                    Kilométrage initial (km)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="kilometers"
                      value={kilometers}
                      onChange={(e) => setKilometers(e.target.value)}
                      min="0"
                      step="0.1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="0.0"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-sm text-gray-500 font-medium">km</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Kilométrage manuel déjà effectué avec cette chaussure. Laissez 0 pour une chaussure neuve.
                  </p>
                </div>
              </div>
            </div>            {/* Footer avec boutons */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="px-6 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Création...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Créer
                    </>
                  )}
                </button>
              </div>
              
              {/* Instructions */}
              <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                <div className="flex items-center justify-center text-xs text-gray-500">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Appuyez sur <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">Échap</kbd> ou cliquez à l&apos;extérieur pour fermer</span>                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  // Utiliser un portal pour rendre le modal au niveau de body
  return createPortal(modalContent, document.body);
}
