
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
BEGIN
  _company_name := NEW.raw_user_meta_data->>'company_name';
  _has_company_meta := _company_name IS NOT NULL AND _company_name <> '';

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
