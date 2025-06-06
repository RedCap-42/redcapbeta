'use client';

import { useEffect, useState } from 'react';

type ElevationToggleProps = {
  onChange: (showElevation: boolean) => void;
  initialValue?: boolean;
};

export default function ElevationToggle({ onChange, initialValue = false }: ElevationToggleProps) {
  const [showElevation, setShowElevation] = useState(initialValue);

  useEffect(() => {
    // Appeler onChange lorsque la valeur change
    onChange(showElevation);
  }, [showElevation, onChange]);

  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id="elevation-toggle"
        checked={showElevation}
        onChange={(e) => setShowElevation(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
      />
      <label htmlFor="elevation-toggle" className="text-sm text-gray-600 cursor-pointer">
        Afficher D+
      </label>
    </div>
  );
}
