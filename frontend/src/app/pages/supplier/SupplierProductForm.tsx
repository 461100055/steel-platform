import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  X,
  Save,
  ArrowLeft,
  Image as ImageIcon,
  Plus,
  Trash2,
  AlertTriangle,
  UploadCloud,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import {
  createProduct,
  deleteProduct,
  getProductById,
  updateProduct,
} from '../../lib/api';

interface ProductFormData {
  name: string;
  category: string;
  price: number;
  moq: number;
  unit: string;
  deliveryTime: string;
  description: string;
  inventory: number;
  specifications: Record<string, any>;
  image: string;
  images: string[];
}

const categories = [
  'Steel Sheets',
  'Steel Pipes',
  'Steel Coils',
  'Rebar',
  'Steel Beams',
  'Structural Steel',
  'Galvanized Steel',
  'Stainless Steel',
  'Carbon Steel',
  'Alloy Steel',
];

const units = ['ton', 'kg', 'piece', 'meter', 'bundle', 'sheet'];

const initialFormData: ProductFormData = {
  name: '',
  category: '',
  price: 0,
  moq: 1,
  unit: 'ton',
  deliveryTime: '',
  description: '',
  inventory: 0,
  specifications: {},
  image: '',
  images: [],
};

const PRODUCT_IMAGES_SPEC_KEY = 'product_images';

function isBase64Image(value: string) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function isLocalPreviewImage(value: string) {
  return typeof value === 'string' && value.startsWith('blob:');
}

function normalizeImageUrl(value: string) {
  return String(value || '').trim();
}

function uniqueImages(images: string[]) {
  return Array.from(
    new Set(
      images
        .map((image) => normalizeImageUrl(image))
        .filter(Boolean)
    )
  );
}

function extractErrorMessage(error: any) {
  if (!error) return 'Failed to save product.';
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.detail) return error.detail;

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

  return 'Failed to save product.';
}

function getImagesFromProduct(product: any) {
  const apiImages = Array.isArray(product?.images)
    ? product.images.filter(Boolean).map(String)
    : [];

  const specificationImages = Array.isArray(product?.specifications?.[PRODUCT_IMAGES_SPEC_KEY])
    ? product.specifications[PRODUCT_IMAGES_SPEC_KEY].filter(Boolean).map(String)
    : [];

  const imageUrl =
    typeof product?.image_url === 'string'
      ? product.image_url
      : '';

  const mainImage =
    typeof product?.image === 'string'
      ? product.image
      : '';

  return uniqueImages([imageUrl, mainImage, ...apiImages, ...specificationImages]);
}

