import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
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

const allQuickActions = [
  {
    title: 'Create New Scheme',
    description: 'Setup subscription or loyalty program',
    icon: Plus,
    action: 'create-scheme',
    gradient: 'gradient-blue',
    ownerOnly: true
  },
  {
    title: 'View All Customers',
    description: 'Manage member directory',
    icon: Eye,
    action: 'customers',
    gradient: 'gradient-blue',
    ownerOnly: false
  }
];

interface DashboardOverviewProps {
  onNavigate?: (section: string) => void;
}

export function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if user is manager
  const isManager = String(user?.role || '').toLowerCase().includes('manager');
  const [activeSubscriptions, setActiveSubscriptions] = useState<number | null>(null);
  const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
  const [loyaltyMembers, setLoyaltyMembers] = useState<number | null>(null);
  const [expiringSoon, setExpiringSoon] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [permittedLocationIds, setPermittedLocationIds] = useState<string[]>([]);
  const [mom, setMoM] = useState<{
    activeSubs?: { pct: number; label: string };
    revenue?: { pct: number; label: string };
    loyalty?: { pct: number; label: string };
    expiring?: { pct: number; label: string };
  }>({});
  const [insights, setInsights] = useState<{
    topPlanName?: string;
    topPlanSharePct?: number;
    loyaltyVisitMoM?: number;
    prevMonthName?: string;
  }>({});

  const getMonthRanges = () => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfThisMonth.setHours(23, 59, 59, 999);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    const endOfPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    endOfPrevMonth.setHours(23, 59, 59, 999);
    return { startOfThisMonth, endOfThisMonth, startOfPrevMonth, endOfPrevMonth, prevMonthName: endOfPrevMonth.toLocaleString('default', { month: 'long' }) };
  };
  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const allStatsCards = [
    { key: 'activeSubs', title: 'Active Subscriptions', valueKey: 'activeSubscriptions', icon: CreditCard, color: 'blue-600', ownerOnly: false },
    { key: 'revenue', title: 'Total Revenue', valueKey: 'totalRevenue', icon: TrendingUp, color: 'blue-500', ownerOnly: true },
    { key: 'loyalty', title: 'Loyalty Members', valueKey: 'loyaltyMembers', icon: Users, color: 'blue-400', ownerOnly: false },
    { key: 'expiring', title: 'Expiring Soon', valueKey: 'expiringSoon', icon: Calendar, color: 'blue-300', ownerOnly: false }
  ];
  
  const statsCards = allStatsCards.filter(card => !isManager || !card.ownerOnly);
  const quickActions = allQuickActions.filter(action => !isManager || !action.ownerOnly);

  // Resolve permitted locations
  useEffect(() => {
    const resolveLocations = async () => {
      if (!user?.id) return;
      const isManager = String(user.role || '').toLowerCase().includes('manager');
      if (isManager && user.assigned_location) {
        setPermittedLocationIds([user.assigned_location]);
        return;
      }
      const { data: ownerships } = await supabase
        .from('location_owners')
        .select('location_id')
        .eq('owner_id', user.id);
      const ids = (ownerships || []).map((o: any) => o.location_id).filter(Boolean);
      setPermittedLocationIds(ids);
    };
    resolveLocations();
  }, [user?.id, user?.role, user?.assigned_location]);

  // Fetch stats, MoM, activities, and insights
  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { startOfThisMonth, endOfThisMonth, startOfPrevMonth, endOfPrevMonth, prevMonthName } = getMonthRanges();

      // Active subs
      let activeCount = 0; let activeThisMonth = 0; let activePrevMonth = 0;
      // Revenue
      let revenueMonth = 0; let revenueThisMonth = 0; let revenuePrevMonth = 0;
      // Loyalty counts
      let loyaltyCount = 0; let loyaltyThisMonth = 0; let loyaltyPrevMonth = 0;
      // Expiring soon
      let expSoonCount = 0; let expiringThisMonth = 0; let expiringPrevMonth = 0;

      // Common datasets
      const { data: purchases } = await supabase
        .from('subscription_purchases')
        .select('id, plan_id, customer_id, status, total_value, created_at, expiry_date, location_id')
        .in('location_id', permittedLocationIds.length > 0 ? permittedLocationIds : ['00000000-0000-0000-0000-000000000000']);

      const purchaseRows = purchases || [];
      activeCount = purchaseRows.filter(r => String(r.status || '').toLowerCase() === 'active').length;
      activeThisMonth = purchaseRows.filter(r => String(r.status || '').toLowerCase() === 'active' && new Date(r.created_at) >= startOfThisMonth && new Date(r.created_at) <= endOfThisMonth).length;
      activePrevMonth = purchaseRows.filter(r => String(r.status || '').toLowerCase() === 'active' && new Date(r.created_at) >= startOfPrevMonth && new Date(r.created_at) <= endOfPrevMonth).length;

      revenueMonth = purchaseRows
        .filter(r => new Date(r.created_at) >= startOfThisMonth && new Date(r.created_at) <= endOfThisMonth)
        .reduce((s, r) => s + Number(r.total_value || 0), 0);
      revenueThisMonth = revenueMonth;
      revenuePrevMonth = purchaseRows
        .filter(r => new Date(r.created_at) >= startOfPrevMonth && new Date(r.created_at) <= endOfPrevMonth)
        .reduce((s, r) => s + Number(r.total_value || 0), 0);

      // Loyalty (visit plans)
      const planIds = Array.from(new Set(purchaseRows.map(r => r.plan_id).filter(Boolean)));
      let visitPlanIds: string[] = [];
      if (planIds.length > 0) {
        const { data: plans } = await supabase.from('subscription_plans').select('id, type').in('id', planIds);
        visitPlanIds = (plans || []).filter(p => String(p.type || '').toLowerCase() === 'visit').map(p => p.id);
      }
      const visitPurchases = purchaseRows.filter(r => visitPlanIds.includes(r.plan_id));
      loyaltyCount = new Set(visitPurchases.map(r => r.customer_id)).size;
      loyaltyThisMonth = new Set(visitPurchases.filter(r => new Date(r.created_at) >= startOfThisMonth && new Date(r.created_at) <= endOfThisMonth).map(r => r.customer_id)).size;
      loyaltyPrevMonth = new Set(visitPurchases.filter(r => new Date(r.created_at) >= startOfPrevMonth && new Date(r.created_at) <= endOfPrevMonth).map(r => r.customer_id)).size;

      // Expiring soon
      const withExpiry = purchaseRows.filter(r => r.expiry_date);
      expSoonCount = withExpiry.filter(r => { const d = new Date(r.expiry_date as any); return d >= now && d <= sevenDaysFromNow; }).length;
      expiringThisMonth = withExpiry.filter(r => { const d = new Date(r.expiry_date as any); return d >= startOfThisMonth && d <= endOfThisMonth; }).length;
      expiringPrevMonth = withExpiry.filter(r => { const d = new Date(r.expiry_date as any); return d >= startOfPrevMonth && d <= endOfPrevMonth; }).length;

      setActiveSubscriptions(activeCount);
      setTotalRevenue(revenueMonth);
      setLoyaltyMembers(loyaltyCount);
      setExpiringSoon(expSoonCount);

      setMoM({
        activeSubs: { pct: pctChange(activeThisMonth, activePrevMonth), label: prevMonthName },
        revenue: { pct: pctChange(revenueThisMonth, revenuePrevMonth), label: prevMonthName },
        loyalty: { pct: pctChange(loyaltyThisMonth, loyaltyPrevMonth), label: prevMonthName },
        expiring: { pct: pctChange(expiringThisMonth, expiringPrevMonth), label: prevMonthName }
      });

      // Insights: most enrolled plan share (this month)
      const thisMonthPurchases = purchaseRows.filter(r => new Date(r.created_at) >= startOfThisMonth && new Date(r.created_at) <= endOfThisMonth);
      const countsByPlan = thisMonthPurchases.reduce((acc: Record<string, number>, r: any) => {
        if (!r.plan_id) return acc; acc[r.plan_id] = (acc[r.plan_id] || 0) + 1; return acc;
      }, {});
      let topPlanId = ''; let topCount = 0; const totalCount = thisMonthPurchases.length || 0;
      Object.entries(countsByPlan).forEach(([pid, count]) => { if (count > topCount) { topCount = count as number; topPlanId = pid; } });
      let topPlanName = '';
      if (topPlanId) {
        const { data: one } = await supabase.from('subscription_plans').select('id, name').eq('id', topPlanId).maybeSingle();
        topPlanName = one?.name || '';
      }
      const topPlanSharePct = totalCount > 0 ? Math.round((topCount / totalCount) * 100) : 0;
      const loyaltyVisitMoM = pctChange(loyaltyThisMonth, loyaltyPrevMonth);
      setInsights({ topPlanName, topPlanSharePct, loyaltyVisitMoM, prevMonthName });

      // Recent activity with plan names (location-filtered for managers)
      const formatTime = (d: string | Date) => { const date = typeof d === 'string' ? new Date(d) : d; return date.toLocaleString(); };
      const activities: any[] = [];
      // New purchases (already filtered by location in purchaseRows)
      const lastPurchases = purchaseRows.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
      const lpPlanIds = Array.from(new Set(lastPurchases.map((p: any) => p.plan_id).filter(Boolean)));
      const lpCustIds = Array.from(new Set(lastPurchases.map((p: any) => p.customer_id).filter(Boolean)));
      let planNameMap: Record<string, string> = {}; let custMapLocal: Record<string, any> = {};
      if (lpPlanIds.length > 0) {
        const { data: lplans } = await supabase.from('subscription_plans').select('id, name').in('id', lpPlanIds);
        (lplans || []).forEach((pl: any) => { planNameMap[pl.id] = pl.name; });
      }
      if (lpCustIds.length > 0) {
        const { data: lc } = await supabase.from('customers').select('id, name, phone').in('id', lpCustIds);
        (lc || []).forEach((c: any) => { custMapLocal[c.id] = c; });
      }
      lastPurchases.forEach((p: any) => {
        activities.push({
          type: 'purchase',
          action: `New customer added to plan ${planNameMap[p.plan_id] || ''}`,
          customer: custMapLocal[p.customer_id]?.name || custMapLocal[p.customer_id]?.phone || 'Customer',
          scheme: planNameMap[p.plan_id] || '',
          time: formatTime(p.created_at),
          at: new Date(p.created_at).getTime()
        });
      });

      // Topups via payments mapping - get all first, then filter by location later
      const { data: allTopups } = await supabase
        .from('credit_transactions')
        .select('id, amount, created_at, related_payment_id')
        .eq('transaction_type', 'topup')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Get more to filter by location later
      const paymentIds = Array.from(new Set((allTopups || []).map((t: any) => t.related_payment_id).filter(Boolean)));
      let paymentMap: Record<string, any> = {};
      if (paymentIds.length > 0) {
        const { data: pays } = await supabase.from('subscription_payments').select('id, purchase_id').in('id', paymentIds);
        (pays || []).forEach((p: any) => { paymentMap[p.id] = p; });
      }
      const purIds = Array.from(new Set(Object.values(paymentMap).map((p: any) => p.purchase_id).filter(Boolean)));
      let purMap: Record<string, any> = {};
      if (purIds.length > 0) {
        const { data: pur } = await supabase.from('subscription_purchases').select('id, plan_id, customer_id').in('id', purIds);
        (pur || []).forEach((p: any) => { purMap[p.id] = p; });
      }
      const purPlanIds = Array.from(new Set(Object.values(purMap).map((p: any) => p.plan_id).filter(Boolean)));
      if (purPlanIds.length > 0) {
        const { data: plans } = await supabase.from('subscription_plans').select('id, name').in('id', purPlanIds);
        (plans || []).forEach((pl: any) => { planNameMap[pl.id] = pl.name; });
      }
      const purCustIds = Array.from(new Set(Object.values(purMap).map((p: any) => p.customer_id).filter(Boolean)));
      if (purCustIds.length > 0) {
        const { data: customers } = await supabase.from('customers').select('id, name, phone').in('id', purCustIds);
        (customers || []).forEach((c: any) => { custMapLocal[c.id] = c; });
      }
      
      // Filter topups by location for managers
      const topups = (allTopups || []).filter((t: any) => {
        const pay = paymentMap[t.related_payment_id];
        const pr = pay ? purMap[pay.purchase_id] : undefined;
        // If no purchase found or no location restriction, include it
        return !pr || permittedLocationIds.includes(pr.location_id);
      }).slice(0, 10); // Limit to 10 after filtering
      
      topups.forEach((t: any) => {
        const pay = paymentMap[t.related_payment_id]; const pr = pay ? purMap[pay.purchase_id] : undefined;
        const planName = pr ? planNameMap[pr.plan_id] : '';
        const cust = pr ? custMapLocal[pr.customer_id] : undefined;
        activities.push({
          type: 'topup',
          action: `Top-up ₹${Number(t.amount || 0)} to plan ${planName}`,
          customer: cust?.name || cust?.phone || 'Customer',
          scheme: planName,
          time: formatTime(t.created_at),
          at: new Date(t.created_at).getTime()
        });
      });

      activities.sort((a, b) => b.at - a.at);
      setRecentActivities(activities.slice(0, 10));
      if (activities.length > 0) setLastUpdated(activities[0].time);
    };
    run();
  }, [user?.id, permittedLocationIds.join('|')]);

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
      {statsCards.map((stat, index) => {
        const Icon = stat.icon as any;
        const momEntry: any = (mom as any)[stat.key] || { pct: 0, label: '' };
        const isPositive = momEntry.pct >= 0;
        const value = stat.valueKey === 'activeSubscriptions' ? (activeSubscriptions ?? '...')
          : stat.valueKey === 'totalRevenue' ? (totalRevenue !== null ? `₹${totalRevenue.toLocaleString()}` : '...')
          : stat.valueKey === 'loyaltyMembers' ? (loyaltyMembers ?? '...')
          : (expiringSoon ?? '...');
        const onClick = () => {
          if (stat.key === 'activeSubs') navigate('/loyalty/customers?filter=active');
          else if (stat.key === 'loyalty') navigate('/loyalty/customers?loyalty=1');
          else if (stat.key === 'expiring') navigate('/loyalty/customers?filter=expiring');
        };
        return (
          <Card
            key={stat.title}
            onClick={onClick}
            className="hover:shadow-card hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 bg-white animate-slide-up transform-gpu cursor-pointer"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}`} />
                </div>
                <div className={`flex items-center gap-2 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                  <span className="text-blue-400">{momEntry.label}</span>
                  <ArrowUpRight className={`w-4 h-4 ${!isPositive ? 'rotate-180' : ''}`} />
                  {momEntry.pct}%
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900 mb-1">{value}</div>
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
    <div className={`grid gap-6 ${isManager ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
      {/* Recent Activity */}
      <Card className={`${isManager ? '' : 'lg:col-span-2'} animate-fade-in bg-white transition-all duration-300 hover:shadow-card hover:-translate-y-1 transform-gpu`} style={{ animationDelay: '600ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Recent Activity {isManager ? '(Your Location)' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium text-blue-900">{activity.action}</div>
                <div className="text-sm text-blue-600">{activity.customer}{activity.scheme ? ` • ${activity.scheme}` : ''}</div>
              </div>
              <div className="text-xs text-blue-500">{activity.time}</div>
            </div>
          )) : (
            <div className="text-center text-blue-600 py-8">
              <Zap className="w-8 h-8 mx-auto mb-2 text-blue-300" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Insights - Only for Owners */}
      {!isManager && (
        <Card className="animate-fade-in bg-white transition-all duration-300 hover:shadow-card hover:-translate-y-1 transform-gpu" style={{ animationDelay: '700ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-600">Most Enrolled</span>
                </div>
                <span className="text-green-700 text-sm">{insights.topPlanSharePct != null ? `${insights.topPlanSharePct}% of new signups` : '-'}</span>
              </div>
              <p className="text-sm text-blue-900">{insights.topPlanName || '—'}</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-purple-500">Loyalty Visits</span>
                </div>
                <span className={`text-sm ${Number(insights.loyaltyVisitMoM || 0) >= 0 ? 'text-green-700' : 'text-orange-700'}`}>{insights.prevMonthName}: {insights.loyaltyVisitMoM != null ? `${insights.loyaltyVisitMoM}%` : '-'}</span>
              </div>
              <p className="text-sm text-blue-900">Month-over-month change in visit-based members</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  </div>
  );
}