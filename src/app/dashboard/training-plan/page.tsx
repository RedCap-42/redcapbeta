import TrainingCalendar from '@/components/calendar/TrainingCalendar';

export default function TrainingPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Training Plan</h1>
        <p className="mt-2 text-gray-600">
          Programmes d&apos;entraînement personnalisés
        </p>
      </div>
      
      <TrainingCalendar />
    </div>
  );
}
