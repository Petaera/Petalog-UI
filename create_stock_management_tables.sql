-- Create Stock Management Tables for Payroll Module
-- This script creates tables to manage inventory/stock items for each branch

-- 1. Create stock_items table
CREATE TABLE IF NOT EXISTS stock_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    quantity numeric(10, 2) NOT NULL DEFAULT 0,
    unit text DEFAULT 'pcs', -- units like 'pcs', 'kg', 'liters', 'boxes', etc.
    min_stock_level numeric(10, 2) DEFAULT 0, -- alert when stock goes below this
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- 2. Create stock_transactions table to track all stock movements
CREATE TABLE IF NOT EXISTS stock_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    stock_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    branch_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('add', 'remove', 'adjust', 'initial')),
    quantity numeric(10, 2) NOT NULL,
    previous_quantity numeric(10, 2), -- quantity before this transaction
    new_quantity numeric(10, 2), -- quantity after this transaction
    notes text,
    created_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT NOW()
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_items_branch_id ON stock_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_active ON stock_items(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_item_id ON stock_transactions(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_branch_id ON stock_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at ON stock_transactions(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for stock_items
-- Policy: Users can view stock items for branches they have access to
CREATE POLICY "Users can view stock items for their branches" ON stock_items
    FOR SELECT USING (
        branch_id IN (
            -- Owner's own branches
            SELECT id FROM public.locations 
            WHERE own_id = (SELECT own_id FROM public.users WHERE id = auth.uid())
            -- Or branches through partnerships
            UNION
            SELECT location_id FROM public.location_owners 
            WHERE owner_id = auth.uid()
            -- Or manager's assigned branch
            UNION
            SELECT assigned_location FROM public.users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Policy: Only owners and managers can insert stock items
CREATE POLICY "Owners and managers can insert stock items" ON stock_items
    FOR INSERT WITH CHECK (
        branch_id IN (
            SELECT id FROM public.locations 
            WHERE own_id = (SELECT own_id FROM public.users WHERE id = auth.uid())
            UNION
            SELECT location_id FROM public.location_owners 
            WHERE owner_id = auth.uid()
            UNION
            SELECT assigned_location FROM public.users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Policy: Only owners and managers can update stock items
CREATE POLICY "Owners and managers can update stock items" ON stock_items
    FOR UPDATE USING (
        branch_id IN (
            SELECT id FROM public.locations 
            WHERE own_id = (SELECT own_id FROM public.users WHERE id = auth.uid())
            UNION
            SELECT location_id FROM public.location_owners 
            WHERE owner_id = auth.uid()
            UNION
            SELECT assigned_location FROM public.users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Policy: Only owners can delete stock items
CREATE POLICY "Owners can delete stock items" ON stock_items
    FOR DELETE USING (
        branch_id IN (
            SELECT id FROM public.locations 
            WHERE own_id = (SELECT own_id FROM public.users WHERE id = auth.uid())
            UNION
            SELECT location_id FROM public.location_owners 
            WHERE owner_id = auth.uid()
        )
    );

-- 6. Create RLS policies for stock_transactions
-- Policy: Users can view transactions for branches they have access to
CREATE POLICY "Users can view stock transactions for their branches" ON stock_transactions
    FOR SELECT USING (
        branch_id IN (
            SELECT id FROM public.locations 
            WHERE own_id = (SELECT own_id FROM public.users WHERE id = auth.uid())
            UNION
            SELECT location_id FROM public.location_owners 
            WHERE owner_id = auth.uid()
            UNION
            SELECT assigned_location FROM public.users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Policy: Only owners and managers can insert transactions
CREATE POLICY "Owners and managers can insert stock transactions" ON stock_transactions
    FOR INSERT WITH CHECK (
        branch_id IN (
            SELECT id FROM public.locations 
            WHERE own_id = (SELECT own_id FROM public.users WHERE id = auth.uid())
            UNION
            SELECT location_id FROM public.location_owners 
            WHERE owner_id = auth.uid()
            UNION
            SELECT assigned_location FROM public.users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- 7. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to update updated_at automatically
CREATE TRIGGER trigger_update_stock_items_updated_at
    BEFORE UPDATE ON stock_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_items_updated_at();

-- 9. Create function to automatically record transaction when stock quantity changes
CREATE OR REPLACE FUNCTION record_stock_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record transaction if quantity actually changed
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
        INSERT INTO stock_transactions (
            stock_item_id,
            branch_id,
            transaction_type,
            quantity,
            previous_quantity,
            new_quantity,
            notes,
            created_by
        ) VALUES (
            NEW.id,
            NEW.branch_id,
            CASE 
                WHEN NEW.quantity > OLD.quantity THEN 'add'
                WHEN NEW.quantity < OLD.quantity THEN 'remove'
                ELSE 'adjust'
            END,
            ABS(NEW.quantity - OLD.quantity),
            OLD.quantity,
            NEW.quantity,
            'Automatic transaction from quantity update',
            NEW.created_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to record transactions automatically
CREATE TRIGGER trigger_record_stock_transaction
    AFTER UPDATE OF quantity ON stock_items
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION record_stock_transaction();

COMMENT ON TABLE stock_items IS 'Stores inventory items for each branch/location';
COMMENT ON TABLE stock_transactions IS 'Stores all stock movement history (add, remove, adjustments)';

