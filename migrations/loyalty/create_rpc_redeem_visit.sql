-- Create the rpc_redeem_visit stored procedure
-- This function handles visit redemption with proper validation

CREATE OR REPLACE FUNCTION public.rpc_redeem_visit(
  p_purchase_id uuid,
  p_vehicle_id uuid,
  p_customer_id uuid,
  p_location_id uuid,
  p_service_rendered text DEFAULT NULL,
  p_performed_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purchase_record record;
  plan_record record;
  loyalty_visit_id uuid;
  result json;
BEGIN
  -- Validate purchase exists and is active
  SELECT * INTO purchase_record
  FROM subscription_purchases
  WHERE id = p_purchase_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Purchase not found or inactive');
  END IF;

  -- Get plan details
  SELECT * INTO plan_record
  FROM subscription_plans
  WHERE id = purchase_record.plan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Plan not found');
  END IF;

  -- Check expiry
  IF purchase_record.expiry_date IS NOT NULL AND purchase_record.expiry_date < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Subscription has expired');
  END IF;

  -- Validate remaining visits/credits based on plan type
  IF plan_record.type IN ('visit', 'package') THEN
    IF COALESCE(purchase_record.remaining_visits, 0) <= 0 THEN
      RETURN json_build_object('success', false, 'error', 'No remaining visits');
    END IF;
  ELSIF plan_record.type = 'credit' THEN
    IF COALESCE(purchase_record.remaining_value, 0) <= 0 THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient credit balance');
    END IF;
  END IF;

  -- Create loyalty visit record (triggers will handle the accounting)
  INSERT INTO loyalty_visits (
    purchase_id,
    vehicle_id,
    customer_id,
    location_id,
    visit_type,
    service_rendered,
    amount_charged,
    payment_method,
    created_by
  ) VALUES (
    p_purchase_id,
    p_vehicle_id,
    p_customer_id,
    p_location_id,
    'redemption',
    p_service_rendered,
    CASE WHEN plan_record.type = 'credit' THEN 0 ELSE 0 END, -- For credit plans, amount_charged should be set by caller
    'subscription',
    p_performed_by
  ) RETURNING id INTO loyalty_visit_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'loyalty_visit_id', loyalty_visit_id,
    'plan_name', plan_record.name,
    'plan_type', plan_record.type
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_redeem_visit TO authenticated;
