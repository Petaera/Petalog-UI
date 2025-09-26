import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, User, Receipt } from 'lucide-react';

const RecentActivityLogs: React.FC = () => {
  // Mock data for recent activity
  const activities = [
    {
      id: 1,
      type: 'salary',
      description: 'Salary paid to John Doe',
      amount: 25000,
      date: '2024-01-15',
      icon: User
    },
    {
      id: 2,
      type: 'expense',
      description: 'Office supplies purchase',
      amount: 5000,
      date: '2024-01-14',
      icon: Receipt
    },
    {
      id: 3,
      type: 'salary',
      description: 'Salary paid to Jane Smith',
      amount: 30000,
      date: '2024-01-14',
      icon: User
    },
    {
      id: 4,
      type: 'expense',
      description: 'Electricity bill payment',
      amount: 8000,
      date: '2024-01-13',
      icon: Receipt
    },
    {
      id: 5,
      type: 'salary',
      description: 'Advance payment to Mike Johnson',
      amount: 15000,
      date: '2024-01-12',
      icon: User
    }
  ];

  const formatCurrency = (amount: number) => 
    `₹${amount.toLocaleString('en-IN')}`;

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-IN');

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = activity.icon;
        return (
          <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {activity.description}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatDate(activity.date)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${
                activity.type === 'salary' ? 'text-green-600' : 'text-red-600'
              }`}>
                {activity.type === 'salary' ? '+' : '-'}{formatCurrency(activity.amount)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecentActivityLogs;
