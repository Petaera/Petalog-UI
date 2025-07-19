import { Clock, Car, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AutomaticEntry {
  id: string;
  vehicleNumber: string;
  entryTime: string;
  vehicleType: string;
  imageUrl?: string;
}

interface ManualEntry {
  id: string;
  vehicleNumber: string;
  entryTime: string;
  service: string;
  amount: number;
  entryType: "Normal" | "Workshop";
}

interface RecentEntriesCardProps {
  title: string;
  type: "automatic" | "manual";
  entries: AutomaticEntry[] | ManualEntry[];
  onViewAll: () => void;
}

export function RecentEntriesCard({ title, type, entries, onViewAll }: RecentEntriesCardProps) {
  const isAutomatic = type === "automatic";

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button variant="outline" size="sm" onClick={onViewAll}>
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No entries today</p>
          </div>
        ) : (
          entries.slice(0, 5).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-3">
                {isAutomatic && (
                  <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{entry.vehicleNumber}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{entry.entryTime}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                {isAutomatic ? (
                  <Badge variant="secondary">
                    {(entry as AutomaticEntry).vehicleType}
                  </Badge>
                ) : (
                  <div>
                    <p className="font-semibold text-financial">
                      ₹{(entry as ManualEntry).amount}
                    </p>
                    <div className="flex gap-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                      >
                        {(entry as ManualEntry).service}
                      </Badge>
                      <Badge 
                        variant={(entry as ManualEntry).entryType === "Workshop" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {(entry as ManualEntry).entryType}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}