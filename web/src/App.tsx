import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PricingPage from './pages/PricingPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import DeleteAccountPage from './pages/DeleteAccountPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PricingPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
      </Routes>
    </BrowserRouter>
  )
}
