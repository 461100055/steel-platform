from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.db.models import Count, Sum
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    UserProfile,
    SupplierProfile,
    Product,
    Order,
    OrderItem,
    Payment,
    RFQ,
)
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ProductSerializer,
    OrderSerializer,
    PaymentSerializer,
    PaymentCreateSerializer,
    AdminPaymentUpdateSerializer,
    RFQSerializer,
    SupplierProfileSerializer,
    AdminUserUpdateSerializer,
    AdminProductUpdateSerializer,
    AdminOrderUpdateSerializer,
    AdminRFQUpdateSerializer,
)

User = get_user_model()


# =========================================================
# Helpers
# =========================================================

BUYER_ROLES = [
    "buyer",
    "buyer_individual",
    "buyer_company",
    "buyer_establishment",
]


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def get_user_profile(user):
    try:
        return user.profile
    except UserProfile.DoesNotExist:
        return None
    except Exception:
        return None


def get_supplier_profile(user):
    try:
        return user.supplier_profile
    except SupplierProfile.DoesNotExist:
        return None
    except Exception:
        return None


def get_user_role(user):
    profile = get_user_profile(user)

    if profile:
        return profile.role or ""

    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return "admin"

    return ""


def is_admin(user):
    if not user or not user.is_authenticated:
        return False

    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True

    profile = get_user_profile(user)
    return bool(profile and profile.role == "admin")


def is_supplier(user):
    return get_user_role(user) == "supplier"


def is_buyer_role(role):
    return role in BUYER_ROLES


def is_buyer(user):
    return is_buyer_role(get_user_role(user))


def admin_has_permission(user, permission_code):
    if not is_admin(user):
        return False

    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True

    profile = get_user_profile(user)
    if not profile:
        return False

    permissions = profile.permissions or []

    # In development / legacy admin accounts, empty permissions means full admin access.
    if not permissions:
        return True

    return permission_code in permissions


def get_product_or_404(pk):
    try:
        return Product.objects.select_related("supplier").get(pk=pk)
    except Product.DoesNotExist:
        return None


def get_order_or_404(pk):
    try:
        return (
            Order.objects.prefetch_related("items__product")
            .select_related("buyer")
            .get(pk=pk)
        )
    except Order.DoesNotExist:
        return None


def get_payment_or_404(pk):
    try:
        return (
            Payment.objects.select_related("order", "buyer", "confirmed_by", "rejected_by")
            .prefetch_related("order__items__product")
            .get(pk=pk)
        )
    except Payment.DoesNotExist:
        return None


def get_rfq_or_404(pk):
    try:
        return RFQ.objects.select_related("buyer", "supplier").get(pk=pk)
    except RFQ.DoesNotExist:
        return None


def get_user_or_404(pk):
    try:
        return User.objects.select_related("profile").get(pk=pk)
    except User.DoesNotExist:
        return None


def normalize_email(value):
    return str(value or "").strip().lower()


def get_request_email(request):
    email = request.data.get("email") or request.query_params.get("email") or ""
    return normalize_email(email)


def ensure_supplier_profile_status(user, status_value, rejection_reason=""):
    profile = get_user_profile(user)
    supplier_profile = get_supplier_profile(user)

    if profile:
        profile.status = status_value
        profile.rejection_reason = rejection_reason
        profile.save()

    if supplier_profile:
        supplier_profile.status = status_value
        supplier_profile.rejection_reason = rejection_reason
        supplier_profile.save()

    return profile, supplier_profile


def get_order_supplier_ids(order):
    supplier_ids = set()

    for item in order.items.all():
        if item.product and item.product.supplier_id:
            supplier_ids.add(item.product.supplier_id)

    return supplier_ids


def serialize_product(product, request):
    return ProductSerializer(product, context={"request": request}).data


def serialize_products(products, request):
    return ProductSerializer(products, many=True, context={"request": request}).data


def serialize_order(order, request):
    return OrderSerializer(order, context={"request": request}).data


def serialize_payment(payment, request):
    return PaymentSerializer(payment, context={"request": request}).data


def can_user_access_product_detail(user, product):
    """
    السماح برؤية تفاصيل المنتج:
    - المنتج approved ومفعل: متاح للجميع.
    - الأدمن: يرى كل المنتجات.
    - المورد مالك المنتج: يرى منتجه حتى لو pending أو rejected.
    """
    if product.is_active and product.status == "approved":
        return True

    if user and user.is_authenticated:
        if is_admin(user):
            return True

        if is_supplier(user) and product.supplier_id == user.id:
            return True

    return False


