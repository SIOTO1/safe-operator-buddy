export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      background_jobs: {
        Row: {
          attempts: number
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          max_attempts: number
          payload: Json
          priority: number
          processed_at: string | null
          scheduled_for: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type: Database["public"]["Enums"]["job_type"]
          max_attempts?: number
          payload?: Json
          priority?: number
          processed_at?: string | null
          scheduled_for?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          max_attempts?: number
          payload?: Json
          priority?: number
          processed_at?: string | null
          scheduled_for?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: []
      }
      booking_notes: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string
          id: string
          note: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by: string
          id?: string
          note: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          company_id: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          delivery_fee: number | null
          equipment: string[]
          event_date: string
          event_end_time: string | null
          event_id: string | null
          event_location: string
          event_time: string | null
          guest_count: number | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          special_requests: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          delivery_fee?: number | null
          equipment?: string[]
          event_date: string
          event_end_time?: string | null
          event_id?: string | null
          event_location: string
          event_time?: string | null
          guest_count?: number | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          special_requests?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_fee?: number | null
          equipment?: string[]
          event_date?: string
          event_end_time?: string | null
          event_id?: string | null
          event_location?: string
          event_time?: string | null
          guest_count?: number | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          special_requests?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_text: string
          created_at: string
          event_id: string | null
          id: string
          quote_id: string | null
          signature_image: string | null
          signed_at: string | null
          signed_by: string | null
        }
        Insert: {
          contract_text?: string
          created_at?: string
          event_id?: string | null
          id?: string
          quote_id?: string | null
          signature_image?: string | null
          signed_at?: string | null
          signed_by?: string | null
        }
        Update: {
          contract_text?: string
          created_at?: string
          event_id?: string | null
          id?: string
          quote_id?: string | null
          signature_image?: string | null
          signed_at?: string | null
          signed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_availability: {
        Row: {
          available_date: string
          created_at: string
          id: string
          is_available: boolean
          notes: string | null
          user_id: string
        }
        Insert: {
          available_date: string
          created_at?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          user_id: string
        }
        Update: {
          available_date?: string
          created_at?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_activity_log: {
        Row: {
          company_id: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          lead_id: string
          performed_by: string | null
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          lead_id: string
          performed_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          lead_id?: string
          performed_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string
          created_by: string
          expected_close_date: string | null
          id: string
          lead_id: string | null
          notes: string | null
          stage: string
          title: string
          updated_at: string
          value: number | null
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          stage?: string
          title: string
          updated_at?: string
          value?: number | null
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          stage?: string
          title?: string
          updated_at?: string
          value?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          stage: string
          updated_at: string
          value: number | null
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          value?: number | null
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          value?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          company_id: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          lead_id: string
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          lead_id: string
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          driver_id: string | null
          id: string
          name: string
          notes: string | null
          route_date: string
          status: string
          updated_at: string
          vehicle_id: string | null
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          driver_id?: string | null
          id?: string
          name: string
          notes?: string | null
          route_date: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          driver_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          route_date?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          license_number: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_certifications: {
        Row: {
          certificate_id: string | null
          certification_name: string
          certification_status: Database["public"]["Enums"]["certification_status"]
          created_at: string
          employee_id: string
          expiration_date: string | null
          id: string
          issued_date: string | null
        }
        Insert: {
          certificate_id?: string | null
          certification_name: string
          certification_status?: Database["public"]["Enums"]["certification_status"]
          created_at?: string
          employee_id: string
          expiration_date?: string | null
          id?: string
          issued_date?: string | null
        }
        Update: {
          certificate_id?: string | null
          certification_name?: string
          certification_status?: Database["public"]["Enums"]["certification_status"]
          created_at?: string
          employee_id?: string
          expiration_date?: string | null
          id?: string
          issued_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["employee_role"]
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["employee_role"]
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["employee_role"]
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_catalog: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_catalog_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inspections: {
        Row: {
          created_at: string
          id: string
          inspected_by: string
          inspection_date: string
          inspection_status: Database["public"]["Enums"]["inspection_status"]
          next_due_date: string | null
          notes: string | null
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspected_by: string
          inspection_date?: string
          inspection_status?: Database["public"]["Enums"]["inspection_status"]
          next_due_date?: string | null
          notes?: string | null
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inspected_by?: string
          inspection_date?: string
          inspection_status?: Database["public"]["Enums"]["inspection_status"]
          next_due_date?: string | null
          notes?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inspections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      event_assignments: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_equipment: {
        Row: {
          created_at: string
          equipment_name: string
          event_id: string
          id: string
          notes: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          equipment_name: string
          event_id: string
          id?: string
          notes?: string | null
          quantity?: number
        }
        Update: {
          created_at?: string
          equipment_name?: string
          event_id?: string
          id?: string
          notes?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_equipment_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_products: {
        Row: {
          created_at: string
          event_id: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff: {
        Row: {
          assigned_at: string
          employee_id: string
          event_id: string
          id: string
          role: Database["public"]["Enums"]["event_staff_role"]
        }
        Insert: {
          assigned_at?: string
          employee_id: string
          event_id: string
          id?: string
          role?: Database["public"]["Enums"]["event_staff_role"]
        }
        Update: {
          assigned_at?: string
          employee_id?: string
          event_id?: string
          id?: string
          role?: Database["public"]["Enums"]["event_staff_role"]
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          crew_needed: number
          end_time: string | null
          event_date: string
          id: string
          location: string | null
          notes: string | null
          quote_id: string | null
          review_request_sent: boolean
          start_time: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          crew_needed?: number
          end_time?: string | null
          event_date: string
          id?: string
          location?: string | null
          notes?: string | null
          quote_id?: string | null
          review_request_sent?: boolean
          start_time?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          crew_needed?: number
          end_time?: string | null
          event_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          quote_id?: string | null
          review_request_sent?: boolean
          start_time?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          created_at: string
          date_reported: string
          description: string
          equipment_product_id: string | null
          event_id: string
          id: string
          photo_urls: string[]
          reported_by_employee_id: string | null
          reported_by_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_reported?: string
          description: string
          equipment_product_id?: string | null
          event_id: string
          id?: string
          photo_urls?: string[]
          reported_by_employee_id?: string | null
          reported_by_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_reported?: string
          description?: string
          equipment_product_id?: string | null
          event_id?: string
          id?: string
          photo_urls?: string[]
          reported_by_employee_id?: string | null
          reported_by_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_equipment_product_id_fkey"
            columns: ["equipment_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_reported_by_employee_id_fkey"
            columns: ["reported_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          company_id: string
          coverage_amount: number
          created_at: string
          document_url: string | null
          effective_date: string
          expiration_date: string
          id: string
          policy_number: string
          provider: string
        }
        Insert: {
          company_id: string
          coverage_amount?: number
          created_at?: string
          document_url?: string | null
          effective_date: string
          expiration_date: string
          id?: string
          policy_number: string
          provider: string
        }
        Update: {
          company_id?: string
          coverage_amount?: number
          created_at?: string
          document_url?: string | null
          effective_date?: string
          expiration_date?: string
          id?: string
          policy_number?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          severity: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          severity?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          severity?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          address: string | null
          company_id: string | null
          company_name: string
          created_at: string
          default_delivery_fee: number | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          review_link: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string
          default_delivery_fee?: number | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          review_link?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string
          default_delivery_fee?: number | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          review_link?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string
          event_id: string | null
          id: string
          payment_method: string | null
          payment_status: string
          payment_type: string
          quote_id: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          stripe_session_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string
          payment_type?: string
          quote_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_session_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string
          payment_type?: string
          quote_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_session_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_tokens: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at?: string
          id?: string
          token?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number | null
          quantity_available: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          quantity_available?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          quantity_available?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          selected_workspace_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          selected_workspace_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          selected_workspace_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_selected_workspace_id_fkey"
            columns: ["selected_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          quote_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          lead_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["quote_status"]
          title: string
          total_amount: number | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          title?: string
          total_amount?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          title?: string
          total_amount?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_hits: {
        Row: {
          action: string
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      route_stops: {
        Row: {
          address: string | null
          created_at: string
          event_id: string | null
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          route_id: string
          stop_order: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          route_id: string
          stop_order?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          route_id?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity_notes: string | null
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          license_plate: string | null
          name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          capacity_notes?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          capacity_notes?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_event_products: {
        Args: { _event_id: string; _products: Json }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          _action: string
          _identifier: string
          _max_requests: number
          _window_seconds?: number
        }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enqueue_job: {
        Args: {
          _job_type: Database["public"]["Enums"]["job_type"]
          _payload?: Json
          _priority?: number
          _scheduled_for?: string
        }
        Returns: string
      }
      generate_company_slug: { Args: { _name: string }; Returns: string }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_org_settings_by_slug: {
        Args: { _slug: string }
        Returns: {
          address: string
          company_id: string
          company_name: string
          default_delivery_fee: number
          email: string
          logo_url: string
          phone: string
          review_link: string
          website: string
        }[]
      }
      get_product_availability: {
        Args: { _company_id: string; _date: string }
        Returns: {
          product_id: string
          units_allocated: number
        }[]
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_workspace_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_dashboard_stats: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "manager" | "crew"
      certification_status: "active" | "expired" | "pending" | "revoked"
      employee_role:
        | "driver"
        | "installer"
        | "crew_lead"
        | "warehouse"
        | "manager"
      employee_status: "active" | "inactive" | "on_leave"
      event_staff_role: "driver" | "setup_crew" | "supervisor"
      inspection_status: "pass" | "fail" | "needs_repair"
      job_status: "pending" | "processing" | "completed" | "failed" | "retrying"
      job_type:
        | "email_notification"
        | "balance_charge"
        | "weather_check"
        | "report_generation"
      product_category:
        | "inflatables"
        | "slides"
        | "foam_machines"
        | "tents"
        | "tables"
        | "chairs"
        | "generators"
        | "concessions"
        | "other"
      quote_status: "draft" | "sent" | "accepted" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "manager", "crew"],
      certification_status: ["active", "expired", "pending", "revoked"],
      employee_role: [
        "driver",
        "installer",
        "crew_lead",
        "warehouse",
        "manager",
      ],
      employee_status: ["active", "inactive", "on_leave"],
      event_staff_role: ["driver", "setup_crew", "supervisor"],
      inspection_status: ["pass", "fail", "needs_repair"],
      job_status: ["pending", "processing", "completed", "failed", "retrying"],
      job_type: [
        "email_notification",
        "balance_charge",
        "weather_check",
        "report_generation",
      ],
      product_category: [
        "inflatables",
        "slides",
        "foam_machines",
        "tents",
        "tables",
        "chairs",
        "generators",
        "concessions",
        "other",
      ],
      quote_status: ["draft", "sent", "accepted", "expired"],
    },
  },
} as const