export default function SupplierProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pageError, setPageError] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [localPreviewUrls, setLocalPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const loadProduct = async () => {
      if (!isEditMode || !id) return;

      try {
        setIsLoadingProduct(true);
        setPageError('');

        const product = await getProductById(id);

        const normalizedSpecs =
          product.specifications &&
          typeof product.specifications === 'object' &&
          !Array.isArray(product.specifications)
            ? { ...(product.specifications as Record<string, any>) }
            : {};

        const loadedImages = getImagesFromProduct(product);
        const mainImage = loadedImages[0] || '';

        delete normalizedSpecs[PRODUCT_IMAGES_SPEC_KEY];

        setFormData({
          name: String(product.name || ''),
          category: String(product.category || ''),
          price: Number(product.price || 0),
          moq: Number(product.moq ?? product.min_order_quantity ?? 1),
          unit: String(product.unit || 'ton'),
          deliveryTime: String(product.deliveryTime || product.delivery_time || ''),
          description: String(product.description || ''),
          inventory: Number(product.inventory ?? product.stock ?? 0),
          specifications: normalizedSpecs,
          image: mainImage,
          images: loadedImages,
        });
      } catch (error: any) {
        const message = extractErrorMessage(error);
        setPageError(message);
        toast.error(message);
      } finally {
        setIsLoadingProduct(false);
      }
    };

    loadProduct();

    return () => {
      localPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode]);

  // =========================================================
  // Cloudinary Upload - Disabled / Frozen
  // =========================================================
  // ملاحظة:
  // تم تجميد Cloudinary فقط بدون حذف.
  // كان هذا الكود يرفع الصور مباشرة إلى Cloudinary من الواجهة الأمامية.
  // الآن التخزين أصبح محليًا عبر Django media باستخدام FormData.
  //
  // const uploadToCloudinary = async (file: File) => {
  //   const cloudName = 'dmrnepldy';
  //   const uploadPreset = 'unsigned_preset';
  //
  //   const uploadFormData = new FormData();
  //   uploadFormData.append('file', file);
  //   uploadFormData.append('upload_preset', uploadPreset);
  //
  //   const response = await fetch(
  //     `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  //     {
  //       method: 'POST',
  //       body: uploadFormData,
  //     }
  //   );
  //
  //   const data = await response.json();
  //
  //   if (!response.ok || !data?.secure_url) {
  //     throw new Error(data?.error?.message || 'Image upload to Cloudinary failed.');
  //   }
  //
  //   return data.secure_url as string;
  // };

  const setImages = (images: string[]) => {
    const nextImages = uniqueImages(images);
    const mainImage = nextImages[0] || '';

    setFormData((prev) => ({
      ...prev,
      image: mainImage,
      images: nextImages,
    }));
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploadingImage(true);
      setPageError('');

      const imageFiles = files.filter((file) => file.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        throw new Error('Please select valid image files only.');
      }

      localPreviewUrls.forEach((url) => URL.revokeObjectURL(url));

      const previewUrls = imageFiles.map((file) => URL.createObjectURL(file));

      setSelectedImageFile(imageFiles[0]);
      setLocalPreviewUrls(previewUrls);

      setImages([
        ...previewUrls,
        ...formData.images.filter((image) => !isLocalPreviewImage(image)),
      ]);

      if (imageFiles.length > 1) {
        toast.info(
          'Multiple images selected for preview. The backend currently saves the first selected image as the main product image.'
        );
      } else {
        toast.success('Image selected successfully. It will be saved locally when you submit the form.');
      }
    } catch (error: any) {
      const message = extractErrorMessage(error);
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const addImageUrl = () => {
    const imageUrl = normalizeImageUrl(newImageUrl);

    if (!imageUrl) {
      toast.error('Image URL is required.');
      return;
    }

    if (isBase64Image(imageUrl)) {
      toast.error('Base64 image data is not supported. Please use a file upload or a public URL.');
      return;
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      toast.error('Please enter a valid public image URL.');
      return;
    }

    setImages([...formData.images, imageUrl]);
    setNewImageUrl('');
    toast.success('Image URL added.');
  };

  const removeImage = (imageUrl: string) => {
    const nextImages = formData.images.filter((image) => image !== imageUrl);

    if (isLocalPreviewImage(imageUrl)) {
      URL.revokeObjectURL(imageUrl);

      const remainingLocalPreviews = localPreviewUrls.filter((url) => url !== imageUrl);
      setLocalPreviewUrls(remainingLocalPreviews);

      if (remainingLocalPreviews.length === 0) {
        setSelectedImageFile(null);
      }
    }

    setImages(nextImages);
    toast.info('Image removed.');
  };

  const makeMainImage = (imageUrl: string) => {
    const nextImages = uniqueImages([
      imageUrl,
      ...formData.images.filter((image) => image !== imageUrl),
    ]);

    setImages(nextImages);

    if (isLocalPreviewImage(imageUrl)) {
      toast.info(
        'Main preview updated. The backend currently saves the first selected local file only.'
      );
    } else {
      toast.success('Main image updated.');
    }
  };

  const addSpecification = () => {
    if (newSpecKey.trim() && newSpecValue.trim()) {
      if (newSpecKey.trim() === PRODUCT_IMAGES_SPEC_KEY) {
        toast.error('This specification key is reserved for product images.');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [newSpecKey.trim()]: newSpecValue.trim(),
        },
      }));

      setNewSpecKey('');
      setNewSpecValue('');
      toast.success('Specification added.');
    }
  };

  const removeSpecification = (key: string) => {
    const { [key]: _, ...rest } = formData.specifications;

    setFormData((prev) => ({
      ...prev,
      specifications: rest,
    }));

    toast.info('Specification removed.');
  };

  const buildPayload = () => {
    const images = uniqueImages(formData.images);

    // لا نحفظ روابط blob أو base64 في قاعدة البيانات لأنها روابط مؤقتة داخل المتصفح فقط.
    const publicImages = images.filter(
      (image) =>
        image &&
        !isLocalPreviewImage(image) &&
        !isBase64Image(image)
    );

    const payload = new FormData();

    payload.append('name', formData.name.trim());
    payload.append('category', formData.category);
    payload.append('price', String(Number(formData.price)));
    payload.append('moq', String(Number(formData.moq)));
    payload.append('unit', formData.unit);
    payload.append('delivery_time', formData.deliveryTime.trim());
    payload.append('description', formData.description.trim());
    payload.append('inventory', String(Number(formData.inventory)));

    const safeSpecifications = {
      ...(formData.specifications && typeof formData.specifications === 'object'
        ? formData.specifications
        : {}),
      [PRODUCT_IMAGES_SPEC_KEY]: publicImages,
    };

    // هذا السطر هو الأهم لحل مشكلة:
    // Value must be valid JSON.
    payload.append('specifications', JSON.stringify(safeSpecifications));

    // الباكند الحالي يحفظ صورة رئيسية واحدة فقط في Product.image.
    // لذلك نرسل أول ملف صورة تم اختياره فقط.
    if (selectedImageFile) {
      payload.append('image', selectedImageFile);
    }

    return payload;
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      throw new Error('Product name is required.');
    }

    if (!formData.category) {
      throw new Error('Category is required.');
    }

    if (!formData.description.trim()) {
      throw new Error('Description is required.');
    }

    if (!Number.isFinite(Number(formData.price)) || Number(formData.price) <= 0) {
      throw new Error('Price must be greater than zero.');
    }

    if (!Number.isFinite(Number(formData.moq)) || Number(formData.moq) <= 0) {
      throw new Error('Minimum order quantity must be greater than zero.');
    }

    if (!Number.isFinite(Number(formData.inventory)) || Number(formData.inventory) < 0) {
      throw new Error('Inventory must be zero or greater.');
    }

    if (!formData.deliveryTime.trim()) {
      throw new Error('Delivery time is required.');
    }

    for (const image of formData.images) {
      if (isBase64Image(image)) {
        throw new Error(
          'Base64 image data is not supported. Please upload the image as a file.'
        );
      }
    }

    try {
      JSON.stringify(formData.specifications || {});
    } catch {
      throw new Error('Specifications must be valid JSON.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      validateForm();

      const payload = buildPayload();

      if (isEditMode && id) {
        await updateProduct(id, payload);
        toast.success('Product updated successfully and returned to pending review.');
      } else {
        await createProduct(payload);
        toast.success('Product submitted successfully and is waiting for admin approval.');
      }

      localPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      setLocalPreviewUrls([]);
      setSelectedImageFile(null);

      navigate('/supplier/products');
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!isEditMode || !id) return;

    const confirmed = window.confirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      await deleteProduct(id);
      toast.success('Product deleted successfully.');
      navigate('/supplier/products');
    } catch (error: any) {
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/supplier/products')}
              className="w-fit"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>

            <div>
              <h1 className="text-2xl font-bold text-[#0F2854] md:text-3xl">
                {isEditMode ? 'Edit Product' : 'Add New Product'}
              </h1>
              <p className="mt-1 text-[#6B7280]">
                {isEditMode
                  ? 'Update product information. The product will return to pending review.'
                  : 'Add a new product. It will be reviewed by admin before appearing in the marketplace.'}
              </p>
            </div>
          </div>
        </div>

        {pageError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">{pageError}</AlertDescription>
          </Alert>
        )}

        {isLoadingProduct ? (
          <Card>
            <CardContent className="py-10 text-center text-[#6B7280]">
              Loading product details...
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the core details about your product</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Hot Rolled Steel Sheet"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your product in detail..."
                    rows={4}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing & Inventory</CardTitle>
                <CardDescription>Set pricing and stock information</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (SAR) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: Number(e.target.value || 0) })
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="moq">Minimum Order Quantity *</Label>
                    <Input
                      id="moq"
                      type="number"
                      value={formData.moq}
                      onChange={(e) =>
                        setFormData({ ...formData, moq: Number(e.target.value || 1) })
                      }
                      placeholder="1"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inventory">Current Inventory *</Label>
                    <Input
                      id="inventory"
                      type="number"
                      value={formData.inventory}
                      onChange={(e) =>
                        setFormData({ ...formData, inventory: Number(e.target.value || 0) })
                      }
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryTime">Delivery Time *</Label>
                    <Input
                      id="deliveryTime"
                      value={formData.deliveryTime}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveryTime: e.target.value })
                      }
                      placeholder="e.g., 7-10 days"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
                <CardDescription>
                  Upload a local product image to be saved in Django media storage.
                  Cloudinary is currently disabled and frozen in the code.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="relative flex-1">
                      <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                      <Input
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Optional: paste public image URL, then click Add Image"
                        className="pl-10"
                      />
                    </div>

                    <Button type="button" onClick={addImageUrl} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Image URL
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload local image file</Label>

                  <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E5E7EB] bg-white p-6 text-center transition-colors hover:border-[#1C4D8D]">
                    <UploadCloud className="mb-3 h-10 w-10 text-[#6B7280]" />

                    <span className="mb-1 text-sm font-medium text-[#111827]">
                      {isUploadingImage ? 'Preparing image...' : 'Select product image'}
                    </span>

                    <span className="text-xs text-[#6B7280]">
                      {isUploadingImage
                        ? 'Please wait'
                        : 'The image will be saved locally in Django media when you submit the form'}
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImagesUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                  </label>
                </div>

                {formData.images.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Images ({formData.images.length})</Label>
                      <p className="text-xs text-[#6B7280]">
                        First image is the main preview
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {formData.images.map((imageUrl, index) => (
                        <div
                          key={imageUrl}
                          className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white"
                        >
                          <div className="relative h-48 bg-white">
                            <ImageWithFallback
                              src={imageUrl}
                              alt={`Product image ${index + 1}`}
                              className="h-full w-full object-contain"
                            />

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-2 bg-white/90 hover:bg-white"
                              onClick={() => removeImage(imageUrl)}
                            >
                              <X className="h-4 w-4" />
                            </Button>

                            {index === 0 && (
                              <span className="absolute left-2 top-2 rounded-full bg-[#0F2854] px-3 py-1 text-xs font-medium text-white">
                                Main Image
                              </span>
                            )}

                            {isLocalPreviewImage(imageUrl) && (
                              <span className="absolute bottom-2 left-2 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
                                Local Preview
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 border-t border-[#E5E7EB] p-3">
                            <p className="line-clamp-1 text-xs text-[#6B7280]">
                              {isLocalPreviewImage(imageUrl)
                                ? 'Local image selected'
                                : imageUrl}
                            </p>

                            {index !== 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => makeMainImage(imageUrl)}
                              >
                                Make Main Image
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-center">
                    <ImageIcon className="mx-auto mb-3 h-12 w-12 text-[#9CA3AF]" />
                    <p className="text-sm font-medium text-[#111827]">
                      No product images added yet
                    </p>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      Upload a local image or add a public image URL.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
                <CardDescription>Add detailed specifications and properties</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {Object.keys(formData.specifications).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(formData.specifications).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 rounded-lg bg-[#F9FAFB] p-3">
                        <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
                          <div>
                            <span className="text-sm font-medium text-[#374151]">{key}</span>
                          </div>
                          <div>
                            <span className="break-words text-sm text-[#6B7280]">
                              {typeof value === 'string' ? value : JSON.stringify(value)}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSpecification(key)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Add Specification</Label>

                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      placeholder="Property name (e.g., Grade)"
                      className="flex-1"
                    />

                    <Input
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      placeholder="Value (e.g., ASTM A36)"
                      className="flex-1"
                    />

                    <Button
                      type="button"
                      onClick={addSpecification}
                      disabled={!newSpecKey || !newSpecValue}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-6 md:flex-row md:items-center md:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/supplier/products')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <div className="flex flex-col gap-3 md:flex-row">
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    disabled={isSubmitting}
                    onClick={handleDeleteProduct}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Product
                  </Button>
                )}

                <Button
                  type="submit"
                  className="bg-[#0F2854] hover:bg-[#1C4D8D]"
                  disabled={isSubmitting || isUploadingImage}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting
                    ? 'Saving...'
                    : isUploadingImage
                    ? 'Preparing Image...'
                    : isEditMode
                    ? 'Update Product'
                    : 'Submit Product'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}