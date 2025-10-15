import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  type: string;
  max_redemptions: number;
  price: number;
}

interface SubscriptionPurchase {
  id: string;
  plan_id: string;
  remaining_visits: number;
  remaining_value?: number;
  status: string;
  created_at: string;
  subscription_plans: SubscriptionPlan;
}

interface RedemptionResult {
  isRedemption: boolean;
  logId?: string;
  subscriptionName?: string;
  remainingVisits?: number;
  error?: string;
}

export const useLoyaltyRedemption = () => {
  const { user } = useAuth();
  const [usableSubscriptions, setUsableSubscriptions] = useState<SubscriptionPurchase[]>([]);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionPurchase | null>(null);
  const [useSubscriptionForRedemption, setUseSubscriptionForRedemption] = useState(false);

  // Fetch active subscriptions for a customer
  const fetchUsableSubscriptions = async (customerId: string): Promise<SubscriptionPurchase[]> => {
    try {
      console.log('🔍 Fetching usable subscriptions for customer:', customerId);

      const { data: subscriptions, error } = await supabase
        .from('subscription_purchases')
        .select(`
          id,
          plan_id,
          remaining_visits,
          remaining_value,
          status,
          created_at,
          subscription_plans!inner(
            id,
            name,
            type,
            max_redemptions,
            price
          )
        `)
        .eq('customer_id', customerId)
        .eq('status', 'active')
        .in('subscription_plans.type', ['package', 'visit', 'credit'])
        .order('created_at', { ascending: false }) as { data: any; error: any };

      if (error) {
        console.warn('❌ Error fetching usable subscriptions:', error);
        return [];
      }

      console.log('📊 Subscription query result:', subscriptions);
      // Filter by availability per plan type
      const filtered = (subscriptions || []).filter((s: any) => {
        const t = s?.subscription_plans?.type;
        if (t === 'credit') {
          return (s?.remaining_value ?? 0) > 0;
        }
        return (s?.remaining_visits ?? 0) > 0;
      });
      return filtered;
    } catch (error) {
      console.warn('❌ Error fetching usable subscriptions:', error);
      return [];
    }
  };

  // Check for active subscriptions and show modal if available
  const checkForActiveSubscriptions = async (customerId: string): Promise<boolean> => {
    console.log('🎯 Checking for active subscriptions for customer:', customerId);
    const subscriptions = await fetchUsableSubscriptions(customerId);
    console.log('📦 Found subscriptions:', subscriptions);
    setUsableSubscriptions(subscriptions);
    
    if (subscriptions.length > 0) {
      console.log('✅ Showing subscription modal - pausing form submission');
      setShowSubscriptionModal(true);
      return true; // Has subscriptions, will pause for user selection
    }
    
    console.log('❌ No subscriptions found, proceeding with normal payment');
    setUseSubscriptionForRedemption(false);
    setSelectedSubscription(null);
    return false; // No subscriptions, continue normally
  };

  // Process package redemption
  const processRedemption = async (
    customerId: string,
    vehicleId: string,
    service: string[],
    locationId: string,
    selectedSubscriptionId?: string,
    amountCharged?: number
  ): Promise<RedemptionResult> => {
    try {
      // If no subscription is selected for redemption, skip redemption processing
      if (!useSubscriptionForRedemption || !selectedSubscriptionId) {
        console.log('🚫 No subscription selected for redemption, skipping redemption processing');
        return { isRedemption: false };
      }

      // Find active package/visit subscriptions for this customer
      const { data: activeSubscriptions, error: subError } = await supabase
        .from('subscription_purchases')
        .select(`
          id,
          plan_id,
          remaining_visits,
          remaining_value,
          status,
          subscription_plans!inner(
            id,
            name,
            type,
            max_redemptions
          )
        `)
        .eq('customer_id', customerId)
        .eq('status', 'active')
        .in('subscription_plans.type', ['package', 'visit', 'credit']) as { data: any; error: any };

      if (subError) {
        console.warn('Error fetching active subscriptions:', subError);
        return { isRedemption: false };
      }

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        return { isRedemption: false };
      }

      // Use selected subscription if provided
      let subscription = activeSubscriptions.find(sub => sub.id === selectedSubscriptionId);
      
      if (!subscription) {
        console.warn('Selected subscription not found or not active');
        return { isRedemption: false };
      }

      const plan = subscription.subscription_plans;

      if (!plan) {
        return { isRedemption: false };
      }
      if (plan.type === 'credit') {
        const canCharge = (subscription.remaining_value ?? 0) >= (amountCharged ?? 0);
        if (!canCharge) return { isRedemption: false, error: 'Insufficient credit balance' };
      } else if ((subscription.remaining_visits ?? 0) <= 0) {
        return { isRedemption: false };
      }

      // Create loyalty_visits record for redemption
      const { data: loyaltyVisit, error: loyaltyError } = await supabase
        .from('loyalty_visits')
        .insert([{
          purchase_id: subscription.id,
          vehicle_id: vehicleId,
          customer_id: customerId,
          location_id: locationId,
          visit_type: 'redemption',
          service_rendered: service.join(', '),
          amount_charged: plan.type === 'credit' ? (amountCharged || 0) : 0, // Use amount for credit plans
          payment_method: 'subscription',
          created_by: user?.id,
          notes: `Package redemption from ${plan.name}`
        }])
        .select('id')
        .single();

      if (loyaltyError) {
        console.warn('Error creating loyalty visit:', loyaltyError);
        // Return error message for better user feedback
        return { 
          isRedemption: false, 
          error: loyaltyError.message || 'Redemption failed due to subscription constraints'
        };
      }

      // Read back updated subscription (DB trigger is expected to decrement/expire)
      const { data: updatedSubscription, error: subReadError } = await supabase
        .from('subscription_purchases')
        .select('remaining_visits, status')
        .eq('id', subscription.id)
        .single();

      if (subReadError) {
        console.warn('Error reading updated subscription after redemption:', subReadError);
      }

      const remainingVisitsAfter = updatedSubscription?.remaining_visits != null
        ? updatedSubscription.remaining_visits
        : Math.max(0, subscription.remaining_visits - 1);

      return {
        isRedemption: true,
        logId: loyaltyVisit.id,
        subscriptionName: plan.name,
        remainingVisits: remainingVisitsAfter
      };

    } catch (error) {
      console.warn('Error processing package redemption:', error);
      return { isRedemption: false };
    }
  };

  // Confirm subscription selection
  const confirmSubscriptionSelection = (subscription: SubscriptionPurchase) => {
    setSelectedSubscription(subscription);
    setUseSubscriptionForRedemption(true);
    setShowSubscriptionModal(false);
  };

  // Skip subscription and use normal payment
  const skipSubscription = () => {
    setUseSubscriptionForRedemption(false);
    setSelectedSubscription(null);
    setShowSubscriptionModal(false);
  };

  // Reset all subscription state
  const resetSubscriptionState = () => {
    setUseSubscriptionForRedemption(false);
    setSelectedSubscription(null);
    setUsableSubscriptions([]);
    setShowSubscriptionModal(false);
  };

  return {
    // State
    usableSubscriptions,
    showSubscriptionModal,
    selectedSubscription,
    useSubscriptionForRedemption,
    
    // Functions
    checkForActiveSubscriptions,
    processRedemption,
    confirmSubscriptionSelection,
    skipSubscription,
    resetSubscriptionState,
    setShowSubscriptionModal,
    fetchUsableSubscriptions,
    setSelectedSubscription,
    setUseSubscriptionForRedemption,
    setUsableSubscriptions,
  };
};

