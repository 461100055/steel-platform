from django.urls import path

from .views import (
    RegisterView,
    LoginView,
    CurrentUserView,
    CheckEmailView,

    ProductListCreateView,
    ProductDetailView,
    SupplierProductsView,

    OrderListView,
    OrderDetailView,
    OrderCreateView,
    SupplierOrdersView,
    OrderInvoicePDFView,

    PaymentListView,
    PaymentCreateView,
    PaymentDetailView,

    RFQListCreateView,
    RFQDetailView,

    AdminUsersView,
    AdminUserDetailView,
    AdminUserToggleStatusView,

    AdminSuppliersView,
    AdminSupplierApproveView,
    AdminSupplierRejectView,
    AdminSupplierApprovalView,

    AdminProductsView,
    AdminProductDetailView,
    AdminProductApproveView,
    AdminProductRejectView,
    AdminProductApprovalView,

    AdminOrdersView,
    AdminOrderDetailView,

    AdminPaymentsView,
    AdminPaymentDetailView,
    AdminPaymentConfirmView,
    AdminPaymentRejectView,

    AdminRFQsView,
    AdminRFQDetailView,

    AdminAnalyticsView,
)


urlpatterns = [
    # =========================
    # Auth
    # =========================
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/me/", CurrentUserView.as_view(), name="current-user"),
    path("auth/check-email/", CheckEmailView.as_view(), name="check-email"),

    # =========================
    # Products - Public / Supplier
    # =========================
    path("products/", ProductListCreateView.as_view(), name="product-list-create"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("supplier/products/", SupplierProductsView.as_view(), name="supplier-products"),

    # =========================
    # Orders
    # =========================
    path("orders/", OrderListView.as_view(), name="order-list"),
    path("orders/create/", OrderCreateView.as_view(), name="order-create"),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<int:pk>/invoice/", OrderInvoicePDFView.as_view(), name="order-invoice-pdf"),

    path("supplier/orders/", SupplierOrdersView.as_view(), name="supplier-orders"),

    # =========================
    # Payments - Buyer
    # =========================
    path("payments/", PaymentListView.as_view(), name="payment-list"),
    path("payments/create/", PaymentCreateView.as_view(), name="payment-create"),
    path("payments/<int:pk>/", PaymentDetailView.as_view(), name="payment-detail"),

    # =========================
    # RFQs
    # =========================
    path("rfqs/", RFQListCreateView.as_view(), name="rfq-list-create"),
    path("rfqs/<int:pk>/", RFQDetailView.as_view(), name="rfq-detail"),

    # =========================
    # Admin - Users
    # =========================
    path("admin/users/", AdminUsersView.as_view(), name="admin-users"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path(
        "admin/users/<int:pk>/toggle-status/",
        AdminUserToggleStatusView.as_view(),
        name="admin-user-toggle-status",
    ),

    # =========================
    # Admin - Suppliers
    # =========================
    path("admin/suppliers/", AdminSuppliersView.as_view(), name="admin-suppliers"),
    path(
        "admin/suppliers/<int:pk>/approve/",
        AdminSupplierApproveView.as_view(),
        name="admin-supplier-approve",
    ),
    path(
        "admin/suppliers/<int:pk>/reject/",
        AdminSupplierRejectView.as_view(),
        name="admin-supplier-reject",
    ),
    path(
        "admin/suppliers/<int:pk>/approval/",
        AdminSupplierApprovalView.as_view(),
        name="admin-supplier-approval",
    ),

    # =========================
    # Admin - Products
    # =========================
    path("admin/products/", AdminProductsView.as_view(), name="admin-products"),
    path("admin/products/<int:pk>/", AdminProductDetailView.as_view(), name="admin-product-detail"),
    path(
        "admin/products/<int:pk>/approve/",
        AdminProductApproveView.as_view(),
        name="admin-product-approve",
    ),
    path(
        "admin/products/<int:pk>/reject/",
        AdminProductRejectView.as_view(),
        name="admin-product-reject",
    ),
    path(
        "admin/products/<int:pk>/approval/",
        AdminProductApprovalView.as_view(),
        name="admin-product-approval",
    ),

    # =========================
    # Admin - Orders
    # =========================
    path("admin/orders/", AdminOrdersView.as_view(), name="admin-orders"),
    path("admin/orders/<int:pk>/", AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path(
        "admin/orders/<int:pk>/update/",
        AdminOrderDetailView.as_view(),
        name="admin-order-update",
    ),

    # =========================
    # Admin - Payments
    # =========================
    path("admin/payments/", AdminPaymentsView.as_view(), name="admin-payments"),
    path(
        "admin/payments/<int:pk>/",
        AdminPaymentDetailView.as_view(),
        name="admin-payment-detail",
    ),
    path(
        "admin/payments/<int:pk>/confirm/",
        AdminPaymentConfirmView.as_view(),
        name="admin-payment-confirm",
    ),
    path(
        "admin/payments/<int:pk>/reject/",
        AdminPaymentRejectView.as_view(),
        name="admin-payment-reject",
    ),

    # =========================
    # Admin - RFQs
    # =========================
    path("admin/rfqs/", AdminRFQsView.as_view(), name="admin-rfqs"),
    path("admin/rfqs/<int:pk>/", AdminRFQDetailView.as_view(), name="admin-rfq-detail"),
    path(
        "admin/rfqs/<int:pk>/update/",
        AdminRFQDetailView.as_view(),
        name="admin-rfq-update",
    ),

    # =========================
    # Admin - Analytics
    # =========================
    path("admin/analytics/", AdminAnalyticsView.as_view(), name="admin-analytics"),
]