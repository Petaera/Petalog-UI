import VehicleEntry from '@/components/VehicleEntry';

interface ManagerOwnerEntryProps {
  selectedLocation?: string;
}

export default function ManagerOwnerEntry({ selectedLocation }: ManagerOwnerEntryProps) {
  return (
    <VehicleEntry 
      selectedLocation={selectedLocation} 
      accessType="manager"
      showBackButton={true}
    />
  );
}