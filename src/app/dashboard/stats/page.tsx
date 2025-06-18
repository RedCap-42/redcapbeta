'use client';

import { useAuth } from '@/context/AuthContext';
import VolumeChart from '@/components/widgets/volumeWidget/VolumeChart';
import TrainingTypeChart from '@/components/widgets/trainingTypeWidget/TrainingTypeChart';

export default function StatsPage() {
  // useAuth est conservé pour une utilisation future potentielle
  const { /* user */ } = useAuth();
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Statistiques</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Widget de volume d'entraînement */}
        <div className="col-span-1 h-fit">
          <VolumeChart />
        </div>

        {/* Widget de type d'entraînements */}
        <div className="col-span-1 h-fit">
          <TrainingTypeChart />
        </div>
      </div>

      {/* Message d'information */}
      <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-md">
        <h3 className="font-semibold text-amber-700 mb-2">À propos des statistiques</h3>
        <p className="text-gray-600">
          Cette section affiche des données agrégées de vos entraînements synchronisés depuis Garmin Connect.
          Pour voir plus de données, assurez-vous d&apos;avoir synchronisé vos activités récentes.
        </p>
      </div>
    </div>
  );
}
