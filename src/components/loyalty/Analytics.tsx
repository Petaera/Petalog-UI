import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  TrendingUp, 
  Download,
  Calendar,
  Filter,
  PieChart,
  LineChart,
  Users,
  CreditCard,
  MapPin,
  Target,
  AlertCircle
} from 'lucide-react';

export function Analytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if user is manager - allow managers to view analytics for their assigned location
  const isManager = String(user?.role || '').toLowerCase().includes('manager');

  // State for analytics data
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    customerRetention: 0,
    avgCustomerValue: 0,
    monthlyGrowth: { revenue: 0, subs: 0, retention: 0, avgValue: 0 },
    planDistribution: [] as Array<{ name: string; count: number; revenue: number; type: string }>,
    monthlyTrends: [] as Array<{ month: string; revenue: number; subscriptions: number; customers: number }>,
    topLocations: [] as Array<{ name: string; revenue: number; customers: number; id: string }>,
    revenueByType: [] as Array<{ type: string; revenue: number; count: number }>,
    customerLifetime: [] as Array<{ segment: string; value: number; count: number }>,
    expiringPlans: 0,
    creditBalance: 0,
    totalCustomers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [locationFilter, setLocationFilter] = useState('all');
  const [permittedLocations, setPermittedLocations] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch user's permitted locations
  useEffect(() => {
    const fetchLocations = async () => {
      if (!user?.id) return;
      
      if (isManager && user.assigned_location) {
        // For managers: only their assigned location
        const { data: location } = await supabase
          .from('locations')
          .select('id, name')
          .eq('id', user.assigned_location)
          .maybeSingle();
        
        if (location) {
          setPermittedLocations([{ id: location.id, name: location.name }]);
          setLocationFilter(location.id); // Auto-select manager's location
        }
      } else {
        // For owners: get all locations they own
        const { data: ownerships } = await supabase
          .from('location_owners')
          .select('location_id')
          .eq('owner_id', user.id);
        
        const locationIds = (ownerships || []).map((o: any) => o.location_id).filter(Boolean);
        
        if (locationIds.length > 0) {
          const { data: locations } = await supabase
            .from('locations')
            .select('id, name')
            .in('id', locationIds);
          
          setPermittedLocations((locations || []).map((l: any) => ({ id: l.id, name: l.name })));
        }
      }
    };
    
    fetchLocations();
  }, [user?.id, isManager, user?.assigned_location]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      try {
        const daysBack = parseInt(dateRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        const prevStartDate = new Date();
        prevStartDate.setDate(prevStartDate.getDate() - (daysBack * 2));
        const prevEndDate = new Date();
        prevEndDate.setDate(prevEndDate.getDate() - daysBack);

        // Get user's plans first
        let plansQuery = supabase
          .from('subscription_plans')
          .select('id, name, type, price, owner_id');

        if (isManager && user.assigned_location) {
          // For managers: get plans from owners who have the manager's assigned location
          const { data: ownerIds } = await supabase
            .from('location_owners')
            .select('owner_id')
            .eq('location_id', user.assigned_location);
          
          const validOwnerIds = (ownerIds || []).map(o => o.owner_id).filter(Boolean);
          
          if (validOwnerIds.length > 0) {
            plansQuery = plansQuery.in('owner_id', validOwnerIds);
          } else {
            setAnalyticsData(prev => ({ ...prev }));
            setIsLoading(false);
            return;
          }
        } else {
          // For owners: only their own plans
          plansQuery = plansQuery.eq('owner_id', user.id);
        }

        const { data: userPlans } = await plansQuery;
        const planIds = (userPlans || []).map(p => p.id);

        if (planIds.length === 0) {
          setAnalyticsData(prev => ({ ...prev }));
          setIsLoading(false);
          return;
        }

        // Get purchases for user's plans
        let purchasesQuery = supabase
          .from('subscription_purchases')
          .select(`
            id, plan_id, customer_id, status, total_value, amount, created_at, 
            expiry_date, location_id, remaining_visits, remaining_value
          `)
          .in('plan_id', planIds);

        // Apply location filter if specified
        if (locationFilter !== 'all') {
          purchasesQuery = purchasesQuery.eq('location_id', locationFilter);
        }

        const { data: allPurchases } = await purchasesQuery;
        const purchases = allPurchases || [];

        // Filter by date range
        const currentPeriodPurchases = purchases.filter(p => 
          new Date(p.created_at) >= startDate
        );
        const previousPeriodPurchases = purchases.filter(p => 
          new Date(p.created_at) >= prevStartDate && new Date(p.created_at) < prevEndDate
        );

        // Calculate metrics
        const totalRevenue = currentPeriodPurchases.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
        const prevRevenue = previousPeriodPurchases.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
        
        const activeSubscriptions = purchases.filter(p => p.status === 'active').length;
        const prevActiveSubscriptions = previousPeriodPurchases.filter(p => p.status === 'active').length;

        // Get unique customers
        const currentCustomers = new Set(currentPeriodPurchases.map(p => p.customer_id));
        const prevCustomers = new Set(previousPeriodPurchases.map(p => p.customer_id));
        const totalCustomers = new Set(purchases.map(p => p.customer_id)).size;
        
        // Customer retention (customers who made purchases in both periods)
        const retainedCustomers = [...currentCustomers].filter(c => prevCustomers.has(c));
        const customerRetention = prevCustomers.size > 0 ? (retainedCustomers.length / prevCustomers.size) * 100 : 0;
        const prevRetention = 85; // This would need historical data calculation
        
        // Average customer value
        const avgCustomerValue = currentCustomers.size > 0 ? totalRevenue / currentCustomers.size : 0;
        const prevAvgCustomerValue = prevCustomers.size > 0 ? prevRevenue / prevCustomers.size : 0;

        // Plan distribution
        const planCounts = purchases.reduce((acc, p) => {
          const plan = userPlans?.find(pl => pl.id === p.plan_id);
          if (plan) {
            if (!acc[plan.id]) {
              acc[plan.id] = { name: plan.name, count: 0, revenue: 0, type: plan.type };
            }
            acc[plan.id].count++;
            acc[plan.id].revenue += Number(p.total_value || 0);
          }
          return acc;
        }, {} as Record<string, any>);

        const planDistribution = Object.values(planCounts);

        // Revenue by type
        const revenueByType = purchases.reduce((acc, p) => {
          const plan = userPlans?.find(pl => pl.id === p.plan_id);
          if (plan) {
            if (!acc[plan.type]) {
              acc[plan.type] = { type: plan.type, revenue: 0, count: 0 };
            }
            acc[plan.type].revenue += Number(p.total_value || 0);
            acc[plan.type].count++;
          }
          return acc;
        }, {} as Record<string, any>);

        // Location performance
        let topLocations: Array<{ name: string; revenue: number; customers: number; id: string }> = [];
        if (permittedLocations.length > 0) {
          topLocations = permittedLocations.map(loc => {
            const locationPurchases = purchases.filter(p => p.location_id === loc.id);
            const revenue = locationPurchases.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
            const customers = new Set(locationPurchases.map(p => p.customer_id)).size;
            return { name: loc.name, revenue, customers, id: loc.id };
          }).sort((a, b) => b.revenue - a.revenue);
        }

        // Monthly trends (last 6 months)
        const monthlyTrends = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - i);
          monthStart.setDate(1);
          
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0);
          
          const monthPurchases = purchases.filter(p => {
            const pDate = new Date(p.created_at);
            return pDate >= monthStart && pDate <= monthEnd;
          });
          
          monthlyTrends.push({
            month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            revenue: monthPurchases.reduce((sum, p) => sum + Number(p.total_value || 0), 0),
            subscriptions: monthPurchases.length,
            customers: new Set(monthPurchases.map(p => p.customer_id)).size
          });
        }

        // Expiring plans (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const expiringPlans = purchases.filter(p => 
          p.expiry_date && 
          p.status === 'active' && 
          new Date(p.expiry_date) <= nextWeek
        ).length;

        // Total credit balance
        const customerIds = [...new Set(purchases.map(p => p.customer_id))];
        let creditBalance = 0;
        if (customerIds.length > 0) {
          const { data: creditAccounts } = await supabase
            .from('credit_accounts')
            .select('balance')
            .in('customer_id', customerIds);
          
          creditBalance = (creditAccounts || []).reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
        }

        setAnalyticsData({
          totalRevenue,
          activeSubscriptions,
          customerRetention,
          avgCustomerValue,
          monthlyGrowth: {
            revenue: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0,
            subs: prevActiveSubscriptions > 0 ? ((activeSubscriptions - prevActiveSubscriptions) / prevActiveSubscriptions) * 100 : 0,
            retention: customerRetention - prevRetention,
            avgValue: prevAvgCustomerValue > 0 ? ((avgCustomerValue - prevAvgCustomerValue) / prevAvgCustomerValue) * 100 : 0
          },
          planDistribution,
          monthlyTrends,
          topLocations,
          revenueByType: Object.values(revenueByType),
          customerLifetime: [], // Would need more complex calculation
          expiringPlans,
          creditBalance,
          totalCustomers
        });

      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast({ title: 'Error loading analytics', description: 'Please try again later', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user?.id, dateRange, locationFilter, permittedLocations.length]);

  const exportData = async () => {
    try {
      const csvData = [
        ['Metric', 'Value'],
        ['Total Revenue', `₹${analyticsData.totalRevenue.toLocaleString()}`],
        ['Active Subscriptions', analyticsData.activeSubscriptions.toString()],
        ['Customer Retention', `${analyticsData.customerRetention.toFixed(1)}%`],
        ['Average Customer Value', `₹${analyticsData.avgCustomerValue.toLocaleString()}`],
        ['Total Customers', analyticsData.totalCustomers.toString()],
        ['Expiring Plans (7 days)', analyticsData.expiringPlans.toString()],
        ['Total Credit Balance', `₹${analyticsData.creditBalance.toLocaleString()}`],
        ...analyticsData.planDistribution.map(plan => [
          `Plan: ${plan.name}`, 
          `${plan.count} customers, ₹${plan.revenue.toLocaleString()}`
        ])
      ];

      const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({ title: 'Export successful', description: 'Analytics data exported to CSV' });
    } catch (error) {
      toast({ title: 'Export failed', description: 'Could not export data', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics & Reports</h1>
          <p className="text-muted-foreground">Insights into your loyalty and subscription performance</p>
        </div>
        <div className="flex gap-2">
          <select 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          
          {!isManager && (
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="all">All Locations</option>
              {permittedLocations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}
          {isManager && permittedLocations.length > 0 && (
            <div className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-700">
              📍 {permittedLocations[0].name} (Your Location)
            </div>
          )}
          
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
            onClick={exportData}
            disabled={isLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-muted-foreground">Loading analytics...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                title: 'Total Revenue', 
                value: `₹${analyticsData.totalRevenue.toLocaleString()}`, 
                change: `${analyticsData.monthlyGrowth.revenue >= 0 ? '+' : ''}${analyticsData.monthlyGrowth.revenue.toFixed(1)}%`, 
                icon: TrendingUp,
                changeColor: analyticsData.monthlyGrowth.revenue >= 0 ? 'text-green-600' : 'text-red-600'
              },
              { 
                title: 'Active Subscriptions', 
                value: analyticsData.activeSubscriptions.toString(), 
                change: `${analyticsData.monthlyGrowth.subs >= 0 ? '+' : ''}${analyticsData.monthlyGrowth.subs.toFixed(1)}%`, 
                icon: BarChart3,
                changeColor: analyticsData.monthlyGrowth.subs >= 0 ? 'text-green-600' : 'text-red-600'
              },
              { 
                title: 'Customer Retention', 
                value: `${analyticsData.customerRetention.toFixed(1)}%`, 
                change: `${analyticsData.monthlyGrowth.retention >= 0 ? '+' : ''}${analyticsData.monthlyGrowth.retention.toFixed(1)}%`, 
                icon: Users,
                changeColor: analyticsData.monthlyGrowth.retention >= 0 ? 'text-green-600' : 'text-red-600'
              },
              { 
                title: 'Avg. Customer Value', 
                value: `₹${analyticsData.avgCustomerValue.toLocaleString()}`, 
                change: `${analyticsData.monthlyGrowth.avgValue >= 0 ? '+' : ''}${analyticsData.monthlyGrowth.avgValue.toFixed(1)}%`, 
                icon: Target,
                changeColor: analyticsData.monthlyGrowth.avgValue >= 0 ? 'text-green-600' : 'text-red-600'
              }
            ].map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.title} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Icon className="w-8 h-8 text-blue-600" />
                      <span className={`text-sm font-medium ${metric.changeColor}`}>{metric.change}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground mb-1">{metric.value}</div>
                    <div className="text-sm text-muted-foreground">{metric.title}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Total</span>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{analyticsData.totalCustomers}</div>
                <div className="text-sm text-muted-foreground">Total Customers</div>
              </CardContent>
            </Card>
            
            <Card className="animate-slide-up" style={{ animationDelay: '500ms' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">7 days</span>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{analyticsData.expiringPlans}</div>
                <div className="text-sm text-muted-foreground">Expiring Plans</div>
              </CardContent>
            </Card>
            
            <Card className="animate-slide-up" style={{ animationDelay: '600ms' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CreditCard className="w-8 h-8 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Balance</span>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">₹{analyticsData.creditBalance.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Credit Balance</div>
              </CardContent>
            </Card>
            
            <Card className="animate-slide-up" style={{ animationDelay: '700ms' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <MapPin className="w-8 h-8 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">Active</span>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{permittedLocations.length}</div>
                <div className="text-sm text-muted-foreground">Your Locations</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan Distribution */}
            <Card className="animate-fade-in" style={{ animationDelay: '800ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Plan Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.planDistribution.length > 0 ? (
                    analyticsData.planDistribution.map((plan, index) => (
                      <div key={plan.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-foreground">{plan.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">{plan.type} plan</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-foreground">{plan.count}</div>
                          <div className="text-sm text-muted-foreground">₹{plan.revenue.toLocaleString()}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No plan data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card className="animate-fade-in" style={{ animationDelay: '900ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-blue-600" />
                  Monthly Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.monthlyTrends.length > 0 ? (
                    analyticsData.monthlyTrends.map((trend, index) => (
                      <div key={trend.month} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div className="font-medium text-foreground">{trend.month}</div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-green-600">₹{trend.revenue.toLocaleString()}</span>
                          <span className="text-blue-600">{trend.subscriptions} subs</span>
                          <span className="text-purple-600">{trend.customers} customers</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <LineChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No trend data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Performance */}
          {analyticsData.topLocations.length > 0 && (
            <Card className="animate-fade-in" style={{ animationDelay: '1000ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Location Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analyticsData.topLocations.map((location, index) => (
                    <div key={location.id} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{location.name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">#{index + 1}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Revenue:</span>
                          <span className="font-medium text-green-600">₹{location.revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Customers:</span>
                          <span className="font-medium text-blue-600">{location.customers}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenue by Type */}
          {analyticsData.revenueByType.length > 0 && (
            <Card className="animate-fade-in" style={{ animationDelay: '1100ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Revenue by Plan Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analyticsData.revenueByType.map((type, index) => (
                    <div key={type.type} className="p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground mb-1">₹{type.revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground capitalize mb-2">{type.type} Plans</div>
                        <div className="text-xs text-blue-600">{type.count} subscriptions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}