import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../lib/api';
import { API_BASE_URL } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Star, ShoppingCart, FileText, Image as ImageIcon } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

const PRODUCT_IMAGES_SPEC_KEY = 'product_images';

const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const fallbackProductImage =
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400';

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
  const mainImage = normalizeImageUrl(product.image);

  const apiImages = Array.isArray(product.images)
    ? product.images.map((image) => normalizeImageUrl(image))
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

function getProductPrice(product: Product) {
  const value = Number(product.price ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getProductMoq(product: Product) {
  const value = Number(product.moq ?? product.min_order_quantity ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getProductRating(product: Product) {
  const value = Number((product as any).rating ?? 4.5);
  return Number.isFinite(value) ? value : 4.5;
}

function getSupplierName(product: Product) {
  return String(
    (product as any).supplierName ||
      (product as any).supplier_name ||
      'Verified Supplier'
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const images = getProductImages(product);
  const [selectedImage, setSelectedImage] = useState(images[0]);

  const price = getProductPrice(product);
  const moq = getProductMoq(product);
  const rating = getProductRating(product);
  const supplierName = getSupplierName(product);
  const unit = String(product.unit || 'unit');

  useEffect(() => {
    const nextImages = getProductImages(product);
    setSelectedImage(nextImages[0]);
  }, [
    product.id,
    product.image,
    (product as any).image_url,
    product.images,
    product.specifications,
  ]);

  const handleAddToCart = () => {
    addToCart(product, moq);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="border-b border-[#E5E7EB] bg-white">
        <Link to={`/marketplace/product/${product.id}`}>
          <div className="relative aspect-video overflow-hidden bg-[#F9FAFB]">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={String(product.name)}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                onError={(event) => {
                  event.currentTarget.src = fallbackProductImage;
                }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-[#9CA3AF]">
                <ImageIcon className="mb-2 h-10 w-10" />
                <span className="text-sm">No image</span>
              </div>
            )}

            {images.length > 1 && (
              <span className="absolute left-3 top-3 rounded-full bg-[#0F2854] px-3 py-1 text-xs font-medium text-white">
                {images.length} images
              </span>
            )}
          </div>
        </Link>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto bg-white p-3">
            {images.map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                onClick={() => setSelectedImage(imageUrl)}
                className={`relative h-14 w-16 shrink-0 overflow-hidden rounded-lg border bg-white transition ${
                  selectedImage === imageUrl
                    ? 'border-[#0F2854] ring-2 ring-[#0F2854]/20'
                    : 'border-[#E5E7EB] hover:border-[#4988C4]'
                }`}
              >
                <img
                  src={imageUrl}
                  alt={`Product thumbnail ${index + 1}`}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = fallbackProductImage;
                  }}
                />

                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-[#0F2854] px-1.5 py-0.5 text-[9px] text-white">
                    Main
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <Link to={`/marketplace/product/${product.id}`}>
          <h3 className="mb-1 font-semibold text-[#111827] hover:text-[#4988C4]">
            {String(product.name)}
          </h3>
        </Link>

        <p className="mb-2 text-sm text-[#6B7280]">{supplierName}</p>

        <div className="mb-3 flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium">{rating}</span>
        </div>

        <div className="mb-3">
          <div className="text-2xl font-bold text-[#0F2854]">
            {price.toLocaleString()} SAR
          </div>
          <div className="text-sm text-[#6B7280]">per {unit}</div>
          <div className="text-sm text-[#6B7280]">
            MOQ: {moq} {unit}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={handleAddToCart}
            className="bg-[#0F2854] hover:bg-[#1C4D8D]"
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            Add to Cart
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/buyer/rfq/new?product=${product.id}`)}
            className="border-[#4988C4] text-[#4988C4] hover:bg-[#4988C4] hover:text-white"
          >
            <FileText className="mr-1 h-4 w-4" />
            RFQ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}