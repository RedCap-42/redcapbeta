'use client';

import { useEffect, useState } from 'react';

interface DisplayModeToggleProps {
  onChange: (showByMonth: boolean) => void;
  initialValue?: boolean;
}

export default function DisplayModeToggle({ onChange, initialValue = false }: DisplayModeToggleProps) {
  const [showByMonth, setShowByMonth] = useState<boolean>(initialValue);

  // Effect pour notifier le parent quand la valeur change
  useEffect(() => {
    onChange(showByMonth);
  }, [showByMonth, onChange]);

  return (
    <div className="inline-flex items-center">
      <span className="text-sm font-medium text-gray-700 mr-2">Afficher par mois</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          value=""
          className="sr-only peer"
          checked={showByMonth}
          onChange={() => setShowByMonth(!showByMonth)}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
}
