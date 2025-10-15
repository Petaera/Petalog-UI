-- Create the rpc_enroll_purchase stored procedure
-- This function handles subscription enrollment with proper validation and initialization

CREATE OR REPLACE FUNCTION public.rpc_enroll_purchase(
  p_plan_id uuid,
  p_customer_id uuid,
  p_vehicle_id uuid DEFAULT NULL,
  p_location_id uuid DEFAULT NULL,
  p_total_value numeric DEFAULT 0,
  p_payment_method text DEFAULT 'cash',
  p_created_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_record record;
  customer_record record;
  vehicle_record record;
  location_record record;
  new_purchase_id uuid;
  result json;
BEGIN
  -- Validate plan exists and is active
  SELECT * INTO plan_record FROM subscription_plans WHERE id = p_plan_id AND active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Plan not found or inactive');
  END IF;

  -- Validate customer exists
  SELECT * INTO customer_record FROM customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Validate location if provided
  IF p_location_id IS NOT NULL THEN
    SELECT * INTO location_record FROM locations WHERE id = p_location_id;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Location not found');
    END IF;
  END IF;

  -- Validate vehicle if provided (for visit/package plans)
  IF p_vehicle_id IS NOT NULL THEN
    SELECT * INTO vehicle_record FROM vehicles WHERE id = p_vehicle_id;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Vehicle not found');
    END IF;
  END IF;

  -- For visit/package plans, vehicle is required
  IF plan_record.type IN ('visit', 'package') AND p_vehicle_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vehicle required for visit/package plans');
  END IF;

  -- Create the subscription purchase
  INSERT INTO subscription_purchases (
    plan_id,
    customer_id,
    vehicle_id,
    location_id,
    total_value,
    source_payment_method,
    created_by
  ) VALUES (
    p_plan_id,
    p_customer_id,
    p_vehicle_id,
    p_location_id,
    p_total_value,
    p_payment_method,
    p_created_by
  ) RETURNING id INTO new_purchase_id;

  -- Create payment record if amount > 0
  IF p_total_value > 0 THEN
    INSERT INTO subscription_payments (
      purchase_id,
      customer_id,
      amount,
      payment_method,
      created_by
    ) VALUES (
      new_purchase_id,
      p_customer_id,
      p_total_value,
      p_payment_method,
      p_created_by
    );
  END IF;

  -- Return success with purchase ID
  RETURN json_build_object(
    'success', true,
    'purchase_id', new_purchase_id,
    'plan_name', plan_record.name,
    'plan_type', plan_record.type
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_enroll_purchase TO authenticated;
