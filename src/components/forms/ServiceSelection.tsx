import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactSelect from 'react-select';
import { sortServicesWithPriority, sortVehicleTypesWithPriority } from '@/constants/vehicleConfig';
import { doesTypeMatchWheelCategory } from '@/utils/vehicleUtils';

interface ServiceSelectionProps {
  entryType: string;
  vehicleType: string;
  service: string[];
  wheelCategory: string;
  vehicleTypes: string[];
  priceMatrix: any[];
  onVehicleTypeChange: (type: string) => void;
  onServiceChange: (services: string[]) => void;
}

export const ServiceSelection = ({
  entryType,
  vehicleType,
  service,
  wheelCategory,
  vehicleTypes,
  priceMatrix,
  onVehicleTypeChange,
  onServiceChange
}: ServiceSelectionProps) => {
  // Show service selection for both customer and workshop entry types
  if (entryType !== 'customer' && entryType !== 'workshop') return null;

  const getFilteredServices = () => {
    if (!vehicleType) return [];
    
    let filteredServices = priceMatrix
      .filter(row => row.VEHICLE && row.VEHICLE.trim() === vehicleType.trim())
      .filter(row => {
        if (!wheelCategory) return true;
        if (!(row as any).type) return true;
        return doesTypeMatchWheelCategory((row as any).type, wheelCategory);
      })
      .map(row => row.SERVICE)
      .filter((v, i, arr) => v && arr.indexOf(v) === i);

    // Always include FULL WASH
    if (!filteredServices.includes("FULL WASH")) {
      filteredServices = ["FULL WASH", ...filteredServices];
    }

    return sortServicesWithPriority(filteredServices);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <Label className="text-base font-semibold">Service Selection</Label>

      {/* Vehicle Type */}
      <div className="space-y-2">
        <Label htmlFor="vehicleType">Vehicle Type</Label>
        <Select
          value={vehicleType}
          onValueChange={(val) => {
            onVehicleTypeChange(val);
            onServiceChange(["FULL WASH"]);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select vehicle type" />
          </SelectTrigger>
          <SelectContent>
            {sortVehicleTypesWithPriority(vehicleTypes).map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Service Chosen */}
      <div className="space-y-2">
        <Label htmlFor="service">Service Chosen</Label>
        <ReactSelect
          isMulti
          options={getFilteredServices().map(option => ({ value: option, label: option }))}
          value={service.map(option => ({ value: option, label: option }))}
          onChange={(selected) =>
            onServiceChange(Array.isArray(selected) ? selected.map((s: any) => s.value) : [])
          }
          placeholder={vehicleType ? "Select services" : (wheelCategory ? "Select vehicle type first" : "Select category first")}
          classNamePrefix="react-select"
          isDisabled={!wheelCategory || !vehicleType}
        />
      </div>
    </div>
  );
};
