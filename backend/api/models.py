from django.conf import settings
from django.db import models
from django.utils import timezone


ROLE_CHOICES = [
    ('buyer_individual', 'Buyer Individual'),
    ('buyer_company', 'Buyer Company'),
    ('buyer_establishment', 'Commercial Establishment'),
    ('supplier', 'Supplier'),
    ('admin', 'Admin'),
]

BUYER_TYPE_CHOICES = [
    ('individual', 'Individual Buyer'),
    ('company', 'Company Buyer'),
    ('establishment', 'Commercial Establishment'),
]

ADMIN_PERMISSION_CHOICES = [
    ('manage_users', 'Manage Users'),
    ('manage_suppliers', 'Manage Suppliers'),
    ('approve_suppliers', 'Approve Suppliers'),
    ('manage_products', 'Manage Products'),
    ('approve_products', 'Approve Products'),
    ('manage_orders', 'Manage Orders'),
    ('manage_rfqs', 'Manage RFQs'),
    ('view_analytics', 'View Analytics'),
    ('manage_messages', 'Manage Messages'),
    ('manage_settings', 'Manage Settings'),
]

ACCOUNT_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
]


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default='buyer_individual'
    )
    buyer_type = models.CharField(
        max_length=20,
        choices=BUYER_TYPE_CHOICES,
        blank=True,
        default=''
    )
    phone = models.CharField(max_length=50, blank=True)
    city = models.CharField(max_length=100, blank=True)
    company = models.CharField(max_length=255, blank=True)

    # للمورد الجديد تكون pending من serializers.py
    # للمشتري والأدمن تكون approved
    status = models.CharField(
        max_length=20,
        choices=ACCOUNT_STATUS_CHOICES,
        default='approved'
    )

    rejection_reason = models.TextField(blank=True, default='')
    permissions = models.JSONField(default=list, blank=True)
    joined_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

    def has_permission(self, permission_code):
        if self.role != 'admin':
            return False
        return permission_code in (self.permissions or [])


class SupplierProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='supplier_profile'
    )
    description = models.TextField(blank=True)
    categories = models.JSONField(default=list, blank=True)
    rating = models.FloatField(default=4.5)
    total_orders = models.PositiveIntegerField(default=0)

    # Local media storage:
    # يتم حفظ صورة المورد داخل backend/media/suppliers/
    image = models.ImageField(
        upload_to='suppliers/',
        blank=True,
        null=True
    )

    # حالة قبول المورد من قبل الأدمن
    status = models.CharField(
        max_length=20,
        choices=ACCOUNT_STATUS_CHOICES,
        default='pending'
    )

    # بيانات رخصة مزاولة المهنة
    license_number = models.CharField(max_length=100, blank=True, default='')
    license_date = models.DateField(null=True, blank=True)

    # بيانات السجل التجاري
    commercial_register_number = models.CharField(max_length=100, blank=True, default='')
    commercial_register_date = models.DateField(null=True, blank=True)

    # سبب الرفض من الأدمن
    rejection_reason = models.TextField(blank=True, default='')

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class Product(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    STOCK_CHOICES = [
        ('In Stock', 'In Stock'),
        ('Low Stock', 'Low Stock'),
        ('Made to Order', 'Made to Order'),
    ]

    supplier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='products'
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    moq = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=50, default='ton')
    delivery_time = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    inventory = models.PositiveIntegerField(default=0)
    specifications = models.JSONField(default=dict, blank=True)

    # Local media storage:
    # يتم حفظ صورة المنتج داخل backend/media/products/
    image = models.ImageField(
        upload_to='products/',
        blank=True,
        null=True
    )

    rating = models.FloatField(default=4.5)
    stock_status = models.CharField(
        max_length=20,
        choices=STOCK_CHOICES,
        default='In Stock'
    )
    badge = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    # Product approval workflow:
    # أي منتج جديد من المورد يبدأ Pending ولا يظهر للمشتري إلا بعد موافقة الأدمن.
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # سبب رفض المنتج من الأدمن في حال كانت الحالة rejected.
    rejection_reason = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def approve(self):
        self.status = 'approved'
        self.rejection_reason = ''
        self.is_active = True
        self.save(update_fields=['status', 'rejection_reason', 'is_active', 'updated_at'])

    def reject(self, reason=''):
        self.status = 'rejected'
        self.rejection_reason = reason or ''
        self.is_active = False
        self.save(update_fields=['status', 'rejection_reason', 'is_active', 'updated_at'])

    def mark_pending(self):
        self.status = 'pending'
        self.rejection_reason = ''
        self.is_active = True
        self.save(update_fields=['status', 'rejection_reason', 'is_active', 'updated_at'])

    def __str__(self):
        return self.name


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('shipped', 'Shipped'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    total_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def confirm(self):
        self.status = 'confirmed'
        self.save(update_fields=['status'])

    def cancel(self):
        self.status = 'cancelled'
        self.save(update_fields=['status'])

    def __str__(self):
        return f"Order #{self.id}"


class Payment(models.Model):
    PROVIDER_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit/Debit Card'),
        ('moyasar', 'Moyasar'),
        ('paytabs', 'PayTabs'),
        ('hyperpay', 'HyperPay'),
        ('stripe', 'Stripe'),
        ('credit_terms', 'Credit Terms'),
    ]

    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='payment'
    )

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )

    provider = models.CharField(
        max_length=30,
        choices=PROVIDER_CHOICES,
        default='bank_transfer'
    )

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=10, default='SAR')

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='initiated'
    )

    # رقم مرجعي داخلي يظهر للمشتري عند التحويل البنكي.
    reference_number = models.CharField(max_length=100, unique=True)

    # رقم العملية من مزود الدفع الخارجي لاحقًا مثل Moyasar / PayTabs / HyperPay.
    provider_payment_id = models.CharField(max_length=255, blank=True, default='')
    provider_reference = models.CharField(max_length=255, blank=True, default='')

    # رابط صفحة الدفع من مزود خارجي لاحقًا.
    checkout_url = models.URLField(blank=True, default='')

    # بيانات التحويل البنكي أو ملاحظات الدفع.
    bank_name = models.CharField(max_length=150, blank=True, default='')
    bank_account_name = models.CharField(max_length=150, blank=True, default='')
    bank_iban = models.CharField(max_length=100, blank=True, default='')

    # ملاحظات من المشتري أو الأدمن.
    notes = models.TextField(blank=True, default='')

    # سبب رفض الدفع إذا رفضه الأدمن.
    rejection_reason = models.TextField(blank=True, default='')

    # حفظ استجابة بوابة الدفع لاحقًا دون كسر النظام.
    raw_response = models.JSONField(default=dict, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)

    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_payments'
    )

    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rejected_payments'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def mark_paid(self, admin_user=None):
        self.status = 'paid'
        self.rejection_reason = ''
        self.paid_at = timezone.now()

        if admin_user:
            self.confirmed_by = admin_user

        self.save(update_fields=[
            'status',
            'rejection_reason',
            'paid_at',
            'confirmed_by',
            'updated_at',
        ])

        self.order.status = 'confirmed'
        self.order.save(update_fields=['status'])

    def mark_rejected(self, reason='', admin_user=None):
        self.status = 'rejected'
        self.rejection_reason = reason or ''

        if admin_user:
            self.rejected_by = admin_user

        self.save(update_fields=[
            'status',
            'rejection_reason',
            'rejected_by',
            'updated_at',
        ])

    def mark_failed(self, reason=''):
        self.status = 'failed'
        self.rejection_reason = reason or ''
        self.save(update_fields=['status', 'rejection_reason', 'updated_at'])

    def mark_cancelled(self):
        self.status = 'cancelled'
        self.save(update_fields=['status', 'updated_at'])

    def __str__(self):
        return f"Payment {self.reference_number} - Order #{self.order_id}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='order_items'
    )
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"


class RFQ(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('quoted', 'Quoted'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rfqs'
    )
    supplier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplier_rfqs'
    )
    product_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=50, default='ton')
    target_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    required_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.product_name


class Conversation(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='buyer_conversations'
    )
    supplier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='supplier_conversations'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Conversation #{self.id}"


class Message(models.Model):
    ROLE_CHOICES = [
        ('buyer', 'Buyer'),
        ('supplier', 'Supplier'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    sender_role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message #{self.id}"