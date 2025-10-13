import VehicleEntry from '@/components/VehicleEntry';

interface OwnerEntryProps {
  selectedLocation?: string;
}

export default function OwnerEntry({ selectedLocation }: OwnerEntryProps) {
  return (
    <VehicleEntry 
      selectedLocation={selectedLocation} 
      accessType="owner"
    />
  );
}