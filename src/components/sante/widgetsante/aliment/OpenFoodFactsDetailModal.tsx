'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';
import type { OpenFoodFactsDetailedProduct } from '@/types/aliment';

interface OpenFoodFactsDetailModalProps {
  product: OpenFoodFactsDetailedProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onProductAdded?: () => void;
}

export default function OpenFoodFactsDetailModal({ product, isOpen, onClose, onProductAdded }: OpenFoodFactsDetailModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  // Fonction pour mapper les données Open Food Facts vers le format de la base de données
  const mapOpenFoodFactsToPrivateAliment = (product: OpenFoodFactsDetailedProduct) => {
    const getNutrientValue = (nutrientKey: string): number | null => {
      // Priorité aux nutriments dans l'objet nutriments
      if (product.nutriments && product.nutriments[nutrientKey as keyof typeof product.nutriments]) {
        const value = product.nutriments[nutrientKey as keyof typeof product.nutriments];
        return typeof value === 'number' ? value : null;
      }
      // Sinon chercher dans les propriétés directes du produit
      const directValue = product[nutrientKey as keyof OpenFoodFactsDetailedProduct] as number;
      return typeof directValue === 'number' ? directValue : null;
    };

    // Fonction spéciale pour le sel/sodium (priorité à salt_100g)
    const getSaltValue = (): number | null => {
      const saltValue = getNutrientValue('salt_100g');
      if (saltValue !== null) return saltValue;
      
      // Si pas de sel, essayer sodium et convertir (sodium * 2.5 ≈ sel)
      const sodiumValue = getNutrientValue('sodium_100g');
      return sodiumValue !== null ? sodiumValue * 2.5 : null;
    };

    return {
      nom: product.product_name || 'Produit Open Food Facts',
      calories_kcal: getNutrientValue('energy-kcal_100g'),
      proteines_g: getNutrientValue('proteins_100g'),
      glucides_g: getNutrientValue('carbohydrates_100g'),
      dont_sucres_g: getNutrientValue('sugars_100g'),
      lipides_g: getNutrientValue('fat_100g'),
      dont_satures_g: getNutrientValue('saturated-fat_100g'),
      fibres_g: getNutrientValue('fiber_100g'),
      sel_sodium_g: getSaltValue(),
      micronutriments_principaux: product.allergens ? `Allergènes: ${product.allergens.replace(/en:/g, '').replace(/,/g, ', ')}` : null,
      type_aliment: product.categories ? 
        product.categories.split(',')[0].trim().toLowerCase().replace(/en:/g, '') : 'autre',
      vitamines: product.traces ? 
        `Traces possibles: ${product.traces.replace(/en:/g, '').replace(/,/g, ', ')}` : null,
      note_supplementaire: [
        'Source: Open Food Facts',
        product.brands ? `Marque: ${product.brands.split(',')[0].trim()}` : null,
        product.nutrition_grades ? `Nutri-Score: ${product.nutrition_grades.toUpperCase()}` : null,
        product.ecoscore_grade ? `Eco-Score: ${product.ecoscore_grade.toUpperCase()}` : null,
        product.ingredients_text ? `Ingrédients: ${product.ingredients_text.slice(0, 200)}${product.ingredients_text.length > 200 ? '...' : ''}` : null
      ].filter(Boolean).join(' | '),
      user_id: user?.id
    };
  };

  // Fonction pour ajouter le produit à la liste privée
  const handleAddToPrivateList = async () => {
    if (!user || !product) {
      return;
    }

    setIsAdding(true);
    setAddSuccess(false);

    try {
      const alimentData = mapOpenFoodFactsToPrivateAliment(product);
      
      const { error } = await supabase
        .from('private_aliment')
        .insert(alimentData);

      if (error) {
        console.error('Erreur lors de l\'ajout:', error);
        alert('Erreur lors de l\'ajout du produit');
      } else {
        setAddSuccess(true);
        if (onProductAdded) {
          onProductAdded();
        }
        // Fermer la modal après 1.5 secondes
        setTimeout(() => {
          onClose();
          setAddSuccess(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Erreur inattendue:', error);
      alert('Erreur inattendue lors de l\'ajout');
    } finally {
      setIsAdding(false);
    }
  };
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

  if (!isOpen || !product) return null;
  // Fonction pour obtenir les valeurs nutritionnelles (priorité aux nutriments puis aux champs directs)
  const getNutrientValue = (nutrientKey: string) => {
    // Priorité aux nutriments dans l'objet nutriments
    if (product.nutriments && product.nutriments[nutrientKey as keyof typeof product.nutriments]) {
      const value = product.nutriments[nutrientKey as keyof typeof product.nutriments];
      return typeof value === 'number' ? value : undefined;
    }
    // Sinon chercher dans les propriétés directes du produit
    const directValue = product[nutrientKey as keyof OpenFoodFactsDetailedProduct] as number;
    return typeof directValue === 'number' ? directValue : undefined;
  };

  // Fonction spéciale pour le sel/sodium
  const getSaltValue = () => {
    const saltValue = getNutrientValue('salt_100g');
    if (saltValue !== undefined) return saltValue;
    
    // Si pas de sel, essayer sodium et convertir
    const sodiumValue = getNutrientValue('sodium_100g');
    return sodiumValue !== undefined ? sodiumValue * 2.5 : undefined;
  };

  const nutritionData = [
    { label: 'Protéines', value: getNutrientValue('proteins_100g'), unit: 'g', color: 'blue' },
    { label: 'Glucides', value: getNutrientValue('carbohydrates_100g'), unit: 'g', color: 'yellow' },
    { label: 'dont sucres', value: getNutrientValue('sugars_100g'), unit: 'g', color: 'orange' },
    { label: 'Lipides', value: getNutrientValue('fat_100g'), unit: 'g', color: 'red' },
    { label: 'dont saturés', value: getNutrientValue('saturated-fat_100g'), unit: 'g', color: 'pink' },
    { label: 'Fibres', value: getNutrientValue('fiber_100g'), unit: 'g', color: 'green' },
    { label: 'Sel', value: getSaltValue(), unit: 'g', color: 'gray' },
  ].filter(item => item.value !== null && item.value !== undefined && item.value > 0);

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
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return 'bg-gray-100 text-gray-600';
    switch (grade.toLowerCase()) {
      case 'a': return 'bg-green-100 text-green-700 border-green-200';
      case 'b': return 'bg-lime-100 text-lime-700 border-lime-200';
      case 'c': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'd': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'e': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const calories = getNutrientValue('energy-kcal_100g');
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-white/30 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-200/30 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            {/* En-tête */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg">                  {product.image_url ? (
                    <Image 
                      src={product.image_url} 
                      alt={product.product_name || 'Produit'}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover rounded-2xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <span className={`text-white text-xl font-bold ${product.image_url ? 'hidden' : ''}`}>
                    {product.product_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {product.product_name || 'Produit inconnu'}
                  </h3>
                  {product.brands && (
                    <span className="inline-block px-3 py-1 text-sm bg-amber-100/80 text-amber-700 rounded-full font-medium">
                      {product.brands.split(',')[0]}
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
            </div>

            {/* Calories */}
            {calories && (
              <div className="mb-8 text-center">
                <div className="inline-flex items-baseline gap-2 px-6 py-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
                  <span className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                    {Math.round(calories)}
                  </span>
                  <span className="text-sm text-orange-600 font-medium">kcal / 100g</span>
                </div>
              </div>
            )}

            {/* Informations nutritionnelles */}
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
                        <p className="text-lg font-bold mb-1">
                          {typeof nutrition.value === 'number' ? nutrition.value.toFixed(1) : nutrition.value}{nutrition.unit}
                        </p>
                        <p className="text-xs font-medium opacity-80">{nutrition.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scores nutritionnels */}
            <div className="mb-8">
              <div className="flex gap-4">
                {product.nutrition_grades && (
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Nutri-Score</h4>
                    <div className={`p-3 rounded-xl border text-center ${getGradeColor(product.nutrition_grades)}`}>
                      <div className="text-2xl font-bold">{product.nutrition_grades.toUpperCase()}</div>
                      <div className="text-xs font-medium opacity-80">Qualité nutritionnelle</div>
                    </div>
                  </div>
                )}
                {product.ecoscore_grade && (
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Eco-Score</h4>
                    <div className={`p-3 rounded-xl border text-center ${getGradeColor(product.ecoscore_grade)}`}>
                      <div className="text-2xl font-bold">{product.ecoscore_grade.toUpperCase()}</div>
                      <div className="text-xs font-medium opacity-80">Impact environnemental</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Informations supplémentaires */}
            <div className="space-y-4">
              {/* Catégories */}
              {product.categories && (
                <div className="p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-100/50 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Catégories
                  </h4>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    {product.categories.split(',').slice(0, 3).join(', ')}
                  </p>
                </div>
              )}

              {/* Ingrédients */}
              {product.ingredients_text && (
                <div className="p-5 bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-2xl border border-green-100/50 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Ingrédients
                  </h4>
                  <p className="text-sm text-green-700 leading-relaxed max-h-20 overflow-y-auto">
                    {product.ingredients_text}
                  </p>
                </div>
              )}

              {/* Allergènes */}
              {product.allergens && (
                <div className="p-5 bg-gradient-to-r from-red-50/50 to-pink-50/50 rounded-2xl border border-red-100/50 backdrop-blur-sm">
                  <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Allergènes
                  </h4>
                  <p className="text-sm text-red-700 leading-relaxed">
                    {product.allergens.replace(/en:/g, '').split(',').join(', ')}
                  </p>
                </div>
              )}
            </div>            {/* Source */}
            <div className="mt-8 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
              <p className="text-xs text-amber-700 text-center">
                Base de données collaborative
              </p>
            </div>            {/* Boutons d'action */}
            <div className="mt-8 flex flex-col gap-3">
              {/* Bouton d'ajout à la liste privée */}
              {user && (
                <button
                  onClick={handleAddToPrivateList}
                  disabled={isAdding || addSuccess}
                  className={`px-6 py-3 rounded-2xl transition-all font-medium backdrop-blur-sm border flex items-center justify-center gap-2 ${
                    addSuccess
                      ? 'bg-green-100/80 text-green-700 border-green-200/50'
                      : isAdding
                      ? 'bg-blue-100/80 text-blue-600 border-blue-200/50 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:scale-105'
                  }`}
                >
                  {isAdding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Ajout en cours...
                    </>
                  ) : addSuccess ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Ajouté avec succès !
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Ajouter à votre liste
                    </>
                  )}
                </button>
              )}
              
              {/* Bouton de fermeture */}
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 rounded-2xl transition-all font-medium backdrop-blur-sm border border-gray-200/50 hover:scale-105"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
