"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ClipboardList,
  CreditCard,
  Eye,
  EyeOff,
  Handshake,
  Leaf,
  LogOut,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sprout,
  Store,
  Truck,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import DemandMap from "@/components/demand-map";
import {
  createAppwriteAccount,
  createPlatformProfile,
  createAppwriteSession,
  loadPlatformState,
} from "@/lib/appwrite";
import { Button as UiButton } from "@/components/ui/button";
import { usePlatform } from "@/services/platform-store";
import { crops, locations } from "@/services/platform-options";
import { findDemandMatches, findFarmerMatches } from "@/services/matching";
import type {
  BuyerType,
  Deal,
  DealStatus,
  DeliveryStatus,
  DemoPaymentMethod,
  PlatformState,
  UserRole,
} from "@/types";
import {
  calculatePlatformCommission,
  PLATFORM_COMMISSION_RATE,
} from "@/services/commission";
import { calculateRiderFee } from "@/services/delivery";
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
const dayLabel = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
const dateInputValue = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <UiButton {...props} variant={variant}>
      {children}
    </UiButton>
  );
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <span className="brand-mark">
        <Sprout size={19} />
      </span>
      <span
        className={`brand-label font-semibold tracking-[-.02em] ${dark ? "text-[#1f3829]" : "text-white"}`}
      >
        khetlink
        <span className="brand-caption ml-1 text-[9px] font-medium opacity-60">
          LOCAL TRADE
        </span>
      </span>
    </Link>
  );
}

function Heading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="page-title text-[34px] sm:text-[39px]">{title}</h1>
        <p className="mt-2 max-w-[650px] text-xs leading-5 text-[#778178]">
          {subtitle}
        </p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
  icon: Icon,
  warm = false,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Sprout;
  warm?: boolean;
}) {
  return (
    <div className="panel stat-card">
      <div className="flex items-start justify-between gap-2">
        <span className="stat-label">{label}</span>
        <span
          className={`grid size-8 place-items-center rounded-md ${warm ? "bg-[#f8eee5] text-[#b96e3c]" : "bg-[#edf3e9] text-[#4b7853]"}`}
        >
          <Icon size={16} />
        </span>
      </div>
      <p className="stat-value">{value}</p>
      <p className="mt-2 text-[10px] text-[#849087]">{helper}</p>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
  action,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h2 className="section-title">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#849087]">{label}</p>
      <p className="mt-1 text-xs font-semibold">{value}</p>
    </div>
  );
}

const farmerNav = [
  ["Overview", "/farmer/dashboard", BarChart3],
  ["My produce", "/farmer/produce", Package],
  ["Nearby demand", "/farmer/demand", Search],
  ["My matches", "/farmer/matches", Handshake],
  ["Orders & deals", "/farmer/orders", ClipboardList],
  ["Earnings", "/farmer/earnings", TrendingUp],
] as const;
const buyerNav = [
  ["Overview", "/buyer/dashboard", BarChart3],
  ["My demands", "/buyer/demand", ClipboardList],
  ["Find farmers", "/buyer/matches", Search],
  ["Orders & deals", "/buyer/orders", Handshake],
] as const;
const riderNav = [
  ["My deliveries", "/rider/dashboard", Truck],
] as const;
const commonNav = [
  ["Local discovery", "/marketplace", MapPin],
  ["Price transparency", "/price-transparency", BarChart3],
  ["Platform impact", "/impact", TrendingUp],
] as const;
const adminNav = [
  ["Admin dashboard", "/admin/dashboard", Users],
] as const;

function Workspace({
  route,
  role,
  name,
  signOut,
  children,
}: {
  route: string;
  role: UserRole;
  name: string;
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const { refreshState } = usePlatform();
  const [refreshing, setRefreshing] = useState(false);
  const links =
    role === "admin"
      ? adminNav
      : role === "buyer"
        ? buyerNav
        : role === "rider"
          ? riderNav
          : farmerNav;
  const sideLink = ([label, href, Icon]: readonly [
    string,
    string,
    typeof Sprout,
  ]) => (
    <Link
      key={href}
      href={href}
      aria-label={label}
      aria-current={route === href.slice(1) ? "page" : undefined}
      title={label}
      className={`side-link ${route === href.slice(1) ? "active" : ""}`}
    >
      <Icon size={17} />
      <span>{label}</span>
    </Link>
  );
  const refreshWorkspace = async () => {
    setRefreshing(true);
    try {
      await refreshState();
      toast.success("Latest data loaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh data.");
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <div className="platform-shell flex">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="mb-9 px-1">
          <Brand />
        </div>
        <p className="side-section !pt-0">Workspace</p>
        <nav aria-label="Workspace navigation" className="space-y-1">
          {links.map(sideLink)}
        </nav>
        <p className="side-section">Explore</p>
        <nav aria-label="Explore navigation" className="space-y-1">
          {commonNav.map(sideLink)}
        </nav>
        <div className="mt-auto rounded-lg border border-white/10 bg-white/[.045] p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-[#d6ed8a] text-xs font-bold text-[#234b35]">
              {name[0]?.toUpperCase()}
            </span>
            <div className="profile-label min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{name}</p>
              <p className="mt-0.5 text-[10px] capitalize text-[#aebeac]">
                {role} account
              </p>
            </div>
            <button
              title="Sign out"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await signOut();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not sign out.");
                }
              }}
              className="grid size-10 place-items-center rounded-md text-[#d0dbd0] hover:bg-white/10"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div>
            <p className="text-[10px] capitalize text-[#879087]">
              KhetLink / {route.split("/").at(-1)?.replaceAll("-", " ")}
            </p>
            <p className="mt-1 text-[13px] font-semibold">
              Good day, {name.split(" ")[0]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="!min-h-9 gap-2 !px-3 text-[10px]"
              aria-label="Refresh KhetLink data"
              title="Refresh data from Appwrite"
              disabled={refreshing}
              onClick={() => void refreshWorkspace()}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">
                {refreshing ? "Refreshing…" : "Refresh data"}
              </span>
            </Button>
            <span className="hidden rounded-full bg-[#eff4e9] px-3 py-1.5 text-[10px] font-semibold capitalize text-[#4b7350] sm:inline-flex">
              {role} view
            </span>
            <button
              aria-label="Notifications"
              className="grid size-9 place-items-center rounded-md border border-[#e3e8e0] bg-white"
            >
              <Bell size={15} />
            </button>
            <span className="grid size-8 place-items-center rounded-full bg-[#dce9d6] text-xs font-bold text-[#36563b]">
              {name[0]?.toUpperCase()}
            </span>
          </div>
        </header>
        <nav aria-label="Workspace navigation" className="mobile-nav">
          {[...links, ...commonNav].map(
            ([label, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={route === href.slice(1) ? "page" : undefined}
                className={route === href.slice(1) ? "active" : ""}
              >
                {label}
              </Link>
            ),
          )}
        </nav>
        <main id="main-content" className="page-wrap fade-up">
          {children}
        </main>
      </div>
    </div>
  );
}

function isAppwriteConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 409
  );
}

