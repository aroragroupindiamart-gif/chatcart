import { motion } from "framer-motion";

export default function About() {
  return (
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-8">
              Why we built Chatcart
            </h1>
            
            <div className="prose prose-lg prose-slate dark:prose-invert max-w-none text-foreground/90 space-y-6">
              <p className="text-xl font-medium leading-relaxed">
                I ran a wholesale jewelry business. Every day, my livelihood depended on WhatsApp. It was where my customers were, where they wanted to see new designs, and where they placed their bulk orders.
              </p>
              
              <p>
                Naturally, I used the built-in WhatsApp Business catalog. At first, it seemed like the perfect solution. But as my inventory grew, it turned into a daily nightmare.
              </p>
              
              <p>
                <strong>The bugs were maddening.</strong>
              </p>
              
              <p>
                The worst one: products would randomly vanish. I’d upload a hot new necklace set, share the link, and a customer would message me: <em>"Bhaiya, the link is empty."</em> I’d check the catalog, and the product was just gone. No warning. No error message. Just deleted by some hidden automated system. This usually happened right before a big festive season when I needed it the most. I lost real money to this.
              </p>
              
              <p>
                Then there was the lack of search. When a retailer asked for "polki bangles under ₹500", I couldn't just send them a link. There was no search bar in the catalog. They had to scroll past hundreds of rings and earrings to find what they wanted. Mostly, they just gave up, and I had to manually send 20 photos in a chat. It defeated the whole purpose of having a catalog.
              </p>
              
              <p>
                And sorting? Forget about it. WhatsApp ordered things however it pleased. I couldn't put my highest-margin items at the top. I couldn't group things logically. It was a mess.
              </p>
              
              <p>
                I looked for alternatives. But every "ecommerce builder" out there wanted me to force my customers to download an app, create an account, or navigate a clunky web checkout. My buyers didn't want that. They wanted to see photos and text me their order. That was it.
              </p>
              
              <p>
                So I stopped waiting for WhatsApp to fix their bugs, and I built Chatcart.
              </p>
              
              <p>
                It’s not trying to be the next Amazon. It’s exactly what the WhatsApp catalog should have been: a fast, reliable place to display your products, with rock-solid search, custom sorting, and a checkout that just drops a perfectly formatted message right into your WhatsApp chat.
              </p>
              
              <p>
                No vanishing products. No frustrated buyers. Just clean, frictionless ordering.
              </p>
              
              <p className="font-semibold text-lg mt-8">
                If you sell on WhatsApp, give it a try. It’s the tool I wish I had five years ago.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
