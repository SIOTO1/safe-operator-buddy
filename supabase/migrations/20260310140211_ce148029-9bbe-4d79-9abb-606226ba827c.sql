-- Fix: assign company to user whose company_id is null
-- Create a company for user 5456f073-3265-4b25-8554-a6d6dc32c465 if they don't have one
DO $$
DECLARE
  _company_id uuid;
  _user_id uuid := '5456f073-3265-4b25-8554-a6d6dc32c465';
BEGIN
  -- Check if user already has a company
  SELECT company_id INTO _company_id FROM public.profiles WHERE user_id = _user_id;
  
  IF _company_id IS NULL THEN
    -- Create a new company
    INSERT INTO public.companies (name) VALUES ('Sioto') RETURNING id INTO _company_id;
    
    -- Update the profile
    UPDATE public.profiles SET company_id = _company_id WHERE user_id = _user_id;
  END IF;
END $$;