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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_chat_usage: {
        Row: {
          client_hash: string
          created_at: string
          id: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          client_hash: string
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          window_start: string
        }
        Update: {
          client_hash?: string
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      ai_lead_events: {
        Row: {
          channel: string
          created_at: string
          delivery_status: string
          from_status: string | null
          id: string
          lead_id: string
          note: string | null
          response_body: string | null
          response_code: number | null
          to_status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          delivery_status?: string
          from_status?: string | null
          id?: string
          lead_id: string
          note?: string | null
          response_body?: string | null
          response_code?: number | null
          to_status: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          delivery_status?: string
          from_status?: string | null
          id?: string
          lead_id?: string
          note?: string | null
          response_body?: string | null
          response_code?: number | null
          to_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ai_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_leads: {
        Row: {
          carrier_need: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          last_notified_status: string | null
          node_count: string | null
          organization: string | null
          phone: string | null
          plan: Json | null
          proposal_ref: string | null
          qualification_score: number | null
          status: string
          summary: string | null
          transcript: Json | null
          urgency: string | null
          use_case: string | null
        }
        Insert: {
          carrier_need?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_notified_status?: string | null
          node_count?: string | null
          organization?: string | null
          phone?: string | null
          plan?: Json | null
          proposal_ref?: string | null
          qualification_score?: number | null
          status?: string
          summary?: string | null
          transcript?: Json | null
          urgency?: string | null
          use_case?: string | null
        }
        Update: {
          carrier_need?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_notified_status?: string | null
          node_count?: string | null
          organization?: string | null
          phone?: string | null
          plan?: Json | null
          proposal_ref?: string | null
          qualification_score?: number | null
          status?: string
          summary?: string | null
          transcript?: Json | null
          urgency?: string | null
          use_case?: string | null
        }
        Relationships: []
      }
      api_usage_events: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          license_id: string | null
          status_code: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          license_id?: string | null
          status_code: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          license_id?: string | null
          status_code?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_events_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_runs: {
        Row: {
          accuracy_pct: number | null
          antenna_height: string
          bias_km: number | null
          calibrated_hop_km: number
          carrier: string
          created_at: string
          detail: Json | null
          id: string
          mae_km: number | null
          model_hop_km: number
          sample_count: number
          terrain: string
          user_id: string
          verdict: string
        }
        Insert: {
          accuracy_pct?: number | null
          antenna_height: string
          bias_km?: number | null
          calibrated_hop_km: number
          carrier: string
          created_at?: string
          detail?: Json | null
          id?: string
          mae_km?: number | null
          model_hop_km: number
          sample_count: number
          terrain: string
          user_id: string
          verdict: string
        }
        Update: {
          accuracy_pct?: number | null
          antenna_height?: string
          bias_km?: number | null
          calibrated_hop_km?: number
          carrier?: string
          created_at?: string
          detail?: Json | null
          id?: string
          mae_km?: number | null
          model_hop_km?: number
          sample_count?: number
          terrain?: string
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          active_uplink: boolean
          carrier: string | null
          created_at: string
          e2ee: boolean
          failover_group: string | null
          failover_priority: number
          firmware: string | null
          id: string
          is_backup: boolean
          key_fingerprint: string | null
          key_updated_at: string | null
          kind: string
          label: string | null
          last_error_at: string | null
          last_error_code: string | null
          last_seen_at: string | null
          license_id: string
          node_id: string
          public_key: string | null
          region: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_uplink?: boolean
          carrier?: string | null
          created_at?: string
          e2ee?: boolean
          failover_group?: string | null
          failover_priority?: number
          firmware?: string | null
          id?: string
          is_backup?: boolean
          key_fingerprint?: string | null
          key_updated_at?: string | null
          kind?: string
          label?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_seen_at?: string | null
          license_id: string
          node_id: string
          public_key?: string | null
          region?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_uplink?: boolean
          carrier?: string | null
          created_at?: string
          e2ee?: boolean
          failover_group?: string | null
          failover_priority?: number
          firmware?: string | null
          id?: string
          is_backup?: boolean
          key_fingerprint?: string | null
          key_updated_at?: string | null
          kind?: string
          label?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_seen_at?: string | null
          license_id?: string
          node_id?: string
          public_key?: string | null
          region?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      field_measurements: {
        Row: {
          antenna_height: string
          carrier: string
          created_at: string
          distance_km: number
          id: string
          link_ok: boolean
          note: string | null
          rssi_dbm: number | null
          snr_db: number | null
          terrain: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          antenna_height: string
          carrier: string
          created_at?: string
          distance_km: number
          id?: string
          link_ok?: boolean
          note?: string | null
          rssi_dbm?: number | null
          snr_db?: number | null
          terrain: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          antenna_height?: string
          carrier?: string
          created_at?: string
          distance_km?: number
          id?: string
          link_ok?: boolean
          note?: string | null
          rssi_dbm?: number | null
          snr_db?: number | null
          terrain?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      field_reports: {
        Row: {
          admin_note: string | null
          category: string
          created_at: string
          detail: string
          device_id: string | null
          id: string
          license_id: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          category?: string
          created_at?: string
          detail: string
          device_id?: string | null
          id?: string
          license_id?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          created_at?: string
          detail?: string
          device_id?: string | null
          id?: string
          license_id?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_reports_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_reports_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      ir_frames: {
        Row: {
          alarm: boolean
          alarm_reason: string | null
          created_at: string
          detections: number | null
          device_id: string
          frame_hash: string | null
          id: string
          license_id: string
          note: string | null
          temp_avg_c: number | null
          temp_max_c: number | null
          temp_min_c: number | null
        }
        Insert: {
          alarm?: boolean
          alarm_reason?: string | null
          created_at?: string
          detections?: number | null
          device_id: string
          frame_hash?: string | null
          id?: string
          license_id: string
          note?: string | null
          temp_avg_c?: number | null
          temp_max_c?: number | null
          temp_min_c?: number | null
        }
        Update: {
          alarm?: boolean
          alarm_reason?: string | null
          created_at?: string
          detections?: number | null
          device_id?: string
          frame_hash?: string | null
          id?: string
          license_id?: string
          note?: string | null
          temp_avg_c?: number | null
          temp_max_c?: number | null
          temp_min_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ir_frames_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ir_frames_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      license_events: {
        Row: {
          actor: string
          created_at: string
          detail: string | null
          device_id: string | null
          event: string
          id: string
          license_id: string
          user_id: string | null
        }
        Insert: {
          actor?: string
          created_at?: string
          detail?: string | null
          device_id?: string | null
          event: string
          id?: string
          license_id: string
          user_id?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          detail?: string | null
          device_id?: string | null
          event?: string
          id?: string
          license_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_events_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string
          current_period_end: string | null
          email: string
          id: string
          license_key: string
          node_limit: number
          organization_id: string | null
          plan: string
          provider: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          email: string
          id?: string
          license_key?: string
          node_limit?: number
          organization_id?: string | null
          plan: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          email?: string
          id?: string
          license_key?: string
          node_limit?: number
          organization_id?: string | null
          plan?: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      link_alerts: {
        Row: {
          acknowledged: boolean
          created_at: string
          detail: string | null
          detected_at: string
          device_id: string | null
          failover_to: string | null
          id: string
          layer: string
          license_id: string
          node_id: string
          resolved_at: string | null
          state: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          detail?: string | null
          detected_at?: string
          device_id?: string | null
          failover_to?: string | null
          id?: string
          layer: string
          license_id: string
          node_id: string
          resolved_at?: string | null
          state: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          detail?: string | null
          detected_at?: string
          device_id?: string | null
          failover_to?: string | null
          id?: string
          layer?: string
          license_id?: string
          node_id?: string
          resolved_at?: string | null
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_alerts_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      mesh_messages: {
        Row: {
          attempts: number
          cipher_alg: string | null
          created_at: string
          delivered_at: string | null
          device_id: string | null
          encrypted: boolean
          expires_at: string
          id: string
          last_error: string | null
          license_id: string
          origin_node: string
          payload: Json
          priority: number
          queued_at: string
          status: string
          target_node: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          cipher_alg?: string | null
          created_at?: string
          delivered_at?: string | null
          device_id?: string | null
          encrypted?: boolean
          expires_at?: string
          id?: string
          last_error?: string | null
          license_id: string
          origin_node: string
          payload?: Json
          priority?: number
          queued_at?: string
          status?: string
          target_node?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          cipher_alg?: string | null
          created_at?: string
          delivered_at?: string | null
          device_id?: string | null
          encrypted?: boolean
          expires_at?: string
          id?: string
          last_error?: string | null
          license_id?: string
          origin_node?: string
          payload?: Json
          priority?: number
          queued_at?: string
          status?: string
          target_node?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mesh_messages_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesh_messages_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      node_enrollments: {
        Row: {
          carrier: string
          claimed_at: string | null
          claimed_fingerprint: string | null
          created_at: string
          device_id: string | null
          expires_at: string
          id: string
          kind: string
          label: string | null
          license_id: string
          node_id: string
          region: string
          role: string
          status: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier?: string
          claimed_at?: string | null
          claimed_fingerprint?: string | null
          created_at?: string
          device_id?: string | null
          expires_at?: string
          id?: string
          kind?: string
          label?: string | null
          license_id: string
          node_id: string
          region?: string
          role?: string
          status?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier?: string
          claimed_at?: string | null
          claimed_fingerprint?: string | null
          created_at?: string
          device_id?: string | null
          expires_at?: string
          id?: string
          kind?: string
          label?: string | null
          license_id?: string
          node_id?: string
          region?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_enrollments_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      outage_events: {
        Row: {
          cause: string | null
          created_at: string
          device_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          failover_to: string | null
          id: string
          layer: string
          license_id: string
          node_id: string
          resolved: boolean
          started_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cause?: string | null
          created_at?: string
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          failover_to?: string | null
          id?: string
          layer: string
          license_id: string
          node_id: string
          resolved?: boolean
          started_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cause?: string | null
          created_at?: string
          device_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          failover_to?: string | null
          id?: string
          layer?: string
          license_id?: string
          node_id?: string
          resolved?: boolean
          started_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pilot_requests: {
        Row: {
          admin_note: string | null
          carrier: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          node_count: number | null
          organization: string
          phone: string | null
          status: string
          updated_at: string
          use_case: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          carrier?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          node_count?: number | null
          organization: string
          phone?: string | null
          status?: string
          updated_at?: string
          use_case: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          carrier?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          node_count?: number | null
          organization?: string
          phone?: string | null
          status?: string
          updated_at?: string
          use_case?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      relay_directory: {
        Row: {
          box_public: string
          node_id: string
          sign_public: string
          updated_at: string
        }
        Insert: {
          box_public: string
          node_id: string
          sign_public: string
          updated_at?: string
        }
        Update: {
          box_public?: string
          node_id?: string
          sign_public?: string
          updated_at?: string
        }
        Relationships: []
      }
      relay_envelopes: {
        Row: {
          created_at: string
          envelope: string
          expires_at: string
          id: string
          origin_node: string
          pkt_id: string
          priority: number
          target_node: string
        }
        Insert: {
          created_at?: string
          envelope: string
          expires_at?: string
          id?: string
          origin_node: string
          pkt_id: string
          priority?: number
          target_node: string
        }
        Update: {
          created_at?: string
          envelope?: string
          expires_at?: string
          id?: string
          origin_node?: string
          pkt_id?: string
          priority?: number
          target_node?: string
        }
        Relationships: []
      }
      relay_plans: {
        Row: {
          antenna_height: string
          carrier: string
          created_at: string
          distance_km: number
          hop_km: number
          id: string
          license_id: string
          name: string
          nodes: Json
          relay_count: number
          terrain: string
          updated_at: string
          user_id: string
        }
        Insert: {
          antenna_height: string
          carrier: string
          created_at?: string
          distance_km: number
          hop_km: number
          id?: string
          license_id: string
          name: string
          nodes?: Json
          relay_count: number
          terrain: string
          updated_at?: string
          user_id: string
        }
        Update: {
          antenna_height?: string
          carrier?: string
          created_at?: string
          distance_km?: number
          hop_km?: number
          id?: string
          license_id?: string
          name?: string
          nodes?: Json
          relay_count?: number
          terrain?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relay_plans_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telemetry_samples: {
        Row: {
          bytes: number | null
          carrier: string | null
          created_at: string
          device_id: string
          hops: number | null
          id: string
          license_id: string
          note: string | null
          packet_loss_pct: number | null
          rtt_ms: number | null
          throughput_kbps: number | null
        }
        Insert: {
          bytes?: number | null
          carrier?: string | null
          created_at?: string
          device_id: string
          hops?: number | null
          id?: string
          license_id: string
          note?: string | null
          packet_loss_pct?: number | null
          rtt_ms?: number | null
          throughput_kbps?: number | null
        }
        Update: {
          bytes?: number | null
          carrier?: string | null
          created_at?: string
          device_id?: string
          hops?: number | null
          id?: string
          license_id?: string
          note?: string | null
          packet_loss_pct?: number | null
          rtt_ms?: number | null
          throughput_kbps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_samples_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_samples_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          created_at: string
          endpoint_id: string
          error: string | null
          event_type: string
          id: string
          payload: Json | null
          response_code: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint_id: string
          error?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          response_code?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint_id?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          response_code?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          id: string
          last_delivery_at: string | null
          last_status: number | null
          organization_id: string | null
          secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          last_delivery_at?: string | null
          last_status?: number | null
          organization_id?: string | null
          secret?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          last_delivery_at?: string | null
          last_status?: number | null
          organization_id?: string | null
          secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "user"
      org_role: "owner" | "admin" | "operator" | "viewer"
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
      app_role: ["admin", "user"],
      org_role: ["owner", "admin", "operator", "viewer"],
    },
  },
} as const
