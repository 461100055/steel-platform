import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Plus,
  Download,
  MoreVertical,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import {
  API_BASE_URL,
  createProduct,
  deleteProduct,
  getSupplierProducts,
  type Product,
  updateProduct,
} from '../../lib/api';
import { Alert, AlertDescription } from '../../components/ui/alert';

type ProductFormState = {
  name: string;
  category: string;
  price: number | string;
  moq: number | string;
  unit: string;
  deliveryTime: string;
  description: string;
  inventory: number | string;
  image: string;
  specificationsText: string;
};

const PRODUCT_IMAGES_SPEC_KEY = 'product_images';

const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const fallbackProductImage =
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800';

const initialProductForm: ProductFormState = {
  name: '',
  category: '',
  price: '',
  moq: 1,
  unit: 'ton',
  deliveryTime: '',
  description: '',
  inventory: '',
  image: '',
  specificationsText: '{}',
};

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

function getProductInventory(product: Product) {
  const value = Number(product.inventory ?? product.stock ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getProductPrice(product: Product) {
  const value = Number(product.price ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getProductMoq(product: Product) {
  const value = Number(product.moq ?? product.min_order_quantity ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getProductStatus(product: Product) {
  return String(product.status || 'pending').toLowerCase();
}

function getRejectionReason(product: Product) {
  return String((product as any).rejection_reason || '').trim();
}

function parseSpecificationsText(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    throw new Error('Specifications must be valid JSON.');
  }
}

function extractErrorMessage(error: any, fallback = 'Something went wrong.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.detail) return error.detail;
  if (error?.error) return error.error;

  if (typeof error === 'object') {
    const firstKey = Object.keys(error)[0];
    const firstValue = error[firstKey];

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }

    if (typeof firstValue === 'string') {
      return firstValue;
    }
  }

  return fallback;
}

function ProductApprovalBadge({ product }: { product: Product }) {
  const status = getProductStatus(product);

  if (status === 'approved') {
    return (
      <Badge className="border-0 bg-green-600 text-white hover:bg-green-600">
        <CheckCircle className="mr-1 h-3 w-3" />
        Approved
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <Badge className="border-0 bg-red-600 text-white hover:bg-red-600">
        <XCircle className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    );
  }

  return (
    <Badge className="border-0 bg-orange-600 text-white hover:bg-orange-600">
      <Clock className="mr-1 h-3 w-3" />
      Pending Review
    </Badge>
  );
}

function RejectionReasonAlert({ product }: { product: Product }) {
  const status = getProductStatus(product);
  const reason = getRejectionReason(product);

  if (status !== 'rejected') return null;

  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <span className="font-semibold">Rejection reason:</span>{' '}
        {reason || 'No rejection reason was provided by admin.'}
      </AlertDescription>
    </Alert>
  );
}

function ProductImageGallery({
  product,
  mode = 'grid',
}: {
  product: Product;
  mode?: 'grid' | 'list';
}) {
  const images = getProductImages(product);
  const [selectedImage, setSelectedImage] = useState(images[0]);

  useEffect(() => {
    setSelectedImage(images[0]);
  }, [product.id, images[0]]);

  if (mode === 'list') {
    return (
      <div className="flex shrink-0 gap-2">
        <div className="relative h-24 w-28 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={String(product.name)}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = fallbackProductImage;
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#9CA3AF]">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}

          {images.length > 1 && (
            <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
              {images.length} images
            </span>
          )}
        </div>

        {images.length > 1 && (
          <div className="hidden max-h-24 w-16 grid-cols-2 gap-1 sm:grid">
            {images.slice(0, 4).map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                onClick={() => setSelectedImage(imageUrl)}
                className={`overflow-hidden rounded-md border bg-white transition ${
                  selectedImage === imageUrl
                    ? 'border-[#0F2854] ring-1 ring-[#0F2854]'
                    : 'border-[#E5E7EB] hover:border-[#4988C4]'
                }`}
              >
                <img
                  src={imageUrl}
                  alt={`Thumbnail ${index + 1}`}
                  className="h-11 w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = fallbackProductImage;
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-[#E5E7EB] bg-white">
      <div className="relative h-52 overflow-hidden bg-[#F9FAFB]">
        {selectedImage ? (
          <img
            src={selectedImage}
            alt={String(product.name)}
            className="h-full w-full object-cover"
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

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto bg-white p-3">
          {images.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              onClick={() => setSelectedImage(imageUrl)}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border bg-white transition ${
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
  );
}

export default function SupplierProducts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [productForm, setProductForm] = useState<ProductFormState>(initialProductForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setPageError('');

      const data = await getSupplierProducts();
      const nextProducts = Array.isArray(data) ? data : [];

      setProducts(nextProducts);
    } catch (error: any) {
      const message = extractErrorMessage(error, 'Failed to load supplier products.');
      setPageError(message);
      setProducts([]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const productName = String(product.name || '').toLowerCase();
      const productCategory = String(product.category || '').toLowerCase();
      const productStatus = getProductStatus(product);

      const matchesSearch =
        query === '' ||
        productName.includes(query) ||
        productCategory.includes(query);

      const matchesCategory =
        categoryFilter === 'all' || String(product.category || '') === categoryFilter;

      const matchesStatus =
        statusFilter === 'all' || productStatus === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const totalProducts = products.length;

  const approvedProducts = useMemo(() => {
    return products.filter((product) => getProductStatus(product) === 'approved').length;
  }, [products]);

  const pendingProducts = useMemo(() => {
    return products.filter((product) => getProductStatus(product) === 'pending').length;
  }, [products]);

  const rejectedProducts = useMemo(() => {
    return products.filter((product) => getProductStatus(product) === 'rejected').length;
  }, [products]);

  const totalValue = useMemo(() => {
    return products.reduce((sum, p) => sum + getProductPrice(p) * getProductInventory(p), 0);
  }, [products]);

  const categories = useMemo(() => {
    return [
      'all',
      ...Array.from(
        new Set(products.map((p) => String(p.category || '').trim()).filter(Boolean))
      ),
    ];
  }, [products]);

  const resetProductForm = () => {
    setProductForm(initialProductForm);
    setFormError('');
    setSelectedProduct(null);
  };

  const validateProductForm = () => {
    if (!productForm.name.trim()) {
      throw new Error('Product name is required.');
    }

    if (!productForm.category.trim()) {
      throw new Error('Category is required.');
    }

    const price = Number(productForm.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Price must be greater than zero.');
    }

    const moq = Number(productForm.moq);
    if (!Number.isFinite(moq) || moq <= 0) {
      throw new Error('MOQ must be greater than zero.');
    }

    const inventory = Number(productForm.inventory);
    if (!Number.isFinite(inventory) || inventory < 0) {
      throw new Error('Inventory must be zero or greater.');
    }

    if (!productForm.deliveryTime.trim()) {
      throw new Error('Delivery time is required.');
    }

    parseSpecificationsText(productForm.specificationsText || '{}');
  };

  const buildProductPayload = () => {
    const specifications = parseSpecificationsText(productForm.specificationsText || '{}');

    return {
      name: productForm.name.trim(),
      category: productForm.category.trim(),
      price: Number(productForm.price),
      moq: Number(productForm.moq),
      unit: productForm.unit.trim() || 'ton',
      delivery_time: productForm.deliveryTime.trim(),
      description: productForm.description.trim(),
      inventory: Number(productForm.inventory),
      image: productForm.image.trim(),
      specifications,
    };
  };

  const handleAddProduct = async () => {
    try {
      setIsSaving(true);
      setFormError('');

      validateProductForm();

      const created = await createProduct(buildProductPayload());
      setProducts((prev) => [created, ...prev]);

      setIsAddDialogOpen(false);
      resetProductForm();

      toast.success('Product submitted successfully and is waiting for admin approval.');
    } catch (error: any) {
      const message = extractErrorMessage(error, 'Failed to add product.');
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;

    try {
      setIsSaving(true);
      setFormError('');

      validateProductForm();

      const updated = await updateProduct(selectedProduct.id, buildProductPayload());

      setProducts((prev) =>
        prev.map((product) =>
          String(product.id) === String(selectedProduct.id) ? updated : product
        )
      );

      setIsEditDialogOpen(false);
      resetProductForm();

      toast.success('Product updated successfully and returned to pending review.');
    } catch (error: any) {
      const message = extractErrorMessage(error, 'Failed to update product.');
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string | number) => {
    const confirmed = window.confirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    try {
      await deleteProduct(productId);
      setProducts((prev) => prev.filter((product) => String(product.id) !== String(productId)));
      toast.success('Product deleted successfully.');
    } catch (error: any) {
      toast.error(extractErrorMessage(error, 'Failed to delete product.'));
    }
  };

  const handleOpenEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormError('');

    const productImages = getProductImages(product);
    const specifications =
      product.specifications &&
      typeof product.specifications === 'object' &&
      !Array.isArray(product.specifications)
        ? { ...(product.specifications as Record<string, unknown>) }
        : {};

    setProductForm({
      name: String(product.name || ''),
      category: String(product.category || ''),
      price: getProductPrice(product),
      moq: getProductMoq(product),
      unit: String(product.unit || 'ton'),
      deliveryTime: String(product.deliveryTime || product.delivery_time || ''),
      description: String(product.description || ''),
      inventory: getProductInventory(product),
      image: String((product as any).image_url || product.image || productImages[0] || ''),
      specificationsText: JSON.stringify(specifications, null, 2),
    });

    setIsEditDialogOpen(true);
  };

  const renderStockBadge = (inventory: number) => {
    if (inventory === 0) {
      return <Badge className="absolute right-3 top-3 bg-red-600">Out of Stock</Badge>;
    }

    if (inventory < 100) {
      return <Badge className="absolute right-3 top-3 bg-orange-600">Low Stock</Badge>;
    }

    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F2854]">Product Management</h1>
            <p className="mt-1 text-[#6B7280]">
              Manage your catalog. New or edited products remain hidden until admin approval.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => toast.info('Export feature can be added next.')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <Button asChild className="bg-[#0F2854] hover:bg-[#1C4D8D]">
              <Link to="/supplier/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
          </div>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Products added by suppliers are submitted as <strong>Pending Review</strong>.
            They will appear in the marketplace only after admin approval.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6B7280]">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#111827]">{totalProducts}</div>
              <p className="mt-1 text-xs text-[#6B7280]">All submitted products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6B7280]">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedProducts}</div>
              <p className="mt-1 text-xs text-[#6B7280]">Visible in marketplace</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6B7280]">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingProducts}</div>
              <p className="mt-1 text-xs text-[#6B7280]">Waiting for admin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6B7280]">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedProducts}</div>
              <p className="mt-1 text-xs text-[#6B7280]">Need correction</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Search, filter, and review approval status for your catalog
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-6 flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-[#E5E7EB] bg-white pl-10"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full border-[#E5E7EB] bg-white md:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>

                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full border-[#E5E7EB] bg-white md:w-[190px]">
                  <SelectValue placeholder="Approval Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pageError && (
              <Alert className="mb-6 border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-orange-700">
                  {pageError}
                </AlertDescription>
              </Alert>
            )}

            {!pageError && !isLoading && products.length === 0 && (
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-700">
                  No products found. Click Add Product to create your first listing.
                </AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="py-12 text-center text-[#6B7280]">Loading products...</div>
            ) : (
              <Tabs defaultValue="grid" className="w-full">
                <TabsList>
                  <TabsTrigger value="grid">Grid View</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                </TabsList>

                <TabsContent value="grid" className="mt-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => {
                      const inventory = getProductInventory(product);
                      const price = getProductPrice(product);

                      return (
                        <Card
                          key={String(product.id)}
                          className="overflow-hidden transition-shadow hover:shadow-lg"
                        >
                          <div className="relative">
                            <ProductImageGallery product={product} mode="grid" />
                            {renderStockBadge(inventory)}
                          </div>

                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <CardTitle className="truncate text-base">
                                  {String(product.name)}
                                </CardTitle>
                                <p className="mt-1 text-sm text-[#6B7280]">
                                  {String(product.category || '')}
                                </p>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link
                                      to={`/supplier/products/edit/${product.id}`}
                                      className="flex cursor-pointer items-center"
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem onClick={() => handleOpenEditDialog(product)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Quick Edit
                                  </DropdownMenuItem>

                                  <DropdownMenuItem asChild>
                                    <Link
                                      to={`/supplier/products/edit/${product.id}`}
                                      className="flex cursor-pointer items-center"
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Page
                                    </Link>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <ProductApprovalBadge product={product} />
                            </div>
                          </CardHeader>

                          <CardContent>
                            <div className="space-y-3">
                              <RejectionReasonAlert product={product} />

                              <div className="flex items-center justify-between">
                                <span className="text-sm text-[#6B7280]">Price</span>
                                <span className="font-semibold text-[#111827]">
                                  {price.toLocaleString()} SAR/{String(product.unit || 'unit')}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-sm text-[#6B7280]">Stock</span>
                                <span
                                  className={`font-medium ${
                                    inventory === 0
                                      ? 'text-red-600'
                                      : inventory < 100
                                      ? 'text-orange-600'
                                      : 'text-green-600'
                                  }`}
                                >
                                  {inventory} {String(product.unit || 'unit')}
                                </span>
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button size="sm" variant="outline" className="flex-1" asChild>
                                  <Link to={`/supplier/products/edit/${product.id}`}>
                                    <Edit className="mr-1 h-3 w-3" />
                                    Edit
                                  </Link>
                                </Button>

                                <Button size="sm" variant="outline" className="flex-1" asChild>
                                  <Link to={`/supplier/products/edit/${product.id}`}>
                                    <Eye className="mr-1 h-3 w-3" />
                                    View
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="list" className="mt-6">
                  <div className="space-y-4">
                    {filteredProducts.map((product) => {
                      const inventory = getProductInventory(product);
                      const price = getProductPrice(product);

                      return (
                        <Card key={String(product.id)} className="transition-shadow hover:shadow-lg">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                              <ProductImageGallery product={product} mode="list" />

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <h3 className="truncate font-semibold text-[#111827]">
                                      {String(product.name)}
                                    </h3>

                                    <p className="mt-1 text-sm text-[#6B7280]">
                                      {String(product.category || '')}
                                    </p>

                                    <div className="mt-2 flex flex-wrap items-center gap-3">
                                      <span className="text-sm text-[#6B7280]">
                                        SKU: {String(product.id)}
                                      </span>

                                      <ProductApprovalBadge product={product} />

                                      {inventory === 0 ? (
                                        <Badge variant="outline" className="border-red-600 text-red-600">
                                          <AlertTriangle className="mr-1 h-3 w-3" />
                                          Out of Stock
                                        </Badge>
                                      ) : inventory < 100 ? (
                                        <Badge variant="outline" className="border-orange-600 text-orange-600">
                                          <AlertTriangle className="mr-1 h-3 w-3" />
                                          Low Stock
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="border-green-600 text-green-600">
                                          In Stock
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="mt-3">
                                      <RejectionReasonAlert product={product} />
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-6">
                                    <div className="text-left lg:text-right">
                                      <p className="text-sm text-[#6B7280]">Price</p>
                                      <p className="font-semibold text-[#111827]">
                                        {price.toLocaleString()} SAR
                                      </p>
                                      <p className="text-xs text-[#6B7280]">
                                        per {String(product.unit || 'unit')}
                                      </p>
                                    </div>

                                    <div className="text-left lg:text-right">
                                      <p className="text-sm text-[#6B7280]">Stock</p>
                                      <p
                                        className={`font-semibold ${
                                          inventory === 0
                                            ? 'text-red-600'
                                            : inventory < 100
                                            ? 'text-orange-600'
                                            : 'text-green-600'
                                        }`}
                                      >
                                        {inventory}
                                      </p>
                                      <p className="text-xs text-[#6B7280]">
                                        {String(product.unit || 'unit')}
                                      </p>
                                    </div>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>

                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                          <Link
                                            to={`/supplier/products/edit/${product.id}`}
                                            className="flex cursor-pointer items-center"
                                          >
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Details
                                          </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => handleOpenEditDialog(product)}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Quick Edit
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild>
                                          <Link
                                            to={`/supplier/products/edit/${product.id}`}
                                            className="flex cursor-pointer items-center"
                                          >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Page
                                          </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => handleDeleteProduct(product.id)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetProductForm();
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              Add a new product. It will be submitted for admin review before appearing in the marketplace.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4 pr-2">
            {formError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="add-category">Category</Label>
              <Input
                id="add-category"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="add-price">Price</Label>
              <Input
                id="add-price"
                type="number"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="add-moq">MOQ</Label>
              <Input
                id="add-moq"
                type="number"
                value={productForm.moq}
                onChange={(e) => setProductForm({ ...productForm, moq: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="add-unit">Unit</Label>
              <Input
                id="add-unit"
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="add-deliveryTime">Delivery Time</Label>
              <Input
                id="add-deliveryTime"
                value={productForm.deliveryTime}
                onChange={(e) => setProductForm({ ...productForm, deliveryTime: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="add-image">Main Image URL</Label>
              <Input
                id="add-image"
                value={productForm.image}
                onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="add-inventory">Inventory</Label>
              <Input
                id="add-inventory"
                type="number"
                value={productForm.inventory}
                onChange={(e) => setProductForm({ ...productForm, inventory: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
              <Label htmlFor="add-specifications">Specifications</Label>
              <Textarea
                id="add-specifications"
                value={productForm.specificationsText}
                onChange={(e) => setProductForm({ ...productForm, specificationsText: e.target.value })}
                className="min-h-[120px] sm:col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddProduct} disabled={isSaving}>
              {isSaving ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) resetProductForm();
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Editing a product will return it to pending review before it appears in the marketplace again.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4 pr-2">
            {formError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="edit-price">Price</Label>
              <Input
                id="edit-price"
                type="number"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="edit-moq">MOQ</Label>
              <Input
                id="edit-moq"
                type="number"
                value={productForm.moq}
                onChange={(e) => setProductForm({ ...productForm, moq: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="edit-unit">Unit</Label>
              <Input
                id="edit-unit"
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="edit-deliveryTime">Delivery Time</Label>
              <Input
                id="edit-deliveryTime"
                value={productForm.deliveryTime}
                onChange={(e) => setProductForm({ ...productForm, deliveryTime: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="edit-image">Main Image URL</Label>
              <Input
                id="edit-image"
                value={productForm.image}
                onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="edit-inventory">Inventory</Label>
              <Input
                id="edit-inventory"
                type="number"
                value={productForm.inventory}
                onChange={(e) => setProductForm({ ...productForm, inventory: e.target.value })}
                className="sm:col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-start sm:gap-4">
              <Label htmlFor="edit-specifications">Specifications</Label>
              <Textarea
                id="edit-specifications"
                value={productForm.specificationsText}
                onChange={(e) => setProductForm({ ...productForm, specificationsText: e.target.value })}
                className="min-h-[120px] sm:col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditProduct} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Update & Submit for Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}