-- Add branding toggle columns for organizations and spaces
-- These control whether "Powered by Borda" footer is shown

-- Organization-level branding setting (default: true = show branding)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS show_borda_branding boolean DEFAULT true;

-- Space-level branding setting (default: true = show branding)
-- This allows per-space override if the org-level setting allows it
ALTER TABLE spaces 
ADD COLUMN IF NOT EXISTS show_borda_branding boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN organizations.show_borda_branding IS 'Whether to show "Powered by Borda" branding. Only Scale plan can set this to false.';
COMMENT ON COLUMN spaces.show_borda_branding IS 'Per-space branding override. Only effective if org-level setting and plan allow it.';
