import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MarketplaceHeader } from '../../components/MarketplaceHeader';
import { useCart } from '../../context/CartContext';
import { API_BASE_URL, getProductById, type Product } from '../../lib/api';
import { toast } from 'sonner';
import {
  Package,
  Star,
  ShoppingCart,
  Heart,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription } from '../../components/ui/alert';

const PRODUCT_IMAGES_SPEC_KEY = 'product_images';

const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const fallbackProductImage =
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800';

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

function getProductImages(product: Product) {
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

  return images.length > 0 ? images : [fallbackProductImage];
}

function getProductImage(product: Product) {
  return getProductImages(product)[0];
}

function getProductPrice(product: Product) {
  const value = Number(product.price ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getProductMoq(product: Product) {
  const value = Number(product.moq ?? product.min_order_quantity ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getProductInventory(product: Product) {
  const value = Number(product.inventory ?? product.stock ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getProductDeliveryTime(product: Product) {
  return String(product.deliveryTime || product.delivery_time || '-');
}

function getProductRating(product: Product) {
  const value = Number((product as any).rating ?? 4.5);
  return Number.isFinite(value) ? value : 4.5;
}

function normalizeSpecifications(product: Product): Record<string, string> {
  if (
    product.specifications &&
    typeof product.specifications === 'object' &&
    !Array.isArray(product.specifications)
  ) {
    return Object.fromEntries(
      Object.entries(product.specifications as Record<string, unknown>)
        .filter(([key]) => key !== PRODUCT_IMAGES_SPEC_KEY)
        .map(([key, value]) => [
          key,
          typeof value === 'string' ? value : JSON.stringify(value),
        ])
    );
  }

  return {};
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setPageError('Product ID is missing.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setPageError('');

        const data = await getProductById(id);
        const productImages = getProductImages(data);

        setProduct(data);
        setSelectedImage(productImages[0] || getProductImage(data));
        setQuantity(getProductMoq(data));
      } catch (error: any) {
        console.error('Failed to load product details:', error);
        setPageError(error?.message || 'Failed to load product details.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const productImages = useMemo(() => {
    return product ? getProductImages(product) : [];
  }, [product]);

  const specifications = useMemo(() => {
    return product ? normalizeSpecifications(product) : {};
  }, [product]);

  const price = product ? getProductPrice(product) : 0;
  const moq = product ? getProductMoq(product) : 1;
  const inventory = product ? getProductInventory(product) : 0;
  const rating = product ? getProductRating(product) : 4.5;
  const deliveryTime = product ? getProductDeliveryTime(product) : '-';
  const unit = product ? String(product.unit || 'unit') : 'unit';

  const supplierName = product
    ? String((product as any).supplierName || (product as any).supplier_name || 'Supplier')
    : 'Supplier';

  const supplierId = product
    ? (product as any).supplierId || (product as any).supplier_id || (product as any).supplier || ''
    : '';

  const isOutOfStock = inventory <= 0;
  const isLowStock = inventory > 0 && inventory <= moq * 2;

  const handleDecrease = () => {
    if (!product) return;
    setQuantity((prev) => Math.max(moq, prev - 1));
  };

  const handleIncrease = () => {
    if (!product) return;

    if (inventory > 0 && quantity + 1 > inventory) {
      toast.error(`Only ${inventory} ${unit} available in stock`);
      return;
    }

    setQuantity((prev) => prev + 1);
  };

  const handleQuantityInput = (value: string) => {
    if (!product) return;

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      setQuantity(moq);
      return;
    }

    if (parsed < moq) {
      setQuantity(moq);
      return;
    }

    if (inventory > 0 && parsed > inventory) {
      setQuantity(inventory);
      toast.error(`Only ${inventory} ${unit} available in stock`);
      return;
    }

    setQuantity(parsed);
  };

  const handleAddToCart = () => {
    if (!product) return;

    const finalQuantity = Math.max(quantity, moq);

    if (inventory <= 0) {
      toast.error('This product is currently out of stock');
      return;
    }

    if (finalQuantity > inventory) {
      toast.error(`Only ${inventory} ${unit} available in stock`);
      return;
    }

    addToCart(product as any, finalQuantity);
    toast.success(`${product.name} added to cart`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <MarketplaceHeader />

        <div className="container mx-auto px-4 py-12">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-12 text-center">
            <Package className="mx-auto mb-4 h-16 w-16 text-[#6B7280]" />
            <h3 className="mb-2 text-xl font-semibold text-[#111827]">
              Loading product
            </h3>
            <p className="text-[#6B7280]">
              Please wait while product details are being fetched.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <MarketplaceHeader />

        <div className="container mx-auto px-4 py-12">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              {pageError || 'Product not found.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <MarketplaceHeader />

      <div className="container mx-auto px-4 py-8">
        {pageError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">{pageError}</AlertDescription>
          </Alert>
        )}

        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
              <div className="flex h-[320px] items-center justify-center bg-white md:h-[460px]">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={String(product.name)}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.src = fallbackProductImage;
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-[#6B7280]">
                    <ImageIcon className="mb-3 h-12 w-12" />
                    <p>No image available</p>
                  </div>
                )}
              </div>
            </div>

            {productImages.length > 1 && (
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#111827]">
                    Product Images
                  </h3>
                  <span className="text-xs text-[#6B7280]">
                    {productImages.length} images
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
                  {productImages.map((imageUrl, index) => {
                    const isActive = selectedImage === imageUrl;

                    return (
                      <button
                        key={`${imageUrl}-${index}`}
                        type="button"
                        onClick={() => setSelectedImage(imageUrl)}
                        className={`relative overflow-hidden rounded-lg border bg-white transition ${
                          isActive
                            ? 'border-[#0F2854] ring-2 ring-[#0F2854]/20'
                            : 'border-[#E5E7EB] hover:border-[#4988C4]'
                        }`}
                      >
                        <img
                          src={imageUrl}
                          alt={`Product image ${index + 1}`}
                          className="h-20 w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = fallbackProductImage;
                          }}
                        />

                        {index === 0 && (
                          <span className="absolute left-1 top-1 rounded bg-[#0F2854] px-1.5 py-0.5 text-[10px] text-white">
                            Main
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
              <h1 className="mb-2 text-3xl font-bold text-[#111827]">
                {String(product.name)}
              </h1>

              {supplierId ? (
                <Link
                  to={`/marketplace/supplier/${supplierId}`}
                  className="mb-4 flex items-center gap-2 text-[#4988C4] hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  {supplierName}
                </Link>
              ) : (
                <div className="mb-4 flex items-center gap-2 text-[#6B7280]">
                  <MapPin className="h-4 w-4" />
                  {supplierName}
                </div>
              )}

              <div className="mb-6 flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{rating}</span>
                <span className="text-[#6B7280]">(Estimated rating)</span>
              </div>

              <div className="mb-6 border-y border-[#E5E7EB] py-6">
                <div className="mb-2 text-4xl font-bold text-[#0F2854]">
                  {price.toLocaleString()} SAR
                </div>
                <div className="text-[#6B7280]">per {unit} (excl. VAT)</div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <Heart className="h-5 w-5 text-[#4988C4]" />
                  <div>
                    <div className="text-sm">MOQ</div>
                    <div className="font-semibold text-[#111827]">
                      {moq} {unit}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#6B7280]">
                  <Clock className="h-5 w-5 text-[#4988C4]" />
                  <div>
                    <div className="text-sm">Delivery Time</div>
                    <div className="font-semibold text-[#111827]">
                      {deliveryTime}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 text-sm text-[#6B7280]">
                Available inventory:{' '}
                <span className="font-medium text-[#111827]">
                  {inventory} {unit}
                </span>
              </div>

              {isOutOfStock && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-700">
                    This product is currently out of stock.
                  </AlertDescription>
                </Alert>
              )}

              {!isOutOfStock && isLowStock && (
                <Alert className="mb-4 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="text-orange-700">
                    Low stock available. Only {inventory} {unit} remaining.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center overflow-hidden rounded-lg border border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={handleDecrease}
                      className="border-r border-[#E5E7EB] px-3 py-2 hover:bg-[#F3F4F6]"
                    >
                      −
                    </button>

                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityInput(e.target.value)}
                      min={moq}
                      max={inventory > 0 ? inventory : undefined}
                      className="w-20 border-0 text-center"
                      disabled={isOutOfStock}
                    />

                    <button
                      type="button"
                      onClick={handleIncrease}
                      className="border-l border-[#E5E7EB] px-3 py-2 hover:bg-[#F3F4F6]"
                    >
                      +
                    </button>
                  </div>

                  <span className="text-sm text-[#6B7280]">{unit}</span>
                </div>

                <div className="text-sm text-[#6B7280]">
                  Minimum order quantity is {moq} {unit}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Button
                    onClick={handleAddToCart}
                    className="bg-[#0F2854] hover:bg-[#1C4D8D]"
                    size="lg"
                    disabled={isOutOfStock}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>

                  <Button
                    onClick={() => navigate(`/buyer/rfq/new?product=${product.id}`)}
                    variant="outline"
                    size="lg"
                    className="border-[#4988C4] text-[#4988C4] hover:bg-[#4988C4] hover:text-white"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Request Quote
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white">
          <Tabs defaultValue="description" className="p-6">
            <TabsList className="flex h-auto flex-wrap">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
              <TabsTrigger value="supplier">Supplier Info</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <h3 className="mb-3 font-semibold text-[#111827]">
                Product Description
              </h3>
              <p className="leading-relaxed text-[#6B7280]">
                {String(product.description || 'No description available.')}
              </p>
            </TabsContent>

            <TabsContent value="specifications" className="mt-6">
              <h3 className="mb-3 font-semibold text-[#111827]">
                Technical Specifications
              </h3>

              {Object.keys(specifications).length === 0 ? (
                <div className="text-[#6B7280]">
                  No technical specifications available.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {Object.entries(specifications).map(([key, value]) => (
                    <div key={key} className="border-b border-[#E5E7EB] pb-2">
                      <div className="text-sm capitalize text-[#6B7280]">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="break-words font-medium text-[#111827]">
                        {value}
                      </div>
                    </div>
                  ))}

                  <div className="border-b border-[#E5E7EB] pb-2">
                    <div className="text-sm text-[#6B7280]">
                      Available Inventory
                    </div>
                    <div className="font-medium text-[#111827]">
                      {inventory} {unit}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="supplier" className="mt-6">
              <h3 className="mb-3 font-semibold text-[#111827]">
                Supplier Information
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[#6B7280]">Supplier Name</div>
                  <div className="font-medium text-[#111827]">{supplierName}</div>
                </div>

                <div>
                  <div className="text-sm text-[#6B7280]">Rating</div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-[#111827]">
                      {rating} / 5.0
                    </span>
                  </div>
                </div>

                {supplierId && (
                  <Button asChild variant="outline" className="mt-4">
                    <Link to={`/marketplace/supplier/${supplierId}`}>
                      View Supplier Profile
                    </Link>
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}