def can_user_access_order(user, order):
    role = get_user_role(user)

    if is_admin(user):
        return True

    if is_buyer_role(role) and order.buyer_id == user.id:
        return True

    if role == "supplier" and user.id in get_order_supplier_ids(order):
        return True

    return False


def can_user_access_payment(user, payment):
    if is_admin(user):
        return True

    if payment.buyer_id == user.id:
        return True

    role = get_user_role(user)
    if role == "supplier" and user.id in get_order_supplier_ids(payment.order):
        return True

    return False


# =========================================================
# Auth views
# =========================================================

class RegisterView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @transaction.atomic
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        user_role = get_user_role(user)

        if user_role == "supplier":
            ensure_supplier_profile_status(user, "pending", "")

            return Response(
                {
                    "message": "Supplier registration submitted successfully. Your request is under admin review.",
                    "status": "pending",
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )

        tokens = get_tokens_for_user(user)

        return Response(
            {
                "message": "Registration successful.",
                "tokens": tokens,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def post(self, request):
        email = normalize_email(request.data.get("email"))
        password = request.data.get("password", "")

        if not email:
            return Response(
                {"detail": "Email address is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password:
            return Response(
                {"detail": "Password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(
            request=request,
            username=user_obj.username,
            password=password,
        )

        if not user:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        profile = get_user_profile(user)
        role = profile.role if profile else ""

        if role == "supplier":
            supplier_profile = get_supplier_profile(user)

            supplier_status = ""
            rejection_reason = ""

            if supplier_profile:
                supplier_status = supplier_profile.status or ""
                rejection_reason = supplier_profile.rejection_reason or ""
            elif profile:
                supplier_status = profile.status or ""
                rejection_reason = profile.rejection_reason or ""

            supplier_status = supplier_status.lower()

            if supplier_status == "pending":
                return Response(
                    {
                        "detail": "Your supplier account is still under admin review.",
                        "status": "pending",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            if supplier_status == "rejected":
                return Response(
                    {
                        "detail": "Your supplier account has been rejected.",
                        "status": "rejected",
                        "rejection_reason": rejection_reason,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        tokens = get_tokens_for_user(user)

        return Response(
            {
                "message": "Login successful.",
                "tokens": tokens,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class MeView(CurrentUserView):
    pass


class CheckEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        email = get_request_email(request)

        if not email:
            return Response(
                {"detail": "Email address is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        exists = User.objects.filter(email__iexact=email).exists()

        return Response(
            {
                "email": email,
                "exists": exists,
                "available": not exists,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        return self.get(request)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def check_email(request):
    email = get_request_email(request)

    if not email:
        return Response(
            {"detail": "Email address is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    exists = User.objects.filter(email__iexact=email).exists()

    return Response(
        {
            "email": email,
            "exists": exists,
            "available": not exists,
        },
        status=status.HTTP_200_OK,
    )


# =========================================================
# Products
# =========================================================

class ProductListCreateView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        products = Product.objects.select_related("supplier").all().order_by("-id")

        # Public / buyer marketplace:
        # لا تظهر إلا المنتجات المعتمدة.
        # الأدمن فقط يرى الكل من نفس endpoint، أما المورد عنده /supplier/products/
        if not (request.user and request.user.is_authenticated and is_admin(request.user)):
            products = products.filter(is_active=True, status="approved")

        return Response(serialize_products(products, request), status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        role = get_user_role(request.user)

        if role not in ["supplier", "admin"]:
            return Response(
                {"detail": "Only suppliers or admins can create products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if role == "supplier":
            supplier_profile = get_supplier_profile(request.user)
            profile = get_user_profile(request.user)

            supplier_status = ""
            if supplier_profile:
                supplier_status = supplier_profile.status or ""
            elif profile:
                supplier_status = profile.status or ""

            if supplier_status.lower() != "approved":
                return Response(
                    {"detail": "Supplier account must be approved before adding products."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = ProductSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            product = serializer.save()

            # منطق موافقة الأدمن:
            # المورد: المنتج ينتظر المراجعة ولا يظهر للمشتري.
            # الأدمن: المنتج يعتمد مباشرة.
            if role == "supplier":
                product.supplier = request.user
                product.status = "pending"
                product.rejection_reason = ""
                product.is_active = True
                product.save(update_fields=["supplier", "status", "rejection_reason", "is_active", "updated_at"])

                return Response(
                    {
                        "message": "Product submitted successfully and is waiting for admin approval.",
                        "status": "pending",
                        "product": serialize_product(product, request),
                    },
                    status=status.HTTP_201_CREATED,
                )

            if role == "admin":
                product.status = "approved"
                product.rejection_reason = ""
                product.is_active = True
                product.save(update_fields=["status", "rejection_reason", "is_active", "updated_at"])

            return Response(serialize_product(product, request), status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductDetailView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        product = get_product_or_404(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not can_user_access_product_detail(request.user, product):
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(serialize_product(product, request), status=status.HTTP_200_OK)

    def put(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        product = get_product_or_404(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not is_admin(request.user) and product.supplier_id != request.user.id:
            return Response(
                {"detail": "You do not have permission to update this product."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProductSerializer(
            product,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if serializer.is_valid():
            updated_product = serializer.save()

            if is_supplier(request.user) and not is_admin(request.user):
                return Response(
                    {
                        "message": "Product updated successfully and returned to pending review.",
                        "status": updated_product.status,
                        "product": serialize_product(updated_product, request),
                    },
                    status=status.HTTP_200_OK,
                )

            return Response(serialize_product(updated_product, request), status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        product = get_product_or_404(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not is_admin(request.user) and product.supplier_id != request.user.id:
            return Response(
                {"detail": "You do not have permission to delete this product."},
                status=status.HTTP_403_FORBIDDEN,
            )

        product.delete()

        return Response(
            {"message": "Product deleted successfully."},
            status=status.HTTP_200_OK,
        )


class SupplierProductsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_supplier(request.user) and not is_admin(request.user):
            return Response(
                {"detail": "Supplier or admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        products = Product.objects.select_related("supplier").all()

        if is_supplier(request.user):
            # المورد يرى كل منتجاته: pending / approved / rejected
            products = products.filter(supplier=request.user)

        products = products.order_by("-id")

        return Response(serialize_products(products, request), status=status.HTTP_200_OK)


# =========================================================
# Orders
# =========================================================

class OrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = get_user_role(request.user)

        orders = Order.objects.prefetch_related("items__product").select_related("buyer").all()

        if is_buyer_role(role):
            orders = orders.filter(buyer=request.user)
        elif role == "supplier":
            orders = orders.filter(items__product__supplier=request.user).distinct()
        elif role != "admin":
            return Response(
                {"detail": "You do not have permission to view orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        orders = orders.order_by("-id")
        serializer = OrderSerializer(orders, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class OrderCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def post(self, request):
        if not is_buyer(request.user) and not is_admin(request.user):
            return Response(
                {"detail": "Only buyers can create orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = OrderSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            order = serializer.save()
            return Response(
                OrderSerializer(order, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_order_or_404(pk)

        if not order:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not can_user_access_order(request.user, order):
            return Response(
                {"detail": "You do not have permission to view this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = OrderSerializer(order, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SupplierOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_supplier(request.user) and not is_admin(request.user):
            return Response(
                {"detail": "Supplier or admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        orders = Order.objects.prefetch_related("items__product").select_related("buyer")

        if is_supplier(request.user):
            orders = orders.filter(items__product__supplier=request.user).distinct()

        orders = orders.order_by("-id")
        serializer = OrderSerializer(orders, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


# =========================================================
# Payments
# =========================================================

class PaymentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = get_user_role(request.user)

        payments = (
            Payment.objects.select_related("order", "buyer", "confirmed_by", "rejected_by")
            .prefetch_related("order__items__product")
            .all()
        )

        if is_buyer_role(role):
            payments = payments.filter(buyer=request.user)
        elif role == "supplier":
            payments = payments.filter(order__items__product__supplier=request.user).distinct()
        elif role != "admin":
            return Response(
                {"detail": "You do not have permission to view payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payments = payments.order_by("-id")
        serializer = PaymentSerializer(payments, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class PaymentCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    @transaction.atomic
    def post(self, request):
        if not is_buyer(request.user) and not is_admin(request.user):
            return Response(
                {"detail": "Only buyers can create payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PaymentCreateSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            payment = serializer.save()
            return Response(
                {
                    "message": "Payment created successfully.",
                    "payment": serialize_payment(payment, request),
                    "order": serialize_order(payment.order, request),
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        payment = get_payment_or_404(pk)

        if not payment:
            return Response(
                {"detail": "Payment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not can_user_access_payment(request.user, payment):
            return Response(
                {"detail": "You do not have permission to view this payment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(serialize_payment(payment, request), status=status.HTTP_200_OK)




class OrderInvoicePDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_order_or_404(pk)

        if not order:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        role = get_user_role(request.user)

        if is_buyer_role(role) and order.buyer_id != request.user.id:
            return Response(
                {"detail": "You do not have permission to download this invoice."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if role == "supplier" and request.user.id not in get_order_supplier_ids(order):
            return Response(
                {"detail": "You do not have permission to download this invoice."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if role not in BUYER_ROLES + ["supplier", "admin"]:
            return Response(
                {"detail": "You do not have permission to download this invoice."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from io import BytesIO
        from django.http import HttpResponse
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            Table,
            TableStyle,
        )

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=18 * mm,
            leftMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=18 * mm,
        )

        styles = getSampleStyleSheet()
        story = []

        invoice_number = f"INV-{order.id}"
        order_number = f"ORD-{order.id}"
        payment = getattr(order, "payment", None)

        buyer = order.buyer
        buyer_name = buyer.get_full_name() or buyer.username
        buyer_email = buyer.email or "-"

        try:
            buyer_company = buyer.profile.company or "-"
            buyer_city = buyer.profile.city or "-"
            buyer_phone = buyer.profile.phone or "-"
        except Exception:
            buyer_company = "-"
            buyer_city = "-"
            buyer_phone = "-"

        story.append(Paragraph("STEEL PLATFORM", styles["Title"]))
        story.append(Paragraph("Tax Invoice / Order Invoice", styles["Heading2"]))
        story.append(Spacer(1, 8))

        meta_data = [
            ["Invoice Number", invoice_number],
            ["Order Number", order_number],
            [
                "Order Date",
                order.created_at.strftime("%Y-%m-%d %H:%M") if order.created_at else "-",
            ],
            ["Order Status", order.status],
        ]

        if payment:
            meta_data.extend([
                ["Payment Reference", payment.reference_number],
                ["Payment Method", payment.provider],
                ["Payment Status", payment.status],
            ])
        else:
            meta_data.extend([
                ["Payment Reference", "-"],
                ["Payment Method", "-"],
                ["Payment Status", "Not created"],
            ])

        meta_table = Table(meta_data, colWidths=[45 * mm, 110 * mm])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("PADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 14))

        story.append(Paragraph("Buyer Information", styles["Heading3"]))

        buyer_data = [
            ["Buyer Name", buyer_name],
            ["Email", buyer_email],
            ["Company", buyer_company],
            ["City", buyer_city],
            ["Phone", buyer_phone],
        ]

        buyer_table = Table(buyer_data, colWidths=[45 * mm, 110 * mm])
        buyer_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 7),
        ]))
        story.append(buyer_table)
        story.append(Spacer(1, 14))

        story.append(Paragraph("Order Items", styles["Heading3"]))

        items_data = [["#", "Product", "Quantity", "Unit Price", "Total"]]
        subtotal = 0

        for index, item in enumerate(order.items.all(), start=1):
            product = item.product
            quantity = item.quantity
            unit_price = float(product.price or 0)
            line_total = unit_price * quantity
            subtotal += line_total

            items_data.append([
                str(index),
                product.name,
                f"{quantity} {product.unit}",
                f"{unit_price:,.2f} SAR",
                f"{line_total:,.2f} SAR",
            ])

        items_table = Table(
            items_data,
            colWidths=[12 * mm, 68 * mm, 28 * mm, 35 * mm, 35 * mm],
        )
        items_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F2854")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("PADDING", (0, 0), (-1, -1), 7),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 14))

        total_price = float(order.total_price or subtotal)

        summary_data = [
            ["Subtotal", f"{subtotal:,.2f} SAR"],
            ["VAT", "Included / As applicable"],
            ["Total", f"{total_price:,.2f} SAR"],
        ]

        summary_table = Table(summary_data, colWidths=[115 * mm, 45 * mm])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 20))

        story.append(Paragraph(
            "This invoice was generated electronically by Steel Platform.",
            styles["Normal"],
        ))

        doc.build(story)

        pdf = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="invoice_{order_number}.pdf"'
        return response


# =========================================================
# RFQs
# =========================================================

class RFQListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        role = get_user_role(request.user)

        rfqs = RFQ.objects.select_related("buyer", "supplier").all()

        if is_buyer_role(role):
            rfqs = rfqs.filter(buyer=request.user)
        elif role == "supplier":
            rfqs = rfqs.filter(supplier=request.user)
        elif role != "admin":
            return Response(
                {"detail": "You do not have permission to view RFQs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        rfqs = rfqs.order_by("-id")
        serializer = RFQSerializer(rfqs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not is_buyer(request.user) and not is_admin(request.user):
            return Response(
                {"detail": "Only buyers can create RFQs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RFQSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            rfq = serializer.save()
            return Response(
                RFQSerializer(rfq, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RFQDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        rfq = get_rfq_or_404(pk)

        if not rfq:
            return Response(
                {"detail": "RFQ not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        role = get_user_role(request.user)

        if is_buyer_role(role) and rfq.buyer_id != request.user.id:
            return Response(
                {"detail": "You do not have permission to view this RFQ."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if role == "supplier" and rfq.supplier_id != request.user.id:
            return Response(
                {"detail": "You do not have permission to view this RFQ."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if role not in BUYER_ROLES + ["supplier", "admin"]:
            return Response(
                {"detail": "You do not have permission to view this RFQ."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RFQSerializer(rfq, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


# =========================================================
# Admin - Users
# =========================================================

class AdminUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not admin_has_permission(request.user, "manage_users"):
            return Response(
                {"detail": "You do not have permission to manage users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        users = User.objects.select_related("profile").all().order_by("-id")
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not admin_has_permission(request.user, "manage_users"):
            return Response(
                {"detail": "You do not have permission to manage users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = get_user_or_404(pk)

        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        if not admin_has_permission(request.user, "manage_users"):
            return Response(
                {"detail": "You do not have permission to manage users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = get_user_or_404(pk)

        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            updated_user = serializer.save()
            return Response(UserSerializer(updated_user).data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        if not admin_has_permission(request.user, "manage_users"):
            return Response(
                {"detail": "You do not have permission to manage users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.id == int(pk):
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_user_or_404(pk)

        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.delete()

        return Response(
            {"message": "User deleted successfully."},
            status=status.HTTP_200_OK,
        )


class AdminUserToggleStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not admin_has_permission(request.user, "manage_users"):
            return Response(
                {"detail": "You do not have permission to manage users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.id == int(pk):
            return Response(
                {"detail": "You cannot change your own status from this action."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_user_or_404(pk)

        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile = get_user_profile(user)

        if not profile:
            return Response(
                {"detail": "User profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        current_status = (profile.status or "").strip().lower()

        if current_status in ["approved", "active"]:
            profile.status = "inactive"
        else:
            profile.status = "approved"

        profile.save()

        if profile.role == "supplier":
            supplier_profile = get_supplier_profile(user)
            if supplier_profile:
                supplier_profile.status = profile.status
                supplier_profile.save()

        return Response(
            {
                "message": "User status updated successfully.",
                "status": profile.status,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# Admin - Suppliers
# =========================================================

class AdminSuppliersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not admin_has_permission(request.user, "manage_suppliers"):
            return Response(
                {"detail": "You do not have permission to manage suppliers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        suppliers = (
            User.objects.select_related("profile", "supplier_profile")
            .filter(profile__role="supplier")
            .order_by("-id")
        )

        serializer = UserSerializer(suppliers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminPendingSuppliersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not admin_has_permission(request.user, "approve_suppliers"):
            return Response(
                {"detail": "You do not have permission to view pending suppliers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        suppliers = (
            SupplierProfile.objects.select_related("user", "user__profile")
            .filter(status="pending")
            .order_by("-id")
        )

        serializer = SupplierProfileSerializer(
            suppliers,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminSupplierApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not admin_has_permission(request.user, "approve_suppliers"):
            return Response(
                {"detail": "You do not have permission to approve suppliers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.select_related("profile", "supplier_profile").get(
                pk=pk,
                profile__role="supplier",
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Supplier not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile, supplier_profile = ensure_supplier_profile_status(user, "approved", "")

        if not profile:
            return Response(
                {"detail": "Supplier user profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not supplier_profile:
            return Response(
                {"detail": "Supplier profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "message": "Supplier approved successfully.",
                "status": "approved",
                "user": UserSerializer(user).data,
                "supplier": SupplierProfileSerializer(
                    supplier_profile,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminSupplierRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not admin_has_permission(request.user, "approve_suppliers"):
            return Response(
                {"detail": "You do not have permission to reject suppliers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        rejection_reason = (
            request.data.get("rejection_reason")
            or request.data.get("reason")
            or ""
        ).strip()

        if not rejection_reason:
            return Response(
                {"detail": "Rejection reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.select_related("profile", "supplier_profile").get(
                pk=pk,
                profile__role="supplier",
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Supplier not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile, supplier_profile = ensure_supplier_profile_status(
            user,
            "rejected",
            rejection_reason,
        )

        if not profile:
            return Response(
                {"detail": "Supplier user profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not supplier_profile:
            return Response(
                {"detail": "Supplier profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "message": "Supplier rejected successfully.",
                "status": "rejected",
                "rejection_reason": rejection_reason,
                "user": UserSerializer(user).data,
                "supplier": SupplierProfileSerializer(
                    supplier_profile,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminSupplierApprovalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        action = (request.data.get("action") or "").strip().lower()

        if action == "approve":
            return AdminSupplierApproveView().post(request, pk)

        if action == "reject":
            return AdminSupplierRejectView().post(request, pk)

        return Response(
            {"detail": "Action must be approve or reject."},
            status=status.HTTP_400_BAD_REQUEST,
        )


# =========================================================
# Admin - Products
# =========================================================

class AdminProductsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not admin_has_permission(request.user, "manage_products"):
            return Response(
                {"detail": "You do not have permission to manage products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        products = Product.objects.select_related("supplier").all().order_by("-id")
        return Response(serialize_products(products, request), status=status.HTTP_200_OK)


class AdminProductDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        if not admin_has_permission(request.user, "manage_products"):
            return Response(
                {"detail": "You do not have permission to manage products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        product = get_product_or_404(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(serialize_product(product, request), status=status.HTTP_200_OK)

    def patch(self, request, pk):
        if not admin_has_permission(request.user, "manage_products"):
            return Response(
                {"detail": "You do not have permission to manage products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        product = get_product_or_404(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminProductUpdateSerializer(
            product,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if serializer.is_valid():
            updated_product = serializer.save()
            return Response(serialize_product(updated_product, request), status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        if not admin_has_permission(request.user, "manage_products"):
            return Response(
                {"detail": "You do not have permission to manage products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        product = get_product_or_404(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        product.delete()

        return Response(
            {"message": "Product deleted successfully."},
            status=status.HTTP_200_OK,
        )


class AdminProductApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not admin_has_permission(request.user, "approve_products"):
            return Response(
                {"detail": "You do not have permission to approve products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        product = get_product_or_404(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        product.status = "approved"
        product.rejection_reason = ""
        product.is_active = True
        product.save(update_fields=["status", "rejection_reason", "is_active", "updated_at"])

        return Response(
            {
                "message": "Product approved successfully.",
                "status": "approved",
                "product": serialize_product(product, request),
            },
            status=status.HTTP_200_OK,
        )


class AdminProductRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not admin_has_permission(request.user, "approve_products"):
            return Response(
                {"detail": "You do not have permission to reject products."},
                status=status.HTTP_403_FORBIDDEN,
            )

        rejection_reason = (
            request.data.get("rejection_reason")
            or request.data.get("reason")
            or ""
        ).strip()

        if not rejection_reason:
            return Response(
                {"detail": "Rejection reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = get_product_or_404(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        product.status = "rejected"
        product.rejection_reason = rejection_reason
        product.is_active = False
        product.save(update_fields=["status", "rejection_reason", "is_active", "updated_at"])

        return Response(
            {
                "message": "Product rejected successfully.",
                "status": "rejected",
                "rejection_reason": rejection_reason,
                "product": serialize_product(product, request),
            },
            status=status.HTTP_200_OK,
        )


class AdminProductApprovalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        action = (request.data.get("action") or "").strip().lower()

        if action == "approve":
            return AdminProductApproveView().post(request, pk)

        if action == "reject":
            return AdminProductRejectView().post(request, pk)

        return Response(
            {"detail": "Action must be approve or reject."},
            status=status.HTTP_400_BAD_REQUEST,
        )


# =========================================================
# Admin - Orders
# =========================================================

class AdminOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not admin_has_permission(request.user, "manage_orders"):
            return Response(
                {"detail": "You do not have permission to manage orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        orders = (
            Order.objects.prefetch_related("items__product")
            .select_related("buyer")
            .all()
            .order_by("-id")
        )
        serializer = OrderSerializer(orders, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not admin_has_permission(request.user, "manage_orders"):
            return Response(
                {"detail": "You do not have permission to manage orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        order = get_order_or_404(pk)

        if not order:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            OrderSerializer(order, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        if not admin_has_permission(request.user, "manage_orders"):
            return Response(
                {"detail": "You do not have permission to manage orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        order = get_order_or_404(pk)

        if not order:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminOrderUpdateSerializer(order, data=request.data, partial=True)

        if serializer.is_valid():
            updated_order = serializer.save()
            return Response(
                OrderSerializer(updated_order, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)


# =========================================================
# Admin - Payments
# =========================================================

class AdminPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not admin_has_permission(request.user, "manage_orders"):
            return Response(
                {"detail": "You do not have permission to manage payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payments = (
            Payment.objects.select_related("order", "buyer", "confirmed_by", "rejected_by")
            .prefetch_related("order__items__product")
            .all()
            .order_by("-id")
        )

        serializer = PaymentSerializer(payments, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminPaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not admin_has_permission(request.user, "manage_orders"):
            return Response(
                {"detail": "You do not have permission to manage payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payment = get_payment_or_404(pk)

        if not payment:
            return Response(
                {"detail": "Payment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(serialize_payment(payment, request), status=status.HTTP_200_OK)

    def patch(self, request, pk):
        if not admin_has_permission(request.user, "manage_orders"):
            return Response(
                {"detail": "You do not have permission to manage payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payment = get_payment_or_404(pk)

        if not payment:
            return Response(
                {"detail": "Payment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminPaymentUpdateSerializer(
            payment,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if serializer.is_valid():
            updated_payment = serializer.save()
            return Response(serialize_payment(updated_payment, request), status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)


class AdminPaymentConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not admin_has_permission(request.user, "manage_orders"):
            return Response(
                {"detail": "You do not have permission to confirm payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payment = get_payment_or_404(pk)

        if not payment:
            return Response(
                {"detail": "Payment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if payment.status == "paid":
            return Response(
                {
                    "message": "Payment is already confirmed.",
                    "payment": serialize_payment(payment, request),
                    "order": serialize_order(payment.order, request),
                },
                status=status.HTTP_200_OK,
            )

        payment.mark_paid(admin_user=request.user)

        return Response(
            {
                "message": "Payment confirmed successfully.",
                "payment": serialize_payment(payment, request),
                "order": serialize_order(payment.order, request),
            },
            status=status.HTTP_200_OK,
        )


class AdminPaymentRejectView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not admin_has_permission(request.user, "manage_orders"):
            return Response(
                {"detail": "You do not have permission to reject payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payment = get_payment_or_404(pk)

        if not payment:
            return Response(
                {"detail": "Payment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        rejection_reason = (
            request.data.get("rejection_reason")
            or request.data.get("reason")
            or ""
        ).strip()

        if not rejection_reason:
            return Response(
                {"detail": "Rejection reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment.mark_rejected(reason=rejection_reason, admin_user=request.user)

        return Response(
            {
                "message": "Payment rejected successfully.",
                "payment": serialize_payment(payment, request),
                "order": serialize_order(payment.order, request),
            },
            status=status.HTTP_200_OK,
        )


# =========================================================
# Admin - RFQs
# =========================================================

class AdminRFQsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not admin_has_permission(request.user, "manage_rfqs"):
            return Response(
                {"detail": "You do not have permission to manage RFQs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        rfqs = RFQ.objects.select_related("buyer", "supplier").all().order_by("-id")
        serializer = RFQSerializer(rfqs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminRFQDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not admin_has_permission(request.user, "manage_rfqs"):
            return Response(
                {"detail": "You do not have permission to manage RFQs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        rfq = get_rfq_or_404(pk)

        if not rfq:
            return Response(
                {"detail": "RFQ not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            RFQSerializer(rfq, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        if not admin_has_permission(request.user, "manage_rfqs"):
            return Response(
                {"detail": "You do not have permission to manage RFQs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        rfq = get_rfq_or_404(pk)

        if not rfq:
            return Response(
                {"detail": "RFQ not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminRFQUpdateSerializer(rfq, data=request.data, partial=True)

        if serializer.is_valid():
            updated_rfq = serializer.save()
            return Response(
                RFQSerializer(updated_rfq, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)


# =========================================================
# Admin - Analytics
# =========================================================

class AdminAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not admin_has_permission(request.user, "view_analytics"):
            return Response(
                {"detail": "You do not have permission to view analytics."},
                status=status.HTTP_403_FORBIDDEN,
            )

        total_users = User.objects.count()
        total_buyers = UserProfile.objects.filter(role__in=BUYER_ROLES).count()
        total_suppliers = UserProfile.objects.filter(role="supplier").count()
        pending_suppliers = SupplierProfile.objects.filter(status="pending").count()
        rejected_suppliers = SupplierProfile.objects.filter(status="rejected").count()
        approved_suppliers = SupplierProfile.objects.filter(status="approved").count()

        total_products = Product.objects.count()
        approved_products = Product.objects.filter(status="approved").count()
        pending_products = Product.objects.filter(status="pending").count()
        rejected_products = Product.objects.filter(status="rejected").count()

        total_orders = Order.objects.count()
        total_payments = Payment.objects.count()
        paid_payments = Payment.objects.filter(status="paid").count()
        pending_payments = Payment.objects.filter(status__in=["initiated", "pending"]).count()
        rejected_payments = Payment.objects.filter(status="rejected").count()
        total_rfqs = RFQ.objects.count()

        orders_by_status = list(
            Order.objects.values("status").annotate(count=Count("id")).order_by("status")
        )

        payments_by_status = list(
            Payment.objects.values("status").annotate(count=Count("id")).order_by("status")
        )

        rfqs_by_status = list(
            RFQ.objects.values("status").annotate(count=Count("id")).order_by("status")
        )

        products_by_status = list(
            Product.objects.values("status").annotate(count=Count("id")).order_by("status")
        )

        products_by_category = list(
            Product.objects.values("category").annotate(count=Count("id")).order_by("category")
        )

        latest_orders = (
            Order.objects.prefetch_related("items__product")
            .select_related("buyer")
            .order_by("-id")[:5]
        )
        latest_payments = (
            Payment.objects.select_related("order", "buyer")
            .order_by("-id")[:5]
        )
        latest_rfqs = RFQ.objects.select_related("buyer", "supplier").order_by("-id")[:5]

        total_order_value = Order.objects.aggregate(total=Sum("total_price")).get("total") or 0
        total_paid_value = Payment.objects.filter(status="paid").aggregate(total=Sum("amount")).get("total") or 0

        return Response(
            {
                "summary": {
                    "total_users": total_users,
                    "total_buyers": total_buyers,
                    "total_suppliers": total_suppliers,
                    "approved_suppliers": approved_suppliers,
                    "pending_suppliers": pending_suppliers,
                    "rejected_suppliers": rejected_suppliers,
                    "total_products": total_products,
                    "approved_products": approved_products,
                    "pending_products": pending_products,
                    "rejected_products": rejected_products,
                    "total_orders": total_orders,
                    "total_payments": total_payments,
                    "paid_payments": paid_payments,
                    "pending_payments": pending_payments,
                    "rejected_payments": rejected_payments,
                    "total_rfqs": total_rfqs,
                    "total_order_value": total_order_value,
                    "total_paid_value": total_paid_value,
                },
                "orders_by_status": orders_by_status,
                "payments_by_status": payments_by_status,
                "rfqs_by_status": rfqs_by_status,
                "products_by_status": products_by_status,
                "products_by_category": products_by_category,
                "latest_orders": OrderSerializer(
                    latest_orders,
                    many=True,
                    context={"request": request},
                ).data,
                "latest_payments": PaymentSerializer(
                    latest_payments,
                    many=True,
                    context={"request": request},
                ).data,
                "latest_rfqs": RFQSerializer(
                    latest_rfqs,
                    many=True,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )
