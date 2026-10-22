import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { ProductDto, CategoryDto } from '@nool-and-nila/shared';
import { ProductCard } from '../components/product/ProductCard';
import { WhatsAppButton } from '../components/ui/WhatsAppButton';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Truck,
  MessageCircle,
  Clock,
  HeartHandshake,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  // Fetch featured sarees
  const { data: featuredData, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const res = await fetchApi<ProductDto[]>('/products/featured');
      return res.data;
    },
  });

  // Fetch new arrivals
  const { data: newArrivalsData, isLoading: isNewArrivalsLoading } = useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: async () => {
      const res = await fetchApi<ProductDto[]>('/products/new-arrivals');
      return res.data;
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetchApi<CategoryDto[]>('/categories');
      return res.data;
    },
  });

  return (
    <div className="space-y-20 pb-20">
      {/* 1. Hero Section */}
      <section className="relative bg-brand-ivory-dark overflow-hidden border-b border-brand-beige">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-maroon/10 text-brand-maroon text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-brand-maroon" />
                <span>Heirloom Indian Handlooms</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-charcoal leading-[1.15]">
                Threads of tradition. <br />
                <span className="italic font-normal text-brand-maroon">Woven for today.</span>
              </h1>

              <p className="text-base sm:text-lg text-brand-charcoal-light max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Discover the sublime tactile beauty of authentic Kanjivaram pure silks, Banarasi brocades,
                and airy Chanderi handlooms, woven with tested gold zari directly by master weaver families.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <Link
                  to="/shop"
                  className="w-full sm:w-auto px-8 py-3.5 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-sm font-semibold tracking-wide shadow-luxury transition-all flex items-center justify-center space-x-2"
                >
                  <span>Shop Saree Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <WhatsAppButton
                  variant="inline"
                  label="Consult on WhatsApp"
                  className="w-full sm:w-auto py-3.5 px-6"
                />
              </div>

              {/* Guarantees */}
              <div className="pt-6 border-t border-brand-beige-dark/60 grid grid-cols-3 gap-4 text-center sm:text-left">
                <div>
                  <p className="font-serif text-lg font-bold text-brand-charcoal">100%</p>
                  <p className="text-xs text-gray-500">Pure Silk Mark</p>
                </div>
                <div>
                  <p className="font-serif text-lg font-bold text-brand-charcoal">Direct</p>
                  <p className="text-xs text-gray-500">Loom Authenticity</p>
                </div>
                <div>
                  <p className="font-serif text-lg font-bold text-brand-charcoal">Pan-India</p>
                  <p className="text-xs text-gray-500">Insured Delivery</p>
                </div>
              </div>
            </div>

            {/* Right Hero Image Mosaic */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-brand-ivory">
                  <img
                    src="/images/sarees/kanjivaram-crimson-gold.jpg"
                    alt="Rukmani Crimson Temple Kanjivaram Pure Silk Saree"
                    className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                  />
                </div>
                {/* Floating Badge */}
                <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-luxury border border-brand-beige hidden sm:flex items-center space-x-3">
                  <div className="p-2.5 rounded-full bg-brand-ivory text-brand-gold">
                    <Award className="w-6 h-6 text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-brand-charcoal">Pure Zari Korvai</p>
                    <p className="text-[11px] text-gray-500">Master Artisan Heritage</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Craftsmanship Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 bg-white rounded-xl border border-brand-beige text-center space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-full bg-brand-ivory flex items-center justify-center text-brand-maroon">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-brand-charcoal">Silk Mark Certified</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Every pure silk saree undergoes testing for genuine natural silk fibers and unadulterated quality.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-brand-beige text-center space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-full bg-brand-ivory flex items-center justify-center text-brand-maroon">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-brand-charcoal">Direct Artisan Weaves</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ethically sourced directly from master handloom cooperatives across Tamil Nadu, Uttar Pradesh, and Bengal.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-brand-beige text-center space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-full bg-brand-ivory flex items-center justify-center text-brand-maroon">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-brand-charcoal">WhatsApp Concierge</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Request real-time video draping, custom blouse advice, or order assistance directly on WhatsApp.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-brand-beige text-center space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto rounded-full bg-brand-ivory flex items-center justify-center text-brand-maroon">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-brand-charcoal">Complimentary Shipping</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Enjoy fully insured complimentary express courier across India on all orders of ₹5,000 and above.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Category Tiles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-10">
          <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Curated Looms</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal">
            Explore Handloom Collections
          </h2>
          <p className="text-sm text-gray-600 max-w-lg mx-auto">
            From regal bridal Kanjivarams to breezy artisanal cottons, discover sarees for every celebration.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {categoriesData?.map((cat) => (
            <Link
              key={cat.id}
              to={`/collections/${cat.slug}`}
              className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-brand-charcoal border border-brand-beige shadow-sm"
            >
              <img
                src={cat.imageUrl || '/images/sarees/default.jpg'}
                alt={cat.name}
                className="w-full h-full object-cover object-center opacity-85 group-hover:opacity-75 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/90 via-black/20 to-transparent flex flex-col justify-end p-4 text-white text-center">
                <h3 className="font-serif text-base sm:text-lg font-bold leading-tight group-hover:text-brand-gold transition-colors">
                  {cat.name}
                </h3>
                <span className="text-[11px] text-brand-ivory/80 mt-1 inline-flex items-center justify-center space-x-1 group-hover:underline">
                  <span>Explore Collection</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. New Arrivals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-4 border-b border-brand-beige">
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Fresh Off The Loom</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal">
              New Arrivals
            </h2>
          </div>
          <Link
            to="/shop?sort=newest"
            className="mt-3 sm:mt-0 text-sm font-semibold text-brand-maroon hover:text-brand-maroon-dark flex items-center space-x-1"
          >
            <span>View All New Additions</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isNewArrivalsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] bg-white rounded-lg animate-pulse border border-gray-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivalsData?.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Editorial Banner: The Art of the Korvai Loom */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-maroon text-brand-ivory rounded-2xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 space-y-5">
            <span className="text-xs uppercase tracking-[0.25em] text-brand-gold font-bold">
              Weaving Heritage
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
              The Korvai Technique: <br />
              <span className="italic font-normal text-brand-gold-light">Where two weavers breathe as one.</span>
            </h2>
            <p className="text-sm text-brand-ivory/80 leading-relaxed font-light">
              Unlike machine imitations, an authentic Korvai Kanjivaram saree requires two master weavers operating
              shuttles in synchronized harmony on a single pit-loom. The contrasting border and body are interlocked
              with meticulous precision, producing an indestructible joint and seamless color contrast that lasts for centuries.
            </p>
            <div className="pt-2">
              <Link
                to="/about"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-gold hover:bg-brand-gold-dark text-brand-charcoal text-xs font-bold uppercase tracking-wider rounded transition-colors"
              >
                <span>Read The Artisan Story</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 h-80 lg:h-full relative overflow-hidden">
            <img
              src="/images/sarees/bridal-maroon-silk.jpg"
              alt="Bridal Korvai Weave"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* 6. Bestselling Sarees Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-4 border-b border-brand-beige">
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Client Favorites</p>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal">
              Bestselling Handlooms
            </h2>
          </div>
          <Link
            to="/shop"
            className="mt-3 sm:mt-0 text-sm font-semibold text-brand-maroon hover:text-brand-maroon-dark flex items-center space-x-1"
          >
            <span>Explore Entire Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isFeaturedLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] bg-white rounded-lg animate-pulse border border-gray-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredData?.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 7. Fabric & Weave Distinction Guide */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 sm:p-12 rounded-2xl border border-brand-beige shadow-sm">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <p className="text-xs uppercase tracking-widest text-brand-gold font-bold">Connoisseur's Guide</p>
          <h2 className="font-serif text-3xl font-bold text-brand-charcoal">Understanding Our Weaves</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Each region imparts its unique soul, drape, and zari character. Here is how to choose the right weave:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-brand-ivory rounded-xl border border-brand-beige space-y-3">
            <span className="px-2.5 py-1 bg-brand-maroon text-white text-[10px] font-bold uppercase rounded">
              Kanchipuram
            </span>
            <h3 className="font-serif font-bold text-lg text-brand-charcoal">Pure Kanjivaram Silk</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Woven with heavy three-ply mulberry silk and tested silver-gold zari. Characterized by substantial weight,
              sculptural drape, and contrasting temple korvai borders. Ideal for weddings and milestone pujas.
            </p>
          </div>

          <div className="p-6 bg-brand-ivory rounded-xl border border-brand-beige space-y-3">
            <span className="px-2.5 py-1 bg-emerald-800 text-white text-[10px] font-bold uppercase rounded">
              Varanasi
            </span>
            <h3 className="font-serif font-bold text-lg text-brand-charcoal">Banarasi Katan Brocade</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Celebrated for floral jaal (vines), paisleys, and hunting scenes (shikargah) woven with kadwa zari.
              Features a soft, liquid drape with rich Mughal and Persian aesthetic influences.
            </p>
          </div>

          <div className="p-6 bg-brand-ivory rounded-xl border border-brand-beige space-y-3">
            <span className="px-2.5 py-1 bg-amber-700 text-white text-[10px] font-bold uppercase rounded">
              Madhya Pradesh
            </span>
            <h3 className="font-serif font-bold text-lg text-brand-charcoal">Chanderi & Maheshwari</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Featherlight blend of sheer silk and fine cotton warp and weft. Features delicate golden butis and a shimmering
              zari selvedge. Exudes airy, dignified elegance suited for daytime celebrations and workwear.
            </p>
          </div>
        </div>
      </section>

      {/* 8. WhatsApp Styling Consultation Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white rounded-2xl p-8 sm:p-12 shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              Personalized Boutique Service
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold">
              Looking for a specific shade or matching blouse fabric?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
              Connect directly with our boutique styling team on WhatsApp. We share live natural-light videos of sarees,
              drape previews, and assist with custom measurements.
            </p>
          </div>

          <WhatsAppButton
            variant="inline"
            label="Chat With Stylist"
            className="text-sm py-3 px-8 bg-white hover:bg-emerald-50 !text-emerald-950 font-bold"
          />
        </div>
      </section>
    </div>
  );
};
