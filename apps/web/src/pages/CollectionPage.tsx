import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { ProductDto, CategoryDto } from '@nool-and-nila/shared';
import { ProductCard } from '../components/product/ProductCard';
import { ChevronRight, Sparkles } from 'lucide-react';

export const CollectionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Fetch category details
  const { data: category, isLoading: isCatLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const res = await fetchApi<CategoryDto>(`/categories/${slug}`);
      return res.data;
    },
    enabled: Boolean(slug),
  });

  // Fetch products in this category
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products', 'category', slug],
    queryFn: async () => {
      const res = await fetchApi<{ items: ProductDto[]; total: number }>(`/products?category=${slug}&limit=24`);
      return res.data;
    },
    enabled: Boolean(slug),
  });

  if (isCatLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-brand-charcoal">Collection Not Found</h1>
        <p className="text-xs text-gray-500">The requested saree collection could not be found.</p>
        <Link to="/shop" className="inline-block px-6 py-2.5 bg-brand-maroon text-white text-xs font-semibold rounded">
          Browse All Sarees
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-gray-500">
        <Link to="/" className="hover:text-brand-maroon">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <Link to="/shop" className="hover:text-brand-maroon">Collections</Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold text-brand-charcoal">{category.name}</span>
      </nav>

      {/* Hero Banner for Collection */}
      <div className="bg-brand-ivory p-8 sm:p-12 rounded-2xl border border-brand-beige relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-maroon/10 text-brand-maroon text-xs font-semibold">
            <Sparkles className="w-3 h-3 text-brand-gold" />
            <span>Curated Heritage Edit</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal">
            {category.name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
            {category.description || 'Artisanal handlooms woven with timeless mastery.'}
          </p>
          <p className="text-xs font-semibold text-brand-maroon pt-1">
            {productsData?.total || 0} Exclusive Sarees Available
          </p>
        </div>
      </div>

      {/* Sarees Grid */}
      {isProductsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-white rounded-lg animate-pulse border border-brand-beige" />
          ))}
        </div>
      ) : !productsData || productsData.items.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-brand-beige space-y-3">
          <p className="font-serif text-lg font-bold text-brand-charcoal">New Sarees Arriving Soon</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Our weavers are finishing the current batch of {category.name}. Check back shortly or explore other weaves.
          </p>
          <Link to="/shop" className="inline-block px-5 py-2 bg-brand-maroon text-white text-xs font-semibold rounded">
            Explore All Sarees
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {productsData.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
