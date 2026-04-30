import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  MessageSquare,
  FileText,
  Settings,
  Store,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  Home,
  UserCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CartDropdown } from './CartDropdown';
import { mockConversations } from '../lib/mock-data';
import { PLATFORM_LOGO } from '../lib/constants';

interface DashboardLayoutProps {
  children: ReactNode;
}

function isBuyerRole(role?: string | null) {
  return (
    role === 'buyer' ||
    role === 'buyer_individual' ||
    role === 'buyer_company' ||
    role === 'buyer_establishment'
  );
}

function getDisplayName(user: any) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (user?.name) return user.name;
  if (user?.username) return user.username;
  return 'User';
}

function getRoleLabel(role?: string | null) {
  const roleMap: Record<string, string> = {
    buyer: 'Buyer',
    buyer_individual: 'Buyer Individual',
    buyer_company: 'Buyer Company',
    buyer_establishment: 'Buyer Establishment',
    supplier: 'Supplier',
    admin: 'Admin',
  };

  if (!role) return 'User';
  return roleMap[role] || role.replace(/_/g, ' ');
}

function getDashboardPath(role?: string | null) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'supplier') return '/supplier/dashboard';
  if (isBuyerRole(role)) return '/buyer/dashboard';
  return '/';
}

function getSettingsPath(role?: string | null) {
  if (role === 'supplier') return '/supplier/settings';
  if (isBuyerRole(role)) return '/buyer/settings';
  return getDashboardPath(role);
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = () => {
    setMobileSidebarOpen(false);
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileSidebarOpen]);

  const buyerNav = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/buyer/dashboard' },
    { icon: Store, label: 'Browse Products', path: '/marketplace' },
    { icon: ShoppingCart, label: 'Cart', path: '/buyer/cart' },
    { icon: Package, label: 'Orders', path: '/buyer/orders' },
    { icon: FileText, label: 'Request Quote', path: '/buyer/rfq' },
    { icon: MessageSquare, label: 'Messages', path: '/buyer/messages' },
    { icon: Settings, label: 'Settings', path: '/buyer/settings' },
  ];

  const supplierNav = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/supplier/dashboard' },
    { icon: Store, label: 'Products', path: '/supplier/products' },
    { icon: Package, label: 'Orders', path: '/supplier/orders' },
    { icon: FileText, label: 'RFQ Requests', path: '/supplier/rfq' },
    { icon: BarChart3, label: 'Analytics', path: '/supplier/analytics' },
    { icon: Settings, label: 'Settings', path: '/supplier/settings' },
  ];

  const adminNav = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: Package, label: 'Products', path: '/admin/products' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  ];

  const navigation = isBuyerRole(user?.role)
    ? buyerNav
    : user?.role === 'supplier'
    ? supplierNav
    : user?.role === 'admin'
    ? adminNav
    : [];

  const totalUnreadMessages = mockConversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0
  );

  const quickLinks = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Store, label: 'Marketplace', path: '/marketplace' },
    { icon: LayoutDashboard, label: 'Dashboard', path: getDashboardPath(user?.role) },
    { icon: Settings, label: 'Settings', path: getSettingsPath(user?.role) },
  ];

  const getPageTitle = () => {
    if (location.pathname === '/buyer/dashboard') return 'Dashboard';
    if (location.pathname === '/buyer/cart') return 'Shopping Cart';
    if (location.pathname === '/buyer/orders') return 'My Orders';
    if (location.pathname.startsWith('/buyer/orders/')) return 'Order Details';
    if (location.pathname === '/buyer/messages') return 'Messages';
    if (location.pathname === '/buyer/rfq' || location.pathname === '/buyer/rfq/new') {
      return 'Request Quote';
    }
    if (location.pathname === '/buyer/checkout') return 'Checkout';
    if (location.pathname === '/buyer/payment') return 'Payment';
    if (location.pathname === '/buyer/payment/otp') return 'Payment Verification';
    if (
      location.pathname === '/buyer/payment/success' ||
      location.pathname === '/buyer/order-confirmation'
    ) {
      return 'Order Confirmation';
    }
    if (location.pathname === '/buyer/settings') return 'Settings';
    if (
      location.pathname === '/marketplace' ||
      location.pathname.startsWith('/marketplace/')
    ) {
      return 'Browse Products';
    }

    if (location.pathname === '/supplier/dashboard') return 'Dashboard';
    if (location.pathname === '/supplier/products') return 'Products';
    if (location.pathname === '/supplier/products/new') return 'Add Product';
    if (location.pathname.startsWith('/supplier/products/edit/')) return 'Edit Product';
    if (location.pathname === '/supplier/orders') return 'Orders';
    if (location.pathname.startsWith('/supplier/orders/')) return 'Order Details';
    if (location.pathname === '/supplier/rfq') return 'RFQ Requests';
    if (location.pathname === '/supplier/analytics') return 'Analytics';
    if (location.pathname === '/supplier/settings') return 'Settings';

    if (location.pathname === '/admin/dashboard') return 'Admin Dashboard';
    if (location.pathname === '/admin/users') return 'Users Management';
    if (location.pathname === '/admin/products') return 'Products Management';
    if (location.pathname === '/admin/analytics') return 'Analytics';

    return 'Dashboard';
  };

  const getPageSubtitle = () => {
    if (user?.role === 'admin') {
      return 'Manage platform operations, users, products, and analytics.';
    }

    if (user?.role === 'supplier') {
      return 'Manage your catalog, orders, and supplier activity.';
    }

    if (isBuyerRole(user?.role)) {
      return 'Manage your purchases, orders, quotes, and account.';
    }

    return 'Welcome back.';
  };

  const showTopHeader =
    isBuyerRole(user?.role) || user?.role === 'supplier' || user?.role === 'admin';

  const isAdminSidebar = user?.role === 'admin';

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#1C4D8D]">
        <div
          className={`flex items-center justify-between ${
            isAdminSidebar ? 'px-5 py-4' : 'px-5 py-5'
          }`}
        >
          <Link
            to="/"
            className="inline-flex items-center"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <img
              src={PLATFORM_LOGO}
              alt="Steel Platform"
              className={`${isAdminSidebar ? 'h-10' : 'h-12'} w-auto object-contain`}
            />
          </Link>

          {isMobile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(false)}
              className="rounded-full text-white hover:bg-[#163766] hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className={`${isAdminSidebar ? 'px-5 pb-5 pt-1' : 'px-5 pb-5 pt-1'}`}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#BDE8F5] text-[#0F2854]">
                <UserCircle className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-[0.18em] text-[#BDE8F5]/75">
                  Account
                </div>
                <div className="mt-1 truncate text-base font-semibold text-white">
                  {getDisplayName(user)}
                </div>
                <div className="mt-1 break-all text-xs text-[#BDE8F5]">
                  {user?.email || '-'}
                </div>
                {user?.company ? (
                  <div className="mt-1 truncate text-xs text-[#BDE8F5]">{user.company}</div>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <Badge className="border-0 bg-[#BDE8F5] text-[#0F2854] hover:bg-[#BDE8F5]">
                {getRoleLabel(user?.role)}
              </Badge>

              <Link
                to={getDashboardPath(user?.role)}
                onClick={() => setMobileSidebarOpen(false)}
                className="text-xs font-medium text-[#BDE8F5] hover:text-white"
              >
                View dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <div className="border-b border-[#1C4D8D] px-4 py-4">
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#BDE8F5]/70">
            Quick Menu
          </div>

          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.path + item.label}
                  to={item.path}
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-3 text-sm font-medium text-[#D7ECF9] transition hover:bg-[#163766] hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${isAdminSidebar ? 'px-3 py-3' : 'px-4 py-5'}`}>
        <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#BDE8F5]/70">
          Navigation
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.path === '/marketplace'
                ? location.pathname === '/marketplace' ||
                  location.pathname.startsWith('/marketplace/')
                : location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);

            const showBadge =
              item.path === '/buyer/messages' && totalUnreadMessages > 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`group flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${
                  isActive
                    ? 'bg-[#1C4D8D] text-white shadow-lg shadow-black/10'
                    : 'text-[#D7ECF9] hover:bg-[#163766] hover:text-white'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate text-[15px] font-medium">{item.label}</span>
                </div>

                {showBadge ? (
                  <Badge className="border-0 bg-[#BDE8F5] text-[#0F2854] hover:bg-[#BDE8F5]">
                    {totalUnreadMessages}
                  </Badge>
                ) : (
                  <ChevronRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-[#1C4D8D] p-4">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="h-12 w-full justify-start rounded-xl px-3 text-[#D7ECF9] hover:bg-red-500/15 hover:text-white"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen flex-shrink-0 border-r border-[#1C4D8D] bg-[#0F2854] text-white lg:block ${
            isAdminSidebar ? 'w-[250px]' : 'w-72'
          }`}
        >
          <SidebarContent />
        </aside>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu overlay"
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setMobileSidebarOpen(false)}
            />

            <aside className="relative h-full w-[86vw] max-w-[340px] animate-in slide-in-from-left duration-200 border-r border-[#1C4D8D] bg-[#0F2854] text-white shadow-2xl">
              <SidebarContent isMobile />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden">
          {showTopHeader && (
            <div className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/95 px-3 py-3 backdrop-blur md:px-8 md:py-5">
              <div className="flex items-center justify-between gap-3 md:gap-6">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setMobileSidebarOpen(true)}
                    className="h-11 w-11 shrink-0 rounded-2xl border-[#E5E7EB] bg-white shadow-sm lg:hidden"
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6 text-[#0F2854]" />
                  </Button>

                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold leading-tight tracking-tight text-[#111827] sm:text-xl md:text-2xl">
                      {getPageTitle()}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-xs text-[#6B7280] sm:text-sm md:line-clamp-2">
                      {getPageSubtitle()}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 md:gap-4">
                  {isBuyerRole(user?.role) && <CartDropdown />}

                  <div className="hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 md:block">
                    <div className="text-xs text-[#6B7280]">Signed in as</div>
                    <div className="text-sm font-semibold text-[#111827]">
                      {getDisplayName(user)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showTopHeader && (
            <div className="border-b border-[#E5E7EB] bg-white px-4 py-4 lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="h-11 w-11 rounded-2xl border-[#E5E7EB] bg-white shadow-sm"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6 text-[#0F2854]" />
              </Button>
            </div>
          )}

          <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4 md:px-6 md:py-6 xl:px-8 xl:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}