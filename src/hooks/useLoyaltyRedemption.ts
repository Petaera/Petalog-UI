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
  status: string;
  created_at: string;
  subscription_plans: SubscriptionPlan;
}

interface RedemptionResult {
  isRedemption: boolean;
  logId?: string;
  subscriptionName?: string;
  remainingVisits?: number;
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
        .in('subscription_plans.type', ['package', 'visit'])
        .gt('remaining_visits', 0)
        .order('created_at', { ascending: false }) as { data: any; error: any };

      if (error) {
        console.warn('❌ Error fetching usable subscriptions:', error);
        return [];
      }

      console.log('📊 Subscription query result:', subscriptions);
      return subscriptions || [];
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
    selectedSubscriptionId?: string
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
        .in('subscription_plans.type', ['package', 'visit'])
        .gt('remaining_visits', 0) as { data: any; error: any };

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

      if (!plan || subscription.remaining_visits <= 0) {
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
          amount_charged: 0, // No payment for redemptions
          payment_method: 'subscription',
          created_by: user?.id,
          notes: `Package redemption from ${plan.name}`
        }])
        .select('id')
        .single();

      if (loyaltyError) {
        console.warn('Error creating loyalty visit:', loyaltyError);
        return { isRedemption: false };
      }

      // Decrement remaining visits
      const newRemainingVisits = Math.max(0, subscription.remaining_visits - 1);
      const shouldExpire = newRemainingVisits <= 0;

      const updateData: any = { remaining_visits: newRemainingVisits };
      if (shouldExpire) {
        updateData.status = 'expired';
      }

      const { error: updateError } = await supabase
        .from('subscription_purchases')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        console.warn('Error updating subscription visits:', updateError);
      }

      return { 
        isRedemption: true, 
        logId: loyaltyVisit.id,
        subscriptionName: plan.name,
        remainingVisits: newRemainingVisits
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

