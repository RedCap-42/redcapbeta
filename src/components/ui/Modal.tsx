import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  // Gérer la fermeture avec Échap
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
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

  // Définir les classes selon la taille
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-4xl';
      case 'xl':
        return 'max-w-6xl';
      case 'full':
        return 'max-w-[95vw]';
      default:
        return 'max-w-lg';
    }
  };
  if (!isOpen) return null;

  return (
    <>      {/* Arrière-plan flou qui couvre toute la page */}
      <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-md transition-all duration-300 w-screen h-screen">
        <div 
          className="absolute inset-0"
          onClick={onClose}
        />
      </div>      {/* Contenu du modal centré */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 w-screen h-screen">
        <div className={`relative bg-white rounded-2xl shadow-2xl ${getSizeClasses()} w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-100 rounded-full shadow-md transition-all duration-200 hover:scale-105"
              title="Fermer"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
