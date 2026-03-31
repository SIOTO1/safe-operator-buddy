
-- Add Stripe Connect fields to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_fee_percent numeric NOT NULL DEFAULT 5.0;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_account_id ON public.companies (stripe_account_id) WHERE stripe_account_id IS NOT NULL;
