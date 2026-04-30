from decimal import Decimal
import json
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import UserProfile, SupplierProfile, Product, Order, OrderItem, Payment, RFQ

User = get_user_model()

class FlexibleJSONField(serializers.JSONField):
    """
    يقبل JSONField من JSON العادي أو من FormData كنص JSON.
    يحل خطأ: Value must be valid JSON.
    """

    def to_internal_value(self, data):
        if data is None or data == '':
            return {}

        if isinstance(data, list):
            data = data[0] if data else {}

        if isinstance(data, dict):
            return data

        if isinstance(data, str):
            value = data.strip()

            if value in ['', 'undefined', 'null', 'None', '[object Object]']:
                return {}

            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError('Value must be valid JSON.')

            if parsed is None:
                return {}

            if not isinstance(parsed, dict):
                raise serializers.ValidationError('Specifications must be a JSON object.')

            return parsed

        return {}


def build_media_url(request, file_field):
    if not file_field:
        return ''

    try:
        url = file_field.url
    except Exception:
        return ''

    if request:
        return request.build_absolute_uri(url)

    return url



class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    buyer_type = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    rejection_reason = serializers.SerializerMethodField()
    joined_date = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'role',
            'buyer_type',
            'phone',
            'city',
            'company',
            'status',
            'rejection_reason',
            'joined_date',
            'permissions',
        ]

    def get_role(self, obj):
        try:
            return obj.profile.role
        except Exception:
            return ''

    def get_buyer_type(self, obj):
        try:
            return obj.profile.buyer_type
        except Exception:
            return ''

    def get_phone(self, obj):
        try:
            return obj.profile.phone
        except Exception:
            return ''

    def get_city(self, obj):
        try:
            return obj.profile.city
        except Exception:
            return ''

    def get_company(self, obj):
        try:
            return obj.profile.company
        except Exception:
            return ''

    def get_status(self, obj):
        try:
            if obj.profile.role == 'supplier' and hasattr(obj, 'supplier_profile'):
                return obj.supplier_profile.status
            return obj.profile.status
        except Exception:
            return 'approved'

    def get_rejection_reason(self, obj):
        try:
            if obj.profile.role == 'supplier' and hasattr(obj, 'supplier_profile'):
                return obj.supplier_profile.rejection_reason or obj.profile.rejection_reason or ''
            return obj.profile.rejection_reason or ''
        except Exception:
            return ''

    def get_joined_date(self, obj):
        try:
            return obj.profile.joined_date
        except Exception:
            return None

    def get_permissions(self, obj):
        try:
            permissions = obj.profile.permissions or []
            return permissions if isinstance(permissions, list) else []
        except Exception:
            return []


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    username = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    role = serializers.CharField(write_only=True, required=False, default='buyer_individual')
    buyer_type = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    city = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    company = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    establishment_name = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    id_type = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    id_number = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    date_of_birth = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    district = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    street = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    building_number = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    postal_code = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    additional_directions = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    commercial_registration_number = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    tax_number = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    year_established = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    company_size = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    contact_person = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    position = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    owner_name = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    website = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    subscribe_newsletter = serializers.BooleanField(write_only=True, required=False, default=False)

    supplier_description = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    supplier_categories = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        default=list
    )
    supplier_image = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    description = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    image = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    license_number = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    license_date = serializers.DateField(write_only=True, required=False, allow_null=True)

    commercial_register_number = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    commercial_register_date = serializers.DateField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'username',
            'first_name',
            'last_name',
            'email',
            'password',
            'confirm_password',
            'password_confirm',
            'role',
            'buyer_type',
            'phone',
            'city',
            'company',
            'company_name',
            'establishment_name',
            'id_type',
            'id_number',
            'date_of_birth',
            'district',
            'street',
            'building_number',
            'postal_code',
            'additional_directions',
            'commercial_registration_number',
            'tax_number',
            'year_established',
            'company_size',
            'contact_person',
            'position',
            'owner_name',
            'website',
            'subscribe_newsletter',
            'supplier_description',
            'supplier_categories',
            'supplier_image',
            'description',
            'image',
            'license_number',
            'license_date',
            'commercial_register_number',
            'commercial_register_date',
        ]

    def validate_email(self, value):
        email = str(value).strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('This email is already registered.')
        return email

    def validate_username(self, value):
        username = str(value).strip()
        if not username:
            return username

        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError('This username is already taken.')
        return username

    def validate(self, attrs):
        password = attrs.get('password', '')
        confirm_password = attrs.get('confirm_password', '') or attrs.get('password_confirm', '')

        validate_password(password)

        if confirm_password and password != confirm_password:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})

        role = attrs.get('role', 'buyer_individual')
        buyer_type = attrs.get('buyer_type', '')

        if role in ['buyer_individual', 'buyer_company', 'buyer_establishment'] and not buyer_type:
            if role == 'buyer_individual':
                attrs['buyer_type'] = 'individual'
            elif role == 'buyer_company':
                attrs['buyer_type'] = 'company'
            elif role == 'buyer_establishment':
                attrs['buyer_type'] = 'establishment'

        company = attrs.get('company', '').strip()
        company_name = attrs.get('company_name', '').strip()
        establishment_name = attrs.get('establishment_name', '').strip()

        if not company:
            if company_name:
                attrs['company'] = company_name
            elif establishment_name:
                attrs['company'] = establishment_name

        if role == 'supplier':
            if not attrs.get('company', '').strip():
                raise serializers.ValidationError({'company': 'Company name is required for supplier registration.'})

            if not attrs.get('license_number', '').strip():
                raise serializers.ValidationError({'license_number': 'Professional license number is required.'})

            if not attrs.get('license_date'):
                raise serializers.ValidationError({'license_date': 'Professional license date is required.'})

            if not attrs.get('commercial_register_number', '').strip():
                raise serializers.ValidationError({'commercial_register_number': 'Commercial register number is required.'})

            if not attrs.get('commercial_register_date'):
                raise serializers.ValidationError({'commercial_register_date': 'Commercial register date is required.'})

        username = str(attrs.get('username', '')).strip()
        email = str(attrs.get('email', '')).strip().lower()
        first_name = str(attrs.get('first_name', '')).strip()
        last_name = str(attrs.get('last_name', '')).strip()

        if not username:
            base_username = email.split('@')[0] if email else 'user'
            if first_name or last_name:
                base_username = f'{first_name}{last_name}'.replace(' ', '') or base_username

            candidate = base_username.lower()
            counter = 1

            while User.objects.filter(username__iexact=candidate).exists():
                candidate = f'{base_username.lower()}{counter}'
                counter += 1

            attrs['username'] = candidate

        return attrs

    def create(self, validated_data):
        role = validated_data.pop('role', 'buyer_individual')
        buyer_type = validated_data.pop('buyer_type', '')
        phone = validated_data.pop('phone', '')
        city = validated_data.pop('city', '')
        company = validated_data.pop('company', '')

        validated_data.pop('company_name', None)
        validated_data.pop('establishment_name', None)

        validated_data.pop('id_type', None)
        validated_data.pop('id_number', None)
        validated_data.pop('date_of_birth', None)

        validated_data.pop('district', None)
        validated_data.pop('street', None)
        validated_data.pop('building_number', None)
        validated_data.pop('postal_code', None)
        validated_data.pop('additional_directions', None)

        validated_data.pop('commercial_registration_number', None)
        validated_data.pop('tax_number', None)
        validated_data.pop('year_established', None)
        validated_data.pop('company_size', None)
        validated_data.pop('contact_person', None)
        validated_data.pop('position', None)
        validated_data.pop('owner_name', None)
        validated_data.pop('website', None)
        validated_data.pop('subscribe_newsletter', None)

        supplier_description = validated_data.pop('supplier_description', '') or validated_data.pop('description', '')
        supplier_categories = validated_data.pop('supplier_categories', [])
        supplier_image = validated_data.pop('supplier_image', '') or validated_data.pop('image', '')

        license_number = validated_data.pop('license_number', '')
        license_date = validated_data.pop('license_date', None)
        commercial_register_number = validated_data.pop('commercial_register_number', '')
        commercial_register_date = validated_data.pop('commercial_register_date', None)

        validated_data.pop('confirm_password', None)
        validated_data.pop('password_confirm', None)

        email = validated_data.get('email', '').strip().lower()
        username = validated_data.get('username', '').strip()

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data.pop('password'),
            first_name=validated_data.get('first_name', '').strip(),
            last_name=validated_data.get('last_name', '').strip(),
        )

        account_status = 'pending' if role == 'supplier' else 'approved'

        UserProfile.objects.create(
            user=user,
            role=role,
            buyer_type=buyer_type,
            phone=phone,
            city=city,
            company=company,
            status=account_status,
            rejection_reason='',
            permissions=[],
        )

        if role == 'supplier':
            SupplierProfile.objects.create(
                user=user,
                description=supplier_description,
                categories=supplier_categories,
                image=supplier_image,
                status='pending',
                license_number=license_number,
                license_date=license_date,
                commercial_register_number=commercial_register_number,
                commercial_register_date=commercial_register_date,
                rejection_reason='',
            )

        return user


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField(read_only=True)
    supplier_id = serializers.IntegerField(source='supplier.id', read_only=True)
    deliveryTime = serializers.CharField(source='delivery_time', required=False, allow_blank=True)
    stock = serializers.IntegerField(source='inventory', required=False)
    min_order_quantity = serializers.IntegerField(source='moq', required=False)
    images = serializers.SerializerMethodField(read_only=True)
    stockStatus = serializers.CharField(source='stock_status', read_only=True)
    image_url = serializers.SerializerMethodField(read_only=True)
    specifications = FlexibleJSONField(required=False)

    class Meta:
        model = Product
        fields = [
            'id',
            'supplier',
            'supplier_id',
            'supplier_name',
            'name',
            'category',
            'price',
            'moq',
            'min_order_quantity',
            'unit',
            'delivery_time',
            'deliveryTime',
            'description',
            'inventory',
            'stock',
            'specifications',
            'image',
            'image_url',
            'images',
            'rating',
            'stock_status',
            'stockStatus',
            'badge',
            'is_active',
            'status',
            'rejection_reason',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'supplier',
            'supplier_id',
            'supplier_name',
            'image_url',
            'rating',
            'stock_status',
            'stockStatus',
            'status',
            'rejection_reason',
            'created_at',
            'updated_at',
        ]

    def get_supplier_name(self, obj):
        try:
            if hasattr(obj.supplier, 'profile') and obj.supplier.profile.company:
                return obj.supplier.profile.company
            return obj.supplier.get_full_name() or obj.supplier.username
        except Exception:
            return 'Supplier'

    def get_image_url(self, obj):
        request = self.context.get('request')
        return build_media_url(request, obj.image)

    def get_images(self, obj):
        image_url = self.get_image_url(obj)
        if image_url:
            return [image_url]
        return []

    def validate_price(self, value):
        if value is None or Decimal(value) <= 0:
            raise serializers.ValidationError('Price must be greater than zero.')
        return value

    def validate_moq(self, value):
        if value is None or int(value) <= 0:
            raise serializers.ValidationError('MOQ must be greater than zero.')
        return value

    def validate_inventory(self, value):
        if value is None or int(value) < 0:
            raise serializers.ValidationError('Inventory cannot be negative.')
        return value

    def validate(self, attrs):
        inventory = attrs.get('inventory')
        if inventory is not None:
            if inventory == 0:
                attrs['stock_status'] = 'Made to Order'
            elif inventory < 100:
                attrs['stock_status'] = 'Low Stock'
            else:
                attrs['stock_status'] = 'In Stock'
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['supplier'] = request.user
            validated_data['status'] = 'pending'
            validated_data['rejection_reason'] = ''
            validated_data['is_active'] = True
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        product = super().update(instance, validated_data)

        if request and request.user and request.user.is_authenticated:
            try:
                is_admin = bool(
                    getattr(request.user, 'is_superuser', False)
                    or getattr(request.user, 'is_staff', False)
                    or getattr(request.user.profile, 'role', '') == 'admin'
                )
            except Exception:
                is_admin = False

            if not is_admin:
                product.status = 'pending'
                product.rejection_reason = ''
                product.is_active = True
                product.save(update_fields=['status', 'rejection_reason', 'is_active', 'updated_at'])

        return product


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'product_name',
            'name',
            'quantity',
            'price',
            'unit',
            'product_details',
        ]

    def get_product_name(self, obj):
        try:
            return obj.product.name
        except Exception:
            return 'Product'

    def get_name(self, obj):
        try:
            return obj.product.name
        except Exception:
            return 'Product'

    def get_price(self, obj):
        try:
            return obj.product.price
        except Exception:
            return 0

    def get_unit(self, obj):
        try:
            return obj.product.unit
        except Exception:
            return 'unit'


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, required=False)
    total = serializers.DecimalField(source='total_price', max_digits=14, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(source='total_price', max_digits=14, decimal_places=2, read_only=True)
    order_number = serializers.SerializerMethodField()
    supplier_name = serializers.SerializerMethodField()
    delivery_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    shipping_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    delivery_info = serializers.JSONField(write_only=True, required=False)
    billing_info = serializers.JSONField(write_only=True, required=False)
    order_info = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'buyer',
            'total_price',
            'total',
            'total_amount',
            'status',
            'notes',
            'created_at',
            'items',
            'supplier_name',
            'delivery_address',
            'shipping_address',
            'delivery_info',
            'billing_info',
            'order_info',
        ]
        read_only_fields = [
            'id',
            'buyer',
            'total_price',
            'total',
            'total_amount',
            'created_at',
            'order_number',
            'supplier_name',
        ]

    def get_order_number(self, obj):
        return f"ORD-{obj.id}"

    def get_supplier_name(self, obj):
        try:
            first_item = obj.items.first()
            if first_item and first_item.product and first_item.product.supplier:
                supplier = first_item.product.supplier
                if hasattr(supplier, 'profile') and supplier.profile.company:
                    return supplier.profile.company
                return supplier.get_full_name() or supplier.username
        except Exception:
            pass
        return 'Supplier'

    def create(self, validated_data):
        request = self.context.get('request')
        items_data = validated_data.pop('items', [])

        validated_data.pop('delivery_address', None)
        validated_data.pop('shipping_address', None)
        validated_data.pop('delivery_info', None)
        validated_data.pop('billing_info', None)
        validated_data.pop('order_info', None)

        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError({'detail': 'Authenticated user is required.'})

        order = Order.objects.create(
            buyer=request.user,
            notes=validated_data.get('notes', ''),
            status=validated_data.get('status', 'pending'),
            total_price=0,
        )

        total_price = Decimal('0.00')

        for item_data in items_data:
            product = item_data.get('product')
            quantity = int(item_data.get('quantity', 0))

            if not product:
                raise serializers.ValidationError({'items': 'Each item must include a product.'})

            if quantity <= 0:
                raise serializers.ValidationError({'items': 'Quantity must be greater than zero.'})

            if isinstance(product, Product):
                product_obj = product
            else:
                try:
                    product_obj = Product.objects.get(pk=product)
                except Product.DoesNotExist:
                    raise serializers.ValidationError({'items': f'Product {product} not found.'})

            if quantity < product_obj.moq:
                raise serializers.ValidationError({
                    'items': f'Minimum order quantity for {product_obj.name} is {product_obj.moq}.'
                })

            if product_obj.inventory < quantity:
                raise serializers.ValidationError({
                    'items': f'Not enough inventory for {product_obj.name}.'
                })

            OrderItem.objects.create(
                order=order,
                product=product_obj,
                quantity=quantity,
            )

            product_obj.inventory -= quantity
            if product_obj.inventory == 0:
                product_obj.stock_status = 'Made to Order'
            elif product_obj.inventory < 100:
                product_obj.stock_status = 'Low Stock'
            else:
                product_obj.stock_status = 'In Stock'
            product_obj.save()

            total_price += Decimal(product_obj.price) * Decimal(quantity)

        order.total_price = total_price
        order.save()

        return order


class PaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.SerializerMethodField(read_only=True)
    buyer_name = serializers.SerializerMethodField(read_only=True)
    buyer_email = serializers.SerializerMethodField(read_only=True)
    confirmed_by_name = serializers.SerializerMethodField(read_only=True)
    rejected_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'order',
            'order_number',
            'buyer',
            'buyer_name',
            'buyer_email',
            'provider',
            'amount',
            'currency',
            'status',
            'reference_number',
            'provider_payment_id',
            'provider_reference',
            'checkout_url',
            'bank_name',
            'bank_account_name',
            'bank_iban',
            'notes',
            'rejection_reason',
            'raw_response',
            'paid_at',
            'confirmed_by',
            'confirmed_by_name',
            'rejected_by',
            'rejected_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'order_number',
            'buyer_name',
            'buyer_email',
            'reference_number',
            'provider_payment_id',
            'provider_reference',
            'checkout_url',
            'bank_name',
            'bank_account_name',
            'bank_iban',
            'rejection_reason',
            'raw_response',
            'paid_at',
            'confirmed_by',
            'confirmed_by_name',
            'rejected_by',
            'rejected_by_name',
            'created_at',
            'updated_at',
        ]

    def get_order_number(self, obj):
        try:
            return f"ORD-{obj.order_id}"
        except Exception:
            return ''

    def get_buyer_name(self, obj):
        try:
            return obj.buyer.get_full_name() or obj.buyer.username
        except Exception:
            return 'Buyer'

    def get_buyer_email(self, obj):
        try:
            return obj.buyer.email or ''
        except Exception:
            return ''

    def get_confirmed_by_name(self, obj):
        try:
            if obj.confirmed_by:
                return obj.confirmed_by.get_full_name() or obj.confirmed_by.username
        except Exception:
            pass
        return ''

    def get_rejected_by_name(self, obj):
        try:
            if obj.rejected_by:
                return obj.rejected_by.get_full_name() or obj.rejected_by.username
        except Exception:
            pass
        return ''

    def validate_amount(self, value):
        if value is None or Decimal(value) <= 0:
            raise serializers.ValidationError('Payment amount must be greater than zero.')
        return value


class PaymentCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(required=False)
    provider = serializers.ChoiceField(
        choices=Payment.PROVIDER_CHOICES,
        default='bank_transfer',
        required=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_order_id(self, value):
        request = self.context.get('request')

        try:
            order = Order.objects.get(pk=value)
        except Order.DoesNotExist:
            raise serializers.ValidationError('Order not found.')

        if request and request.user and request.user.is_authenticated:
            try:
                role = request.user.profile.role
            except Exception:
                role = ''

            is_admin = bool(
                getattr(request.user, 'is_superuser', False)
                or getattr(request.user, 'is_staff', False)
                or role == 'admin'
            )

            if not is_admin and order.buyer_id != request.user.id:
                raise serializers.ValidationError('You do not have permission to pay this order.')

        if hasattr(order, 'payment'):
            raise serializers.ValidationError('This order already has a payment record.')

        return value


class AdminPaymentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'status',
            'notes',
            'rejection_reason',
            'provider_reference',
            'raw_response',
        ]

    def validate(self, attrs):
        next_status = attrs.get('status', getattr(self.instance, 'status', 'pending'))

        if next_status == 'rejected':
            reason = attrs.get('rejection_reason', getattr(self.instance, 'rejection_reason', ''))
            if not str(reason or '').strip():
                raise serializers.ValidationError({
                    'rejection_reason': 'Rejection reason is required when rejecting a payment.'
                })

        return attrs


