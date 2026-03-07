import { Link } from 'react-router-dom'

export default function DeleteAccountPage() {
  return (
    <div className="delete-wrap">
      <div className="delete-container">
        <div className="delete-header">
          <img src="/logo.png" alt="BillSnap logo" />
          <span className="brand">BillSnap</span>
        </div>

        <div className="card delete-card">
          <h1>How to delete your BillSnap account</h1>

          <p>
            To request account deletion, email us at{' '}
            <a href="mailto:billsnap.info@gmail.com">billsnap.info@gmail.com</a>{' '}
            with the subject <strong>"Account Deletion Request"</strong> from your registered email address.
          </p>

          <p>
            We will delete your account and all associated data (receipts, profile info, subscription data) within <strong>30 days</strong>.
          </p>

          <p>
            If you have an active subscription, please cancel it before requesting deletion.
          </p>
        </div>

        <div className="delete-footer">
          <Link to="/">← Back to pricing</Link> &nbsp;·&nbsp; <Link to="/privacy-policy">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}
