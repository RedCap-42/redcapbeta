'use client';

import ShoesGestion from '@/components/widgets/shoesWidget/shoesgestion';

export default function ShoesPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chaussures</h1>
        <p className="text-gray-600 mt-2">
          Gestion de vos chaussures de course
        </p>
      </div>
      
      <ShoesGestion />
    </div>
  );
}
