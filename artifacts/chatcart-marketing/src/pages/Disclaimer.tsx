export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">Disclaimer</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: June 2026</p>

        <div className="bg-muted border border-border rounded-lg px-6 py-4 mb-8">
          <p className="text-sm text-foreground">
            <strong>Operated by:</strong> ARORA GROUP<br />
            Chatcart is a product of ARORA GROUP. All references to "Chatcart" in this document refer to the Chatcart platform operated by ARORA GROUP.
          </p>
        </div>
        
        <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground space-y-6">
          <p className="text-lg leading-relaxed font-medium text-foreground">
            Chatcart provides a software platform that enables sellers to create product catalogs and facilitates communication of orders via WhatsApp.
          </p>

          <div className="bg-muted p-6 rounded-lg border border-border mt-8">
            <h3 className="text-lg font-bold text-foreground mb-4">Please note:</h3>
            <ul className="list-disc pl-5 space-y-3">
              <li>Chatcart is not a marketplace.</li>
              <li>We do not process payments between buyers and sellers.</li>
              <li>We are not a party to any transaction.</li>
              <li>We do not guarantee, endorse, or verify any products listed by sellers on our platform.</li>
              <li>Sellers are independent entities and are solely responsible for their product claims, pricing, fulfillment, and customer service.</li>
            </ul>
          </div>

          <p className="mt-8">
            Any disputes regarding a purchase must be resolved directly between the buyer and the seller. Chatcart accepts no liability for undelivered goods, defective products, or fraudulent transactions.
          </p>
        </div>
      </div>
    </div>
  );
}
