export function formatCurrency(amount: number | null, currency = 'INR'): string {
  const n = Number(amount) || 0
  const formatted = n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'INR' ? `₹${formatted}` : `${currency} ${formatted}`
}

// Maps a raw DB row to the Receipt shape the frontend expects
export function mapReceipt(row: any) {
  return {
    id:              row.id,
    vendor:          row.vendor_name ?? null,
    date:            row.receipt_date ? new Date(row.receipt_date).toISOString().split('T')[0] : null,
    time:            row.receipt_time ?? null,
    category:        row.category ?? null,
    emoji:           row.emoji ?? null,
    amount:          Number(row.total_amount) || 0,
    amountFormatted: formatCurrency(Number(row.total_amount) || 0, row.currency),
    tax:             Number(row.tax_amount) || 0,
    taxFormatted:    formatCurrency(Number(row.tax_amount) || 0, row.currency),
    isBusiness:      row.is_business  ?? false,
    isBillable:      row.is_billable  ?? false,
    notes:           row.notes        ?? null,
    items:           row.items        ?? [],
    receiptImageUrl: row.image_url    ?? null,
  }
}
