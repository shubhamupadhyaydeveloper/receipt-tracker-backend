import { Link } from 'react-router-dom'

export default function PrivacyPolicyPage() {
  return (
    <div className="privacy-wrap">
      <div className="privacy-page">
        <div className="site-header">
          <img src="/logo.png" alt="BillSnap logo" />
          <span className="brand">BillSnap</span>
        </div>

        <Link to="/" className="back-link">← Back to pricing</Link>

        <h1>Privacy Policy</h1>
        <p className="effective">Effective date: 2026-02-23</p>

        <section>
          <p>This privacy policy applies to the BillSnap app (hereby referred to as "Application") for mobile devices, created by the Service Provider as a free service. This service is intended for use "AS IS".</p>
        </section>

        <section>
          <h2>Information Collection and Use</h2>
          <p>The Application collects information when you download and use it. This information may include:</p>
          <ul>
            <li>Your device's Internet Protocol address (e.g. IP address)</li>
            <li>The pages of the Application that you visit, the time and date of your visit, and time spent on those pages</li>
            <li>The time spent on the Application</li>
            <li>The operating system you use on your mobile device</li>
          </ul>
          <p>The Application does not gather precise information about the location of your mobile device.</p>
          <p>For a better experience, while using the Application, the Service Provider may require you to provide certain personally identifiable information. This information will be retained and used as described in this privacy policy.</p>
        </section>

        <section>
          <h2>AI Processing</h2>
          <p>The Application uses Artificial Intelligence (AI) technologies to scan and extract data from receipt images. Receipt images you upload are sent to a third-party AI service (Google Gemini) solely for text extraction purposes. Images are not stored by the Service Provider after processing. All AI processing is performed in accordance with this privacy policy and applicable laws.</p>
        </section>

        <section>
          <h2>Payments</h2>
          <p>The Application uses Razorpay to process subscription payments. When you make a payment, your payment details (such as card information) are handled directly by Razorpay and are not stored by the Service Provider. Razorpay's privacy policy governs how your payment information is collected and used. The Service Provider only receives a confirmation of successful payment and a payment ID.</p>
        </section>

        <section>
          <h2>Third Party Access</h2>
          <p>Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the Application. The Service Provider may share your information with third parties only in the following ways:</p>
          <ul>
            <li>As required by law, such as to comply with a subpoena or similar legal process</li>
            <li>When they believe in good faith that disclosure is necessary to protect their rights, your safety or the safety of others, investigate fraud, or respond to a government request</li>
            <li>With trusted service providers who work on their behalf, do not have an independent use of the information disclosed to them, and have agreed to adhere to the rules set forth in this privacy statement</li>
          </ul>
        </section>

        <section>
          <h2>Opt-Out Rights</h2>
          <p>You can stop all collection of information by the Application by uninstalling it. You may use the standard uninstall processes available as part of your mobile device or via the mobile application marketplace.</p>
        </section>

        <section>
          <h2>Data Retention Policy</h2>
          <p>The Service Provider will retain User Provided data for as long as you use the Application and for a reasonable time thereafter. If you'd like them to delete User Provided Data, please contact them at <a href="mailto:shubhamwork48@gmail.com">shubhamwork48@gmail.com</a> and they will respond in a reasonable time.</p>
        </section>

        <section>
          <h2>Children</h2>
          <p>The Service Provider does not use the Application to knowingly solicit data from or market to children under the age of 13. The Service Provider does not knowingly collect personally identifiable information from children. Parents and legal guardians are encouraged to monitor their children's Internet usage. If you believe a child has provided personally identifiable information, please contact the Service Provider at <a href="mailto:shubhamwork48@gmail.com">shubhamwork48@gmail.com</a> so the necessary actions can be taken. You must also be at least 16 years of age to consent to the processing of your personally identifiable information.</p>
        </section>

        <section>
          <h2>Security</h2>
          <p>The Service Provider is concerned about safeguarding the confidentiality of your information and provides physical, electronic, and procedural safeguards to protect the information it processes and maintains.</p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>This Privacy Policy may be updated from time to time. The Service Provider will notify you of any changes by updating this page with the new Privacy Policy. You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes.</p>
        </section>

        <section>
          <h2>Your Consent</h2>
          <p>By using the Application, you are consenting to the processing of your information as set forth in this Privacy Policy now and as amended by us.</p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>If you have any questions regarding privacy while using the Application, please contact the Service Provider via email at <a href="mailto:shubhamwork48@gmail.com">shubhamwork48@gmail.com</a>.</p>
        </section>

        <div className="privacy-footer">
          &copy; 2026 BillSnap. All rights reserved.
        </div>
      </div>
    </div>
  )
}
