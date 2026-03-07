CREATE TABLE public.receipts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  vendor_name  TEXT,
  total_amount NUMERIC(10, 2),
  tax_amount   NUMERIC(10, 2),
  currency     TEXT DEFAULT 'INR',
  receipt_date DATE,
  category     TEXT CHECK (category IN (
    'Food & Dining',
    'Software Subscription',
    'Electronics',
    'Travel',
    'Health & Fitness',
    'Other'
  )),
  notes        TEXT,
  is_gst_bill  BOOLEAN DEFAULT FALSE,
  gst_number   TEXT,
  image_url    TEXT,
  image_path   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
