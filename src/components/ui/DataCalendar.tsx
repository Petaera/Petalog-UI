import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DataCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  datesWithData: string[]; // Array of dates in YYYY-MM-DD format that have data
  className?: string;
}

export function DataCalendar({ selectedDate, onDateSelect, datesWithData, className = '' }: DataCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Get the first day of the month and number of days
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate array of days for the calendar
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const formatDateForComparison = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDateSelected = (day: number) => {
    const dateStr = formatDateForComparison(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return dateStr === selectedDate;
  };

  const hasDataForDate = (day: number) => {
    const dateStr = formatDateForComparison(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return datesWithData.includes(dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    const dateStr = formatDateForComparison(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const todayStr = formatDateForComparison(today.getFullYear(), today.getMonth(), today.getDate());
    return dateStr === todayStr;
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day names header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(dayName => (
            <div key={dayName} className="text-center text-sm font-medium text-muted-foreground py-2">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={index} className="h-10" />;
            }

            const hasData = hasDataForDate(day);
            const isSelected = isDateSelected(day);
            const isTodayDate = isToday(day);

            return (
              <Button
                key={day}
                variant="ghost"
                size="sm"
                className={`
                  h-10 p-0 relative
                  ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                  ${isTodayDate && !isSelected ? 'bg-muted' : ''}
                  hover:bg-muted
                `}
                onClick={() => {
                  const dateStr = formatDateForComparison(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  onDateSelect(dateStr);
                }}
              >
                <span className="text-sm">{day}</span>
                {/* Data status indicator */}
                <div className={`
                  absolute -top-1 -right-1 w-2 h-2 rounded-full
                  ${hasData ? 'bg-green-500' : 'bg-red-500'}
                `} />
              </Button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Data Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>No Data</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
