import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ProductCard } from '../../components/ProductCard';
import { MarketplaceHeader } from '../../components/MarketplaceHeader';
import {
  Package,
  AlertTriangle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { API_BASE_URL, getProducts, type Product } from '../../lib/api';

const PRODUCT_IMAGES_SPEC_KEY = 'product_images';

const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

function normalizeImageUrl(value: unknown) {
  return String(value || '').trim();
}

function buildProductImageUrl(value: unknown) {
  const image = normalizeImageUrl(value);

  if (!image) return '';

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  if (image.startsWith('/media/')) {
    return `${BACKEND_BASE_URL}${image}`;
  }

  if (image.startsWith('media/')) {
    return `${BACKEND_BASE_URL}/${image}`;
  }

  if (image.startsWith('/products/')) {
    return `${BACKEND_BASE_URL}/media${image}`;
  }

  if (image.startsWith('products/')) {
    return `${BACKEND_BASE_URL}/media/${image}`;
  }

  if (image.startsWith('/suppliers/')) {
    return `${BACKEND_BASE_URL}/media${image}`;
  }

  if (image.startsWith('suppliers/')) {
    return `${BACKEND_BASE_URL}/media/${image}`;
  }

  return image;
}

function uniqueImages(images: string[]) {
  return Array.from(
    new Set(
      images
        .map((image) => buildProductImageUrl(image))
        .filter(Boolean)
    )
  );
}

function normalizeProductForCard(product: Product): Product {
  const imageUrl = normalizeImageUrl((product as any).image_url);
  const mainImage = normalizeImageUrl((product as any).image);

  const apiImages = Array.isArray((product as any).images)
    ? (product as any).images.map((image: unknown) => normalizeImageUrl(image))
    : [];

  const specImages =
    product.specifications &&
    typeof product.specifications === 'object' &&
    !Array.isArray(product.specifications) &&
    Array.isArray((product.specifications as Record<string, unknown>)[PRODUCT_IMAGES_SPEC_KEY])
      ? ((product.specifications as Record<string, unknown>)[PRODUCT_IMAGES_SPEC_KEY] as unknown[]).map(
          (image) => normalizeImageUrl(image)
        )
      : [];

  const images = uniqueImages([imageUrl, mainImage, ...apiImages, ...specImages]);
  const finalMainImage = images[0] || '';

  return {
    ...product,
    image: finalMainImage,
    image_url: finalMainImage,
    images,
  } as Product;
}

function getProductPrice(product: Product) {
  const value = Number(product.price ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getProductRating(product: Product) {
  const value = Number((product as any).rating ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getProductName(product: Product) {
  return String(product.name || '').trim();
}

function getProductDescription(product: Product) {
  return String(product.description || '').trim();
}

function getProductCategory(product: Product) {
  return String(product.category || '').trim();
}

export default function ProductListing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        setPageError('');

        const response = await getProducts();
        const productsData = Array.isArray(response) ? response : response?.results || [];

        const normalizedProducts = productsData.map((product: Product) =>
          normalizeProductForCard(product)
        );

        setProducts(normalizedProducts);
      } catch (error: any) {
        console.error('Failed to load products:', error);
        setPageError(error?.message || 'Failed to load products.');
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) => getProductCategory(product))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const name = getProductName(product).toLowerCase();
      const description = getProductDescription(product).toLowerCase();
      const category = getProductCategory(product);

      const matchesSearch =
        normalizedSearch === '' ||
        name.includes(normalizedSearch) ||
        description.includes(normalizedSearch);

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(category);

      return matchesSearch && matchesCategory;
    });

    const sorted = [...filtered];

    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => getProductPrice(a) - getProductPrice(b));
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => getProductPrice(b) - getProductPrice(a));
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => getProductRating(b) - getProductRating(a));
    }

    return sorted;
  }, [products, searchQuery, selectedCategories, sortBy]);

  const filtersContent = (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#111827]">Filters</h3>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMobileFiltersOpen(false)}
          className="md:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="mb-6">
        <h4 className="mb-3 font-medium text-[#111827]">Categories</h4>

        {categories.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No categories available</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category} className="flex items-center">
                <Checkbox
                  id={`category-${category}`}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => handleCategoryToggle(category)}
                />
                <Label
                  htmlFor={`category-${category}`}
                  className="ml-2 cursor-pointer text-sm text-[#111827]"
                >
                  {category}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCategories.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedCategories([])}
          className="w-full"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <MarketplaceHeader
        showSearch={true}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 md:px-6 md:py-8 xl:px-8">
        {pageError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">{pageError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-24">{filtersContent}</div>
          </aside>

          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                aria-label="Close filters"
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileFiltersOpen(false)}
              />

              <div className="absolute left-0 top-0 h-full w-[86vw] max-w-[340px] overflow-y-auto bg-[#F9FAFB] p-4 shadow-2xl">
                {filtersContent}
              </div>
            </div>
          )}

          <main className="min-w-0 flex-1">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold text-[#0F2854] md:mb-2 md:text-3xl">
                  {selectedCategories.length > 0 ? 'Filtered Products' : 'All Products'}
                </h1>
                <p className="mt-1 text-sm text-[#6B7280] md:text-base">
                  {isLoading ? 'Loading products...' : `${filteredProducts.length} products found`}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="w-full border-[#E5E7EB] bg-white sm:w-auto lg:hidden"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                  {selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}
                </Button>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full border-[#E5E7EB] bg-white sm:w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 text-center md:p-12">
                <Package className="mx-auto mb-4 h-14 w-14 text-[#6B7280] md:h-16 md:w-16" />
                <h3 className="mb-2 text-lg font-semibold text-[#111827] md:text-xl">
                  Loading products
                </h3>
                <p className="text-sm text-[#6B7280] md:text-base">
                  Please wait while we fetch the marketplace catalog.
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 text-center md:p-12">
                <Package className="mx-auto mb-4 h-14 w-14 text-[#6B7280] md:h-16 md:w-16" />
                <h3 className="mb-2 text-lg font-semibold text-[#111827] md:text-xl">
                  No products found
                </h3>
                <p className="text-sm text-[#6B7280] md:text-base">
                  Try adjusting your filters or search query.
                </p>
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={String(product.id)} product={product as any} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}