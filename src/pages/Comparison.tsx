import { useState } from "react";
import { FileText } from "lucide-react";
import { useComparisonData, LogType } from '@/hooks/useComparisonData';
import ComparisonFilters from '@/components/dashboard/ComparisonFilters';
import ComparisonTable from '@/components/dashboard/ComparisonTable';

interface ComparisonProps {
  selectedLocation?: string;
}

const getDefaultDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Comparison({ selectedLocation }: ComparisonProps) {
  const [selectedDate, setSelectedDate] = useState(getDefaultDate);
  const [selectedLogType, setSelectedLogType] = useState<LogType>("all");

  const { loading, data } = useComparisonData({
    selectedLocation,
    selectedDate,
    selectedLogType,
  });

  const clearFilters = () => {
    setSelectedDate("");
    setSelectedLogType("all");
  };

  return (
    <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-2 lg:gap-4">
        <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
        <h1 className="text-xl lg:text-2xl font-bold">Comparison</h1>
      </div>

      <ComparisonFilters
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedLogType={selectedLogType}
        setSelectedLogType={setSelectedLogType}
        clearFilters={clearFilters}
      />

      <ComparisonTable
        loading={loading}
        data={data}
        selectedDate={selectedDate}
        selectedLogType={selectedLogType}
      />
    </div>
  );
}
