import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useCart } from '../../context/CartContext';
import {
  Trash2,
  ShoppingBag,
  Plus,
  Minus,
  Package,
  Truck,
  Shield,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  Store,
  ShoppingCart,
  ChevronRight,
  X,
  Percent,
  Image as ImageIcon,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { toast } from 'sonner';
import { API_BASE_URL, getProducts } from '../../lib/api';

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

function getProductImages(product: any) {
  const imageUrl = normalizeImageUrl(product?.image_url);
  const mainImage = normalizeImageUrl(product?.image);

  const apiImages = Array.isArray(product?.images)
    ? product.images.map((image: unknown) => normalizeImageUrl(image))
    : [];

  const specImages =
    product?.specifications &&
    typeof product.specifications === 'object' &&
    !Array.isArray(product.specifications) &&
    Array.isArray(product.specifications[PRODUCT_IMAGES_SPEC_KEY])
      ? product.specifications[PRODUCT_IMAGES_SPEC_KEY].map((image: unknown) =>
          normalizeImageUrl(image)
        )
      : [];

  const images = uniqueImages([imageUrl, mainImage, ...apiImages, ...specImages]);

  return images.length > 0 ? images : [fallbackProductImage];
}

function getProductMainImage(product: any) {
  return getProductImages(product)[0] || fallbackProductImage;
}

export default function Cart() {
  const { items, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');
  const [syncedItems, setSyncedItems] = useState<any[]>([]);

  useEffect(() => {
    const syncCartWithBackend = async () => {
      try {
        setLoading(true);
        setSyncError('');

        if (!items || items.length === 0) {
          setSyncedItems([]);
          return;
        }

        const response = await getProducts();
        const backendProducts = Array.isArray(response) ? response : response?.results || [];

        const mergedItems = items.map((item: any) => {
          const matched = backendProducts.find(
            (product: any) => String(product.id) === String(item.product.id)
          );

          const sourceProduct = matched
            ? {
                ...item.product,
                ...matched,
              }
            : item.product;

          const productImages = getProductImages(sourceProduct);
          const productMainImage = productImages[0] || fallbackProductImage;

          const inventory = Number(
            matched?.inventory ??
              matched?.stock ??
              item.product.inventory ??
              item.product.stock ??
              0
          );

          const moq = Number(
            matched?.moq ??
              matched?.min_order_quantity ??
              item.product.moq ??
              item.product.min_order_quantity ??
              1
          );

          let stockStatus = item.product.stockStatus || item.product.stock_status || 'In Stock';

          if (inventory <= 0) {
            stockStatus = 'Out of Stock';
          } else if (inventory <= moq * 2) {
            stockStatus = 'Low Stock';
          } else {
            stockStatus = 'In Stock';
          }

          return {
            ...item,
            product: {
              ...item.product,
              id: matched?.id ?? item.product.id,
              name: matched?.name ?? item.product.name,
              image: productMainImage,
              image_url: productMainImage,
              images: productImages,
              price: Number(matched?.price ?? item.product.price ?? 0),
              unit: matched?.unit ?? item.product.unit ?? 'piece',
              moq,
              inventory,
              deliveryTime:
                matched?.deliveryTime ??
                matched?.delivery_time ??
                item.product.deliveryTime ??
                item.product.delivery_time ??
                '3-7 business days',
              supplierName:
                matched?.supplierName ??
                matched?.supplier_name ??
                matched?.supplier?.company ??
                matched?.supplier?.name ??
                matched?.supplier?.username ??
                item.product.supplierName ??
                item.product.supplier_name ??
                'Steel Supplier',
              badge: matched?.badge ?? item.product.badge,
              stockStatus,
            },
            quantity: Number(item.quantity ?? moq),
          };
        });

        setSyncedItems(mergedItems);
      } catch (error: any) {
        console.error('Failed to sync cart with backend:', error);
        setSyncError(error?.message || 'Failed to sync cart with server');

        const fallbackItems = (items || []).map((item: any) => {
          const productImages = getProductImages(item.product);
          const productMainImage = productImages[0] || fallbackProductImage;

          return {
            ...item,
            product: {
              ...item.product,
              image: productMainImage,
              image_url: productMainImage,
              images: productImages,
            },
          };
        });

        setSyncedItems(fallbackItems);
      } finally {
        setLoading(false);
      }
    };

    syncCartWithBackend();
  }, [items]);

  const subtotal = useMemo(() => {
    return syncedItems.reduce((sum: number, item: any) => {
      return sum + Number(item.product.price || 0) * Number(item.quantity || 0);
    }, 0);
  }, [syncedItems]);

  const shipping = syncedItems.length > 0 ? (subtotal >= 5000 ? 0 : 500) : 0;
  const discount = appliedPromo ? appliedPromo.discount : 0;
  const vat = Math.max(0, (subtotal + shipping - discount) * 0.15);
  const total = subtotal + shipping - discount + vat;

  const handleQuantityChange = (
    productId: string | number,
    newQuantity: number,
    moq: number,
    inventory?: number
  ) => {
    if (newQuantity < moq) {
      toast.error(`Minimum order quantity is ${moq}`);
      return;
    }

    if (inventory !== undefined && inventory > 0 && newQuantity > inventory) {
      toast.error(`Only ${inventory} units available in stock`);
      return;
    }

    updateQuantity(productId, newQuantity);
  };

  const handleApplyPromo = () => {
    const validPromoCodes: { [key: string]: number } = {
      STEEL10: 100,
      WELCOME: 200,
      BULK500: 500,
    };

    const code = promoCode.toUpperCase().trim();

    if (validPromoCodes[code]) {
      setAppliedPromo({
        code,
        discount: validPromoCodes[code],
      });

      toast.success(`Promo code "${code}" applied!`, {
        description: `You saved ${validPromoCodes[code]} SAR`,
      });

      setPromoCode('');
    } else {
      toast.error('Invalid promo code');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    toast.success('Promo code removed');
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart();
      toast.success('Cart cleared');
    }
  };

  const handleProceedToCheckout = () => {
    const invalidItem = syncedItems.find((item: any) => {
      const moq = Number(item.product.moq || 1);
      const inventory = Number(item.product.inventory || 0);

      if (item.quantity < moq) return true;
      if (inventory > 0 && item.quantity > inventory) return true;
      if (inventory <= 0) return true;

      return false;
    });

    if (invalidItem) {
      toast.error(`Please review quantity for "${invalidItem.product.name}"`);
      return;
    }

    navigate('/buyer/checkout');
  };

  const getEstimatedDelivery = () => {
    const today = new Date();
    const deliveryStart = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const deliveryEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      start: deliveryStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      end: deliveryEnd.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
  };

  const estimatedDelivery = getEstimatedDelivery();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-3xl font-bold text-[#0F2854]">Shopping Cart</h1>
          <Card>
            <CardContent className="p-10">
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-1/3 rounded bg-gray-200" />
                <div className="h-24 rounded bg-gray-200" />
                <div className="h-24 rounded bg-gray-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (syncedItems.length === 0) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-3xl font-bold text-[#0F2854]">Shopping Cart</h1>
          <Card>
            <CardContent className="p-16 text-center">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#F3F4F6]">
                <ShoppingCart className="h-10 w-10 text-[#6B7280]" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-[#111827]">Your cart is empty</h2>
              <p className="mx-auto mb-8 max-w-md text-[#6B7280]">
                Looks like you haven't added any products to your cart yet. Browse our marketplace to find quality steel products.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => navigate('/marketplace')}
                  className="bg-[#0F2854] hover:bg-[#1C4D8D]"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Browse Products
                </Button>
                <Button
                  onClick={() => navigate('/buyer/dashboard')}
                  variant="outline"
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F2854]">Shopping Cart</h1>
            <p className="mt-1 text-[#6B7280]">
              {syncedItems.length} {syncedItems.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleClearCart}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cart
          </Button>
        </div>

        {syncError && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">Server sync warning</AlertTitle>
            <AlertDescription className="text-orange-700">
              {syncError}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Alert className="border-blue-200 bg-blue-50">
              <Truck className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Free shipping on orders over 5,000 SAR</AlertTitle>
              <AlertDescription className="text-blue-700">
                {subtotal >= 5000
                  ? 'You\'re eligible for free shipping!'
                  : `${(5000 - subtotal).toLocaleString()} SAR away from free shipping`}
              </AlertDescription>
            </Alert>

            {syncedItems.map((item: any) => {
              const itemTotal = Number(item.product.price) * Number(item.quantity);
              const meetsMinimum = item.quantity >= item.product.moq;
              const stockStatus = item.product.stockStatus || 'In Stock';
              const productImage = getProductMainImage(item.product);

              return (
                <Card key={item.product.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      <div className="relative flex-shrink-0">
                        <Link to={`/marketplace/product/${item.product.id}`}>
                          {productImage ? (
                            <img
                              src={productImage}
                              alt={item.product.name}
                              className="h-32 w-32 rounded-lg object-cover transition-opacity hover:opacity-90"
                              onError={(event) => {
                                event.currentTarget.src = fallbackProductImage;
                              }}
                            />
                          ) : (
                            <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#9CA3AF]">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                          )}
                        </Link>
                        {item.product.badge && (
                          <Badge className="absolute left-2 top-2 bg-[#0F2854]">
                            {item.product.badge}
                          </Badge>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex-1">
                            <Link
                              to={`/marketplace/product/${item.product.id}`}
                              className="text-lg font-semibold text-[#111827] transition-colors hover:text-[#0F2854]"
                            >
                              {item.product.name}
                            </Link>
                            <div className="mt-1 flex items-center gap-2">
                              <Store className="h-4 w-4 text-[#6B7280]" />
                              <span className="text-sm text-[#6B7280]">
                                {item.product.supplierName}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              removeFromCart(item.product.id);
                              toast.success('Item removed from cart');
                            }}
                            className="text-[#6B7280] hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>

                        <div className="mb-3 flex items-center gap-2">
                          {stockStatus === 'In Stock' ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">In Stock</span>
                            </>
                          ) : stockStatus === 'Low Stock' ? (
                            <>
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              <span className="text-sm font-medium text-orange-700">Low Stock</span>
                            </>
                          ) : stockStatus === 'Out of Stock' ? (
                            <>
                              <X className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-red-700">Out of Stock</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">Made to Order</span>
                            </>
                          )}
                          <Separator orientation="vertical" className="h-4" />
                          <span className="text-sm text-[#6B7280]">
                            MOQ: {item.product.moq} {item.product.unit}
                          </span>
                        </div>

                        <div className="flex items-end justify-between">
                          <div className="space-y-2">
                            <div className="text-sm text-[#6B7280]">
                              Price per {item.product.unit}
                            </div>
                            <div className="text-lg font-bold text-[#0F2854]">
                              {Number(item.product.price).toLocaleString()} SAR
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end gap-2">
                              <Label className="text-sm text-[#6B7280]">Quantity</Label>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.product.id,
                                      item.quantity - 1,
                                      item.product.moq,
                                      item.product.inventory
                                    )
                                  }
                                  disabled={item.quantity <= item.product.moq}
                                  className="h-9 w-9 p-0"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>

                                <Input
                                  type="number"
                                  min={item.product.moq}
                                  max={
                                    item.product.inventory && item.product.inventory > 0
                                      ? item.product.inventory
                                      : undefined
                                  }
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.product.id,
                                      parseInt(e.target.value, 10) || item.product.moq,
                                      item.product.moq,
                                      item.product.inventory
                                    )
                                  }
                                  className="h-9 w-20 border-[#E5E7EB] bg-white text-center"
                                />

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.product.id,
                                      item.quantity + 1,
                                      item.product.moq,
                                      item.product.inventory
                                    )
                                  }
                                  className="h-9 w-9 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>

                                <span className="min-w-[60px] text-sm text-[#6B7280]">
                                  {item.product.unit}
                                </span>
                              </div>
                            </div>

                            <div className="min-w-[120px] text-right">
                              <div className="mb-1 text-sm text-[#6B7280]">Item Total</div>
                              <div className="text-xl font-bold text-[#111827]">
                                {itemTotal.toLocaleString()} SAR
                              </div>
                            </div>
                          </div>
                        </div>

                        {!meetsMinimum && (
                          <Alert className="mt-4 border-orange-200 bg-orange-50">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-800">
                              Minimum order quantity is {item.product.moq} {item.product.unit}
                            </AlertDescription>
                          </Alert>
                        )}

                        {item.product.inventory !== undefined && item.product.inventory <= 0 && (
                          <Alert className="mt-4 border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              This product is currently out of stock.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="pt-4">
              <Button
                onClick={() => navigate('/marketplace')}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </div>
          </div>

          <div>
            <div className="sticky top-8 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="h-5 w-5" />
                    Promo Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appliedPromo ? (
                    <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium text-green-900">{appliedPromo.code}</div>
                          <div className="text-sm text-green-700">-{appliedPromo.discount} SAR</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePromo}
                        className="text-green-700 hover:bg-green-100 hover:text-green-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter promo code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                          className="border-[#E5E7EB] bg-white"
                        />
                        <Button
                          onClick={handleApplyPromo}
                          variant="outline"
                          disabled={!promoCode.trim()}
                        >
                          Apply
                        </Button>
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        Try: STEEL10, WELCOME, BULK500
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[#6B7280]">
                      <span>Subtotal ({syncedItems.length} items)</span>
                      <span>{subtotal.toLocaleString()} SAR</span>
                    </div>

                    <div className="flex justify-between text-[#6B7280]">
                      <span className="flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        Shipping
                      </span>
                      <span>
                        {subtotal >= 5000 ? (
                          <span className="font-medium text-green-600">FREE</span>
                        ) : (
                          `${shipping.toLocaleString()} SAR`
                        )}
                      </span>
                    </div>

                    {appliedPromo && (
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          Discount ({appliedPromo.code})
                        </span>
                        <span>-{appliedPromo.discount.toLocaleString()} SAR</span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#6B7280]">
                      <span>VAT (15%)</span>
                      <span>{vat.toLocaleString()} SAR</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-xl font-bold text-[#111827]">
                      <span>Total</span>
                      <span className="text-[#0F2854]">{total.toLocaleString()} SAR</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 rounded-lg bg-[#F9FAFB] p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-[#0F2854]" />
                      <span className="font-medium text-[#111827]">Estimated Delivery</span>
                    </div>
                    <div className="ml-6 text-sm text-[#6B7280]">
                      {estimatedDelivery.start} - {estimatedDelivery.end}
                    </div>
                  </div>

                  <Button
                    onClick={handleProceedToCheckout}
                    className="h-12 w-full bg-[#0F2854] text-base hover:bg-[#1C4D8D]"
                  >
                    Proceed to Checkout
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>

                  <div className="space-y-2 border-t border-[#E5E7EB] pt-4">
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <Shield className="h-4 w-4 text-[#0F2854]" />
                      <span>Secure checkout</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <CheckCircle className="h-4 w-4 text-[#0F2854]" />
                      <span>Quality guaranteed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <Truck className="h-4 w-4 text-[#0F2854]" />
                      <span>Fast delivery</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0F2854]" />
                    <div className="text-sm">
                      <p className="mb-1 font-medium text-[#111827]">Need help?</p>
                      <p className="text-[#6B7280]">
                        Contact our support team for assistance with your order.
                      </p>
                      <Button variant="link" className="mt-2 h-auto p-0 text-[#0F2854]">
                        Contact Support
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}