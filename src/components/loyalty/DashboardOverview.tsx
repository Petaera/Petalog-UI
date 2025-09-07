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
    gradient: 'gradient-primary'
  },
  {
    title: 'View All Customers',
    description: 'Manage member directory',
    icon: Eye,
    action: 'customers',
    gradient: 'gradient-primary'
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
      color: 'primary'
    },
    {
      title: 'Total Revenue this month',
      value: totalRevenue !== null ? `₹${totalRevenue.toLocaleString()}` : '...',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'success'
    },
    {
      title: 'Loyalty Members',
      value: loyaltyMembers !== null ? loyaltyMembers : '...',
      change: '+23%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'accent'
    },
    {
      title: 'Expiring Soon',
      value: expiringSoon !== null ? expiringSoon : '...',
      change: '-5%',
      changeType: 'negative' as const,
      icon: Calendar,
      color: 'warning'
    }
  ];
  // use effect to fetch active subscriptions, total revenue, loyalty members
  useEffect(() => {
    async function fetchActiveSubscriptions() {
      const { count, error } = await supabase
        .from('subscription_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (!error) setActiveSubscriptions(count ?? 0);
    }

    async function fetchTotalRevenue() {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const { data, error } = await supabase
        .from('subscription_payments')
        .select('amount, created_at')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay);

      if (!error && data) {
        const sum = data.reduce((acc: number, row: { amount: number }) => acc + Number(row.amount), 0);
        setTotalRevenue(sum);
      }
    }

    async function fetchLoyaltyMembers() {
      // Get unique customer_id count from subscription_purchases
      const { data, error } = await supabase
        .from('subscription_purchases')
        .select('customer_id', { count: 'exact', head: true });
      if (!error) setLoyaltyMembers(data?.length ?? 0);
    }
    async function fetchExpiringSoon() {
      const now = new Date();
      const todayISO = now.toISOString();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from('subscription_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('expiry_date', todayISO)
        .lte('expiry_date', sevenDaysLater);

      if (!error) setExpiringSoon(count ?? 0);
    }
    async function fetchRecentActivities() {
      // Fetch recent subscriptions (new or renewal)
      const { data: subs, error: subsError } = await supabase
        .from('subscription_purchases')
        .select('id, customer_id, plan_id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent loyalty visits
      const { data: visits, error: visitsError } = await supabase
        .from('loyalty_visits')
        .select('id, customer_id, visit_time, service_rendered')
        .order('visit_time', { ascending: false })
        .limit(5);

      let activities: any[] = [];

      if (subs) {
        activities = activities.concat(
          subs.map((sub: any) => ({
            action: sub.status === 'active' ? 'New subscription' : 'Subscription renewal',
            customer: sub.customer_id,
            scheme: sub.plan_id,
            time: new Date(sub.created_at).toLocaleString()
          }))
        );
      }

      if (visits) {
        activities = activities.concat(
          visits.map((visit: any) => ({
            action: 'Loyalty checkpoint',
            customer: visit.customer_id,
            scheme: visit.service_rendered || 'Visit',
            time: new Date(visit.visit_time).toLocaleString()
          }))
        );
      }

      // Sort by time descending
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setRecentActivities(activities.slice(0, 5)); // Show top 5
    }

    async function fetchLastUpdated() {
      // Get the latest created_at from purchases and visits
      const { data: subLatest } = await supabase
        .from('subscription_purchases')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: visitLatest } = await supabase
        .from('loyalty_visits')
        .select('visit_time')
        .order('visit_time', { ascending: false })
        .limit(1);

      let lastUpdate: Date | null = null;
      if (subLatest && subLatest.length > 0) {
        lastUpdate = new Date(subLatest[0].created_at);
      }
      if (visitLatest && visitLatest.length > 0) {
        const visitDate = new Date(visitLatest[0].visit_time);
        if (!lastUpdate || visitDate > lastUpdate) lastUpdate = visitDate;
      }
      setLastUpdated(lastUpdate ? lastUpdate.toLocaleString() : '');
    }
    async function fetchTopPerformer() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  // Get all purchases this month
  const { data, error } = await supabase
    .from('subscription_purchases')
    .select('plan_id, created_at')
    .gte('created_at', firstDay)
    .lte('created_at', lastDay);

  if (!error && data) {
    // Count renewals per plan_id
    const planCounts: Record<string, number> = {};
    data.forEach((row: any) => {
      planCounts[row.plan_id] = (planCounts[row.plan_id] || 0) + 1;
    });
    // Find top plan_id
    const topPlanId = Object.keys(planCounts).reduce((a, b) => (planCounts[a] > planCounts[b] ? a : b), '');
    const renewals = planCounts[topPlanId] || 0;

    // Fetch plan name
    if (topPlanId) {
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', topPlanId)
        .single();
      setTopPerformer({ name: planData?.name || 'Unknown', renewals });
    }
  }
}
async function fetchLoyaltyGrowth() {
  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

  // This month
  const { count: countThisMonth } = await supabase
    .from('loyalty_visits')
    .select('*', { count: 'exact', head: true })
    .gte('visit_time', firstDayThisMonth)
    .lte('visit_time', lastDayThisMonth);

  // Last month
  const { count: countLastMonth } = await supabase
    .from('loyalty_visits')
    .select('*', { count: 'exact', head: true })
    .gte('visit_time', firstDayLastMonth)
    .lte('visit_time', lastDayLastMonth);

  if (typeof countThisMonth === 'number' && typeof countLastMonth === 'number') {
    const growth = countLastMonth === 0
      ? 100
      : Math.round(((countThisMonth - countLastMonth) / countLastMonth) * 100);
    setLoyaltyGrowth(growth);
  }
}

    fetchActiveSubscriptions();// Fetch active subscriptions
    fetchTotalRevenue();// Fetch total revenue
    fetchLoyaltyMembers();// Fetch loyalty members
    fetchExpiringSoon();// Fetch expiring soon
    fetchRecentActivities();// Fetch recent activities
    fetchLastUpdated();// Fetch last updated
    fetchTopPerformer();// Fetch top performer
    fetchLoyaltyGrowth();// Fetch loyalty growth
  }, []);


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor your subscription and loyalty programs</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">Last updated: {lastUpdated ? lastUpdated : '...'}</div>
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.title}
              className="hover:shadow-card transition-all duration-300 bg-gradient-card animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${stat.color}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${stat.changeType === 'positive' ? 'text-success' : 'text-destructive'
                    }`}>
                    <ArrowUpRight className={`w-4 h-4 ${stat.changeType === 'negative' ? 'rotate-180' : ''
                      }`} />
                    {stat.change}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.title}</div>
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
              className={`bg-${action.gradient} text-white cursor-pointer hover:shadow-loyalty transition-all duration-300 animate-scale-in`}
              style={{ animationDelay: `${(index + 4) * 100}ms` }}
              onClick={() => {
                if (onNavigate) {
                  onNavigate(action.action); // Call onNavigate with the action
                } else {
                  // Fallback: Use navigate for navigation
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
        <Card className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="font-medium text-foreground">{activity.action}</div>
                  <div className="text-sm text-muted-foreground">{activity.customer} • {activity.scheme}</div>
                </div>
                <div className="text-xs text-muted-foreground">{activity.time}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card className="animate-fade-in" style={{ animationDelay: '700ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-success" />
                <span className="font-medium text-success">Top Performer</span>
              </div>
              <p className="text-sm text-foreground">Premium Wash scheme has 89% renewal rate</p>
            </div>

            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="font-medium text-accent">Growth Trend</span>
              </div>
              <p className="text-sm text-foreground">Loyalty visits increased by 34% this month</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}