class RFQSerializer(serializers.ModelSerializer):
    buyer_name = serializers.SerializerMethodField()
    supplier_name = serializers.SerializerMethodField()

    class Meta:
        model = RFQ
        fields = [
            'id',
            'buyer',
            'buyer_name',
            'supplier',
            'supplier_name',
            'product_name',
            'quantity',
            'unit',
            'target_price',
            'status',
            'required_date',
            'created_at',
        ]
        read_only_fields = ['id', 'buyer', 'buyer_name', 'supplier_name', 'created_at']

    def get_buyer_name(self, obj):
        try:
            return obj.buyer.get_full_name() or obj.buyer.username
        except Exception:
            return 'Buyer'

    def get_supplier_name(self, obj):
        try:
            if obj.supplier:
                if hasattr(obj.supplier, 'profile') and obj.supplier.profile.company:
                    return obj.supplier.profile.company
                return obj.supplier.get_full_name() or obj.supplier.username
        except Exception:
            pass
        return 'Supplier'

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError({'detail': 'Authenticated user is required.'})

        validated_data['buyer'] = request.user
        return super().create(validated_data)


class SupplierProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    company = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    joined_date = serializers.SerializerMethodField()

    class Meta:
        model = SupplierProfile
        fields = [
            'id',
            'user_id',
            'username',
            'email',
            'first_name',
            'last_name',
            'company',
            'phone',
            'city',
            'description',
            'categories',
            'rating',
            'total_orders',
            'image',
            'status',
            'license_number',
            'license_date',
            'commercial_register_number',
            'commercial_register_date',
            'rejection_reason',
            'joined_date',
        ]

    def get_company(self, obj):
        try:
            return obj.user.profile.company
        except Exception:
            return ''

    def get_phone(self, obj):
        try:
            return obj.user.profile.phone
        except Exception:
            return ''

    def get_city(self, obj):
        try:
            return obj.user.profile.city
        except Exception:
            return ''

    def get_joined_date(self, obj):
        try:
            return obj.user.profile.joined_date
        except Exception:
            return None


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.CharField(required=False)
    buyer_type = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    company = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    permissions = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'email',
            'role',
            'buyer_type',
            'phone',
            'city',
            'company',
            'status',
            'rejection_reason',
            'permissions',
        ]

    def validate_email(self, value):
        email = str(value).strip().lower()
        instance = self.instance

        if User.objects.filter(email__iexact=email).exclude(id=getattr(instance, 'id', None)).exists():
            raise serializers.ValidationError('This email is already registered.')
        return email

    def update(self, instance, validated_data):
        profile = getattr(instance, 'profile', None)

        instance.first_name = validated_data.get('first_name', instance.first_name).strip()
        instance.last_name = validated_data.get('last_name', instance.last_name).strip()
        instance.email = validated_data.get('email', instance.email).strip().lower()
        instance.save()

        if profile:
            if 'role' in validated_data:
                profile.role = validated_data.get('role') or profile.role
            if 'buyer_type' in validated_data:
                profile.buyer_type = validated_data.get('buyer_type', '')
            if 'phone' in validated_data:
                profile.phone = validated_data.get('phone', '')
            if 'city' in validated_data:
                profile.city = validated_data.get('city', '')
            if 'company' in validated_data:
                profile.company = validated_data.get('company', '')
            if 'status' in validated_data:
                profile.status = validated_data.get('status', profile.status)
            if 'rejection_reason' in validated_data:
                profile.rejection_reason = validated_data.get('rejection_reason', '')
            if 'permissions' in validated_data:
                permissions = validated_data.get('permissions', [])
                profile.permissions = permissions if isinstance(permissions, list) else []
            profile.save()

            if profile.role == 'supplier' and hasattr(instance, 'supplier_profile'):
                supplier_profile = instance.supplier_profile

                if 'status' in validated_data:
                    supplier_profile.status = validated_data.get('status', supplier_profile.status)

                if 'rejection_reason' in validated_data:
                    supplier_profile.rejection_reason = validated_data.get('rejection_reason', '')

                supplier_profile.save()

        return instance


class AdminProductUpdateSerializer(serializers.ModelSerializer):
    specifications = FlexibleJSONField(required=False)

    class Meta:
        model = Product
        fields = [
            'name',
            'category',
            'price',
            'moq',
            'unit',
            'delivery_time',
            'description',
            'inventory',
            'specifications',
            'image',
            'badge',
            'is_active',
            'status',
        ]

    def validate_price(self, value):
        if value is None or Decimal(value) <= 0:
            raise serializers.ValidationError('Price must be greater than zero.')
        return value

    def validate_moq(self, value):
        if value is None or int(value) <= 0:
            raise serializers.ValidationError('MOQ must be greater than zero.')
        return value

    def validate_inventory(self, value):
        if value is None or int(value) < 0:
            raise serializers.ValidationError('Inventory cannot be negative.')
        return value

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)

        if instance.inventory == 0:
            instance.stock_status = 'Made to Order'
        elif instance.inventory < 100:
            instance.stock_status = 'Low Stock'
        else:
            instance.stock_status = 'In Stock'

        instance.save()
        return instance


class AdminOrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status', 'notes']


class AdminRFQUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFQ
        fields = ['status', 'supplier', 'target_price', 'required_date']