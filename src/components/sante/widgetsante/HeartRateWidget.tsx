import HealthWidget from './HealthWidget';

export default function HeartRateWidget() {
  return (
    <HealthWidget title="Fréquence Cardiaque">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Fréquence au repos</span>
          <span className="text-lg font-semibold text-blue-600">65 bpm</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Fréquence max</span>
          <span className="text-lg font-semibold text-red-600">185 bpm</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Zone cible</span>
          <span className="text-lg font-semibold text-green-600">130-155 bpm</span>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            Votre fréquence cardiaque au repos est excellente !
          </p>
        </div>
      </div>
    </HealthWidget>
  );
}
