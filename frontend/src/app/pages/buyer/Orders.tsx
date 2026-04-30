import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Package,
  Eye,
  Download,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { getOrders, downloadOrderInvoice } from '../../lib/api';
import { toast } from 'sonner';

function getOrderId(order: any) {
  return order?.id || order?.order_id || order?.orderNumber || order?.order_number;
}

function getOrderDisplayId(order: any) {
  if (order?.order_number) return order.order_number;
  if (order?.orderNumber) return order.orderNumber;
  if (order?.id) return `ORD-${order.id}`;
  return 'ORD';
}

function normalizeOrderStatus(order: any) {
  const rawStatus = String(
    order?.status ||
      order?.order_status ||
      order?.payment_status ||
      'processing'
  ).toLowerCase();

  if (['delivered', 'completed', 'complete'].includes(rawStatus)) {
    return 'delivered';
  }

  if (['shipped', 'shipping', 'in_transit', 'in-transit'].includes(rawStatus)) {
    return 'shipped';
  }

  if (['cancelled', 'canceled', 'failed'].includes(rawStatus)) {
    return 'cancelled';
  }

  return 'processing';
}

function getOrderFirstItem(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.length > 0 ? items[0] : {};
}

function getOrderProductName(order: any) {
  const firstItem = getOrderFirstItem(order);

  return (
    firstItem?.name ||
    firstItem?.product_name ||
    firstItem?.product?.name ||
    firstItem?.product_details?.name ||
    order?.productName ||
    order?.product_name ||
    order?.product?.name ||
    'Order Items'
  );
}

function getOrderQuantity(order: any) {
  const firstItem = getOrderFirstItem(order);
  const quantity = Number(firstItem?.quantity || order?.quantity || 0);
  return Number.isFinite(quantity) ? quantity : 0;
}

function getOrderUnit(order: any) {
  const firstItem = getOrderFirstItem(order);

  return (
    firstItem?.unit ||
    firstItem?.product_details?.unit ||
    order?.unit ||
    'units'
  );
}

function getOrderSupplierName(order: any) {
  const firstItem = getOrderFirstItem(order);

  return (
    order?.supplierName ||
    order?.supplier_name ||
    order?.supplier?.company ||
    order?.supplier?.name ||
    firstItem?.supplierName ||
    firstItem?.supplier_name ||
    firstItem?.product_details?.supplier_name ||
    'Steel Supplier'
  );
}

function getOrderDate(order: any) {
  return (
    order?.created_at ||
    order?.createdAt ||
    order?.date ||
    order?.order_date ||
    ''
  );
}

function getOrderTotal(order: any) {
  const total = Number(
    order?.total_price ||
      order?.total ||
      order?.total_amount ||
      order?.amount ||
      0
  );

  return Number.isFinite(total) ? total : 0;
}

function formatDate(value: string) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getBadgeVariant(status: string) {
  if (status === 'delivered') return 'default';
  if (status === 'shipped') return 'secondary';
  if (status === 'cancelled') return 'destructive';
  return 'outline';
}

function getBadgeLabel(status: string) {
  if (status === 'delivered') return 'Delivered';
  if (status === 'shipped') return 'Shipped';
  if (status === 'cancelled') return 'Cancelled';
  return 'Processing';
}

