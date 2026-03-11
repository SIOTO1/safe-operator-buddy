
-- Add slug column to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);

-- Function to generate a URL-safe slug from company name
CREATE OR REPLACE FUNCTION public.generate_company_slug(_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slug text;
  _count integer;
  _base_slug text;
BEGIN
  -- Convert to lowercase, replace non-alphanumeric with hyphens, trim hyphens
  _base_slug := regexp_replace(
    regexp_replace(lower(trim(_name)), '[^a-z0-9]+', '-', 'g'),
    '^-|-$', '', 'g'
  );
  
  -- Fallback if empty
  IF _base_slug = '' OR _base_slug IS NULL THEN
    _base_slug := 'company';
  END IF;
  
  _slug := _base_slug;
  _count := 0;
  
  -- Ensure uniqueness
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.companies WHERE slug = _slug);
    _count := _count + 1;
    _slug := _base_slug || '-' || _count;
  END LOOP;
  
  RETURN _slug;
END;
$$;

-- Backfill existing companies with slugs
UPDATE public.companies
SET slug = generate_company_slug(name)
WHERE slug IS NULL;

-- Make slug NOT NULL after backfill
ALTER TABLE public.companies ALTER COLUMN slug SET NOT NULL;

-- Update handle_new_user to accept company_name and phone, create workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _company_name text;
  _slug text;
  _is_first boolean;
BEGIN
  _is_first := (SELECT COUNT(*) = 0 FROM public.user_roles);
  _company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1) || '''s Company');

  IF _is_first THEN
    _slug := generate_company_slug(_company_name);
    
    INSERT INTO public.companies (name, slug)
    VALUES (_company_name, _slug)
    RETURNING id INTO _company_id;
    
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
    
    -- Create default "Main" workspace
    INSERT INTO public.workspaces (company_id, name)
    VALUES (_company_id, 'Main');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'crew');
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    _company_id
  );

  RETURN NEW;
END;
$$;
