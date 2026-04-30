import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CartDropdown } from './CartDropdown';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Search,
  User,
  Menu,
  X,
  Store,
  Info,
  LayoutDashboard,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  ChevronRight,
} from 'lucide-react';
import { PLATFORM_LOGO, PLATFORM_NAME } from '../lib/constants';

interface MarketplaceHeaderProps {
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
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
  if (user?.email) return user.email;

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

  if (!role) return 'Guest';
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
  if (role === 'admin') return '/admin/dashboard';

  return '/login';
}

export function MarketplaceHeader({
  showSearch = false,
  searchQuery = '',
  onSearchChange,
}: MarketplaceHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = getDisplayName(user);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    closeMobileMenu();
    logout();
    navigate('/');
  };

  const handleDashboardNavigation = () => {
    if (!user) return;

    closeMobileMenu();
    navigate(getDashboardPath(user.role));
  };

  const handleSettingsNavigation = () => {
    closeMobileMenu();
    navigate(getSettingsPath(user?.role));
  };

  const handleLoginNavigation = () => {
    closeMobileMenu();
    navigate('/login');
  };

  const handleRegisterNavigation = () => {
    closeMobileMenu();
    navigate('/register/select');
  };

  const mainLinks = [
    {
      icon: Home,
      label: 'Home',
      path: '/',
    },
    {
      icon: Store,
      label: 'Marketplace',
      path: '/marketplace',
    },
    {
      icon: Info,
      label: 'About',
      path: '/about',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex min-h-[72px] items-center justify-between gap-3 md:min-h-[76px] md:gap-4">
            <div className="flex min-w-0 items-center gap-3 md:gap-6">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="h-11 w-11 shrink-0 rounded-2xl border-[#E5E7EB] bg-white shadow-sm lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6 text-[#0F2854]" />
              </Button>

              <Link to="/" className="flex flex-shrink-0 items-center">
                <img
                  src={PLATFORM_LOGO}
                  alt={PLATFORM_NAME}
                  className="h-10 w-auto object-contain sm:h-12 md:h-14"
                />
              </Link>

              {!showSearch && (
                <nav className="hidden items-center gap-6 lg:flex">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 font-medium text-[#0F2854] transition-colors hover:text-[#4988C4]"
                  >
                    <Home className="h-4 w-4" />
                    Home
                  </Link>

                  <Link
                    to="/marketplace"
                    className="font-medium text-[#111827] transition-colors hover:text-[#4988C4]"
                  >
                    Marketplace
                  </Link>

                  <Link
                    to="/about"
                    className="font-medium text-[#111827] transition-colors hover:text-[#4988C4]"
                  >
                    About
                  </Link>
                </nav>
              )}
            </div>

            {showSearch && (
              <div className="hidden max-w-2xl flex-1 md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    className="h-11 border-[#D1D5DB] bg-white pl-10"
                  />
                </div>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <CartDropdown />

              {user ? (
                <div className="hidden items-center gap-3 md:flex">
                  <div className="hidden items-center gap-2 rounded-full border border-[#D7E3F4] bg-[#F8FBFF] px-4 py-2 lg:flex">
                    <User className="h-4 w-4 text-[#0F2854]" />
                    <span className="max-w-[160px] truncate text-sm font-semibold text-[#0F2854]">
                      {displayName}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDashboardNavigation}
                    className="border-[#0F2854] text-[#0F2854] hover:bg-[#EEF4FB]"
                  >
                    Dashboard
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-[#111827]"
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="hidden items-center gap-2 sm:flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoginNavigation}
                    className="border-[#0F2854] text-[#0F2854] hover:bg-[#EEF4FB]"
                  >
                    Sign In
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleRegisterNavigation}
                    className="bg-[#0F2854] hover:bg-[#1C4D8D]"
                  >
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>

          {showSearch && (
            <div className="pb-3 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="h-11 border-[#D1D5DB] bg-white pl-10"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={closeMobileMenu}
          />

          <aside className="relative h-full w-[86vw] max-w-[350px] animate-in slide-in-from-left duration-200 overflow-hidden bg-[#0F2854] text-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="border-b border-white/10 px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to="/"
                    onClick={closeMobileMenu}
                    className="inline-flex items-center"
                  >
                    <img
                      src={PLATFORM_LOGO}
                      alt={PLATFORM_NAME}
                      className="h-12 w-auto object-contain"
                    />
                  </Link>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closeMobileMenu}
                    className="rounded-full text-white hover:bg-white/10 hover:text-white"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  {user ? (
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#BDE8F5] text-[#0F2854]">
                        <User className="h-6 w-6" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-[0.18em] text-[#BDE8F5]/75">
                          Signed in as
                        </div>
                        <div className="mt-1 truncate text-base font-semibold text-white">
                          {displayName}
                        </div>
                        <div className="mt-1 break-all text-xs text-[#BDE8F5]">
                          {user?.email || '-'}
                        </div>
                        <div className="mt-3 inline-flex rounded-full bg-[#BDE8F5] px-3 py-1 text-xs font-semibold text-[#0F2854]">
                          {getRoleLabel(user?.role)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[#BDE8F5]/75">
                        Welcome
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        Steel Platform
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#BDE8F5]">
                        Sign in or create an account to manage orders, products, quotes, and cart.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {showSearch && (
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange?.(e.target.value)}
                      className="h-11 border-white/10 bg-white pl-10 text-[#111827]"
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#BDE8F5]/70">
                  Main Menu
                </div>

                <nav className="space-y-2">
                  {mainLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={closeMobileMenu}
                        className="group flex items-center justify-between rounded-2xl px-4 py-3 text-[#D7ECF9] transition hover:bg-[#163766] hover:text-white"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
                      </Link>
                    );
                  })}

                  {user && (
                    <>
                      <button
                        type="button"
                        onClick={handleDashboardNavigation}
                        className="group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-[#D7ECF9] transition hover:bg-[#163766] hover:text-white"
                      >
                        <div className="flex items-center gap-3">
                          <LayoutDashboard className="h-5 w-5" />
                          <span className="font-medium">Dashboard</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
                      </button>

                      <button
                        type="button"
                        onClick={handleSettingsNavigation}
                        className="group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-[#D7ECF9] transition hover:bg-[#163766] hover:text-white"
                      >
                        <div className="flex items-center gap-3">
                          <Settings className="h-5 w-5" />
                          <span className="font-medium">Settings</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
                      </button>
                    </>
                  )}
                </nav>
              </div>

              <div className="border-t border-white/10 p-5">
                {user ? (
                  <Button
                    type="button"
                    onClick={handleLogout}
                    variant="ghost"
                    className="h-12 w-full justify-start rounded-2xl text-[#D7ECF9] hover:bg-red-500/15 hover:text-white"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                  </Button>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      type="button"
                      onClick={handleLoginNavigation}
                      variant="outline"
                      className="h-12 rounded-2xl border-white/20 bg-white text-[#0F2854] hover:bg-[#EEF4FB]"
                    >
                      <LogIn className="mr-2 h-5 w-5" />
                      Sign In
                    </Button>

                    <Button
                      type="button"
                      onClick={handleRegisterNavigation}
                      className="h-12 rounded-2xl bg-[#4988C4] text-white hover:bg-[#1C4D8D]"
                    >
                      <UserPlus className="mr-2 h-5 w-5" />
                      Get Started
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}