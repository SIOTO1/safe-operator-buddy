
-- Create invite status enum
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Create user_invites table
CREATE TABLE public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role team_role NOT NULL DEFAULT 'staff'::team_role,
  invite_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status invite_status NOT NULL DEFAULT 'pending'::invite_status,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, email, status)
);

-- Create index on token for fast lookup
CREATE UNIQUE INDEX idx_user_invites_token ON public.user_invites(invite_token);

-- Enable RLS
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view their company's invites
CREATE POLICY "Users can view company invites"
ON public.user_invites
FOR SELECT
TO authenticated
USING (company_id = get_user_company_id());

-- Only admins can create invites
CREATE POLICY "Admins can create invites"
ON public.user_invites
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id()
  AND is_company_admin(auth.uid())
);

-- Only admins can update invites (revoke)
CREATE POLICY "Admins can update invites"
ON public.user_invites
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id()
  AND is_company_admin(auth.uid())
);

-- Service role can manage invites (for accept-invite function)
CREATE POLICY "Service role can manage invites"
ON public.user_invites
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
