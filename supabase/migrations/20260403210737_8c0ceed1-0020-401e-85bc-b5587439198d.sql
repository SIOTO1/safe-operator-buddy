-- Remove the stale 'crew' role for pao (should be manager only)
DELETE FROM public.user_roles 
WHERE user_id = '606368cf-b2c2-4233-841b-1ef3d6456693' 
AND role = 'crew';

-- Fix handle_new_user trigger to not assign crew role when user is created via admin API (invite flow)
-- The invite acceptance function handles role assignment itself
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _company_id uuid;
  _company_name text;
  _slug text;
  _has_company_meta boolean;
  _is_invite_user boolean;
BEGIN
  _company_name := NEW.raw_user_meta_data->>'company_name';
  _has_company_meta := _company_name IS NOT NULL AND _company_name <> '';

  -- Check if user was created via admin API (invite flow) - these users
  -- have their roles and profiles managed by the accept-invite function
  _is_invite_user := EXISTS (
    SELECT 1 FROM public.user_invites 
    WHERE email = NEW.email AND status = 'pending'
  );

  IF _is_invite_user THEN
    -- Skip role and profile creation - accept-invite handles this
    RETURN NEW;
  END IF;

  IF _has_company_meta THEN
    -- Signup with company_name metadata → create company + owner
    _slug := generate_company_slug(_company_name);
    
    INSERT INTO public.companies (name, slug)
    VALUES (_company_name, _slug)
    RETURNING id INTO _company_id;
    
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
    
    -- Create default "Main" workspace
    INSERT INTO public.workspaces (company_id, name)
    VALUES (_company_id, 'Main');
  ELSE
    -- No company metadata → crew member joining existing company
    _company_name := split_part(NEW.email, '@', 1) || '''s Company';
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
$function$;