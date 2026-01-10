-- Add subscriptions table for Stripe billing
-- Each organization has one subscription record

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  plan TEXT CHECK (plan IN ('trial', 'growth', 'scale')),
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),
  status TEXT CHECK (status IN ('trialing', 'active', 'canceled', 'past_due', 'unpaid', 'incomplete')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id),
  UNIQUE(stripe_customer_id)
);

-- Index for faster lookups
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their organization's subscription
CREATE POLICY "Users can view their org subscription"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.deleted_at IS NULL
    )
  );

-- Only allow updates via service role (webhook)
-- No direct user updates to subscription data

-- Add updated_at trigger
CREATE TRIGGER handle_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Comments for documentation
COMMENT ON TABLE subscriptions IS 'Stripe subscription data per organization';
COMMENT ON COLUMN subscriptions.plan IS 'Current plan: trial, growth, or scale';
COMMENT ON COLUMN subscriptions.status IS 'Stripe subscription status';
COMMENT ON COLUMN subscriptions.trial_ends_at IS 'When the 14-day trial ends';
