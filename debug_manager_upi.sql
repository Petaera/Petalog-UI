-- Debug script to check manager UPI access issues

-- 1. Check if there are any UPI accounts in the database
SELECT 'Total UPI accounts' as check_type, count(*) as count
FROM owner_payment_details 
WHERE payment_method = 'upi' AND is_active = true;

-- 2. Check UPI accounts with location information
SELECT 'UPI accounts with locations' as check_type, 
       opd.id, 
       opd.account_name, 
       opd.upi_id, 
       opd.location_id,
       l.name as location_name
FROM owner_payment_details opd
LEFT JOIN locations l ON opd.location_id = l.id
WHERE opd.payment_method = 'upi' AND opd.is_active = true;

-- 3. Check manager users and their assigned locations
SELECT 'Manager users' as check_type,
       u.id,
       u.email,
       u.role,
       u.assigned_location,
       l.name as assigned_location_name
FROM users u
LEFT JOIN locations l ON u.assigned_location = l.id
WHERE u.role = 'manager';

-- 4. Check current RLS policies on owner_payment_details
SELECT 'Current RLS policies' as check_type,
       schemaname, 
       tablename, 
       policyname, 
       permissive, 
       roles, 
       cmd, 
       qual 
FROM pg_policies 
WHERE tablename = 'owner_payment_details';

-- 5. Test query: what a specific manager should see
-- Replace 'MANAGER_USER_ID' with actual manager ID
/*
SELECT 'What manager should see' as check_type,
       opd.id, 
       opd.account_name, 
       opd.upi_id, 
       opd.location_id,
       l.name as location_name
FROM owner_payment_details opd
LEFT JOIN locations l ON opd.location_id = l.id
WHERE opd.payment_method = 'upi' 
  AND opd.is_active = true
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = 'MANAGER_USER_ID'  -- Replace with actual manager ID
    AND users.role = 'manager'
    AND users.assigned_location = opd.location_id
  );
*/
