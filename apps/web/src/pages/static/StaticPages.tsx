import React from 'react';
import { ShieldCheck, Truck, RotateCcw, HeartHandshake, MapPin, Mail, Phone, MessageCircle } from 'lucide-react';
import { STORE_DEFAULTS } from '@nool-and-nila/shared';
import { useStoreSettings } from '../../hooks/useStoreSettings';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs uppercase tracking-[0.25em] text-brand-gold font-bold">
          The Weaver's Heritage
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-brand-charcoal">
          About Nool & Nila
        </h1>
        <p className="text-base text-brand-maroon italic font-serif">
          Threads of tradition. Woven for today.
        </p>
      </div>

      <div className="prose prose-stone mx-auto text-sm sm:text-base leading-relaxed text-gray-700 space-y-6">
        <p>
          Founded with a devotion to preserving India’s incomparable handloom tapestry,{' '}
          <strong>Nool & Nila</strong> (meaning <em>"Thread & Moon"</em>) connects discerning patrons
          directly with generational master weavers in Kanchipuram, Varanasi, Chanderi, and Bengal.
        </p>

        <div className="my-8 aspect-[16/9] rounded-2xl overflow-hidden shadow-lg border border-brand-beige">
          <img
            src="/images/sarees/mulmul-cotton-terracotta.jpg"
            alt="Handloom Artisan Workshop"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <h2 className="font-serif text-2xl font-bold text-brand-charcoal">Our Philosophical Pillars</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 not-prose my-6">
          <div className="p-5 bg-white rounded-xl border border-brand-beige space-y-2">
            <h3 className="font-serif font-bold text-brand-charcoal text-base">Pure Materials Only</h3>
            <p className="text-xs text-gray-600">
              We insist on certified mulberry silks, natural dyes, and tested zari. No synthetic blends or deceptive polyesters.
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-brand-beige space-y-2">
            <h3 className="font-serif font-bold text-brand-charcoal text-base">Direct From The Loom</h3>
            <p className="text-xs text-gray-600">
              By working directly with weaver cooperatives, artisans receive fair compensation and their families thrive.
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-brand-beige space-y-2">
            <h3 className="font-serif font-bold text-brand-charcoal text-base">Personalized Curation</h3>
            <p className="text-xs text-gray-600">
              We treat saree buying as a sacred ritual. Our WhatsApp concierge guides you through draping, color selection, and heirloom care.
            </p>
          </div>
        </div>

        <p>
          Each saree in our collection is an investment in human skill, representing weeks of synchronized hand movements
          across the wooden loom. When you drape a Nool & Nila saree, you wrap yourself in centuries of living Indian culture.
        </p>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { whatsappNumber, supportEmail, supportPhone } = useStoreSettings();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs uppercase tracking-[0.25em] text-brand-gold font-bold">
          Boutique Concierge
        </span>
        <h1 className="font-serif text-4xl font-bold text-brand-charcoal">Contact Us</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          We welcome your enquiries regarding custom weaving, bridal trousseau consultations, or order assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl border border-brand-beige text-center space-y-2 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-brand-charcoal">WhatsApp Concierge</h3>
          <p className="text-xs text-gray-500">Live natural-light videos & styling</p>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-bold text-emerald-800 hover:underline pt-2"
          >
            +{whatsappNumber}
          </a>
        </div>

        <div className="p-6 bg-white rounded-xl border border-brand-beige text-center space-y-2 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-brand-ivory text-brand-maroon flex items-center justify-center">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-brand-charcoal">Email Support</h3>
          <p className="text-xs text-gray-500">Responses within 24 hours</p>
          <a
            href={`mailto:${supportEmail}`}
            className="inline-block text-xs font-bold text-brand-maroon hover:underline pt-2"
          >
            {supportEmail}
          </a>
        </div>

        <div className="p-6 bg-white rounded-xl border border-brand-beige text-center space-y-2 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-brand-ivory text-brand-maroon flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-brand-charcoal">Boutique Studio</h3>
          <p className="text-xs text-gray-500">By private appointment only</p>
          <p className="text-xs font-medium text-brand-charcoal pt-2">
            Besant Nagar, Chennai, Tamil Nadu
          </p>
        </div>
      </div>
    </div>
  );
};

export const ShippingPolicyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-6">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal">Shipping & Delivery Policy</h1>
      <div className="prose prose-stone text-xs sm:text-sm space-y-4 text-gray-700 leading-relaxed">
        <p>
          <strong>Pan-India Delivery:</strong> We ship to all serviceable PIN codes throughout India via insured express courier partners (Blue Dart, Delhivery, DTDC).
        </p>
        <p>
          <strong>Shipping Charges:</strong> Orders of ₹5,000 and above qualify for complimentary insured delivery. For orders below ₹5,000, a standard courier fee of ₹250 is applied.
        </p>
        <p>
          <strong>Dispatch Time:</strong> Ready-to-ship handloom sarees are carefully steamed, inspected, wrapped in muslin cloth, and dispatched within 1–2 business days of order confirmation.
        </p>
        <p>
          <strong>Transit Timeline:</strong> Metro deliveries typically take 2–4 business days. Regional and tier-2/3 destinations take 4–7 business days.
        </p>
      </div>
    </div>
  );
};

export const ReturnsPolicyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-6">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal">Returns & Exchange Policy</h1>
      <div className="prose prose-stone text-xs sm:text-sm space-y-4 text-gray-700 leading-relaxed">
        <p>
          <strong>Authenticity Guarantee:</strong> Every Nool & Nila pure silk saree is Silk Mark certified. Because our sarees are handcrafted on manual pit-looms, slight variations in weft texture, selvage finish, and color slubs are not defects—they are the authentic hallmarks of genuine handloom artistry.
        </p>
        <p>
          <strong>Exchange Eligibility:</strong> If your saree arrives with an unexpected manufacturing flaw or damage during transit, please notify us within <strong>7 days</strong> of delivery on WhatsApp or email with unboxing photos/videos.
        </p>
        <p>
          <strong>Condition for Return:</strong> The saree must be unworn, unwashed, with all original tags, Silk Mark labels, and packaging intact. Sarees with custom stitched blouses or personalized falls/hemming cannot be returned.
        </p>
      </div>
    </div>
  );
};

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-6">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal">Privacy Policy</h1>
      <div className="prose prose-stone text-xs sm:text-sm space-y-4 text-gray-700 leading-relaxed">
        <p>
          At <strong>Nool & Nila</strong>, your privacy is deeply respected. We only collect details necessary to process your saree order requests, provide customer support on WhatsApp, and improve your boutique shopping experience.
        </p>
        <p>
          <strong>Data Security:</strong> We do not store or process sensitive payment credentials on our servers. Your contact information is never sold or shared with unauthorized third parties.
        </p>
      </div>
    </div>
  );
};

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-6">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal">Terms of Service</h1>
      <div className="prose prose-stone text-xs sm:text-sm space-y-4 text-gray-700 leading-relaxed">
        <p>
          By browsing or placing an order request on Nool & Nila, you agree to our standard terms and conditions.
        </p>
        <p>
          <strong>Order Requests:</strong> Submitting a website order request does not constitute a completed financial contract until our boutique team confirms weave availability and payment instructions.
        </p>
      </div>
    </div>
  );
};
