import { supabase } from './supabaseClient';

export async function createCustomer({ phone, name, email, own_id }) {
  const { data, error } = await supabase
    .from('customers')
    .insert([{ phone, name, email, own_id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPlans(ownerId) {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function enrollPurchase(payload) {
  // payload fields: p_plan_id, p_customer_id, p_vehicle_id, p_location_id, p_total_value, p_payment_method, p_created_by
  const { data, error } = await supabase.rpc('rpc_enroll_purchase', payload);
  if (error) throw error;
  return data;
}

export async function redeemVisit({ p_purchase_id, p_vehicle_id, p_customer_id, p_location_id, p_service_rendered, p_performed_by }) {
  const { data, error } = await supabase.rpc('rpc_redeem_visit', {
    p_purchase_id, p_vehicle_id, p_customer_id, p_location_id, p_service_rendered, p_performed_by
  });
  if (error) throw error;
  return data;
}
