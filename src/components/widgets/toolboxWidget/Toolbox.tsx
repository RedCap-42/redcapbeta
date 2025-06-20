'use client';

import { exportActivityToGPX } from './ExportGPX';

type Activity = {
  id: string;
  activity_id: number;
  start_time: string;
  name: string;
  distance: number;
  duration: number;
  sport_type: string;
  elevation_gain?: number | null;
  fit_file_path?: string;
};

type ToolboxProps = {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
};

export default function Toolbox({ activity, isOpen, onClose }: ToolboxProps) {
  if (!isOpen) return null;

  const tools = [
    {
      id: 'export-gpx',
      name: 'Exporter GPX',
      description: 'Exporter l\'activité au format GPX',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const handleToolClick = async (toolId: string) => {
    switch (toolId) {
      case 'export-gpx':
        try {
          await exportActivityToGPX(activity);
        } catch (error) {
          console.error('Erreur lors de l\'export GPX:', error);
        }
        break;
      default:
        console.log(`Outil sélectionné: ${toolId} pour l'activité ${activity.name}`);
    }
  };
  return (
    <>
      {/* Arrière-plan flou qui couvre toute la page */}
      <div 
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-md transition-all duration-300 w-screen h-screen"
        onClick={onClose}
      />
      
      {/* Contenu du modal centré */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none w-screen h-screen">      
      {/* Contenu de la modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto">
        {/* En-tête */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Boîte à outils</h2>            <p className="text-sm text-gray-600 mt-1">
              Outils d&apos;analyse pour &quot;{activity.name}&quot;
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>        {/* Contenu des outils */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left group"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-indigo-600 group-hover:text-indigo-700">
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 group-hover:text-indigo-800">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 group-hover:text-indigo-600">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>        {/* Pied de page */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              1 outil disponible
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
