import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { LogType } from '@/hooks/useComparisonData';

interface ComparisonFiltersProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedLogType: LogType;
  setSelectedLogType: (logType: LogType) => void;
  clearFilters: () => void;
}

const ComparisonFilters: React.FC<ComparisonFiltersProps> = ({
  selectedDate,
  setSelectedDate,
  selectedLogType,
  setSelectedLogType,
  clearFilters,
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Label htmlFor="date-filter" className="text-sm font-medium">
              Filter by Date:
            </Label>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-48"
            />
            <Select value={selectedLogType} onValueChange={(value) => setSelectedLogType(value as LogType)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select log type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="common">Common Only</SelectItem>
                <SelectItem value="manual">Manual Only</SelectItem>
                <SelectItem value="automatic">Automatic Only</SelectItem>
              </SelectContent>
            </Select>
            {(selectedDate || selectedLogType !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(ComparisonFilters);
