interface HealthWidgetProps {
  title: string;
  children: React.ReactNode;
}

export default function HealthWidget({ title, children }: HealthWidgetProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      <div className="text-gray-600">
        {children}
      </div>
    </div>
  );
}