function Home() {
  return (
    <main className="min-h-screen bg-[#f8f9f4]">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="flex h-[74px] items-center justify-between border-b border-[#e5e9e1] px-4 sm:px-6 md:px-12">
        <Brand dark />
        <nav
          aria-label="Main navigation"
          className="hidden gap-8 text-xs text-[#536057] md:flex"
        >
          <Link href="/marketplace">Explore local trade</Link>
          <Link href="/price-transparency">Price transparency</Link>
          <Link href="/impact">Our impact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-2 py-2 text-xs font-semibold sm:px-3"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="btn-dark inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-xs font-semibold"
          >
            <span className="hidden sm:inline">Join the network</span>
            <span className="sm:hidden">Sign up</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>
      <nav aria-label="Explore KhetLink" className="home-mobile-nav md:hidden">
        <Link href="/marketplace">Explore local trade</Link>
        <Link href="/price-transparency">Price transparency</Link>
        <Link href="/impact">Our impact</Link>
      </nav>
      <section
        id="main-content"
        className="mx-auto grid w-full max-w-[1280px] items-center gap-10 px-6 pb-14 pt-12 md:grid-cols-[.92fr_1.08fr] md:px-12 md:pb-20 md:pt-[72px]"
      >
        <div className="fade-up">
          <p className="eyebrow mb-5">A fairer way to trade local produce</p>
          <h1 className="page-title hero-title max-w-[570px]">
            Good produce.
            <br />
            <span className="text-[#56835c]">Better deals.</span>
            <br />
            Closer to home.
          </h1>
          <p className="mt-6 max-w-[460px] text-[15px] leading-7 text-[#6d786f]">
            We connect nearby farmers with local businesses. Listings show
            prices entered by their owners; verified market-price data is not
            available yet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-md px-5 text-xs font-semibold"
            >
              Join as a farmer <ArrowRight size={15} />
            </Link>
            <Link
              href="/buyer/dashboard"
              className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-md px-5 text-xs font-semibold"
            >
              I buy in bulk <Store size={15} />
            </Link>
          </div>
          <div className="mt-11 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#e3e8de] pt-5">
            <div>
              <p className="font-serif text-[18px] text-[#244830]">
                For farmers
              </p>
              <p className="mt-1 text-[10px] text-[#7a857b]">
                list produce and find buyers
              </p>
            </div>
            <div className="h-9 w-px bg-[#dfe5dc]" />
            <div>
              <p className="font-serif text-[18px] text-[#244830]">
                For buyers
              </p>
              <p className="mt-1 text-[10px] text-[#7a857b]">
                post demand and find produce
              </p>
            </div>
            <Link
              href="/login"
              className="text-[11px] font-semibold text-[#507b55] underline underline-offset-4 sm:ml-auto"
            >
              Log in
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="relative h-[340px] overflow-hidden rounded-lg bg-[#d7dfcf] sm:h-[435px]">
            <Image
              src="https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=1400&q=85"
              alt="Fresh produce ready for local trade"
              fill
              loading="eager"
              unoptimized
              sizes="(min-width: 768px) 55vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3527]/60 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-white">
              <div>
                <p className="text-[10px] uppercase tracking-[.14em] text-white/75">
                  KhetLink marketplace
                </p>
                <p className="mt-1 font-serif text-[23px]">
                  Local produce, local trade
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-[#e4e9df] bg-white px-6 py-7 md:px-12">
        <div className="mx-auto grid max-w-[1150px] gap-5 sm:grid-cols-3">
          {[
            [
              Search,
              "Demand-first matching",
              "Find nearby buyers already looking for your crop.",
            ],
            [
              BarChart3,
              "Clear listing prices",
              "See asking and target prices entered by farmers and buyers.",
            ],
            [
              Handshake,
              "Trade directly",
              "Agree bulk deals between growers and buyers.",
            ],
          ].map(([Icon, title, body]) => (
            <div key={String(title)} className="flex gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-[#edf3e9] text-[#56835c]">
                <Icon size={17} />
              </span>
              <div>
                <p className="text-xs font-semibold">{title as string}</p>
                <p className="mt-1 text-[11px] leading-5 text-[#788279]">
                  {body as string}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <footer className="flex flex-wrap justify-between gap-3 px-6 py-6 text-[10px] text-[#7a857b] md:px-12">
        <span>© 2026 KhetLink · SIH prototype</span>
        <span>Listings, demands, and orders come from Appwrite records.</span>
        <Link href="/impact" className="font-semibold text-[#4c7651]">
          See platform impact →
        </Link>
      </footer>
    </main>
  );
}

function Auth({
  register,
  onAuth,
}: {
  register: boolean;
  onAuth: (
    role: UserRole,
    name: string,
    email: string,
    register: boolean,
    location: string,
    buyerType: BuyerType | "",
  ) => Promise<UserRole>;
}) {
  const [role, setRole] = useState<UserRole>("farmer");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const destination = (nextRole: UserRole) =>
    nextRole === "buyer"
      ? "/buyer/dashboard"
      : nextRole === "admin"
        ? "/admin/dashboard"
        : nextRole === "rider"
          ? "/rider/dashboard"
          : "/farmer/dashboard";
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const name = String(
      form.get("name") ||
        "",
    );
    const location = String(form.get("location") || "");
    const buyerType = String(form.get("buyerType") || "") as BuyerType | "";
    setBusy(true);
    try {
      let existingAuthAccount = false;
      if (register) {
        try {
          await createAppwriteAccount(name, email, password);
        } catch (error) {
          if (!isAppwriteConflict(error)) throw error;
          await createAppwriteSession(email, password);
          existingAuthAccount = true;
        }
      } else {
        await createAppwriteSession(email, password);
      }
      let authenticatedRole: UserRole;
      try {
        authenticatedRole = await onAuth(
          role,
          name,
          email,
          register,
          location,
          buyerType,
        );
      } catch (profileError) {
        if (!existingAuthAccount) throw profileError;
        try {
          const existingState = await loadPlatformState(true);
          if (!existingState.user) throw profileError;
          authenticatedRole = existingState.user.role;
        } catch {
          throw profileError;
        }
      }
      toast.success(
        existingAuthAccount
          ? "Account profile is ready"
          : register
            ? "Account created"
            : `Welcome, ${name.split(" ")[0]}`,
      );
      router.push(destination(authenticatedRole));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not authenticate. Check your details and Appwrite setup.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[.92fr_1.08fr]">
      <a
        className="skip-link"
        href={register ? "#auth-name" : "#auth-email"}
      >
        Skip to form
      </a>
      <section className="hero-grain hidden min-h-screen flex-col justify-between p-10 lg:flex">
        <Brand dark />
        <div className="max-w-[530px]">
          <p className="eyebrow mb-4">A better market starts nearby</p>
          <h1 className="page-title auth-hero-title">
            Make the next
            <br />
            good deal <span className="text-[#56835c]">local.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-[#647165]">
            A local marketplace connecting farms with kitchens, shops and
            other bulk buyers.
          </p>
        </div>
        <p className="text-[10px] text-[#6d786f]">
          Appwrite-backed marketplace · Listings and prices are user-entered
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[410px]">
          <div className="mb-8 lg:hidden">
            <Brand dark />
          </div>
          <p className="eyebrow mb-2">
            {register ? "Get started" : "Welcome back"}
          </p>
          <h1 className="page-title text-[34px]">
            {register ? "Join the local network" : "Sign in to KhetLink"}
          </h1>
          <p className="mt-2 text-sm text-[#778178]">
            {register
              ? "Create an account to sell, buy, or deliver local produce."
              : "View your workspace and assigned activity."}
          </p>
          {register && (
            <div
              role="group"
              aria-label="Account type"
              className="mt-7 grid grid-cols-3 rounded-md border border-[#e3e8e0] bg-[#f7f8f4] p-1"
            >
              {(["farmer", "buyer", "rider"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={role === item}
                  onClick={() => setRole(item)}
                  className={`rounded py-2 text-xs font-semibold capitalize ${role === item ? "bg-white text-[#315b3d] shadow-sm" : "text-[#778178]"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="auth-form">
            {register && (
              <div>
                <label className="field-label" htmlFor="auth-name">
                  {role === "buyer"
                    ? "Business name"
                    : role === "rider"
                      ? "Rider name"
                      : "Your name"}
                </label>
                <input
                  id="auth-name"
                  className="input-field"
                  name="name"
                  placeholder={
                    role === "buyer" ? "Enter your business name" : "Enter your name"
                  }
                  autoComplete={role === "buyer" ? "organization" : "name"}
                  required
                />
              </div>
            )}
            {register && (
              <>
                <div>
                  <label className="field-label" htmlFor="auth-location">
                    Your location
                  </label>
                  <select
                    id="auth-location"
                    className="input-field"
                    name="location"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Select a location
                    </option>
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
                {role === "buyer" && (
                  <div>
                    <label className="field-label" htmlFor="auth-buyer-type">
                      Buyer type
                    </label>
                    <select
                      id="auth-buyer-type"
                      className="input-field"
                      name="buyerType"
                      defaultValue=""
                      required
                    >
                      <option value="" disabled>
                        Select a buyer type
                      </option>
                      {(
                        ["Retailer", "Restaurant", "Hostel", "Small business"] as const
                      ).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="field-label" htmlFor="auth-email">
                Email address
              </label>
              <input
                id="auth-email"
                className="input-field"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="auth-password">
                Password
              </label>
              <div className="password-field">
                <input
                  id="auth-password"
                  className="input-field"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={8}
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
              <ArrowRight size={14} />
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-[#758078]">
            {register ? "Already registered?" : "New to KhetLink?"}{" "}
            <Link
              href={register ? "/login" : "/register"}
              className="font-semibold text-[#47744f] underline underline-offset-4"
            >
              {register ? "Log in" : "Create an account"}
            </Link>
          </p>
          <p className="mt-5 text-center text-[10px] text-[#8a948b]">
            Your account and marketplace records are stored in Appwrite.
          </p>
        </div>
      </section>
    </main>
  );
}

function Empty({
  title,
  body,
  icon: Icon = Search,
  action,
}: {
  title: string;
  body: string;
  icon?: typeof Sprout;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-[190px] place-items-center px-5 py-8 text-center">
      <div>
        <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-[#edf3e9] text-[#567d58]">
          <Icon size={18} />
        </span>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-[#788279]">
          {body}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

function ListingTable({
  items,
  onEdit,
  onClose,
}: {
  items: PlatformState["produce"];
  onEdit?: (item: PlatformState["produce"][number]) => void;
  onClose?: (item: PlatformState["produce"][number]) => void;
}) {
  if (!items.length)
    return (
      <Empty
        icon={Package}
        title="No produce listed yet"
        body="Add what you have available so nearby buyers can find you."
      />
    );
  return (
    <div
      role="region"
      aria-label="Produce listings"
      tabIndex={0}
      className="table-scroll"
    >
      <table className="w-full min-w-[560px] text-left">
        <thead className="table-head">
          <tr>
            {[
              "Produce",
              "Available",
              "Your price",
              "Available by",
              "Status",
              ...(onEdit || onClose ? ["Actions"] : []),
            ].map((item) => (
              <th key={item} className="px-4 py-3 font-semibold">
                {item}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="table-row text-xs">
              <td className="px-4 py-3.5 font-semibold">
                {item.produce}
                <span className="mt-1 block text-[10px] font-normal text-[#859087]">
                  {item.location}
                </span>
              </td>
              <td className="px-4 py-3.5">{item.quantityKg} kg</td>
              <td className="px-4 py-3.5">{money(item.askingPricePerKg)}/kg</td>
              <td className="px-4 py-3.5 text-[#69756b]">
                {dayLabel(item.availableBy)}
              </td>
              <td className="px-4 py-3.5">
                <span className="tag tag-green">{item.status}</span>
              </td>
              {(onEdit || onClose) && (
                <td className="px-4 py-3.5">
                  {item.status === "open" && (
                    <div className="flex items-center gap-3">
                      {onEdit && (
                        <button
                          className="font-semibold text-[#47744f]"
                          onClick={() => onEdit(item)}
                        >
                          Edit
                        </button>
                      )}
                      {onClose && (
                        <button
                          className="font-semibold text-[#9b5441]"
                          onClick={() => onClose(item)}
                        >
                          Close
                        </button>
                      )}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DealsTable({
  items,
  role,
  update,
}: {
  items: PlatformState["deals"];
  role: UserRole;
  update: (id: string, status: DealStatus) => void | Promise<void>;
}) {
  if (!items.length)
    return (
      <Empty
        icon={Handshake}
        title="No deals yet"
        body="Accepted matches between farmers and buyers will show here."
      />
    );
  return (
    <div
      role="region"
      aria-label="Orders and deals"
      tabIndex={0}
      className="table-scroll"
    >
      <table className="w-full min-w-[900px] text-left">
        <thead className="table-head">
          <tr>
            {[
              "Produce",
              role === "buyer" ? "Farmer" : "Buyer",
              "Quantity",
              "Agreed price",
              "Value",
              "Status",
              "Delivery",
              "",
            ].map((item, index) => (
              <th key={`${item}-${index}`} className="px-4 py-3 font-semibold">
                {item}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((deal) => (
            <tr key={deal.id} className="table-row text-xs">
              <td className="px-4 py-3.5 font-semibold">
                {deal.produce}
                <span className="mt-1 block text-[10px] font-normal text-[#859087]">
                  {dayLabel(deal.createdAt)}
                </span>
              </td>
              <td className="px-4 py-3.5">
                {role === "buyer" ? deal.farmerName : deal.buyerName}
              </td>
              <td className="px-4 py-3.5">{deal.quantityKg} kg</td>
              <td className="px-4 py-3.5">{money(deal.agreedPricePerKg)}/kg</td>
              <td className="px-4 py-3.5 font-semibold">
                {money(deal.totalValue)}
              </td>
              <td className="px-4 py-3.5">
                <span
                  className={`tag ${deal.status === "pending" ? "tag-amber" : "tag-green"}`}
                >
                  {deal.status}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <DeliveryProgress deal={deal} />
                {role === "buyer" && deal.deliveryAddress && (
                  <p className="mt-1 max-w-[220px] whitespace-normal text-[10px] text-[#788279]">
                    Drop-off: {deal.deliveryAddress}
                  </p>
                )}
              </td>
              <td className="px-4 py-3.5">
                <div className="flex flex-col items-start gap-2">
                  {deal.status === "pending" ? (
                    <button
                      onClick={async () => {
                        try {
                          await update(deal.id, "confirmed");
                          toast.success("Deal confirmed");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Could not update this deal.");
                        }
                      }}
                      className="text-[10px] font-semibold text-[#47744f]"
                    >
                      Confirm
                    </button>
                  ) : deal.status === "confirmed" ? (
                    role === "buyer" &&
                    (deal.paymentStatus !== "simulated_paid" ||
                      deal.deliveryStatus === "delivered") ? (
                      <button
                        onClick={async () => {
                          try {
                            await update(deal.id, "completed");
                            toast.success("Order marked complete");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Could not update this order.");
                          }
                        }}
                        className="text-[10px] font-semibold text-[#47744f]"
                      >
                        Confirm received
                      </button>
                    ) : (
                      <span className="max-w-28 text-[10px] text-[#788279]">
                        {role === "farmer"
                          ? "Buyer confirms receipt"
                          : "Waiting for rider delivery"}
                      </span>
                    )
                  ) : (
                    <Check size={14} className="text-[#58825b]" />
                  )}
                  {role === "buyer" && deal.status !== "pending" && (
                    <Link
                      href={`/buyer/payment/${deal.id}`}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-[#47744f] underline underline-offset-2"
                    >
                      <CreditCard size={12} />
                      {deal.paymentStatus === "simulated_paid"
                        ? "View delivery"
                        : "Payment demo"}
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeliveryProgress({ deal }: { deal: Deal }) {
  const status: DeliveryStatus =
    deal.deliveryStatus ??
    (deal.paymentStatus === "simulated_paid"
      ? "awaiting_assignment"
      : "awaiting_payment");
  const labels = [
    "Rider assigned",
    "Reached farmer",
    "Delivered to buyer",
  ] as const;
  const completedSteps: Record<DeliveryStatus, number> = {
    awaiting_payment: 0,
    awaiting_assignment: 0,
    rider_assigned: 1,
    at_farmer: 2,
    delivered: 3,
  };
  const statusText: Record<DeliveryStatus, string> = {
    awaiting_payment: "Waiting for buyer payment",
    awaiting_assignment: "Paid demo order · waiting for admin to assign a rider",
    rider_assigned: `Rider assigned${deal.riderName ? `: ${deal.riderName}` : ""}`,
    at_farmer: "Rider reached the farmer",
    delivered: "Delivered to the buyer",
  };
  const stepsDone = completedSteps[status];

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-[#315b3d]">
        {statusText[status]}
      </p>
      {status !== "awaiting_payment" && (
        <ol aria-label="Delivery progress" className="flex flex-wrap gap-1.5">
          {labels.map((label, index) => (
            <li
              key={label}
              className={`rounded-full border px-2 py-1 text-[9px] ${
                index < stepsDone
                  ? "border-[#cfe0ca] bg-[#edf4e9] text-[#315b3d]"
                  : "border-[#e5e9e1] bg-white text-[#7b857c]"
              }`}
            >
              {index < stepsDone ? "✓ " : `${index + 1}. `}
              {label}
            </li>
          ))}
        </ol>
      )}
      {deal.riderName && deal.distanceKm !== null && deal.distanceKm !== undefined && (
        <p className="text-[10px] text-[#788279]">
          {deal.distanceKm} km · rider fee {money(deal.riderFee ?? 0)}
        </p>
      )}
    </div>
  );
}

function DemoPayment({
  deal,
  pay,
}: {
  deal?: Deal;
  pay: (dealId: string, method: DemoPaymentMethod) => Promise<void>;
}) {
  const [method, setMethod] = useState<DemoPaymentMethod>("upi");
  const [busy, setBusy] = useState(false);

  if (!deal || deal.status === "pending") {
    return (
      <Section eyebrow="Demo payment" title="Payment is not available">
        <p className="text-sm leading-6 text-[#768078]">
          This accepted order could not be found. Only confirmed or completed
          orders can be used in the payment demonstration.
        </p>
        <Link
          href="/buyer/orders"
          className="mt-4 inline-flex text-xs font-semibold text-[#47744f] underline underline-offset-4"
        >
          Back to orders
        </Link>
      </Section>
    );
  }

  const commission = calculatePlatformCommission(deal.totalValue);
  const totalDue = deal.totalValue + commission;
  const methods = [
    ["upi", "UPI"],
    ["card", "Debit or credit card"],
    ["bank", "Net banking"],
  ] satisfies ReadonlyArray<readonly [DemoPaymentMethod, string]>;

  const simulate = async () => {
    setBusy(true);
    try {
      await pay(deal.id, method);
      toast.success("Demo payment recorded. No money was transferred.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the demo payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Heading
        eyebrow="Payment flow · simulation only"
        title="Review your payment"
        subtitle="This screen demonstrates a possible checkout. It will not charge you or transfer money."
        action={
          <Link
            href="/buyer/orders"
            className="btn-secondary inline-flex min-h-10 items-center rounded-md px-4 text-xs font-semibold"
          >
            Back to orders
          </Link>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Section eyebrow="Order summary" title={`${deal.produce} from ${deal.farmerName}`}>
          <div className="space-y-4">
            <Info label="Quantity" value={`${deal.quantityKg} kg`} />
            <Info label="Agreed price" value={`${money(deal.agreedPricePerKg)} per kg`} />
            <div className="border-t border-[#edf0eb] pt-4">
              <div className="flex justify-between gap-4 text-sm">
                <span>Order subtotal</span>
                <strong>{money(deal.totalValue)}</strong>
              </div>
              <div className="mt-3 flex justify-between gap-4 text-sm">
                <span>
                  Example platform fee ({PLATFORM_COMMISSION_RATE * 100}%)
                </span>
                <strong>{money(commission)}</strong>
              </div>
              <div className="mt-4 flex justify-between gap-4 border-t border-[#edf0eb] pt-4 text-base font-semibold">
                <span>Total shown for demo</span>
                <span>{money(totalDue)}</span>
              </div>
            </div>
            <p className="text-[11px] leading-5 text-[#788279]">
              Rider fee is set by the admin after assignment using the route
              distance and the selected rider&apos;s per-km rate. It is shown
              separately and is not included in this demo total.
            </p>
          </div>
        </Section>
        <Section eyebrow="Choose a method" title="Demo payment method">
          {deal.paymentStatus === "simulated_paid" ? (
            <div className="space-y-4">
              <p
                role="status"
                className="rounded-md border border-[#dce8d8] bg-[#f0f5ed] p-4 text-sm text-[#315b3d]"
              >
                Demo payment recorded. No money was charged or transferred.
              </p>
              <DeliveryProgress deal={deal} />
            </div>
          ) : (
            <>
              <div role="group" aria-label="Demo payment method" className="space-y-2">
                {methods.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={method === value}
                    onClick={() => setMethod(value)}
                    className={`flex min-h-12 w-full items-center justify-between rounded-md border px-4 text-left text-xs font-semibold ${
                      method === value
                        ? "border-[#527b56] bg-[#f0f5ed] text-[#315b3d]"
                        : "border-[#e3e8e0] bg-white text-[#536057]"
                    }`}
                  >
                    {label}
                    <span aria-hidden="true">{method === value ? "Selected" : ""}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 rounded-md bg-[#fff7e8] p-3 text-xs leading-5 text-[#735b2b]">
                Simulation only: no card, UPI or bank details are collected and
                no real payment is made. The simulated payment status is saved
                to Appwrite so the admin can manage delivery.
              </p>
              <Button
                className="mt-4 w-full"
                onClick={() => void simulate()}
                disabled={busy}
                aria-busy={busy}
              >
                <CreditCard size={15} />
                {busy ? "Recording demo…" : `Simulate payment · ${money(totalDue)}`}
              </Button>
            </>
          )}
        </Section>
      </div>
    </>
  );
}

function FarmerDashboard({
  state,
  userId,
}: {
  state: PlatformState;
  userId: string;
}) {
  const mine = state.produce.filter((item) => item.farmerId === userId);
  const deals = state.deals.filter((item) => item.farmerId === userId);
  const activeKg = mine
    .filter((item) => item.status === "open")
    .reduce((sum, item) => sum + item.quantityKg, 0);
  const earnings = deals
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + item.totalValue, 0);
  const matchingDemands = state.demands.filter((demand) =>
    demand.status === "open" &&
    mine.some((item) => findDemandMatches(item, [demand]).length > 0),
  );
  return (
    <>
      <Heading
        eyebrow={`Farmer workspace · ${state.user?.location ?? "Location unavailable"}`}
        title="Your farm, in good company."
        subtitle="Manage your produce and review open requests from nearby buyers."
        action={
          <Link
            href="/farmer/demand"
            className="btn-primary inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-xs font-semibold"
          >
            Find nearby demand <ArrowRight size={14} />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Active produce"
          value={`${activeKg} kg`}
          helper={`${mine.filter((x) => x.status === "open").length} listings available`}
          icon={Package}
        />
        <Metric
          label="Matched demand"
          value={`${matchingDemands.length} buyers`}
          helper="Open nearby crop requests"
          icon={Handshake}
        />
        <Metric
          label="Pending deals"
          value={`${deals.filter((x) => x.status === "pending").length}`}
          helper="Needs your confirmation"
          icon={ClipboardList}
          warm
        />
        <Metric
          label="Completed earnings"
          value={money(earnings)}
          helper="From completed orders"
          icon={TrendingUp}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_.9fr]">
        <Section
          eyebrow="Market information"
          title="Price data not available yet"
        >
          <p className="text-sm leading-6 text-[#768078]">
            KhetLink does not have a verified mandi price feed or historical
            price records. Choose your asking price using information you trust.
          </p>
          <Link
            href="/price-transparency"
            className="mt-4 inline-flex text-[11px] font-semibold text-[#507b55]"
          >
            View price data status →
          </Link>
        </Section>
        <Section
          eyebrow="Ready to match"
          title="Buyers nearby"
          action={
            <Link
              href="/farmer/demand"
              className="text-[11px] font-semibold text-[#507b55]"
            >
              View all
            </Link>
          }
        >
          {matchingDemands[0] ? (
            <div className="rounded-md border border-[#e8ece5] p-4">
              <span className="tag tag-amber">
                {matchingDemands[0].buyerType}
              </span>
              <h3 className="mt-3 text-sm font-semibold">
                {matchingDemands[0].buyerName}
              </h3>
              <p className="mt-1 text-[11px] text-[#768078]">
                {matchingDemands[0].produce} · {matchingDemands[0].quantityKg}{" "}
                kg needed
              </p>
              <div className="mt-4 grid grid-cols-2 border-t border-[#edf0eb] pt-3">
                <Info
                  label="Buyer target"
                  value={`${money(matchingDemands[0].targetPricePerKg)}/kg`}
                />
                <Info
                  label="Needed by"
                  value={dayLabel(matchingDemands[0].requiredBy)}
                />
              </div>
              <Link
                href="/farmer/matches"
                className="btn-secondary mt-4 flex min-h-9 items-center justify-center gap-2 rounded-md text-[11px] font-semibold"
              >
                See the match <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <Empty
              title="No buyer matches yet"
              body="List produce to discover nearby demand."
            />
          )}
        </Section>
      </div>
      <div className="mt-5">
        <Section
          eyebrow="Available today"
          title="Your produce"
          action={
            <Link
              href="/farmer/produce"
              className="text-[11px] font-semibold text-[#507b55]"
            >
              Manage
            </Link>
          }
        >
          <ListingTable items={mine.slice(0, 4)} />
        </Section>
      </div>
    </>
  );
}

function ListingForm({
  role,
  onSubmit,
  initial,
  submitLabel,
  onCancel,
}: {
  role: "farmer" | "buyer";
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  initial?: PlatformState["produce"][number] | PlatformState["demands"][number];
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const isFarmer = role === "farmer";
  const [crop, setCrop] = useState(initial?.produce ?? "");
  const [quantity, setQuantity] = useState(
    initial ? String(initial.quantityKg) : "",
  );
  const [price, setPrice] = useState(
    initial
      ? String(
          "askingPricePerKg" in initial
            ? initial.askingPricePerKg
            : initial.targetPricePerKg,
        )
      : "",
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(
    initial && "deliveryAddress" in initial
      ? initial.deliveryAddress ?? ""
      : "",
  );
  const [minimumDate] = useState(() => dateInputValue(0));
  const [date, setDate] = useState(
    initial
      ? "availableBy" in initial
        ? initial.availableBy
        : initial.requiredBy
      : "",
  );
  return (
    <form onSubmit={onSubmit} className="listing-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="field-label">Produce</span>
          <select
            name="produce"
            className="input-field"
            required
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
          >
            <option value="" disabled>
              Select produce
            </option>
            {crops.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">
            {isFarmer ? "Available quantity (kg)" : "Required quantity (kg)"}
          </span>
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            min="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input-field"
          />
        </label>
        <label>
          <span className="field-label">
            {isFarmer ? "Expected price (₹/kg)" : "Target price (₹/kg)"}
          </span>
          <input
            name="price"
            type="number"
            inputMode="decimal"
            min="1"
            step="0.5"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input-field"
          />
        </label>
        <label>
          <span className="field-label">
            {isFarmer ? "Farm location" : "Delivery location"}
          </span>
          <select
            name="location"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input-field"
          >
            <option value="" disabled>
              Select a location
            </option>
            {locations.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        {!isFarmer && (
          <label>
            <span className="field-label">Buyer type</span>
            <select
              name="buyerType"
              defaultValue={initial && "buyerType" in initial ? initial.buyerType : ""}
              className="input-field"
              required
            >
              <option value="" disabled>
                Select a buyer type
              </option>
              {(
                ["Retailer", "Restaurant", "Hostel", "Small business"] as const
              ).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        )}
        {!isFarmer && (
          <label className="sm:col-span-2">
            <span className="field-label">Full delivery address</span>
            <textarea
              name="deliveryAddress"
              className="input-field min-h-20 resize-y"
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              maxLength={512}
              placeholder="House/building, street, area, landmark, PIN code"
              required
            />
            <span className="mt-1 block text-[10px] text-[#849087]">
              This address is shared with the assigned rider for this order.
            </span>
          </label>
        )}
        <label>
          <span className="field-label">
            {isFarmer ? "Available from" : "Required by"}
          </span>
          <input
            name="date"
            type="date"
            min={minimumDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            className="input-field"
          />
        </label>
      </div>
      <div className="form-actions">
        <Button type="submit" className="w-full sm:w-auto">
          {submitLabel ??
            (isFarmer ? "Publish produce listing" : "Post buyer demand")}
          <ArrowRight size={14} />
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}
      </div>
      <p className="text-[10px] leading-5 text-[#8a948b]">
        No verified market-price data is available. Enter a price based on
        information you trust.
      </p>
    </form>
  );
}

function FarmerProduce({
  state,
  id,
  name,
  add,
  update,
  close,
}: {
  state: PlatformState;
  id: string;
  name: string;
  add: ReturnType<typeof usePlatform>["addProduce"];
  update: ReturnType<typeof usePlatform>["updateProduce"];
  close: ReturnType<typeof usePlatform>["closeProduce"];
}) {
  const items = state.produce.filter((item) => item.farmerId === id);
  const [editing, setEditing] = useState<PlatformState["produce"][number] | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const produce = String(form.get("produce"));
    const quantityKg = Number(form.get("quantity"));
    const askingPricePerKg = Number(form.get("price"));
    try {
      await add({
        farmerId: id,
        farmerName: name,
        produce,
        quantityKg,
        askingPricePerKg,
        location: String(form.get("location")),
        availableBy: String(form.get("date")),
      });
      toast.success(`${quantityKg} kg ${produce} listed`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish the listing.");
    }
  };
  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    try {
      await update(editing.id, {
        produce: String(form.get("produce")),
        quantityKg: Number(form.get("quantity")),
        askingPricePerKg: Number(form.get("price")),
        location: String(form.get("location")),
        availableBy: String(form.get("date")),
      });
      setEditing(null);
      toast.success("Listing updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the listing.");
    }
  };
  const closeItem = async (item: PlatformState["produce"][number]) => {
    if (!window.confirm(`Close the ${item.produce} listing?`)) return;
    try {
      await close(item.id);
      toast.success("Listing closed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not close the listing.");
    }
  };
  return (
    <>
      <Heading
        eyebrow="Farmer workspace"
        title="Your produce"
        subtitle="Show nearby buyers what you have available and the price that works for you."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <Section eyebrow="New listing" title="Add available produce">
          <ListingForm role="farmer" onSubmit={submit} />
        </Section>
        <Section
          eyebrow="Your supply"
          title="Current listings"
          action={
            <span className="tag tag-green">{items.length} listings</span>
          }
        >
          {editing && (
            <div className="mb-5 rounded-md border border-[#e3e8e0] p-4">
              <p className="mb-3 text-xs font-semibold">Edit {editing.produce} listing</p>
              <ListingForm
                key={editing.id}
                role="farmer"
                initial={editing}
                submitLabel="Save changes"
                onCancel={() => setEditing(null)}
                onSubmit={saveEdit}
              />
            </div>
          )}
          <ListingTable
            items={items}
            onEdit={setEditing}
            onClose={(item) => void closeItem(item)}
          />
        </Section>
      </div>
    </>
  );
}

function BuyerDemand({
  state,
  id,
  name,
  post,
  update,
  close,
}: {
  state: PlatformState;
  id: string;
  name: string;
  post: ReturnType<typeof usePlatform>["postDemand"];
  update: ReturnType<typeof usePlatform>["updateDemand"];
  close: ReturnType<typeof usePlatform>["closeDemand"];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PlatformState["demands"][number] | null>(null);
  const items = state.demands.filter(
    (demand) => demand.buyerId === id && demand.status !== "matched",
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await post({
        buyerId: id,
        buyerName: name,
        buyerType: String(form.get("buyerType")) as BuyerType,
        produce: String(form.get("produce")),
        quantityKg: Number(form.get("quantity")),
        targetPricePerKg: Number(form.get("price")),
        location: String(form.get("location")),
        deliveryAddress: String(form.get("deliveryAddress")),
        requiredBy: String(form.get("date")),
      });
      toast.success("Demand posted", {
        description: "Nearby farmer matches are ready.",
      });
      router.push("/buyer/matches");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post demand.");
    }
  };
  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    try {
      await update(editing.id, {
        produce: String(form.get("produce")),
        quantityKg: Number(form.get("quantity")),
        targetPricePerKg: Number(form.get("price")),
        buyerType: String(form.get("buyerType")) as BuyerType,
        location: String(form.get("location")),
        deliveryAddress: String(form.get("deliveryAddress")),
        requiredBy: String(form.get("date")),
      });
      setEditing(null);
      toast.success("Demand updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the demand.");
    }
  };
  const closeItem = async (item: PlatformState["demands"][number]) => {
    if (!window.confirm(`Close the ${item.produce} demand?`)) return;
    try {
      await close(item.id);
      toast.success("Demand closed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not close the demand.");
    }
  };
  return (
    <>
      <Heading
        eyebrow="Buyer workspace"
        title="Post a demand"
        subtitle="Describe a bulk requirement. Nearby farmers can respond with available produce."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <Section eyebrow="Purchase request" title="What do you need?">
          {editing ? (
            <ListingForm
              key={editing.id}
              role="buyer"
              initial={editing}
              submitLabel="Save changes"
              onCancel={() => setEditing(null)}
              onSubmit={saveEdit}
            />
          ) : (
            <ListingForm role="buyer" onSubmit={submit} />
          )}
        </Section>
        <Section eyebrow="Your requests" title="Your demands">
          {items.length ? (
            <div className="divide-y divide-[#edf0eb]">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="text-xs font-semibold">
                      {item.produce} · {item.quantityKg} kg
                    </p>
                    <p className="mt-1 text-[10px] text-[#788279]">
                      {item.buyerType} · {item.location} · by{" "}
                      {dayLabel(item.requiredBy)}
                    </p>
                    <p className="mt-1 max-w-sm text-[10px] text-[#788279]">
                      Delivery address: {item.deliveryAddress || "Add an address before accepting a match"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold">
                    Up to {money(item.targetPricePerKg)}/kg
                  </span>
                  {item.status === "open" && (
                    <div className="flex gap-3 text-[10px]">
                      <button
                        className="font-semibold text-[#47744f]"
                        onClick={() => setEditing(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="font-semibold text-[#9b5441]"
                        onClick={() => void closeItem(item)}
                      >
                        Close
                      </button>
                    </div>
                  )}
                  {item.status !== "open" && (
                    <span className="tag tag-green">{item.status}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No active demand yet"
              body="Your new request will appear here once posted."
              icon={ClipboardList}
            />
          )}
        </Section>
      </div>
    </>
  );
}

function Matches({
  state,
  role,
  id,
  accept,
}: {
  state: PlatformState;
  role: "farmer" | "buyer";
  id: string;
  accept: (demandId: string, produceId: string) => Promise<void>;
}) {
  const pairs =
    role === "farmer"
      ? state.produce
          .filter((item) => item.farmerId === id && item.status === "open")
          .flatMap((item) =>
            findDemandMatches(item, state.demands).map((match) => ({
              demand: match.demand,
              produce: item,
              distance: match.distanceKm,
              quantity: match.quantityMatchedKg,
              value: match.potentialValue,
            })),
          )
      : state.demands
          .filter((item) => item.buyerId === id && item.status === "open")
          .flatMap((item) =>
            findFarmerMatches(item, state.produce).map((match) => ({
              demand: item,
              produce: match.produce,
              distance: match.distanceKm,
              quantity: match.quantityMatchedKg,
              value: match.potentialValue,
            })),
          );
  const router = useRouter();
  const [acceptingMatch, setAcceptingMatch] = useState<string | null>(null);
  return (
    <>
      <Heading
        eyebrow={`${role} workspace`}
        title={
          role === "farmer" ? "Nearby buyer demand" : "Farmers who can supply"
        }
        subtitle="Live matches based on crop, available quantity, target price and local distance."
        action={
          <Link
            href={role === "farmer" ? "/farmer/produce" : "/buyer/demand"}
            className="btn-secondary inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-xs font-semibold"
          >
            <Plus size={14} />{" "}
            {role === "farmer" ? "List produce" : "Post demand"}
          </Link>
        }
      />
      {pairs.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {pairs.map(({ demand, produce, distance, quantity, value }) => (
            <article key={`${demand.id}-${produce.id}`} className="panel p-5">
              <div className="flex justify-between gap-3">
                <div>
                  <span className="tag tag-amber">MATCH FOUND</span>
                  <h2 className="mt-3 font-serif text-[22px]">
                    {role === "farmer" ? demand.buyerName : produce.farmerName}
                  </h2>
                  <p className="mt-1 text-[11px] text-[#788279]">
                    {produce.produce} · {distance} km away
                  </p>
                </div>
                <span className="grid size-9 place-items-center rounded-full bg-[#edf3e9] text-[#508058]">
                  <Handshake size={17} />
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-[#edf0eb] py-4">
                <Info label="Available" value={`${produce.quantityKg} kg`} />
                <Info label="Buyer needs" value={`${demand.quantityKg} kg`} />
                <Info
                  label="Farmer price"
                  value={`${money(produce.askingPricePerKg)}/kg`}
                />
                <Info
                  label="Buyer target"
                  value={`${money(demand.targetPricePerKg)}/kg`}
                />
                <Info label="Required by" value={dayLabel(demand.requiredBy)} />
                <Info label="Location" value={demand.location} />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-md bg-[#f2f6ef] px-3.5 py-3">
                <div>
                  <p className="text-[10px] text-[#718071]">
                    Potential deal · {quantity} kg
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#34583a]">
                    {money(value)}
                  </p>
                </div>
                <Button
                  disabled={acceptingMatch === `${demand.id}-${produce.id}`}
                  onClick={async () => {
                    setAcceptingMatch(`${demand.id}-${produce.id}`);
                    try {
                      await accept(demand.id, produce.id);
                      toast.success("Deal confirmed", {
                        description: `${quantity} kg of ${produce.produce}`,
                      });
                      router.push(
                        role === "farmer" ? "/farmer/orders" : "/buyer/orders",
                      );
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not accept this match.");
                    } finally {
                      setAcceptingMatch(null);
                    }
                  }}
                >
                  {acceptingMatch === `${demand.id}-${produce.id}`
                    ? "Confirming…"
                    : role === "farmer"
                      ? "Accept this deal"
                      : "Accept farmer"}
                  <ArrowRight size={14} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title="No matches just yet"
            body="Open listings matching your crop, quantity and price will appear here."
            icon={Search}
            action={
              <Link
                className="font-semibold text-[#47744f]"
                href={role === "farmer" ? "/farmer/produce" : "/buyer/demand"}
              >
                Create a listing →
              </Link>
            }
          />
        </div>
      )}
    </>
  );
}

function Orders({
  state,
  role,
  id,
  update,
}: {
  state: PlatformState;
  role: "farmer" | "buyer";
  id: string;
  update: (dealId: string, status: DealStatus) => void;
}) {
  const items = state.deals.filter(
    (deal) => (role === "farmer" ? deal.farmerId : deal.buyerId) === id,
  );
  const value = items
    .filter((deal) => deal.status !== "pending")
    .reduce((sum, deal) => sum + deal.totalValue, 0);
  return (
    <>
      <Heading
        eyebrow={`${role} workspace`}
        title="Orders & deals"
        subtitle="Track your order, payment demo, and admin-managed delivery."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric
          label="Total deals"
          value={`${items.length}`}
          helper="Across your account"
          icon={Handshake}
        />
        <Metric
          label="Awaiting confirmation"
          value={`${items.filter((x) => x.status === "pending").length}`}
          helper="Review and confirm"
          icon={ClipboardList}
          warm
        />
        <Metric
          label="Confirmed deal value"
          value={money(value)}
          helper="Accepted direct agreements"
          icon={TrendingUp}
        />
      </div>
      <Section eyebrow="Direct agreements" title="All deals">
        <DealsTable items={items} role={role} update={update} />
      </Section>
      <p className="mt-4 text-[10px] text-[#8a948b]">
        Payment is a simulation only. Assigned riders update progress in their
        rider panel; there is no live GPS tracking.
      </p>
    </>
  );
}

function AdminDashboard({
  state,
  assignRider,
}: {
  state: PlatformState;
  assignRider: ReturnType<typeof usePlatform>["adminAssignRider"];
}) {
  const awaitingAssignment = state.deals.filter(
    (deal) =>
      deal.paymentStatus === "simulated_paid" &&
      (deal.deliveryStatus ?? "awaiting_assignment") === "awaiting_assignment",
  ).length;
  const deliveredCount = state.deals.filter(
    (deal) => deal.deliveryStatus === "delivered",
  ).length;
  return (
    <>
      <Heading
        eyebrow="Restricted workspace"
        title="Orders and rider assignment"
        subtitle="Review orders, confirm the delivery address, set the route distance and rider rate, then assign a registered rider. Riders update delivery progress."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Orders" value={`${state.deals.length}`} helper="All Appwrite orders" icon={ClipboardList} />
        <Metric label="Awaiting rider" value={`${awaitingAssignment}`} helper="Buyer demo payment recorded" icon={Truck} warm />
        <Metric label="Delivered" value={`${deliveredCount}`} helper="Rider marked complete" icon={Package} />
        <Metric
          label="Estimated commission"
          value={money(state.metrics.estimatedCommissionTotal)}
          helper={`${PLATFORM_COMMISSION_RATE * 100}% per accepted deal · estimate only`}
          icon={TrendingUp}
        />
      </div>
      <AdminOrders deals={state.deals} />
      <AdminDeliveryQueue
        deals={state.deals}
        riders={state.riders}
        assignRider={assignRider}
      />
    </>
  );
}

function AdminOrders({ deals }: { deals: Deal[] }) {
  return (
    <Section eyebrow="Order review" title="All orders">
      {deals.length ? (
        <div role="region" aria-label="All orders" tabIndex={0} className="table-scroll">
          <table className="w-full min-w-[820px] text-left">
            <thead className="table-head">
              <tr>
                {["Order", "Farmer", "Buyer", "Delivery address", "Order value", "Rider fee", "Delivery"].map((item) => (
                  <th key={item} className="px-4 py-3 font-semibold">{item}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="table-row text-xs">
                  <td className="px-4 py-3.5 font-semibold">
                    {deal.produce} · {deal.quantityKg} kg
                    <span className="mt-1 block text-[10px] font-normal text-[#859087]">
                      {money(deal.agreedPricePerKg)}/kg
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {deal.farmerName}
                    <span className="mt-1 block text-[10px] text-[#859087]">{deal.farmerLocation || "Farm location unavailable"}</span>
                  </td>
                  <td className="px-4 py-3.5">{deal.buyerName}</td>
                  <td className="max-w-[240px] px-4 py-3.5 whitespace-normal">
                    {deal.deliveryAddress || "Address not available"}
                  </td>
                  <td className="px-4 py-3.5">{money(deal.totalValue)}</td>
                  <td className="px-4 py-3.5">{deal.riderFee == null ? "—" : money(deal.riderFee)}</td>
                  <td className="px-4 py-3.5">
                    {deal.deliveryStatus === "delivered"
                      ? "Delivered"
                      : deal.riderName
                        ? `${deal.riderName} · ${deal.deliveryStatus === "at_farmer" ? "At farm" : "Assigned"}`
                        : deal.paymentStatus === "simulated_paid"
                          ? "Awaiting rider"
                          : "Awaiting buyer payment"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No orders yet" body="Accepted buyer-farmer matches will appear here." icon={Handshake} />
      )}
    </Section>
  );
}

function AdminDeliveryQueue({
  deals,
  riders,
  assignRider,
}: {
  deals: Deal[];
  riders: PlatformState["riders"];
  assignRider: ReturnType<typeof usePlatform>["adminAssignRider"];
}) {
  const paidDeals = deals.filter(
    (deal) =>
      deal.paymentStatus === "simulated_paid" &&
      deal.deliveryStatus === "awaiting_assignment",
  );
  return (
    <div className="mt-5">
      <Section
        eyebrow="Admin-managed deliveries"
        title="Assign a rider"
      >
        {paidDeals.length ? (
          <div className="space-y-4">
            {paidDeals.map((deal) => (
              <AdminDeliveryCard
                key={deal.id}
                deal={deal}
                riders={riders}
                assignRider={assignRider}
              />
            ))}
          </div>
        ) : (
          <Empty
            icon={Package}
            title="No paid orders waiting for delivery"
            body="Orders with a recorded buyer demo payment will appear here for rider assignment."
          />
        )}
      </Section>
    </div>
  );
}

function AdminDeliveryCard({
  deal,
  riders,
  assignRider,
}: {
  deal: Deal;
  riders: PlatformState["riders"];
  assignRider: ReturnType<typeof usePlatform>["adminAssignRider"];
}) {
  const [riderId, setRiderId] = useState("");
  const [distance, setDistance] = useState("");
  const [ratePerKm, setRatePerKm] = useState("");
  const [busy, setBusy] = useState(false);
  const deliveryStatus = deal.deliveryStatus ?? "awaiting_assignment";
  const distanceValue = Number(distance);
  const rateValue = Number(ratePerKm);
  const feePreview =
    distanceValue > 0 && rateValue > 0
      ? calculateRiderFee(distanceValue, rateValue)
      : null;

  const submitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!riderId || distanceValue <= 0 || rateValue <= 0) {
      toast.error("Choose a rider, route distance, and per-km rate.");
      return;
    }
    setBusy(true);
    try {
      await assignRider(deal.id, riderId, distanceValue, rateValue);
      toast.success("Rider assigned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign this rider.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-md border border-[#e5e9e1] bg-[#fbfcf9] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {deal.produce} · {deal.quantityKg} kg
          </p>
          <p className="mt-1 text-xs text-[#788279]">
            Farmer: {deal.farmerName} · Buyer: {deal.buyerName}
          </p>
        </div>
        <span className="tag tag-green">Demo payment received</span>
      </div>
      <div className="mt-4">
        <DeliveryProgress deal={deal} />
      </div>
      <div className="mt-4 grid gap-3 rounded-md bg-white p-3 text-xs sm:grid-cols-2">
        <Info label="Pickup location" value={deal.farmerLocation || "Unavailable"} />
        <Info label="Buyer delivery address" value={deal.deliveryAddress || "Missing — cannot assign"} />
      </div>
      {deliveryStatus === "awaiting_assignment" ? (
        <form onSubmit={submitAssignment} className="mt-4 border-t border-[#edf0eb] pt-4">
          <p className="mb-3 text-xs leading-5 text-[#6f7b71]">
            Select a registered rider, enter the actual route distance and quoted
            rate. The rider will update progress from their own panel.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-[11px] font-medium text-[#536057]">
              Registered rider
              <select
                className="input-field mt-1"
                value={riderId}
                onChange={(event) => setRiderId(event.target.value)}
                disabled={!riders.length}
                required
              >
                <option value="" disabled>Select rider</option>
                {riders.map((rider) => (
                  <option key={rider.id} value={rider.id}>
                    {rider.name} · {rider.location}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-medium text-[#536057]">
              Route distance (km)
              <input
                className="input-field mt-1"
                type="number"
                min="0.1"
                max="5000"
                step="0.1"
                value={distance}
                onChange={(event) => setDistance(event.target.value)}
                required
              />
            </label>
            <label className="text-[11px] font-medium text-[#536057]">
              Rider rate (₹/km)
              <input
                className="input-field mt-1"
                type="number"
                min="0.1"
                max="100000"
                step="0.01"
                value={ratePerKm}
                onChange={(event) => setRatePerKm(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[#315b3d]">
              Calculated rider fee: {feePreview === null ? "Enter distance and rate" : money(feePreview)}
            </p>
            <Button
              type="submit"
              disabled={
                busy ||
                !riders.length ||
                !deal.deliveryAddress?.trim()
              }
              aria-busy={busy}
            >
              {busy ? "Assigning…" : "Assign rider"}
            </Button>
          </div>
          {!riders.length && (
            <p className="mt-3 text-xs text-[#9b5441]">
              No active rider accounts yet. Ask the rider to create a Rider account first.
            </p>
          )}
        </form>
      ) : (
        <div className="mt-4 grid gap-3 rounded-md bg-white p-3 text-xs sm:grid-cols-3">
          <Info label="Assigned rider" value={deal.riderName || "Unavailable"} />
          <Info label="Route distance" value={deal.distanceKm == null ? "Unavailable" : `${deal.distanceKm} km`} />
          <Info label="Rider fee" value={deal.riderFee == null ? "Unavailable" : money(deal.riderFee)} />
        </div>
      )}
    </article>
  );
}

function RiderDashboard({
  deals,
  updateDeliveryStatus,
}: {
  deals: Deal[];
  updateDeliveryStatus: ReturnType<typeof usePlatform>["riderUpdateDeliveryStatus"];
}) {
  const activeDeals = deals.filter((deal) => deal.deliveryStatus !== "delivered");
  return (
    <>
      <Heading
        eyebrow="Rider workspace"
        title="My deliveries"
        subtitle="Open an assigned delivery, check pickup and drop-off details, then update each step when it happens."
      />
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Metric label="Active deliveries" value={`${activeDeals.length}`} helper="Assigned to your account" icon={Truck} />
        <Metric label="Delivered" value={`${deals.length - activeDeals.length}`} helper="Completed deliveries" icon={Package} />
      </div>
      <Section eyebrow="Assigned to you" title="Delivery tasks">
        {deals.length ? (
          <div className="space-y-4">
            {deals.map((deal) => (
              <RiderDeliveryCard
                key={deal.id}
                deal={deal}
                updateDeliveryStatus={updateDeliveryStatus}
              />
            ))}
          </div>
        ) : (
          <Empty
            icon={Package}
            title="No deliveries assigned"
            body="Orders assigned by the KhetLink admin will appear here."
          />
        )}
      </Section>
    </>
  );
}

function RiderDeliveryCard({
  deal,
  updateDeliveryStatus,
}: {
  deal: Deal;
  updateDeliveryStatus: ReturnType<typeof usePlatform>["riderUpdateDeliveryStatus"];
}) {
  const [busy, setBusy] = useState(false);
  const nextStatus =
    deal.deliveryStatus === "rider_assigned"
      ? "at_farmer"
      : deal.deliveryStatus === "at_farmer"
        ? "delivered"
        : null;
  const advance = async () => {
    if (!nextStatus) return;
    setBusy(true);
    try {
      await updateDeliveryStatus(deal.id, nextStatus);
      toast.success(
        nextStatus === "at_farmer"
          ? "Pickup arrival recorded"
          : "Delivery marked complete",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update delivery.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-md border border-[#e5e9e1] bg-[#fbfcf9] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{deal.produce} · {deal.quantityKg} kg</p>
          <p className="mt-1 text-xs text-[#788279]">
            Order for {deal.buyerName} · {money(deal.totalValue)}
          </p>
        </div>
        <span className="tag tag-green">
          {deal.riderFee == null ? "Rider fee unavailable" : `${money(deal.riderFee)} rider fee`}
        </span>
      </div>
      <div className="mt-4">
        <DeliveryProgress deal={deal} />
      </div>
      <div className="mt-4 grid gap-3 rounded-md bg-white p-3 text-xs sm:grid-cols-2">
        <Info label="Pickup from farmer" value={`${deal.farmerName} · ${deal.farmerLocation || "Location unavailable"}`} />
        <Info label="Deliver to buyer" value={`${deal.buyerName} · ${deal.deliveryAddress || "Address unavailable"}`} />
        <Info label="Route distance" value={deal.distanceKm == null ? "Unavailable" : `${deal.distanceKm} km`} />
        <Info label="Rate" value={deal.riderRatePerKm == null ? "Unavailable" : `${money(deal.riderRatePerKm)}/km`} />
      </div>
      {nextStatus ? (
        <Button className="mt-4" disabled={busy} onClick={() => void advance()}>
          {busy
            ? "Saving…"
            : nextStatus === "at_farmer"
              ? "I reached the farmer"
              : "I delivered to the buyer"}
        </Button>
      ) : (
        <p className="mt-4 text-xs font-semibold text-[#315b3d]">Delivery complete</p>
      )}
    </article>
  );
}

function Earnings({
  state,
  id,
  update,
}: {
  state: PlatformState;
  id: string;
  update: ReturnType<typeof usePlatform>["updateDealStatus"];
}) {
  const deals = state.deals.filter(
    (deal) => deal.farmerId === id,
  );
  const completedDeals = deals.filter((deal) => deal.status === "completed");
  const earned = completedDeals.reduce((sum, deal) => sum + deal.totalValue, 0);
  const completedVolume = completedDeals.reduce(
    (sum, deal) => sum + deal.quantityKg,
    0,
  );
  const averagePrice = completedDeals.length
    ? `${money(
        Math.round(
          completedDeals.reduce(
            (sum, deal) => sum + deal.agreedPricePerKg,
            0,
          ) / completedDeals.length,
        ),
      )}/kg`
    : "Not available";
  return (
    <>
      <Heading
        eyebrow="Farmer workspace"
        title="Earnings overview"
        subtitle="Earnings include completed orders only."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Completed earnings"
          value={money(earned)}
          helper="From completed orders"
          icon={TrendingUp}
        />
        <Metric
          label="Completed orders"
          value={`${completedDeals.length}`}
          helper="Your completed orders"
          icon={Handshake}
        />
        <Metric
          label="Produce traded"
          value={`${completedVolume} kg`}
          helper="Volume from completed orders"
          icon={Package}
        />
        <Metric
          label="Average completed price"
          value={averagePrice}
          helper={
            completedDeals.length
              ? "Based on completed orders"
              : "No completed orders yet"
          }
          icon={BarChart3}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section
          eyebrow="Market information"
          title="Price history unavailable"
        >
          <p className="text-sm leading-6 text-[#768078]">
            No verified mandi price feed or historical market-price records are
            connected to KhetLink.
          </p>
        </Section>
        <Section eyebrow="Your records" title="Order activity">
          <p className="text-sm leading-6 text-[#768078]">
            {completedDeals.length
              ? `${completedDeals.length} completed ${
                  completedDeals.length === 1 ? "order" : "orders"
                } are included in these earnings.`
              : "No completed orders found."}
          </p>
        </Section>
      </div>
      <div className="mt-5">
        <Section eyebrow="Your trade" title="Orders">
          <DealsTable items={deals} role="farmer" update={update} />
        </Section>
      </div>
    </>
  );
}

function Marketplace({ state }: { state: PlatformState }) {
  const [tab, setTab] = useState<"demand" | "supply">("demand");
  const [crop, setCrop] = useState("All crops");
  const [search, setSearch] = useState("");
  const demands = state.demands.filter(
    (x) =>
      x.status === "open" &&
      (crop === "All crops" || crop === x.produce) &&
      `${x.produce} ${x.buyerName} ${x.location}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const produce = state.produce.filter(
    (x) =>
      x.status === "open" &&
      (crop === "All crops" || crop === x.produce) &&
      `${x.produce} ${x.farmerName} ${x.location}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="Local discovery · NCR"
        title="Trade starts close by."
        subtitle="Find nearby bulk buyers and see what local farmers have available."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          <div className="marketplace-filters mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div
              role="group"
              aria-label="Listing type"
              className="inline-flex w-full rounded-md border border-[#e3e8e0] bg-white p-1 sm:w-auto"
            >
              {(["demand", "supply"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded px-3 py-2 text-[11px] font-semibold capitalize sm:flex-none ${tab === key ? "bg-[#315b3d] text-white" : "text-[#6f7b71]"}`}
                >
                  {key === "demand" ? "Buyer demand" : "Available produce"}
                </button>
              ))}
            </div>
            <select
              aria-label="Filter by crop"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="input-field !h-11 !w-full sm:!w-auto"
            >
              <option>All crops</option>
              {crops.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search local listings"
              placeholder="Search crop or location"
              className="input-field !h-11 min-w-0 w-full sm:flex-1 sm:max-w-[240px]"
            />
          </div>
          <div className="space-y-3">
            {tab === "demand"
              ? demands.map((item) => (
                  <article key={item.id} className="panel p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="tag tag-amber">{item.buyerType}</span>
                        <h3 className="mt-2.5 text-sm font-semibold">
                          {item.buyerName}
                        </h3>
                        <p className="mt-1 text-[11px] text-[#788279]">
                          Looking for {item.quantityKg} kg <b>{item.produce}</b>
                        </p>
                      </div>
                      <p className="shrink-0 whitespace-nowrap text-right text-xs font-semibold">
                        Up to {money(item.targetPricePerKg)}
                        <span className="mt-1 block text-[10px] font-normal text-[#7a857b]">
                          per kg
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-between gap-x-3 gap-y-2 border-t border-[#edf0eb] pt-3 text-[10px] text-[#788279]">
                      <span className="min-w-0">
                        <MapPin size={12} className="mr-1 inline" />
                        {item.location} · due {dayLabel(item.requiredBy)}
                      </span>
                      <span className="min-w-0">
                        {findFarmerMatches(item, state.produce).length} possible
                        matches
                      </span>
                    </div>
                  </article>
                ))
              : produce.map((item) => (
                  <article key={item.id} className="panel p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="tag tag-green">Available produce</span>
                        <h3 className="mt-2.5 text-sm font-semibold">
                          {item.farmerName}
                        </h3>
                        <p className="mt-1 text-[11px] text-[#788279]">
                          {item.quantityKg} kg <b>{item.produce}</b>
                        </p>
                      </div>
                      <p className="shrink-0 whitespace-nowrap text-right text-xs font-semibold">
                        {money(item.askingPricePerKg)}
                        <span className="mt-1 block text-[10px] font-normal text-[#7a857b]">
                          per kg
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-between gap-x-3 gap-y-2 border-t border-[#edf0eb] pt-3 text-[10px] text-[#788279]">
                      <span className="min-w-0">
                        <MapPin size={12} className="mr-1 inline" />
                        {item.location} · available {dayLabel(item.availableBy)}
                      </span>
                      <span className="min-w-0">
                        {findDemandMatches(item, state.demands).length} possible
                        matches
                      </span>
                    </div>
                  </article>
                ))}
            {(tab === "demand" ? demands.length : produce.length) === 0 && (
              <div className="panel">
                <Empty
                  title={
                    search || crop !== "All crops"
                      ? "No listings match these filters"
                      : "No open listings found"
                  }
                  body={
                    search || crop !== "All crops"
                      ? "Try a different crop or search term."
                      : "New Appwrite listings will appear here."
                  }
                />
              </div>
            )}
          </div>
        </section>
        <aside className="panel overflow-hidden p-3">
          <div className="flex items-center justify-between px-2 pb-3 pt-1">
            <div>
              <p className="eyebrow mb-1">Listing locations</p>
              <h2 className="text-sm font-semibold">Location overview</h2>
            </div>
            <span className="text-[10px] text-[#768078]">Names only</span>
          </div>
          <DemandMap demands={demands} produce={produce} />
          <p className="px-2 pt-3 text-[10px] leading-5 text-[#808a81]">
            No estimated map coordinates are used.
          </p>
        </aside>
      </div>
    </>
  );
}

function Transparency() {
  return (
    <>
      <Heading
        eyebrow="Market information"
        title="Price data not available yet."
        subtitle="KhetLink does not have a verified mandi or retail price feed."
      />
      <div className="panel p-6">
        <h2 className="section-title">No verified price records found</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#768078]">
          Produce asking prices and buyer target prices come from Appwrite
          listings. They are user-entered offers, not official mandi prices.
          Historical market data will appear here only after a trusted source
          is connected.
        </p>
      </div>
    </>
  );
}

function Impact({ state }: { state: PlatformState }) {
  const metrics = state.metrics;
  return (
    <>
      <Heading
        eyebrow="Platform activity"
        title="KhetLink activity from Appwrite."
        subtitle="These totals are calculated from current farmer, buyer, listing, match, and completed order records."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Metric
          label="Farmer profiles"
          value={`${metrics.farmerCount}`}
          helper={metrics.farmerCount ? "Appwrite farmer records" : "No records found"}
          icon={Sprout}
        />
        <Metric
          label="Buyer profiles"
          value={`${metrics.buyerCount}`}
          helper={metrics.buyerCount ? "Appwrite buyer records" : "No records found"}
          icon={Store}
        />
        <Metric
          label="Open produce listings"
          value={`${metrics.activeProduceCount}`}
          helper={metrics.activeProduceCount ? "Available to buyers" : "No records found"}
          icon={Package}
        />
        <Metric
          label="Open buyer demands"
          value={`${metrics.activeDemandCount}`}
          helper={metrics.activeDemandCount ? "Available to farmers" : "No records found"}
          icon={ClipboardList}
        />
        <Metric
          label="Accepted matches"
          value={`${metrics.acceptedMatchCount}`}
          helper={metrics.acceptedMatchCount ? "Stored match records" : "No records found"}
          icon={Handshake}
        />
        <Metric
          label="Completed orders"
          value={`${metrics.completedOrderCount}`}
          helper={metrics.completedOrderCount ? "Appwrite order records" : "No records found"}
          icon={Package}
        />
      </div>
      <Section eyebrow="Completed trade" title="Produce volume">
        <p className="font-serif text-[30px] text-[#315b3d]">
          {metrics.completedOrderVolumeKg.toLocaleString("en-IN")} kg
        </p>
        <p className="mt-2 text-xs leading-5 text-[#788279]">
          Total volume in completed Appwrite orders. No historical market-price
          or farmer-income estimates are shown.
        </p>
        {!metrics.completedOrderCount && (
          <p className="mt-4 text-xs font-semibold text-[#788279]">
            No completed order records found.
          </p>
        )}
      </Section>
    </>
  );
}

export default function PlatformApp({ route }: { route: string }) {
  const router = useRouter();
  const {
    state,
    isReady,
    loadError,
    syncState,
    refreshState,
    signOut,
    addProduce,
    postDemand,
    updateProduce,
    updateDemand,
    closeProduce,
    closeDemand,
    acceptMatch,
    updateDealStatus,
    simulatePayment,
    adminAssignRider,
    riderUpdateDeliveryStatus,
  } = usePlatform();
  const parts = route.split("/");
  const routeRole: UserRole =
    parts[0] === "admin"
      ? "admin"
      : parts[0] === "buyer"
        ? "buyer"
        : parts[0] === "rider"
          ? "rider"
          : "farmer";
  const name = state.user?.name ?? "Visitor";
  const userId =
    state.user?.role === routeRole
      ? state.user.id
      : "";
  const requiresRole =
    route.startsWith("farmer/") ||
    route.startsWith("buyer/") ||
    route.startsWith("rider/") ||
    route.startsWith("admin/");

  useEffect(() => {
    if (!isReady || loadError || !requiresRole) return;
    if (!state.user) {
      router.replace("/login");
    } else if (state.user.role !== routeRole) {
      router.replace(
        state.user.role === "admin"
          ? "/admin/dashboard"
          : state.user.role === "buyer"
            ? "/buyer/dashboard"
            : state.user.role === "rider"
              ? "/rider/dashboard"
              : "/farmer/dashboard",
      );
    }
  }, [isReady, loadError, requiresRole, routeRole, router, state.user]);

  const onAuth = async (
    role: UserRole,
    userName: string,
    email: string,
    register: boolean,
    location: string,
    buyerType: BuyerType | "",
  ) => {
    const remoteState = register
      ? await createPlatformProfile(role, userName, location, buyerType)
      : await loadPlatformState(true);
    if (!remoteState.user) {
      throw new Error("The KhetLink profile could not be loaded.");
    }
    syncState(remoteState);
    return remoteState.user.role;
  };
  if (!isReady) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-[#667568]">
        Loading KhetLink data…
      </main>
    );
  }
  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center p-5">
        <div className="panel max-w-lg p-8 text-center">
          <h1 className="page-title text-[26px]">KhetLink data is unavailable</h1>
          <p className="mt-3 text-sm text-[#778178]">{loadError}</p>
          <p className="mt-3 text-xs leading-5 text-[#778178]">
            Check the Appwrite endpoint, project, database, collection IDs, and
            server API key configuration. No demo data is being shown.
          </p>
          <Button
            className="mt-5"
            onClick={() => {
              void refreshState().catch(() => undefined);
            }}
          >
            Try again
          </Button>
        </div>
      </main>
    );
  }
  if (!route) return <Home />;
  if (route === "login" || route === "register")
    return <Auth register={route === "register"} onAuth={onAuth} />;
  if (
    requiresRole &&
    (!state.user || state.user.role !== routeRole)
  ) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-[#667568]">
        Opening your KhetLink workspace…
      </main>
    );
  }
  if (route === "marketplace")
    return (
      <Workspace route={route} role={routeRole} name={name} signOut={signOut}>
        <Marketplace state={state} />
      </Workspace>
    );
  if (route === "price-transparency")
    return (
      <Workspace route={route} role={routeRole} name={name} signOut={signOut}>
        <Transparency />
      </Workspace>
    );
  if (route === "impact")
    return (
      <Workspace
        route={route}
        role="admin"
        name={name}
        signOut={signOut}
      >
        <Impact state={state} />
      </Workspace>
    );
  if (route === "farmer/dashboard")
    return (
      <Workspace
        route={route}
        role="farmer"
        name={name}
        signOut={signOut}
      >
        <FarmerDashboard state={state} userId={userId} />
      </Workspace>
    );
  if (route === "buyer/dashboard")
    return (
      <Workspace
        route={route}
        role="buyer"
        name={name}
        signOut={signOut}
      >
        <BuyerDashboard
          state={state}
          userId={userId}
          update={updateDealStatus}
        />
      </Workspace>
    );
  if (route === "farmer/produce")
    return (
      <Workspace
        route={route}
        role="farmer"
        name={name}
        signOut={signOut}
      >
        <FarmerProduce
          state={state}
          id={userId}
          name={state.user?.name ?? ""}
          add={addProduce}
          update={updateProduce}
          close={closeProduce}
        />
      </Workspace>
    );
  if (route === "buyer/demand")
    return (
      <Workspace
        route={route}
        role="buyer"
        name={name}
        signOut={signOut}
      >
        <BuyerDemand
          state={state}
          id={userId}
          name={state.user?.name ?? ""}
          post={postDemand}
          update={updateDemand}
          close={closeDemand}
        />
      </Workspace>
    );
  if (route === "farmer/demand" || route === "farmer/matches")
    return (
      <Workspace
        route={route}
        role="farmer"
        name={name}
        signOut={signOut}
      >
        <Matches state={state} role="farmer" id={userId} accept={acceptMatch} />
      </Workspace>
    );
  if (route === "buyer/matches")
    return (
      <Workspace
        route={route}
        role="buyer"
        name={name}
        signOut={signOut}
      >
        <Matches state={state} role="buyer" id={userId} accept={acceptMatch} />
      </Workspace>
    );
  if (parts[0] === "buyer" && parts[1] === "payment" && parts[2]) {
    const deal = state.deals.find(
      (item) => item.id === parts[2] && item.buyerId === userId,
    );
    return (
      <Workspace
        route={route}
        role="buyer"
        name={name}
        signOut={signOut}
      >
        <DemoPayment deal={deal} pay={simulatePayment} />
      </Workspace>
    );
  }
  if (route === "farmer/orders" || route === "buyer/orders")
    return (
      <Workspace route={route} role={routeRole} name={name} signOut={signOut}>
        <Orders
          state={state}
          role={route.startsWith("buyer/") ? "buyer" : "farmer"}
          id={userId}
          update={updateDealStatus}
        />
      </Workspace>
    );
  if (route === "farmer/earnings")
    return (
      <Workspace
        route={route}
        role="farmer"
        name={name}
        signOut={signOut}
      >
        <Earnings state={state} id={userId} update={updateDealStatus} />
      </Workspace>
    );
  if (route === "admin/dashboard")
    return (
      <Workspace
        route={route}
        role="admin"
        name={name}
        signOut={signOut}
      >
        <AdminDashboard
          state={state}
          assignRider={adminAssignRider}
        />
      </Workspace>
    );
  if (route === "rider/dashboard")
    return (
      <Workspace
        route={route}
        role="rider"
        name={name}
        signOut={signOut}
      >
        <RiderDashboard
          deals={state.deals}
          updateDeliveryStatus={riderUpdateDeliveryStatus}
        />
      </Workspace>
    );
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="panel p-8 text-center">
        <Leaf className="mx-auto text-[#56835c]" />
        <h1 className="page-title mt-4 text-[28px]">
          This page is not on the map.
        </h1>
        <p className="mt-2 text-sm text-[#778178]">
          We could not find that KhetLink page.
        </p>
        <Link
          href="/"
          className="btn-primary mt-5 inline-flex min-h-10 items-center rounded-md px-4 text-xs font-semibold"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

function BuyerDashboard({
  state,
  userId,
  update,
}: {
  state: PlatformState;
  userId: string;
  update: ReturnType<typeof usePlatform>["updateDealStatus"];
}) {
  const demands = state.demands.filter(
    (item) => item.buyerId === userId && item.status === "open" && item.quantityKg > 0,
  );
  const deals = state.deals.filter((item) => item.buyerId === userId);
  const completedDeals = deals.filter((item) => item.status === "completed");
  const matches = demands.reduce(
    (sum, item) => sum + findFarmerMatches(item, state.produce).length,
    0,
  );
  const purchases = completedDeals
    .reduce((sum, item) => sum + item.totalValue, 0);
  const average = completedDeals.length
    ? money(
        Math.round(
          completedDeals.reduce(
            (sum, item) => sum + item.agreedPricePerKg,
            0,
          ) / completedDeals.length,
        ),
      )
    : null;
  return (
    <>
      <Heading
        eyebrow={`Buyer workspace · ${state.user?.location ?? "Location unavailable"}`}
        title="Good sourcing starts here."
        subtitle="Your open requests are visible to nearby growers."
        action={
          <Link
            href="/buyer/demand"
            className="btn-primary inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-xs font-semibold"
          >
            <Plus size={14} />
            Post new demand
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Active demands"
          value={`${demands.filter((item) => item.status === "open").length}`}
          helper="Open purchase requests"
          icon={ClipboardList}
        />
        <Metric
          label="Matching farmers"
          value={`${matches}`}
          helper="Across open demands"
          icon={Users}
        />
        <Metric
          label="Pending deals"
          value={`${deals.filter((item) => item.status === "pending").length}`}
          helper="Awaiting confirmation"
          icon={Handshake}
          warm
        />
        <Metric
          label="Completed purchases"
          value={money(purchases)}
          helper="From completed orders"
          icon={TrendingUp}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Section
          eyebrow="Demand board"
          title="Your active requests"
          action={
            <Link
              href="/buyer/demand"
              className="text-[11px] font-semibold text-[#507b55]"
            >
              Manage demands
            </Link>
          }
        >
          {demands.length ? (
            <div className="divide-y divide-[#edf0eb]">
              {demands.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="text-xs font-semibold">
                      {item.produce} · {item.quantityKg} kg
                    </p>
                    <p className="mt-1 text-[10px] text-[#788279]">
                      {item.location} · needed by {dayLabel(item.requiredBy)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold">
                      Up to {money(item.targetPricePerKg)}/kg
                    </span>
                    <Link
                      href="/buyer/matches"
                      className="text-[10px] font-semibold text-[#4e7853]"
                    >
                      {findFarmerMatches(item, state.produce).length} matches →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No demands posted"
              body="Post your first bulk requirement to find local growers."
              icon={ClipboardList}
              action={
                <Link
                  className="font-semibold text-[#47744f]"
                  href="/buyer/demand"
                >
                  Post a demand →
                </Link>
              }
            />
          )}
        </Section>
        <Section eyebrow="Your completed orders" title="Average price paid">
          {average ? (
            <>
              <p className="font-serif text-[34px] text-[#315b3d]">
                {average}
                <span className="ml-1 text-xs text-[#788279]">per kg</span>
              </p>
              <p className="mt-2 text-[11px] leading-5 text-[#7a857b]">
                Calculated from your completed Appwrite orders. This is not a
                market-price estimate.
              </p>
            </>
          ) : (
            <p className="text-sm leading-6 text-[#768078]">
              No completed orders found. Verified market-price data is not
              available yet.
            </p>
          )}
          <Link
            href="/price-transparency"
            className="mt-4 inline-flex text-[11px] font-semibold text-[#507b55]"
          >
            View price data status →
          </Link>
        </Section>
      </div>
      <div className="mt-5">
        <Section eyebrow="Direct agreements" title="Recent orders">
          <DealsTable
            items={deals.slice(0, 4)}
            role="buyer"
            update={update}
          />
        </Section>
      </div>
    </>
  );
}
