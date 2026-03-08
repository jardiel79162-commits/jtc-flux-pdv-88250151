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
      admin_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          is_system: boolean
          sender_type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          is_system?: boolean
          sender_type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          is_system?: boolean
          sender_type?: string
          user_id?: string
        }
        Relationships: []
      }
      auri_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auri_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "auri_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "auri_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_cpfs: {
        Row: {
          cpf: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          cpf: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_shortcuts: {
        Row: {
          created_at: string
          created_by: string
          icon_url: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      customer_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          description: string | null
          id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          current_balance: number | null
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          current_balance?: number | null
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          current_balance?: number | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          customer_email: string | null
          document_type: string | null
          id: string
          recipient_email: string | null
          sale_id: string | null
          sender_email: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          document_type?: string | null
          id?: string
          recipient_email?: string | null
          sale_id?: string | null
          sender_email?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          document_type?: string | null
          id?: string
          recipient_email?: string | null
          sale_id?: string | null
          sender_email?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          attempts: number | null
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      employee_permissions: {
        Row: {
          allowed: boolean | null
          employee_id: string
          id: string
          permission_key: string
        }
        Insert: {
          allowed?: boolean | null
          employee_id: string
          id?: string
          permission_key: string
        }
        Update: {
          allowed?: boolean | null
          employee_id?: string
          id?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_used: boolean | null
          owner_user_id: string | null
          used_by_user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_used?: boolean | null
          owner_user_id?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_used?: boolean | null
          owner_user_id?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      invite_ip_usage: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          ip_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          ip_address: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          ip_address?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          doc_type: string
          id: string
          title: string
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          content?: string
          doc_type: string
          id?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          content?: string
          doc_type?: string
          id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      prize_wheel_spins: {
        Row: {
          created_at: string
          id: string
          is_used: boolean
          prize_days: number | null
          prize_label: string | null
          referral_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_used?: boolean
          prize_days?: number | null
          prize_label?: string | null
          referral_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_used?: boolean
          prize_days?: number | null
          prize_label?: string | null
          referral_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_wheel_spins_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_code: string
          image_url: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_code: string
          image_url: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_code?: string
          image_url?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          internal_code: string | null
          is_active: boolean | null
          min_stock_quantity: number | null
          name: string
          photos: string[] | null
          price: number
          product_type: string | null
          promotional_price: number | null
          stock_quantity: number
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          internal_code?: string | null
          is_active?: boolean | null
          min_stock_quantity?: number | null
          name: string
          photos?: string[] | null
          price?: number
          product_type?: string | null
          promotional_price?: number | null
          stock_quantity?: number
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          internal_code?: string | null
          is_active?: boolean | null
          min_stock_quantity?: number | null
          name?: string
          photos?: string[] | null
          price?: number
          product_type?: string | null
          promotional_price?: number | null
          stock_quantity?: number
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cep: string | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          invite_code: string | null
          is_blocked: boolean | null
          neighborhood: string | null
          number: string | null
          phone: string | null
          referred_by_code: string | null
          state: string | null
          street: string | null
          subscription_ends_at: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          terms_version: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          invite_code?: string | null
          is_blocked?: boolean | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          referred_by_code?: string | null
          state?: string | null
          street?: string | null
          subscription_ends_at?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          invite_code?: string | null
          is_blocked?: boolean | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          referred_by_code?: string | null
          state?: string | null
          street?: string | null
          subscription_ends_at?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string | null
          product_name: string | null
          purchase_date: string | null
          quantity: number
          supplier_id: string | null
          total_cost: number
          unit_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          purchase_date?: string | null
          quantity?: number
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          purchase_date?: string | null
          quantity?: number
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          applied_at: string
          days_added: number
          id: string
          referral_id: string
          reward_type: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          days_added?: number
          id?: string
          referral_id: string
          reward_type?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          days_added?: number
          id?: string
          referral_id?: string
          reward_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          fraud_reasons: Json | null
          fraud_score: number
          id: string
          ip_address: string | null
          referral_code: string
          referred_user_id: string | null
          referrer_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reward_applied: boolean
          status: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          fraud_reasons?: Json | null
          fraud_score?: number
          id?: string
          ip_address?: string | null
          referral_code: string
          referred_user_id?: string | null
          referrer_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_applied?: boolean
          status?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          fraud_reasons?: Json | null
          fraud_score?: number
          id?: string
          ip_address?: string | null
          referral_code?: string
          referred_user_id?: string | null
          referrer_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_applied?: boolean
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          cost_price: number | null
          created_at: string
          id: string
          product_id: string | null
          product_name: string | null
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          sale_id: string
          unit_price?: number
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          change_amount: number | null
          created_at: string
          credit_used: number | null
          customer_id: string | null
          customer_name: string | null
          discount: number | null
          id: string
          payment_method: string
          payment_status: string | null
          payments: Json | null
          remaining_amount: number | null
          remaining_payment_method: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          change_amount?: number | null
          created_at?: string
          credit_used?: number | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          payment_method?: string
          payment_status?: string | null
          payments?: Json | null
          remaining_amount?: number | null
          remaining_payment_method?: string | null
          total_amount?: number
          user_id: string
        }
        Update: {
          change_amount?: number | null
          created_at?: string
          credit_used?: number | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          payment_method?: string
          payment_status?: string | null
          payments?: Json | null
          remaining_amount?: number | null
          remaining_payment_method?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_integrations: {
        Row: {
          created_at: string
          encrypted_token: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_token?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_token?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          category: string | null
          commercial_phone: string | null
          created_at: string
          hide_trial_message: boolean | null
          id: string
          logo_url: string | null
          mercado_pago_cpf: string | null
          mercado_pago_name: string | null
          multi_employees_enabled: boolean | null
          operation_type: string | null
          pix_key: string | null
          pix_key_type: string | null
          pix_mode: string | null
          pix_receiver_name: string | null
          primary_color: string | null
          quick_actions_enabled: boolean | null
          store_address: string | null
          store_name: string | null
          store_slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          commercial_phone?: string | null
          created_at?: string
          hide_trial_message?: boolean | null
          id?: string
          logo_url?: string | null
          mercado_pago_cpf?: string | null
          mercado_pago_name?: string | null
          multi_employees_enabled?: boolean | null
          operation_type?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_mode?: string | null
          pix_receiver_name?: string | null
          primary_color?: string | null
          quick_actions_enabled?: boolean | null
          store_address?: string | null
          store_name?: string | null
          store_slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          commercial_phone?: string | null
          created_at?: string
          hide_trial_message?: boolean | null
          id?: string
          logo_url?: string | null
          mercado_pago_cpf?: string | null
          mercado_pago_name?: string | null
          multi_employees_enabled?: boolean | null
          operation_type?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_mode?: string | null
          pix_receiver_name?: string | null
          primary_color?: string | null
          quick_actions_enabled?: boolean | null
          store_address?: string | null
          store_name?: string | null
          store_slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          days_to_add: number
          id: string
          mercado_pago_payment_id: string | null
          mercado_pago_pix_copy_paste: string | null
          mercado_pago_qr_code: string | null
          mercado_pago_qr_code_base64: string | null
          paid_at: string | null
          payment_id: string | null
          plan_type: string
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          ticket_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          days_to_add?: number
          id?: string
          mercado_pago_payment_id?: string | null
          mercado_pago_pix_copy_paste?: string | null
          mercado_pago_qr_code?: string | null
          mercado_pago_qr_code_base64?: string | null
          paid_at?: string | null
          payment_id?: string | null
          plan_type: string
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          ticket_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          days_to_add?: number
          id?: string
          mercado_pago_payment_id?: string | null
          mercado_pago_pix_copy_paste?: string | null
          mercado_pago_qr_code?: string | null
          mercado_pago_qr_code_base64?: string | null
          paid_at?: string | null
          payment_id?: string | null
          plan_type?: string
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          ticket_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          badge: string | null
          created_at: string
          days: number
          features: string[]
          id: string
          is_active: boolean
          name: string
          plan_key: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          days?: number
          features?: string[]
          id?: string
          is_active?: boolean
          name: string
          plan_key: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          days?: number
          features?: string[]
          id?: string
          is_active?: boolean
          name?: string
          plan_key?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          cnpj: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_admins: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings_global: {
        Row: {
          id: string
          maintenance_image_url: string | null
          maintenance_message: string | null
          maintenance_mode: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          maintenance_image_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          maintenance_image_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_redemption_codes: {
        Row: {
          benefit_type: string | null
          code: string
          created_at: string
          days_added: number | null
          id: string
          is_used: boolean | null
          user_id: string
          week_start: string
        }
        Insert: {
          benefit_type?: string | null
          code: string
          created_at?: string
          days_added?: number | null
          id?: string
          is_used?: boolean | null
          user_id: string
          week_start: string
        }
        Update: {
          benefit_type?: string | null
          code?: string
          created_at?: string
          days_added?: number | null
          id?: string
          is_used?: boolean | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_weekly_code_for_user:
        | { Args: { p_user_id: string }; Returns: string }
        | {
            Args: { p_code: string; p_user_id: string; p_week_start: string }
            Returns: string
          }
      get_profile_created_at_by_email: {
        Args: { p_email: string }
        Returns: {
          created_at: string
        }[]
      }
      get_user_email_by_cpf: {
        Args: { search_cpf: string }
        Returns: {
          email: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cpf_blocked: { Args: { check_cpf: string }; Returns: boolean }
      is_system_admin: { Args: { _user_id: string }; Returns: boolean }
      redeem_weekly_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      validate_invite_code: {
        Args: { code: string }
        Returns: {
          is_already_used: boolean
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
