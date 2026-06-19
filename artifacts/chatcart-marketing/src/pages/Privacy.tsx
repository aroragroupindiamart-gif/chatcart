export default function Privacy() {
  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-12 flex gap-3 items-start">
          <span className="text-xl leading-none">⚠️</span>
          <p className="text-sm font-medium">
            This document has been AI-generated and has not been reviewed by a lawyer. It should not be treated as legally vetted. Please consult a qualified legal professional before relying on these terms.
          </p>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Data We Collect</h2>
            <p>
              <strong>From Sellers:</strong> We collect account information (name, phone number, business details) and product data uploaded to the platform.
            </p>
            <p>
              <strong>From Customers:</strong> During checkout, we collect name and phone number solely for the purpose of passing this information to the Seller via WhatsApp to fulfill the order.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. How We Use Data</h2>
            <p>
              Data is used exclusively to provide and improve the Chatcart service. We do not sell your data or your customers' data to third-party marketers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. Data Retention</h2>
            <p>
              Seller account data is retained for as long as the account is active. Order data passed through the system is retained temporarily to facilitate the transaction and for the Seller's order history dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Third-Party Sharing</h2>
            <p>
              We do not share data with third parties except for essential infrastructure providers (e.g., cloud hosting, SMS gateways) required to operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Your Rights (DPDP Act)</h2>
            <p>
              Under India's Digital Personal Data Protection Act, you have the right to request access to, correction of, or deletion of your personal data. Sellers can delete their accounts directly through the dashboard. Customers wishing to have their data deleted should contact the Seller directly, or contact us at privacy@chatcart.com for assistance.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
