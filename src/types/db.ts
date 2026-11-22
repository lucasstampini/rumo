
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "bookings": {
                  Row: {
                    "accepted_at": string | null,"car_id": string,"closed_at": string | null,"completed_at": string | null,"days": number,"end_date": string,"id": string,"owner_payout_cents": number,"payment_method": string,"payment_status": string,"pickup_code": string | null,"pickup_confirmed_at": string | null,"protection": Database["public"]['Enums']["protection_plan"],"protection_cents": number,"renter_id": string,"requested_at": string,"service_fee_cents": number,"start_date": string,"started_at": string | null,"status": Database["public"]['Enums']["booking_status"],"subtotal_cents": number,"total_cents": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"car_id": string,"closed_at"?: string | null,"completed_at"?: string | null,"days": number,"end_date": string,"id"?: string,"owner_payout_cents": number,"payment_method": string,"payment_status"?: string,"pickup_code"?: string | null,"pickup_confirmed_at"?: string | null,"protection"?: Database["public"]['Enums']["protection_plan"],"protection_cents": number,"renter_id": string,"requested_at"?: string,"service_fee_cents": number,"start_date": string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["booking_status"],"subtotal_cents": number,"total_cents": number
                  }
                  Update: {
                    "accepted_at"?: string | null,"car_id"?: string,"closed_at"?: string | null,"completed_at"?: string | null,"days"?: number,"end_date"?: string,"id"?: string,"owner_payout_cents"?: number,"payment_method"?: string,"payment_status"?: string,"pickup_code"?: string | null,"pickup_confirmed_at"?: string | null,"protection"?: Database["public"]['Enums']["protection_plan"],"protection_cents"?: number,"renter_id"?: string,"requested_at"?: string,"service_fee_cents"?: number,"start_date"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["booking_status"],"subtotal_cents"?: number,"total_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_car_id_fkey"
      columns: ["car_id"]
isOneToOne: false
      referencedRelation: "car_ratings"
      referencedColumns: ["car_id"]
    },{
      foreignKeyName: "bookings_car_id_fkey"
      columns: ["car_id"]
isOneToOne: false
      referencedRelation: "cars"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_renter_id_fkey"
      columns: ["renter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bubbles": {
                  Row: {
                    "center_lat": number,"center_lng": number,"id": string,"name": string,"radius_m": number
                  }
                  ComputedFields: never
                  Insert: {
                    "center_lat": number,"center_lng": number,"id"?: string,"name": string,"radius_m": number
                  }
                  Update: {
                    "center_lat"?: number,"center_lng"?: number,"id"?: string,"name"?: string,"radius_m"?: number
                  }
                  Relationships: [
                    
                  ]
                },"car_blocked_dates": {
                  Row: {
                    "car_id": string,"day": string
                  }
                  ComputedFields: never
                  Insert: {
                    "car_id": string,"day": string
                  }
                  Update: {
                    "car_id"?: string,"day"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "car_blocked_dates_car_id_fkey"
      columns: ["car_id"]
isOneToOne: false
      referencedRelation: "car_ratings"
      referencedColumns: ["car_id"]
    },{
      foreignKeyName: "car_blocked_dates_car_id_fkey"
      columns: ["car_id"]
isOneToOne: false
      referencedRelation: "cars"
      referencedColumns: ["id"]
    }
                  ]
                },"car_photos": {
                  Row: {
                    "car_id": string,"id": string,"position": number,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "car_id": string,"id"?: string,"position"?: number,"url": string
                  }
                  Update: {
                    "car_id"?: string,"id"?: string,"position"?: number,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "car_photos_car_id_fkey"
      columns: ["car_id"]
isOneToOne: false
      referencedRelation: "car_ratings"
      referencedColumns: ["car_id"]
    },{
      foreignKeyName: "car_photos_car_id_fkey"
      columns: ["car_id"]
isOneToOne: false
      referencedRelation: "cars"
      referencedColumns: ["id"]
    }
                  ]
                },"cars": {
                  Row: {
                    "annual_depreciation_cents": number,"annual_insurance_cents": number,"annual_ipva_cents": number,"annual_maintenance_cents": number,"available_weekdays": (number)[],"bubble_id": string,"category": Database["public"]['Enums']["car_category"],"color": string,"created_at": string,"description": string | null,"id": string,"is_listed": boolean,"lat": number,"lng": number,"make": string,"model": string,"owner_id": string,"pickup_address": string,"plate": string,"price_per_day_cents": number,"seats": number,"transmission": Database["public"]['Enums']["transmission"],"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "annual_depreciation_cents"?: number,"annual_insurance_cents"?: number,"annual_ipva_cents"?: number,"annual_maintenance_cents"?: number,"available_weekdays"?: (number)[],"bubble_id": string,"category": Database["public"]['Enums']["car_category"],"color": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_listed"?: boolean,"lat": number,"lng": number,"make": string,"model": string,"owner_id": string,"pickup_address": string,"plate": string,"price_per_day_cents": number,"seats"?: number,"transmission": Database["public"]['Enums']["transmission"],"year": number
                  }
                  Update: {
                    "annual_depreciation_cents"?: number,"annual_insurance_cents"?: number,"annual_ipva_cents"?: number,"annual_maintenance_cents"?: number,"available_weekdays"?: (number)[],"bubble_id"?: string,"category"?: Database["public"]['Enums']["car_category"],"color"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_listed"?: boolean,"lat"?: number,"lng"?: number,"make"?: string,"model"?: string,"owner_id"?: string,"pickup_address"?: string,"plate"?: string,"price_per_day_cents"?: number,"seats"?: number,"transmission"?: Database["public"]['Enums']["transmission"],"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "cars_bubble_id_fkey"
      columns: ["bubble_id"]
isOneToOne: false
      referencedRelation: "bubbles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cars_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"inspection_photos": {
                  Row: {
                    "angle": string,"booking_id": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["inspection_kind"],"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "angle": string,"booking_id": string,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["inspection_kind"],"url": string
                  }
                  Update: {
                    "angle"?: string,"booking_id"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["inspection_kind"],"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspection_photos_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bubble_id": string | null,"cnh_url": string | null,"created_at": string,"full_name": string,"id": string,"phone": string | null,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bubble_id"?: string | null,"cnh_url"?: string | null,"created_at"?: string,"full_name": string,"id": string,"phone"?: string | null,"verified"?: boolean
                  }
                  Update: {
                    "avatar_url"?: string | null,"bubble_id"?: string | null,"cnh_url"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"phone"?: string | null,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_bubble_id_fkey"
      columns: ["bubble_id"]
isOneToOne: false
      referencedRelation: "bubbles"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "author_id": string,"booking_id": string,"comment": string | null,"created_at": string,"id": string,"rating": number,"target_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"booking_id": string,"comment"?: string | null,"created_at"?: string,"id"?: string,"rating": number,"target_id": string
                  }
                  Update: {
                    "author_id"?: string,"booking_id"?: string,"comment"?: string | null,"created_at"?: string,"id"?: string,"rating"?: number,"target_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "car_ratings": {
                  Row: {
                    "avg_rating": number | null,"car_id": string,"owner_id": string,"review_count": number | null,"trips_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "cars_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_ratings": {
                  Row: {
                    "avg_rating": number | null,"profile_id": string,"review_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "reviews_target_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "car_busy_ranges":
{ Args: { "p_car": string }; Returns: {
              "end_date": string,"start_date": string
            }[]
                           },
"expire_stale_requests":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"get_my_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_url": string | null,
"bubble_id": string | null,
"cnh_url": string | null,
"created_at": string,
"full_name": string,
"id": string,
"phone": string | null,
"verified": boolean
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"has_booking_on_car":
{ Args: { "p_car": string }; Returns: boolean
                           },
"is_booking_participant":
{ Args: { "p_booking": string }; Returns: boolean
                           },
"is_car_owner":
{ Args: { "p_car": string }; Returns: boolean
                           },
"rumo_is_privileged":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"rumo_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           }
          }
          Enums: {
            "booking_status": "requested"|"accepted"|"active"|"completed"|"rejected"|"cancelled","car_category": "economy"|"sedan"|"suv","inspection_kind": "pickup"|"return","protection_plan": "basic"|"full","transmission": "manual"|"automatic"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "booking_status": ["requested", "accepted", "active", "completed", "rejected", "cancelled"],"car_category": ["economy", "sedan", "suv"],"inspection_kind": ["pickup", "return"],"protection_plan": ["basic", "full"],"transmission": ["manual", "automatic"]
          }
        }
} as const