function getErrorMessage(error: any, fallback = 'Something went wrong.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.detail) return error.detail;
  if (error?.error) return error.error;
  return fallback;
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | number | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await getOrders();
        const ordersData = Array.isArray(response) ? response : response?.results || [];

        setOrders(ordersData);
      } catch (err: any) {
        const message = getErrorMessage(err, 'Failed to load orders.');
        console.error('Failed to load orders:', err);
        setError(message);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const normalizedOrders = useMemo(() => {
    return orders.map((order: any) => {
      const orderId = getOrderId(order);

      return {
        ...order,
        normalizedId: orderId,
        normalizedDisplayId: getOrderDisplayId(order),
        normalizedStatus: normalizeOrderStatus(order),
        normalizedProductName: getOrderProductName(order),
        normalizedSupplierName: getOrderSupplierName(order),
        normalizedQuantity: getOrderQuantity(order),
        normalizedUnit: getOrderUnit(order),
        normalizedDate: getOrderDate(order),
        normalizedTotal: getOrderTotal(order),
      };
    });
  }, [orders]);

  const stats = useMemo(() => {
    return {
      total: normalizedOrders.length,
      processing: normalizedOrders.filter((order) => order.normalizedStatus === 'processing').length,
      shipped: normalizedOrders.filter((order) => order.normalizedStatus === 'shipped').length,
      delivered: normalizedOrders.filter((order) => order.normalizedStatus === 'delivered').length,
    };
  }, [normalizedOrders]);

  const handleDownloadInvoice = async (orderId: string | number) => {
    if (!orderId) {
      toast.error('Order ID is missing.');
      return;
    }

    try {
      setDownloadingOrderId(orderId);
      await downloadOrderInvoice(orderId);
      toast.success('Invoice downloaded successfully.');
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Failed to download invoice.'));
    } finally {
      setDownloadingOrderId(null);
    }
  };

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-[#0F2854]">Orders</h1>
            <p className="text-[#6B7280]">Track and manage your orders</p>
          </div>

          <Button asChild className="bg-[#0F2854] hover:bg-[#1C4D8D]">
            <Link to="/marketplace">Continue Shopping</Link>
          </Button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#BDE8F5]">
                  <Package className="h-6 w-6 text-[#0F2854]" />
                </div>

                <div>
                  <div className="text-sm text-[#6B7280]">Total Orders</div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.total}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>

                <div>
                  <div className="text-sm text-[#6B7280]">Processing</div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.processing}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>

                <div>
                  <div className="text-sm text-[#6B7280]">Shipped</div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.shipped}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>

                <div>
                  <div className="text-sm text-[#6B7280]">Delivered</div>
                  <div className="text-2xl font-bold text-[#111827]">{stats.delivered}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-xl bg-gray-100"
                  />
                ))}
              </div>
            ) : normalizedOrders.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-[#9CA3AF]" />
                <h3 className="text-lg font-semibold text-[#111827]">No orders yet</h3>
                <p className="mt-2 text-[#6B7280]">
                  Start browsing the marketplace to place your first order.
                </p>

                <Button asChild className="mt-6 bg-[#0F2854] hover:bg-[#1C4D8D]">
                  <Link to="/marketplace">Browse Products</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {normalizedOrders.map((order) => {
                  const isDownloading = downloadingOrderId === order.normalizedId;

                  return (
                    <div
                      key={String(order.normalizedId)}
                      className="flex flex-col gap-4 rounded-xl border border-[#E5E7EB] p-5 transition hover:shadow-sm lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#BDE8F5]">
                          <Package className="h-6 w-6 text-[#0F2854]" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-[#111827]">
                              {order.normalizedDisplayId}
                            </h3>

                            <Badge variant={getBadgeVariant(order.normalizedStatus)}>
                              {getBadgeLabel(order.normalizedStatus)}
                            </Badge>
                          </div>

                          <p className="mt-1 text-[#111827]">
                            {order.normalizedProductName}
                          </p>

                          <p className="mt-1 text-sm text-[#6B7280]">
                            {order.normalizedSupplierName} •{' '}
                            {order.normalizedQuantity} {order.normalizedUnit} •{' '}
                            {formatDate(order.normalizedDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-[120px] text-left sm:text-right">
                          <div className="font-semibold text-[#111827]">
                            {order.normalizedTotal.toLocaleString()} SAR
                          </div>
                          <div className="text-sm text-[#6B7280]">Total</div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/buyer/orders/${order.normalizedId}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadInvoice(order.normalizedId)}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-2 h-4 w-4" />
                            )}
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}