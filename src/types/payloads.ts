import { ReceiptCategory } from '../db/types'

// ─── POST /api/upload-image ──────────────────────────────────────────────────
export interface UploadImageResponse {
    url:      string   // public ImageKit URL to store in DB
    filePath: string   // ImageKit internal path (for deletion later)
}

// ─── POST /api/create-receipt ────────────────────────────────────────────────
export interface CreateReceiptBody {
    // required
    vendorName:   string
    totalAmount:  number
    currency:     string           // e.g. 'INR'
    category:     ReceiptCategory
    receiptDate:  string           // ISO date e.g. '2026-03-01'
    // optional
    taxAmount?:   number
    notes?:       string
    isGstBill?:   boolean
    gstNumber?:   string
}
