'use client';

import { useState, useEffect } from 'react';
import type { OpenFoodFactsProduct, OpenFoodFactsDetailedProduct } from '@/types/aliment';
import OpenFoodFactsDetailModal from './OpenFoodFactsDetailModal';

interface OpenFoodFactsResponse {
  products: OpenFoodFactsProduct[];
  count: number;
}

interface OpenFoodFactsSearchProps {
  onProductAdded?: () => void;
}

export default function OpenFoodFactsSearch(props: OpenFoodFactsSearchProps = {}) {
  const { onProductAdded } = props;
  // Fonction pour vérifier si un produit a un nom valide
  const isValidProduct = (product: OpenFoodFactsProduct): boolean => {
    if (!product.product_name || product.product_name.trim() === '') {
      return false;
    }
    
    const lowerName = product.product_name.toLowerCase().trim();
    const invalidNames = [
      'nom non disponible',
      'product name not available',
      'sans nom',
      'no name',
      'unnamed',
      'untitled',
      'n/a',
      'null',
      'undefined'
    ];
    
    return !invalidNames.some(invalid => lowerName.includes(invalid));
  };

  // Fonction pour récupérer l'état depuis le localStorage
  const getStoredState = () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('openFoodFactsSearch');
      const parsedState = stored ? JSON.parse(stored) : null;
      
      // Filtrer les produits stockés au cas où ils contiendraient des noms invalides
      if (parsedState?.products) {
        parsedState.products = parsedState.products.filter(isValidProduct);
      }
      
      return parsedState;
    } catch {
      return null;
    }
  };

  const storedState = getStoredState();
  
  const [searchTerm, setSearchTerm] = useState(storedState?.searchTerm || '');
  const [products, setProducts] = useState<OpenFoodFactsProduct[]>(storedState?.products || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(storedState?.hasSearched || false);
  const [selectedProduct, setSelectedProduct] = useState<OpenFoodFactsDetailedProduct | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  // Sauvegarder l'état dans le localStorage
  const saveState = (newState: {
    searchTerm: string;
    products: OpenFoodFactsProduct[];
    hasSearched: boolean;
  }) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('openFoodFactsSearch', JSON.stringify(newState));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  // Effet pour sauvegarder l'état quand il change
  useEffect(() => {
    const stateToSave = {
      searchTerm,
      products,
      hasSearched,
    };
    saveState(stateToSave);
  }, [searchTerm, products, hasSearched]);
  const searchProducts = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&country=france&json=1&page_size=10`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }      const data: OpenFoodFactsResponse = await response.json();
      const allProducts = data.products || [];
      
      // Filtrer les produits avec la fonction utilitaire
      const filteredProducts = allProducts.filter(isValidProduct);
      
      setProducts(filteredProducts);
      
      // Sauvegarder immédiatement après la recherche réussie
      const stateToSave = {
        searchTerm,
        products: filteredProducts,
        hasSearched: true,
      };
      saveState(stateToSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts();
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchProducts();
    }
  };

  const fetchProductDetails = async (productId: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${productId}.json`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des détails');
      }

      const data = await response.json();
      if (data.status === 1 && data.product) {
        setSelectedProduct(data.product as OpenFoodFactsDetailedProduct);
      } else {
        throw new Error('Produit non trouvé');
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des détails:', err);
      // Afficher un message d'erreur ou garder la modal fermée
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleProductClick = (product: OpenFoodFactsProduct) => {
    fetchProductDetails(product.id);
  };
  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setProducts([]);
    setHasSearched(false);
    setError(null);
    
    // Vider le localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('openFoodFactsSearch');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-amber-100 bg-gradient-to-br from-amber-50/30 to-white p-6 hover:shadow-xl transition-shadow duration-300">      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          Base de données France
          <span className="px-3 py-1 text-xs rounded-full font-medium shadow-sm bg-amber-100 text-amber-800 border border-amber-200">
            Open Food Facts
          </span>
        </h3>
        
        {(hasSearched || searchTerm) && (
          <button
            onClick={clearSearch}
            className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Effacer la recherche"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Effacer
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>            <input
              type="text"
              placeholder="Rechercher un aliment français (ex: yaourt, banane...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="block w-full pl-10 pr-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchTerm.trim()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Recherche...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Rechercher
              </>
            )}
          </button>
        </div>
      </form>

      {/* Résultats */}
      <div className="max-h-96 overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">
              <strong>Erreur:</strong> {error}
            </p>
          </div>
        )}        {hasSearched && !loading && !error && products.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">🔍</div>
            <p className="text-gray-500 italic">Aucun produit valide trouvé pour &ldquo;{searchTerm}&rdquo;</p>
            <p className="text-xs text-gray-400 mt-1">Essayez avec un terme plus général ou vérifiez l&apos;orthographe</p>
          </div>
        )}{!hasSearched && !loading && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">�🇷</div>
            <p className="text-gray-500 italic">Recherchez des aliments disponibles en France</p>
            <p className="text-xs text-gray-400 mt-1">Produits référencés sur le marché français</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="space-y-3">            {products.slice(0, 10).map((product, index) => (
              <div 
                key={product.id || index}
                onClick={() => handleProductClick(product)}
                className="flex items-center justify-between p-4 border-2 border-amber-100 bg-amber-50/20 hover:bg-amber-50/40 hover:border-amber-200 rounded-xl hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm font-bold">
                      {product.product_name ? product.product_name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-amber-700 transition-colors">
                      {product.product_name || 'Nom non disponible'}
                    </h4>
                    {product.brands && (
                      <span className="text-xs text-gray-500 capitalize">
                        {product.brands.split(',')[0]}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {product['energy-kcal_100g'] ? (
                    <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium border border-orange-200">
                      {Math.round(product['energy-kcal_100g'])} kcal
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                      N/A
                    </div>
                  )}
                  {loadingDetails ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                  ) : (
                    <svg 
                      className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>      {/* Info sur Open Food Facts */}
      <div className="mt-4 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
        <p className="text-xs text-amber-700">
          Produits alimentaires disponibles sur le marché français
        </p>
      </div>      {/* Modal pour afficher les détails d'un produit */}
      <OpenFoodFactsDetailModal
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={handleCloseModal}
        onProductAdded={onProductAdded}
      />
    </div>
  );
}
