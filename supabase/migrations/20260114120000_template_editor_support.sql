-- Add template editor support columns
-- Enables standalone template editing with relative due dates

-- Add reference_date_type: determines if dates are relative to start or target date
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS reference_date_type text DEFAULT 'start' 
  CHECK (reference_date_type IN ('start', 'target'));

-- Add skip_weekends: when true, only count business days for relative dates
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS skip_weekends boolean DEFAULT true;
