import { Link } from 'react-router-dom';
import {
  Home,
  Store,
  Info,
  LogIn,
  UserPlus,
  Search,
  ShieldCheck,
  Truck,
  Building2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { PLATFORM_LOGO } from '../lib/constants';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={PLATFORM_LOGO}
              alt="Steel Platform"
              className="h-10 w-auto object-contain md:h-11"
            />
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#0F2854] transition hover:bg-[#F3F4F6]"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>

            <Link
              to="/marketplace"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#0F2854] transition hover:bg-[#F3F4F6]"
            >
              <Store className="h-4 w-4" />
              Marketplace
            </Link>

            <a
              href="#about"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#0F2854] transition hover:bg-[#F3F4F6]"
            >
              <Info className="h-4 w-4" />
              About
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="outline" className="border-[#E5E7EB]">
              <Link to="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>

            <Button asChild className="bg-[#0F2854] hover:bg-[#1C4D8D]">
              <Link to="/register-supplier">
                <UserPlus className="mr-2 h-4 w-4" />
                Get Started
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Button asChild variant="outline" size="sm" className="border-[#E5E7EB] px-3">
              <Link to="/login">
                <LogIn className="mr-1 h-4 w-4" />
                Sign In
              </Link>
            </Button>

            <Button asChild size="sm" className="bg-[#0F2854] px-3 hover:bg-[#1C4D8D]">
              <Link to="/register-supplier">
                <UserPlus className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] bg-white md:hidden">
          <div className="mx-auto flex max-w-[1400px] items-center justify-around gap-2 px-3 py-2">
            <Link
              to="/"
              className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#0F2854]"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>

            <Link
              to="/marketplace"
              className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#0F2854]"
            >
              <Store className="h-4 w-4" />
              Marketplace
            </Link>

            <a
              href="#about"
              className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#0F2854]"
            >
              <Info className="h-4 w-4" />
              About
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F2854] via-[#1C4D8D] to-[#4988C4]" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(189,232,245,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_35%)]" />

          <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
            <div className="text-white">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-[#EAF7FC]">
                <ShieldCheck className="h-4 w-4" />
                Trusted B2B Steel Marketplace
              </div>

              <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-6xl">
                Saudi Arabia&apos;s Leading Steel Marketplace
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-[#EAF7FC] md:text-lg">
                Connect with trusted suppliers, compare prices, request quotes, and streamline your steel procurement process.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-white text-[#0F2854] hover:bg-[#F3F4F6]">
                  <Link to="/marketplace">
                    <Store className="mr-2 h-5 w-5" />
                    Browse Marketplace
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <Link to="/register-supplier">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Get Started
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur md:p-6">
              <div className="rounded-2xl bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#0F2854]">
                      Search Steel Products
                    </h2>
                    <p className="text-sm text-[#6B7280]">
                      Find suppliers and products faster
                    </p>
                  </div>

                  <Building2 className="h-8 w-8 text-[#4988C4]" />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                    <input
                      className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#0F2854] focus:ring-2 focus:ring-[#0F2854]/10"
                      placeholder="Search for steel products..."
                    />
                  </div>

                  <Button asChild className="h-12 bg-[#0F2854] hover:bg-[#1C4D8D]">
                    <Link to="/marketplace">Search</Link>
                  </Button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {['Steel Coils', 'Steel Sheets', 'Stainless Steel', 'Construction Steel'].map(
                    (category) => (
                      <Link
                        key={category}
                        to="/marketplace"
                        className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4 text-center text-sm font-medium text-[#111827] transition hover:border-[#4988C4] hover:bg-[#BDE8F5]/20"
                      >
                        {category}
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-[#0F2854] md:text-4xl">
              About Steel Platform
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#6B7280]">
              A digital marketplace designed to simplify steel sourcing between buyers and verified suppliers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <Store className="mb-4 h-9 w-9 text-[#4988C4]" />
              <h3 className="mb-2 text-lg font-semibold text-[#111827]">
                Marketplace
              </h3>
              <p className="text-sm leading-6 text-[#6B7280]">
                Browse products, compare options, and connect with suppliers in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <ShieldCheck className="mb-4 h-9 w-9 text-[#4988C4]" />
              <h3 className="mb-2 text-lg font-semibold text-[#111827]">
                Verified Suppliers
              </h3>
              <p className="text-sm leading-6 text-[#6B7280]">
                Supplier registration can be reviewed and approved by platform administrators.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <Truck className="mb-4 h-9 w-9 text-[#4988C4]" />
              <h3 className="mb-2 text-lg font-semibold text-[#111827]">
                Procurement Flow
              </h3>
              <p className="text-sm leading-6 text-[#6B7280]">
                Manage orders, RFQs, products, and communication through a streamlined workflow.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}