-- Add month and year columns to payment_data table for salary payments
-- This will help track which month/year the salary payment is for

ALTER TABLE payment_data 
ADD COLUMN salary_month INTEGER,
ADD COLUMN salary_year INTEGER;

-- Add comments to explain the columns
COMMENT ON COLUMN payment_data.salary_month IS 'Month (1-12) for which salary payment is made, NULL for non-salary payments';
COMMENT ON COLUMN payment_data.salary_year IS 'Year for which salary payment is made, NULL for non-salary payments';

-- Create an index for better query performance when filtering by salary month/year
CREATE INDEX idx_payment_data_salary_period ON payment_data(salary_month, salary_year) WHERE salary_month IS NOT NULL AND salary_year IS NOT NULL;

-- Optional: Update existing salary payments to have current month/year (if needed)
-- UPDATE payment_data 
-- SET salary_month = EXTRACT(MONTH FROM payment_date),
--     salary_year = EXTRACT(YEAR FROM payment_date)
-- WHERE type = 'Salary' AND salary_month IS NULL;

-- Useful queries for salary payment tracking:

-- 1. Get all salary payments for a specific month/year
-- SELECT pd.*, s.name as staff_name
-- FROM payment_data pd
-- JOIN staff s ON pd.staff_id = s.id
-- WHERE pd.type = 'Salary' 
--   AND pd.salary_month = 12 
--   AND pd.salary_year = 2024;

-- 2. Get total salary payments by month/year
-- SELECT salary_month, salary_year, SUM(amount) as total_amount, COUNT(*) as payment_count
-- FROM payment_data 
-- WHERE type = 'Salary' 
--   AND salary_month IS NOT NULL 
--   AND salary_year IS NOT NULL
-- GROUP BY salary_month, salary_year
-- ORDER BY salary_year, salary_month;

-- 3. Get staff-wise salary payments for a specific period
-- SELECT s.name, pd.salary_month, pd.salary_year, pd.amount, pd.payment_date
-- FROM payment_data pd
-- JOIN staff s ON pd.staff_id = s.id
-- WHERE pd.type = 'Salary' 
--   AND pd.salary_year = 2024
-- ORDER BY s.name, pd.salary_month;
