// ─── user_profiles ───────────────────────────────────────────────────────────
export type Plan = 'free' | 'pro'

export interface UserProfile {
    id:                          string
    firebase_uid:                string
    full_name:                   string | null
    email:                       string | null
    avatar_url:                  string | null
    plan:                        Plan
    plan_started_at:             Date | null
    plan_expires_at:             Date | null
    razorpay_subscription_id:    string | null
    razorpay_customer_id:        string | null
    receipts_scanned_this_month: number
    last_usage_reset_at:         Date
    created_at:                  Date
    updated_at:                  Date
}

// ─── receipts ────────────────────────────────────────────────────────────────
export type ReceiptCategory =
    | 'Food & Dining'
    | 'Software Subscription'
    | 'Electronics'
    | 'Travel'
    | 'Health & Fitness'
    | 'Other'

export interface Receipt {
    id:           string
    user_id:      string
    vendor_name:  string | null
    total_amount: number | null
    tax_amount:   number | null
    currency:     string
    receipt_date: Date | null
    category:     ReceiptCategory | null
    notes:        string | null
    is_gst_bill:  boolean
    gst_number:   string | null
    image_url:    string | null
    image_path:   string | null
    created_at:   Date
    updated_at:   Date
}
