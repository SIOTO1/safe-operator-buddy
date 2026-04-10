-- ============================================================
-- Migration: Add missing tables for Knowledge Base, Checklists,
-- Waivers, Conversation Guides, and SOPs
-- ============================================================

-- ============================================================
-- 1. knowledge_articles
-- ============================================================
CREATE TABLE public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  sort_order INT NOT NULL DEFAULT 0,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global or company articles"
  ON public.knowledge_articles FOR SELECT TO authenticated
  USING (is_global = true OR company_id = get_user_company_id());

CREATE POLICY "Managers can insert company articles"
  ON public.knowledge_articles FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company articles"
  ON public.knowledge_articles FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company articles"
  ON public.knowledge_articles FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. checklists + checklist_items
-- ============================================================
CREATE TABLE public.checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company checklists"
  ON public.checklists FOR SELECT TO authenticated
  USING (is_template = true OR company_id = get_user_company_id());

CREATE POLICY "Managers can insert company checklists"
  ON public.checklists FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company checklists"
  ON public.checklists FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company checklists"
  ON public.checklists FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER update_checklists_updated_at
  BEFORE UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Checklist items (individual check items within a checklist)
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES public.checklists(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist items"
  ON public.checklist_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists c
      WHERE c.id = checklist_id
      AND (c.is_template = true OR c.company_id = get_user_company_id())
    )
  );

CREATE POLICY "Managers can insert checklist items"
  ON public.checklist_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists c
      WHERE c.id = checklist_id
      AND c.company_id = get_user_company_id()
      AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
    )
  );

CREATE POLICY "Managers can update checklist items"
  ON public.checklist_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists c
      WHERE c.id = checklist_id
      AND c.company_id = get_user_company_id()
      AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
    )
  );

CREATE POLICY "Managers can delete checklist items"
  ON public.checklist_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists c
      WHERE c.id = checklist_id
      AND c.company_id = get_user_company_id()
      AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
    )
  );

-- Checklist completions (tracks which items a user has checked for a given event)
CREATE TABLE public.checklist_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES public.checklists(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.checklist_items(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL DEFAULT auth.uid(),
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (checklist_id, item_id, event_id, completed_by)
);

ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions"
  ON public.checklist_completions FOR SELECT TO authenticated
  USING (completed_by = auth.uid());

CREATE POLICY "Users can insert own completions"
  ON public.checklist_completions FOR INSERT TO authenticated
  WITH CHECK (completed_by = auth.uid());

CREATE POLICY "Users can delete own completions"
  ON public.checklist_completions FOR DELETE TO authenticated
  USING (completed_by = auth.uid());

-- ============================================================
-- 3. waivers
-- ============================================================
CREATE TABLE public.waivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL,
  participant_age TEXT,
  participant_email TEXT,
  participant_phone TEXT,
  guardian_name TEXT,
  guardian_relationship TEXT,
  event_date DATE,
  event_location TEXT,
  equipment_types TEXT[] DEFAULT '{}',
  signature_data TEXT,
  guardian_signature_data TEXT,
  acknowledged_risks BOOLEAN NOT NULL DEFAULT false,
  acknowledged_rules BOOLEAN NOT NULL DEFAULT false,
  acknowledged_medical BOOLEAN NOT NULL DEFAULT false,
  pdf_url TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company waivers"
  ON public.waivers FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert company waivers"
  ON public.waivers FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Managers can update company waivers"
  ON public.waivers FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company waivers"
  ON public.waivers FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

-- ============================================================
-- 4. conversation_guides
-- ============================================================
CREATE TABLE public.conversation_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  context TEXT NOT NULL DEFAULT '',
  do_list TEXT[] DEFAULT '{}',
  dont_list TEXT[] DEFAULT '{}',
  script TEXT NOT NULL DEFAULT '',
  follow_up TEXT NOT NULL DEFAULT '',
  is_global BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global or company guides"
  ON public.conversation_guides FOR SELECT TO authenticated
  USING (is_global = true OR company_id = get_user_company_id());

CREATE POLICY "Managers can insert company guides"
  ON public.conversation_guides FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company guides"
  ON public.conversation_guides FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company guides"
  ON public.conversation_guides FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER update_conversation_guides_updated_at
  BEFORE UPDATE ON public.conversation_guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. sops (Standard Operating Procedures)
-- ============================================================
CREATE TABLE public.sops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  flashcard_question TEXT,
  flashcard_answer TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global or company sops"
  ON public.sops FOR SELECT TO authenticated
  USING (is_global = true OR company_id = get_user_company_id());

CREATE POLICY "Managers can insert company sops"
  ON public.sops FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company sops"
  ON public.sops FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company sops"
  ON public.sops FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER update_sops_updated_at
  BEFORE UPDATE ON public.sops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. driver_compliance (tracks driver rule acknowledgements,
--    inspections, and compliance — linked to existing drivers table)
-- ============================================================
CREATE TABLE public.driver_compliance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  compliance_type TEXT NOT NULL, -- 'rule_ack', 'inspection', 'compliance_check'
  item_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company driver compliance"
  ON public.driver_compliance FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Managers can insert driver compliance"
  ON public.driver_compliance FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update driver compliance"
  ON public.driver_compliance FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete driver compliance"
  ON public.driver_compliance FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER update_driver_compliance_updated_at
  BEFORE UPDATE ON public.driver_compliance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
