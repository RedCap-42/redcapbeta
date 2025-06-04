'use client';

import GarminCredentialsForm from '@/components/GarminCredentialsForm';

export default function DashboardHome() {
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Bienvenue sur votre tableau de bord</h1>
        <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
          <p className="text-lg text-blue-800">Bienvenue dans votre espace personnel</p>
        </div>
      </div>
      
      {/* Section pour les identifiants Garmin */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Configuration Garmin Connect</h2>
        <p className="text-gray-600 mb-4">Configurez vos identifiants Garmin Connect pour synchroniser vos données d&apos;activité.</p>
        <GarminCredentialsForm />
      </div>
    </>
  );
}

