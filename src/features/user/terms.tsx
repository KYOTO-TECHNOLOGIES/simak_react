import React from "react";

const TermsOfServicePage: React.FC = () => {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-14 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-4xl bg-white p-10 shadow-lg border border-slate-200">
        <p className="mb-6 text-sm uppercase tracking-[0.24em] text-cyan-600 font-bold">Terms and Conditions</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-6">
          Welcome to SIMAK FRESH
        </h1>
        <p className="max-w-3xl text-base leading-8 text-slate-600">
          These Terms and Conditions govern your use of our mobile application and services operated by SIMAK FRESH LLC, Trade License No. 2645148, registered at Sharjah Media City, Sharjah, UAE.
        </p>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">1. Product Information</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Availability:</strong> We offer Live, fresh, frozen, and dry seafood. Availability is subject to seasonal changes and stock levels.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Specifications:</strong> Product images are for reference only. Actual weight and quantity may vary slightly due to the nature of the product.</span>
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">2. Pricing and Payment</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          {/* <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Currency &amp; Tax:</strong> All prices are in AED and inclusive of 5% VAT. Prices are subject to change without prior notice.</span>
          </li> */}
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Payments:</strong> We accept Credit/Debit cards, Apple Pay, and Cash on Delivery (COD).</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Right to Refuse:</strong> We reserve the right to refuse or cancel any order at our discretion.</span>
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">3. Delivery Policies</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Coverage:</strong> We deliver inside the UAE only, subjected to availability to each emirates as displayed clearly at checkout.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Cold Chain:</strong> We maintain strict temperature control during transit. Responsibility for the product transfers to the customer upon delivery.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Timelines:</strong> Delivery times are estimates. We are not liable for delays caused by traffic, weather, or unforeseen circumstances.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Charges:</strong> Applicable delivery fees will be displayed clearly at checkout.</span>
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">4. Returns and Refunds</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Perishable Goods:</strong> Due to the nature of seafood, we maintain a No-Return Policy.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Damaged/Wrong Items:</strong> Refunds or replacements are only issued for incorrect or damaged products.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Claims:</strong> Complaints must be raised within 2–3 hours of delivery with photo/video proof.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Refund Timeline:</strong> Approved refunds will be processed within 5–7 business days.</span>
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">5. Safety and Liability</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Storage:</strong> Customers are responsible for proper storage (refrigeration/freezing) following delivery. Please check &quot;Use-by&quot; dates.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Allergies:</strong> SIMAK FRESH is not liable for allergic reactions. Customers must verify product suitability before consumption.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Misuse:</strong> We are not liable for any issues arising from the misuse or improper handling of products after delivery.</span>
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">6. Data Privacy</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Collection:</strong> We collect names, phone numbers, addresses, and payment info to process orders.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Protection:</strong> All data is handled in compliance with the UAE Personal Data Protection Law.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Usage:</strong> Data is used for order fulfilment and, with your consent, promotional updates.</span>
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">7. Promotions</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Promo Codes:</strong> One code per order; non-transferable.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Offers:</strong> Discount terms and validity periods are as stated on the specific promotion.</span>
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">8. Legal and Governing Law</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Jurisdiction:</strong> These terms are governed by the laws of the United Arab Emirates. Any disputes shall be settled in the courts of Sharjah.</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span><strong>Updates:</strong> We may update these terms at any time. Significant changes will be notified via the app.</span>
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">9. Contact Us</h2>
        <p className="mt-4 text-slate-600 leading-7">
          For support or complaints, contact us at:
        </p>
        <p className="mt-3 text-slate-600 leading-7">
          Email: support@simakfresh.ae | Phone: +971 54 544 6111
        </p>
      </div>
    </main>
  );
};

export default TermsOfServicePage;
