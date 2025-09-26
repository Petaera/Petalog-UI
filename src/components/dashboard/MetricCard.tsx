import React from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'default' | 'success' | 'warning' | 'danger';
  change?: {
    value: number;
    type: 'positive' | 'negative' | 'neutral';
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  change 
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-orange-600';
      case 'danger':
        return 'text-red-600';
      default:
        return 'text-primary';
    }
  };

  const getChangeColor = () => {
    if (!change) return '';
    switch (change.type) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return val;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className={`text-2xl font-bold ${getColorClasses()}`}>
            {formatValue(value)}
          </p>
          {change && (
            <p className={`text-xs mt-1 ${getChangeColor()}`}>
              {change.type === 'positive' ? '+' : ''}{change.value}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-muted ${getColorClasses()}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;