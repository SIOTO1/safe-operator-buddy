
-- Add status column to events
ALTER TABLE public.events ADD COLUMN status TEXT NOT NULL DEFAULT 'upcoming';

-- Add review_link to organization_settings
ALTER TABLE public.organization_settings ADD COLUMN review_link TEXT DEFAULT NULL;

-- Add review_request_sent to events to track if review email was sent
ALTER TABLE public.events ADD COLUMN review_request_sent BOOLEAN NOT NULL DEFAULT false;
