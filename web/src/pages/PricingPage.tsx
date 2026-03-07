import { useState, useEffect } from 'react'

const PLANS = {
  monthly: {
    label: 'Monthly',
    amount: 149,
    period: '/month',
    badge: null as string | null,
    original: null as string | null,
  },
  yearly: {
    label: 'Yearly',
    amount: 2499,
    period: '/year',
    badge: 'Save 30%',
    original: '₹1,788/year',
  },
}

const FEATURES = [
  'Unlimited receipt scans',
  'AI-powered data extraction',
  'Export to CSV & PDF',
  'Priority support',
]

declare global {
  interface Window {
    Razorpay: new (options: object) => { open: () => void }
  }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  // Token received from React Native WebView via postMessage
  const [authToken, setAuthToken] = useState<string | null>(null)
  const plan = PLANS[billing]

  // Listen for Firebase token sent by the mobile app WebView
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      try {
        const data = JSON.parse(event.data)
        if (data.token) setAuthToken(data.token)
      } catch {}
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function handlePay() {
    if (!authToken) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ plan: billing }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order')

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'BillSnap',
        description: `${plan.label} Subscription`,
        order_id: data.orderId,
        handler: async (response: object) => {
          const verify = await fetch(`${API_BASE}/api/payment/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(response),
          })
          const result = await verify.json()
          if (result.success) {
            alert('Payment successful! Welcome to BillSnap Pro.')
          } else {
            alert('Payment verification failed. Contact support.')
          }
        },
        theme: { color: '#111111' },
      })
      rzp.open()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pricing-wrap">
      <div className="pricing-container">
        <div className="pricing-header">
          <div className="logo-wrap">
            <img src="/logo.png" alt="BillSnap logo" />
            <span className="brand-name">BillSnap</span>
          </div>
          <p>Scan receipts. Track expenses. Effortlessly.</p>
        </div>

        <div className="toggle">
          <button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
          <button className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}>Yearly</button>
        </div>

        <div className="card">
          {plan.badge && <span className="badge">{plan.badge}</span>}

          <div className="price">
            <span className="amount">₹{plan.amount.toLocaleString()}</span>
            <span className="period">{plan.period}</span>
            {plan.original && <div className="original">{plan.original}</div>}
          </div>

          <ul className="features">
            {FEATURES.map(f => <li key={f}>{f}</li>)}
          </ul>

          <button className="pay-btn" onClick={handlePay} disabled={loading || !authToken}>
            {loading ? 'Processing…' : !authToken ? 'Waiting for app…' : 'Get BillSnap'}
          </button>
        </div>

        <div className="page-footer">
          <p>Secure payments by Razorpay &nbsp;·&nbsp; <a href="/privacy-policy">Privacy Policy</a></p>
        </div>
      </div>
    </div>
  )
}
