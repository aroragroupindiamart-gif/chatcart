export default function Terms() {
  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: June 2026</p>

        <div className="bg-muted border border-border rounded-lg px-6 py-4 mb-8">
          <p className="text-sm text-foreground">
            <strong>Operated by:</strong> ARORA GROUP<br />
            Chatcart is a product of ARORA GROUP. By using Chatcart, you are entering into an agreement with ARORA GROUP as the operating entity of this platform.
          </p>
        </div>
        
        <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Service Description</h2>
            <p>
              Chatcart provides a software platform allowing merchants ("Sellers") to create digital product catalogs and share them with their customers. Chatcart is solely a catalog and ordering utility. We do not process payments, handle fulfillment, or guarantee the quality of any goods listed by Sellers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Subscription and Billing</h2>
            <p>
              Chatcart is offered as a monthly subscription service. Fees are billed in advance. Failure to pay subscription fees may result in suspension or termination of your catalog access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. Acceptable Use</h2>
            <p>
              Sellers agree not to use Chatcart to list, sell, or promote illegal, fraudulent, or counterfeit goods. Sellers are solely responsible for compliance with all applicable local laws regarding their business operations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Account Suspension</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms, receive excessive complaints, or engage in fraudulent behavior, without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Limitation of Liability</h2>
            <p>
              Chatcart is provided "as is". We are not a party to the transactions between Sellers and their customers. We are not liable for any lost profits, lost data, or incidental damages arising from the use or inability to use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in India.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
