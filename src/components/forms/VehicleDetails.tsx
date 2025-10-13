import { Label } from "@/components/ui/label";
import ReactSelect from 'react-select';

interface VehicleDetailsProps {
  selectedVehicleBrand: string;
  selectedModel: string;
  selectedModelId: string;
  availableVehicleBrands: string[];
  availableModels: { name: string; id: string; brand: string; type?: string }[];
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string, modelId: string) => void;
}

export const VehicleDetails = ({
  selectedVehicleBrand,
  selectedModel,
  selectedModelId,
  availableVehicleBrands,
  availableModels,
  onBrandChange,
  onModelChange
}: VehicleDetailsProps) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <Label className="text-base font-semibold">Vehicle Details</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="selectedModel">Vehicle Model</Label>
          <ReactSelect
            isClearable
            isSearchable
            placeholder="Type to search vehicle model..."
            options={availableModels.map(model => ({ value: model.name, label: model.name }))}
            value={selectedModel ? { value: selectedModel, label: selectedModel } : null}
            onChange={(selected) => {
              const modelObj = availableModels.find(m => m.name === selected?.value);
              onModelChange(selected?.value || '', modelObj?.id || '');
            }}
            classNamePrefix="react-select"
            noOptionsMessage={() => "No models found"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="selectedVehicleBrand">Vehicle Brand</Label>
          <ReactSelect
            isClearable
            isSearchable
            placeholder={selectedModel ? "Brand will be auto-selected" : "Type to search vehicle brand..."}
            options={availableVehicleBrands.map(brand => ({ value: brand, label: brand }))}
            value={selectedVehicleBrand ? { value: selectedVehicleBrand, label: selectedVehicleBrand } : null}
            onChange={(selected) => onBrandChange(selected?.value || '')}
            classNamePrefix="react-select"
            noOptionsMessage={() => "No brands found"}
            isDisabled={!!selectedModel}
          />
          {selectedModel && !selectedVehicleBrand && (
            <p className="text-sm text-muted-foreground">
              Brand will be automatically selected based on the chosen model
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
