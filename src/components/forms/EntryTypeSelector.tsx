import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface EntryTypeSelectorProps {
  entryType: string;
  onEntryTypeChange: (type: string) => void;
}

export const EntryTypeSelector = ({ entryType, onEntryTypeChange }: EntryTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold text-foreground">Entry Type</Label>
      <div className="flex flex-col gap-2 p-1 bg-muted/30 rounded-lg">
        <Button
          variant={entryType === 'customer' ? 'default' : 'ghost'}
          size="default"
          className={`h-10 font-medium transition-all duration-200 justify-start ${
            entryType === 'customer'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
          }`}
          onClick={() => onEntryTypeChange('customer')}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              entryType === 'customer' ? 'bg-primary-foreground/80' : 'bg-muted-foreground/60'
            }`} />
            Customer
          </div>
        </Button>
        <Button
          variant={entryType === 'workshop' ? 'default' : 'ghost'}
          size="default"
          className={`h-10 font-medium transition-all duration-200 justify-start ${
            entryType === 'workshop'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
          }`}
          onClick={() => onEntryTypeChange('workshop')}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              entryType === 'workshop' ? 'bg-primary-foreground/80' : 'bg-muted-foreground/60'
            }`} />
            Workshop
          </div>
        </Button>
      </div>
    </div>
  );
};
