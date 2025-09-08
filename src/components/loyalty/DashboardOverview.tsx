import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import {
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  Plus,
  Eye,
  ArrowUpRight,
  Crown,
  Zap,
  Target
} from 'lucide-react';

const quickActions = [
  {
    title: 'Create New Scheme',
    description: 'Setup subscription or loyalty program',
    icon: Plus,
    action: 'create-scheme',
    gradient: 'gradient-blue'
  },
  {
    title: 'View All Customers',
    description: 'Manage member directory',
    icon: Eye,
    action: 'customers',
    gradient: 'gradient-blue'
  }
];

interface DashboardOverviewProps {
  onNavigate?: (section: string) => void;
}

export function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const navigate = useNavigate();
  const [activeSubscriptions, setActiveSubscriptions] = useState<number | null>(null);
  const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
  const [loyaltyMembers, setLoyaltyMembers] = useState<number | null>(null);
  const [expiringSoon, setExpiringSoon] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [topPerformer, setTopPerformer] = useState<{ name: string; renewals: number } | null>(null);
  const [loyaltyGrowth, setLoyaltyGrowth] = useState<number | null>(null);

  const statsCards = [
    {
      title: 'Active Subscriptions',
      value: activeSubscriptions !== null ? activeSubscriptions : '...',
      change: '+12%',
      changeType: 'positive' as const,
      icon: CreditCard,
      color: 'blue-600'
    },
    {
      title: 'Total Revenue this month',
      value: totalRevenue !== null ? `₹${totalRevenue.toLocaleString()}` : '...',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'blue-500'
    },
    {
      title: 'Loyalty Members',
      value: loyaltyMembers !== null ? loyaltyMembers : '...',
      change: '+23%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'blue-400'
    },
    {
      title: 'Expiring Soon',
      value: expiringSoon !== null ? expiringSoon : '...',
      change: '-5%',
      changeType: 'negative' as const,
      icon: Calendar,
      color: 'blue-300'
    }
  ];

  // ... (all useEffect and data fetching code remains unchanged)

  return (
  <div className="space-y-6 animate-fade-in bg-white min-h-screen p-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Dashboard Overview</h1>
        <p className="text-blue-600">Monitor your subscription and loyalty programs</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-blue-500">Last updated: {lastUpdated ? lastUpdated : '...'}</div>
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      </div>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Example colors: blue, green, purple, orange */}
      {[
        { icon: CreditCard, color: 'blue-500', bg: 'bg-blue-100', title: 'Active Subscriptions', value: activeSubscriptions !== null ? activeSubscriptions : '...', change: '+12%', changeType: 'positive' },
        { icon: TrendingUp, color: 'green-500', bg: 'bg-green-100', title: 'Total Revenue this month', value: totalRevenue !== null ? `₹${totalRevenue.toLocaleString()}` : '...', change: '+8.2%', changeType: 'positive' },
        { icon: Users, color: 'purple-500', bg: 'bg-purple-100', title: 'Loyalty Members', value: loyaltyMembers !== null ? loyaltyMembers : '...', change: '+23%', changeType: 'positive' },
        { icon: Calendar, color: 'orange-500', bg: 'bg-orange-100', title: 'Expiring Soon', value: expiringSoon !== null ? expiringSoon : '...', change: '-5%', changeType: 'negative' }
      ].map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="hover:shadow-card hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 bg-white animate-slide-up transform-gpu"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' : 'text-orange-500'}`}>
                  <ArrowUpRight className={`w-4 h-4 ${stat.changeType === 'negative' ? 'rotate-180' : ''}`} />
                  {stat.change}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900 mb-1">{stat.value}</div>
                <div className="text-sm text-blue-600">{stat.title}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>

    {/* Quick Actions */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {quickActions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Card
            key={action.title}
            className="bg-gradient-to-br from-blue-400 to-blue-600 text-white cursor-pointer hover:shadow-loyalty hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 animate-scale-in transform-gpu"
            style={{ animationDelay: `${(index + 4) * 100}ms` }}
            onClick={() => {
              if (onNavigate) {
                onNavigate(action.action);
              } else {
                if (action.action === 'create-scheme') {
                  navigate('/loyalty/create');
                } else if (action.action === 'customers') {
                  navigate('/loyalty/customers');
                }
              }
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Icon className="w-8 h-8 text-white/90" />
                <ArrowUpRight className="w-5 h-5 text-white/60" />
              </div>
              <h3 className="text-xl font-bold mb-2">{action.title}</h3>
              <p className="text-white/80">{action.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>

    {/* Recent Activity & Insights */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Activity */}
      <Card className="lg:col-span-2 animate-fade-in bg-white transition-all duration-300 hover:shadow-card hover:-translate-y-1 transform-gpu" style={{ animationDelay: '600ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium text-blue-900">{activity.action}</div>
                <div className="text-sm text-blue-600">{activity.customer} • {activity.scheme}</div>
              </div>
              <div className="text-xs text-blue-500">{activity.time}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="animate-fade-in bg-white transition-all duration-300 hover:shadow-card hover:-translate-y-1 transform-gpu" style={{ animationDelay: '700ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-600">Top Performer</span>
            </div>
            <p className="text-sm text-blue-900">Premium Wash scheme has 89% renewal rate</p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-purple-500">Growth Trend</span>
            </div>
            <p className="text-sm text-blue-900">Loyalty visits increased by 34% this month</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);
}