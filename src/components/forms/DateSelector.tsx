import { useState } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayYMD, yesterdayYMD, parseYMD, toYMD, getDisplayDate } from '@/utils/dateUtils';

interface DateSelectorProps {
  selectedDateOption: string;
  customEntryDate: string;
  customEntryTime: string;
  onDateOptionChange: (option: string) => void;
  onCustomDateChange: (date: string) => void;
  onCustomTimeChange: (time: string) => void;
}

export const DateSelector = ({
  selectedDateOption,
  customEntryDate,
  customEntryTime,
  onDateOptionChange,
  onCustomDateChange,
  onCustomTimeChange
}: DateSelectorProps) => {
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  const handlePreviousDate = () => {
    const currentDate = parseYMD(customEntryDate) ?? new Date();
    currentDate.setDate(currentDate.getDate() - 1);
    const newYmd = toYMD(currentDate);
    onCustomDateChange(newYmd);

    const todayStr = todayYMD();
    const yestStr = yesterdayYMD();

    if (newYmd === todayStr) onDateOptionChange('today');
    else if (newYmd === yestStr) onDateOptionChange('yesterday');
    else onDateOptionChange('custom');
  };

  const handleNextDate = () => {
    const currentDate = parseYMD(customEntryDate) ?? new Date();
    const todayStr = todayYMD();
    const currentDateStr = customEntryDate;

    if (currentDateStr < todayStr) {
      currentDate.setDate(currentDate.getDate() + 1);
      const newDateStr = toYMD(currentDate);
      onCustomDateChange(newDateStr);

      const yestStr = yesterdayYMD();
      if (newDateStr === todayStr) onDateOptionChange('today');
      else if (newDateStr === yestStr) onDateOptionChange('yesterday');
      else onDateOptionChange('custom');
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Entry Date</Label>
        <div className="flex items-center gap-2">
          {/* Previous Date Button */}
          <button
            type="button"
            onClick={handlePreviousDate}
            className="flex items-center justify-center w-9 h-9 border rounded-md bg-background hover:bg-muted/50 transition-colors shadow-sm"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
          </button>

          {/* Date Display */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background hover:bg-muted/50 transition-colors shadow-sm text-sm"
            >
              <span className="font-medium">{getDisplayDate(selectedDateOption, customEntryDate)}</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-background border rounded-md shadow-lg">
                <div className="p-3 space-y-3">
                  {/* Quick Date Options */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Quick Select</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onDateOptionChange('today');
                          setIsDateDropdownOpen(false);
                        }}
                        className="px-3 py-2 text-sm border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDateOptionChange('yesterday');
                          setIsDateDropdownOpen(false);
                        }}
                        className="px-3 py-2 text-sm border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        Yesterday
                      </button>
                    </div>
                  </div>
                  
                  {/* Custom Date Input */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Custom Date</Label>
                    <Input
                      type="date"
                      value={customEntryDate}
                      onChange={(e) => {
                        onCustomDateChange(e.target.value);
                        onDateOptionChange('custom');
                        setIsDateDropdownOpen(false);
                      }}
                      max={todayYMD()}
                      className="w-full text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Next Date Button */}
          <button
            type="button"
            onClick={handleNextDate}
            className={`flex items-center justify-center w-9 h-9 border rounded-md transition-colors shadow-sm ${
              customEntryDate === todayYMD()
                ? 'bg-muted/30 cursor-not-allowed opacity-50'
                : 'bg-background hover:bg-muted/50 cursor-pointer'
            }`}
            disabled={customEntryDate === todayYMD()}
          >
            <ChevronDown className="h-4 w-4 -rotate-90" />
          </button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground leading-relaxed">
        Entry recorded for <strong className="text-foreground">{(() => {
          const dateParts = customEntryDate.split('-');
          const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));

          const dateStr = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          return `${dateStr} at ${timeStr}`;
        })()}</strong>
      </div>
    </div>
  );
};
