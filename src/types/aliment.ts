export interface AlimentBase {
  id: number;
  nom: string;
  calories_kcal?: number | null;
  proteines_g?: number | null;
  glucides_g?: number | null;
  dont_sucres_g?: number | null;
  lipides_g?: number | null;
  dont_satures_g?: number | null;
  fibres_g?: number | null;
  sel_sodium_g?: number | null;
  micronutriments_principaux?: string | null;
  type_aliment?: string | null;
  vitamines?: string | null;
  note_supplementaire?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrivateAliment extends AlimentBase {
  user_id: string;
}

export type PublicAliment = AlimentBase;

export type AlimentType = 'fruit' | 'legume' | 'viande' | 'poisson' | 'cereale' | 'legumineuse' | 'produit_laitier' | 'matiere_grasse' | 'boisson' | 'autre';

// Types pour Open Food Facts
export interface OpenFoodFactsProduct {
  id: string;
  product_name: string;
  'energy-kcal_100g'?: number;
  image_url?: string;
  brands?: string;
  categories?: string;
}

export interface OpenFoodFactsDetailedProduct {
  id: string;
  product_name: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  'energy-kcal_100g'?: number;
  'proteins_100g'?: number;
  'carbohydrates_100g'?: number;
  'sugars_100g'?: number;
  'fat_100g'?: number;
  'saturated-fat_100g'?: number;
  'fiber_100g'?: number;
  'salt_100g'?: number;
  'sodium_100g'?: number;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'carbohydrates_100g'?: number;
    'sugars_100g'?: number;
    'fat_100g'?: number;
    'saturated-fat_100g'?: number;
    'fiber_100g'?: number;
    'salt_100g'?: number;
    'sodium_100g'?: number;
  };
  ingredients_text?: string;
  allergens?: string;
  traces?: string;
  nutrition_grades?: string;
  ecoscore_grade?: string;
}
