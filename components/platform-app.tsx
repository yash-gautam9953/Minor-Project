"use client";

import dynamic from "next/dynamic";
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
  Handshake,
  Leaf,
  LogIn,
  MapPin,
  Package,
  Plus,
  Search,
  Sprout,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  appwriteConfigured,
  createAppwriteAccount,
  createAppwriteSession,
} from "@/lib/appwrite";
import { Button as UiButton } from "@/components/ui/button";
import { usePlatform } from "@/services/platform-store";
import {
  crops,
  demandTrend,
  locations,
  priceHistory,
} from "@/services/mock-data";
import { findDemandMatches, findFarmerMatches } from "@/services/matching";
import { recommendPrice } from "@/services/price-recommendation";
import type { BuyerType, DealStatus, PlatformState, UserRole } from "@/types";

const DemandMap = dynamic(() => import("@/components/demand-map"), {
  ssr: false,
  loading: () => (
    <div className="hero-grain grid h-[300px] place-items-center rounded-md text-sm text-[#667568]">
      Loading local map…
    </div>
  ),
});
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
        <span className="ml-1 text-[9px] font-medium opacity-60">
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
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="page-title text-[34px] sm:text-[39px]">{title}</h1>
        <p className="mt-2 max-w-[650px] text-xs leading-5 text-[#778178]">
          {subtitle}
        </p>
      </div>
      {action}
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
const commonNav = [
  ["Local discovery", "/marketplace", MapPin],
  ["Price transparency", "/price-transparency", BarChart3],
  ["Platform impact", "/impact", TrendingUp],
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
  signOut: () => void;
  children: ReactNode;
}) {
  const links = role === "buyer" ? buyerNav : farmerNav;
  const sideLink = ([label, href, Icon]: readonly [
    string,
    string,
    typeof Sprout,
  ]) => (
    <Link
      key={href}
      href={href}
      className={`side-link ${route === href.slice(1) ? "active" : ""}`}
    >
      <Icon size={17} />
      <span>{label}</span>
    </Link>
  );
  return (
    <div className="platform-shell flex">
      <aside className="sidebar">
        <div className="mb-9 px-1">
          <Brand />
        </div>
        <p className="side-section !pt-0">Workspace</p>
        <nav className="space-y-1">{links.map(sideLink)}</nav>
        <p className="side-section">Explore</p>
        <nav className="space-y-1">{commonNav.map(sideLink)}</nav>
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
              onClick={signOut}
              className="text-[#aebeac]"
            >
              <LogIn size={15} />
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
        <nav className="mobile-nav hidden">
          {[...links.slice(0, 4), ...commonNav.slice(0, 2)].map(
            ([label, href]) => (
              <Link
                key={href}
                href={href}
                className={route === href.slice(1) ? "active" : ""}
              >
                {label}
              </Link>
            ),
          )}
        </nav>
        <main className="page-wrap fade-up">{children}</main>
      </div>
    </div>
  );
}

function Home() {
  return (
    <main className="min-h-screen bg-[#f8f9f4]">
      <header className="flex h-[74px] items-center justify-between border-b border-[#e5e9e1] px-6 md:px-12">
        <Brand dark />
        <nav className="hidden gap-8 text-xs text-[#536057] md:flex">
          <Link href="/marketplace">Explore local trade</Link>
          <Link href="/price-transparency">Price transparency</Link>
          <Link href="/impact">Our impact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden px-3 py-2 text-xs font-semibold sm:block"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="btn-dark inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-xs font-semibold"
          >
            Join the network <ArrowRight size={14} />
          </Link>
        </div>
      </header>
      <section className="mx-auto grid w-full max-w-[1280px] items-center gap-10 px-6 pb-14 pt-12 md:grid-cols-[.92fr_1.08fr] md:px-12 md:pb-20 md:pt-[72px]">
        <div className="fade-up">
          <p className="eyebrow mb-5">A fairer way to trade local produce</p>
          <h1 className="page-title max-w-[570px] text-[48px] sm:text-[58px]">
            Good produce.
            <br />
            <span className="text-[#56835c]">Better deals.</span>
            <br />
            Closer to home.
          </h1>
          <p className="mt-6 max-w-[460px] text-[15px] leading-7 text-[#6d786f]">
            We connect nearby farmers directly with restaurants, retailers and
            local businesses. Clear prices, less waste, stronger farm earnings.
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
          <div className="mt-11 flex items-center gap-7 border-t border-[#e3e8de] pt-5">
            <div>
              <p className="font-serif text-[23px] text-[#244830]">₹0</p>
              <p className="mt-1 text-[10px] text-[#7a857b]">
                commission on demo deals
              </p>
            </div>
            <div className="h-9 w-px bg-[#dfe5dc]" />
            <div>
              <p className="font-serif text-[23px] text-[#244830]">Local</p>
              <p className="mt-1 text-[10px] text-[#7a857b]">
                demand, matched nearby
              </p>
            </div>
            <Link
              href="/login"
              className="ml-auto hidden text-[11px] font-semibold text-[#507b55] underline underline-offset-4 sm:block"
            >
              Try the live demo
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="relative h-[340px] overflow-hidden rounded-lg bg-[#d7dfcf] sm:h-[435px]">
            <Image
              src="https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=1400&q=85"
              alt="Freshly harvested tomatoes ready for local trade"
              fill
              unoptimized
              sizes="(min-width: 768px) 55vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e3527]/60 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-white">
              <div>
                <p className="text-[10px] uppercase tracking-[.14em] text-white/75">
                  A real local match
                </p>
                <p className="mt-1 font-serif text-[23px]">
                  Greater Noida, today
                </p>
              </div>
              <span className="rounded-md bg-white/15 px-3 py-2 text-[11px] backdrop-blur">
                Tomatoes · ₹25/kg
              </span>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 hidden max-w-[245px] rounded-md border border-[#e0e7dc] bg-white p-4 shadow-lg sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-[.09em] text-[#6d786f]">
              Demand nearby
            </p>
            <p className="mt-2 text-[13px] font-semibold">
              Green Table Kitchen
            </p>
            <p className="mt-1 text-[11px] text-[#788279]">
              300 kg tomatoes · pays up to ₹29/kg
            </p>
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
              "Prices in the open",
              "Compare farm, market and retail estimates side by side.",
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
        <span>All example prices and listings are demo data.</span>
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
  onAuth: (role: UserRole, name: string, email: string) => void;
}) {
  const [role, setRole] = useState<UserRole>("farmer");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const destination = (nextRole: UserRole) =>
    nextRole === "buyer"
      ? "/buyer/dashboard"
      : nextRole === "admin"
        ? "/impact"
        : "/farmer/dashboard";
  const demo = (nextRole: UserRole) => {
    const name =
      nextRole === "farmer"
        ? "Ravi Kumar"
        : nextRole === "buyer"
          ? "Green Table Kitchen"
          : "Platform Admin";
    onAuth(nextRole, name, `${nextRole}@demo.kisanconnect.in`);
    router.push(destination(nextRole));
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const name = String(
      form.get("name") ||
        (role === "farmer" ? "Ravi Kumar" : "Green Table Kitchen"),
    );
    setBusy(true);
    try {
      if (appwriteConfigured) {
        if (register) await createAppwriteAccount(name, email, password);
        else await createAppwriteSession(email, password);
      }
      onAuth(role, name, email);
      toast.success(
        register ? "Account created" : `Welcome, ${name.split(" ")[0]}`,
      );
      router.push(destination(role));
    } catch {
      toast.error(
        "Could not authenticate. Check your details or use a demo account.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[.92fr_1.08fr]">
      <section className="hero-grain hidden min-h-screen flex-col justify-between p-10 lg:flex">
        <Brand dark />
        <div className="max-w-[530px]">
          <p className="eyebrow mb-4">A better market starts nearby</p>
          <h1 className="page-title text-[46px]">
            Make the next
            <br />
            good deal <span className="text-[#56835c]">local.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-[#647165]">
            A working demo connecting farms with the local kitchens and shops
            that need them.
          </p>
        </div>
        <p className="text-[10px] text-[#6d786f]">
          Example listings and prices · NCR demo region
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
              ? "Create an account to start trading directly."
              : "Access your produce, matches and active deals."}
          </p>
          <div className="mt-7 grid grid-cols-3 rounded-md border border-[#e3e8e0] bg-[#f7f8f4] p-1">
            {(["farmer", "buyer", "admin"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                className={`rounded py-2 text-xs font-semibold capitalize ${role === item ? "bg-white text-[#315b3d] shadow-sm" : "text-[#778178]"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-5 space-y-4">
            {register && (
              <label>
                <span className="field-label">
                  {role === "farmer" ? "Your name" : "Business name"}
                </span>
                <input
                  className="input-field"
                  name="name"
                  placeholder={
                    role === "farmer"
                      ? "e.g. Ravi Kumar"
                      : "e.g. Green Table Kitchen"
                  }
                  required
                />
              </label>
            )}
            <label>
              <span className="field-label">Email address</span>
              <input
                className="input-field"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              <span className="field-label">Password</span>
              <input
                className="input-field"
                name="password"
                type="password"
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
            </label>
            <Button disabled={busy} className="w-full">
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
              <ArrowRight size={14} />
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-[10px] text-[#9aa39a]">
            <span className="h-px flex-1 bg-[#e5e9e1]" />
            Or explore the demo
            <span className="h-px flex-1 bg-[#e5e9e1]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["farmer", "buyer", "admin"] as const).map((item) => (
              <button
                key={item}
                onClick={() => demo(item)}
                className="rounded-md border border-[#dfe5dc] px-2 py-2.5 text-[10px] font-semibold capitalize text-[#536057]"
              >
                Try {item}
              </button>
            ))}
          </div>
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
            {appwriteConfigured
              ? "Secure Appwrite authentication enabled"
              : "Demo mode · data stays in this browser"}
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

function ListingTable({ items }: { items: PlatformState["produce"] }) {
  if (!items.length)
    return (
      <Empty
        icon={Package}
        title="No produce listed yet"
        body="Add what you have available so nearby buyers can find you."
      />
    );
  return (
    <div className="table-scroll">
      <table className="w-full min-w-[560px] text-left">
        <thead className="table-head">
          <tr>
            {[
              "Produce",
              "Available",
              "Your price",
              "Available by",
              "Status",
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
  update: (id: string, status: DealStatus) => void;
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
    <div className="table-scroll">
      <table className="w-full min-w-[650px] text-left">
        <thead className="table-head">
          <tr>
            {[
              "Produce",
              role === "buyer" ? "Farmer" : "Buyer",
              "Quantity",
              "Agreed price",
              "Value",
              "Status",
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
                {deal.status === "pending" ? (
                  <button
                    onClick={() => {
                      update(deal.id, "confirmed");
                      toast.success("Deal confirmed");
                    }}
                    className="text-[10px] font-semibold text-[#47744f]"
                  >
                    Confirm
                  </button>
                ) : deal.status === "confirmed" ? (
                  <button
                    onClick={() => {
                      update(deal.id, "completed");
                      toast.success("Deal marked complete");
                    }}
                    className="text-[10px] font-semibold text-[#47744f]"
                  >
                    Complete
                  </button>
                ) : (
                  <Check size={14} className="text-[#58825b]" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    .filter((item) => item.status !== "pending")
    .reduce((sum, item) => sum + item.totalValue, 0);
  const matchingDemands = state.demands.filter((demand) =>
    demand.status === "open" &&
    mine.some((item) => findDemandMatches(item, [demand]).length > 0),
  );
  return (
    <>
      <Heading
        eyebrow="Farmer workspace · Greater Noida"
        title="Your farm, in good company."
        subtitle="Tuesday, 30 September 2026 · Local demand is picking up this week."
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
          label="Confirmed earnings"
          value={money(earnings)}
          helper="From accepted direct deals"
          icon={TrendingUp}
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
        <Section
          eyebrow="Farm-gate price · Tomato"
          title="A clearer view of your price"
          action={<span className="tag tag-green">Demo estimate</span>}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] text-[#748076]">
                Suggested asking price
              </p>
              <p className="mt-1 font-serif text-[37px] leading-none text-[#315b3d]">
                ₹27<span className="ml-1 text-xs text-[#788279]">/ kg</span>
              </p>
            </div>
            <p className="text-xs font-semibold">
              ₹23 – ₹31 / kg{" "}
              <span className="block mt-1 text-[10px] font-normal text-[#849087]">
                Reasonable range
              </span>
            </p>
            <Link
              href="/price-transparency"
              className="text-[11px] font-semibold text-[#507b55]"
            >
              See price breakdown →
            </Link>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[#768078]">
            Nearby buyer demand is high and the asking price is below the local
            reference. This is an explainable demo estimate, not a live quote.
          </p>
          <div className="mt-5 h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory}>
                <CartesianGrid stroke="#edf0eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#89938a", fontSize: 9 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#89938a", fontSize: 9 }}
                />
                <Tooltip />
                <Line
                  dataKey="farmer"
                  stroke="#4c8057"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  dataKey="market"
                  stroke="#d7814f"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-[#788279]">
            ● Farmer reference　 ● Local market reference
          </p>
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
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
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
        <Section eyebrow="This week" title="Demand vs matched (kg)">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandTrend}>
                <CartesianGrid stroke="#edf0eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#89938a", fontSize: 9 }}
                />
                <Tooltip />
                <Bar dataKey="demand" fill="#dce8d4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="matched" fill="#58825b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
    </>
  );
}

function ListingForm({
  role,
  onSubmit,
}: {
  role: "farmer" | "buyer";
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isFarmer = role === "farmer";
  const [crop, setCrop] = useState("Tomato");
  const [quantity, setQuantity] = useState("500");
  const [price, setPrice] = useState(isFarmer ? "25" : "29");
  const [location, setLocation] = useState("Greater Noida");
  const [suggested, setSuggested] = useState(27);
  useEffect(() => {
    void recommendPrice({
      produce: crop,
      location,
      quantityKg: Number(quantity) || 1,
      askingPricePerKg: Number(price) || 1,
      referenceMarketPrice: crop === "Tomato" ? 30 : 32,
      demandQuantityKg: 800,
    }).then((result) => setSuggested(result.recommendedPrice));
  }, [crop, location, quantity, price]);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="field-label">Produce</span>
          <select
            name="produce"
            className="input-field"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
          >
            {crops.map((item) => (
              <option key={item}>{item}</option>
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
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input-field"
          >
            {locations.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        {!isFarmer && (
          <label>
            <span className="field-label">Buyer type</span>
            <select name="buyerType" className="input-field">
              {(
                ["Retailer", "Restaurant", "Hostel", "Small business"] as const
              ).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="field-label">
            {isFarmer ? "Available from" : "Required by"}
          </span>
          <input
            name="date"
            type="date"
            min="2026-09-30"
            defaultValue={isFarmer ? "2026-10-02" : "2026-10-05"}
            required
            className="input-field"
          />
        </label>
      </div>
      {isFarmer && (
        <div className="rounded-md border border-[#dce8d7] bg-[#f2f6ef] p-4">
          <p className="text-xs font-semibold text-[#395f40]">
            Suggested price{" "}
            <span className="ml-1 font-serif text-xl">
              {money(suggested)}/kg
            </span>
          </p>
          <p className="mt-1.5 text-[10px] leading-5 text-[#718071]">
            Deterministic mock estimate based on asking price, quantity and
            local demand.
          </p>
        </div>
      )}
      <Button type="submit">
        {isFarmer ? "Publish produce listing" : "Post buyer demand"}
        <ArrowRight size={14} />
      </Button>
      <p className="text-[10px] leading-5 text-[#8a948b]">
        All recommendations and listings are illustrative, not guaranteed market
        quotes.
      </p>
    </form>
  );
}

function FarmerProduce({
  state,
  id,
  name,
  add,
}: {
  state: PlatformState;
  id: string;
  name: string;
  add: ReturnType<typeof usePlatform>["addProduce"];
}) {
  const items = state.produce.filter((item) => item.farmerId === id);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const produce = String(form.get("produce"));
    const quantityKg = Number(form.get("quantity"));
    const askingPricePerKg = Number(form.get("price"));
    add({
      farmerId: id,
      farmerName: name,
      produce,
      quantityKg,
      askingPricePerKg,
      location: String(form.get("location")),
      availableBy: String(form.get("date")),
    });
    toast.success(`${quantityKg} kg ${produce} listed`);
  };
  return (
    <>
      <Heading
        eyebrow="Farmer workspace"
        title="Your produce"
        subtitle="Show nearby buyers what you have available and the price that works for you."
      />
      <div className="grid items-start gap-5 xl:grid-cols-[.9fr_1.1fr]">
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
          <ListingTable items={items} />
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
}: {
  state: PlatformState;
  id: string;
  name: string;
  post: ReturnType<typeof usePlatform>["postDemand"];
}) {
  const router = useRouter();
  const items = state.demands.filter(
    (demand) => demand.buyerId === id && demand.status === "open" && demand.quantityKg > 0,
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    post({
      buyerId: id,
      buyerName: name,
      buyerType: String(form.get("buyerType")) as BuyerType,
      produce: String(form.get("produce")),
      quantityKg: Number(form.get("quantity")),
      targetPricePerKg: Number(form.get("price")),
      location: String(form.get("location")),
      requiredBy: String(form.get("date")),
    });
    toast.success("Demand posted", {
      description: "Nearby farmer matches are ready.",
    });
    router.push("/buyer/matches");
  };
  return (
    <>
      <Heading
        eyebrow="Buyer workspace"
        title="Post a demand"
        subtitle="Describe a bulk requirement. Nearby farmers can respond with available produce."
      />
      <div className="grid items-start gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Section eyebrow="Purchase request" title="What do you need?">
          <ListingForm role="buyer" onSubmit={submit} />
        </Section>
        <Section eyebrow="Open requests" title="Your active demands">
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
                  </div>
                  <span className="text-xs font-semibold">
                    Up to {money(item.targetPricePerKg)}/kg
                  </span>
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
  accept: (demandId: string, produceId: string) => void;
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
                  onClick={() => {
                    accept(demand.id, produce.id);
                    toast.success("Deal confirmed", {
                      description: `${quantity} kg of ${produce.produce}`,
                    });
                    router.push(
                      role === "farmer" ? "/farmer/orders" : "/buyer/orders",
                    );
                  }}
                >
                  {role === "farmer" ? "Accept this deal" : "Accept farmer"}
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
        subtitle="Direct agreements between growers and bulk buyers. Payments and transport are arranged by participants."
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
        Deals in this MVP record agreement only. There is no payment gateway or
        delivery tracking.
      </p>
    </>
  );
}

function Earnings({ state, id }: { state: PlatformState; id: string }) {
  const deals = state.deals.filter(
    (deal) => deal.farmerId === id && deal.status !== "pending",
  );
  const earned = deals.reduce((sum, deal) => sum + deal.totalValue, 0);
  return (
    <>
      <Heading
        eyebrow="Farmer workspace"
        title="Earnings overview"
        subtitle="See confirmed direct-deal value alongside illustrative local price references."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Confirmed deal value"
          value={money(earned)}
          helper="Accepted agreements"
          icon={TrendingUp}
        />
        <Metric
          label="Deals confirmed"
          value={`${deals.length}`}
          helper="Direct buyer agreements"
          icon={Handshake}
        />
        <Metric
          label="Produce traded"
          value={`${deals.reduce((sum, d) => sum + d.quantityKg, 0)} kg`}
          helper="Accepted order volume"
          icon={Package}
        />
        <Metric
          label="Average price"
          value={`${money(deals.length ? Math.round(deals.reduce((sum, d) => sum + d.agreedPricePerKg, 0) / deals.length) : 25)}/kg`}
          helper="Farm-gate deal price"
          icon={BarChart3}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section
          eyebrow="Illustrative weekly trend"
          title="Price history · Tomato"
        >
          <ChartPrice />
        </Section>
        <Section eyebrow="Confirmed value" title="Deal earnings">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deals.map((deal, i) => ({
                  name: `${deal.produce} ${i + 1}`,
                  value: deal.totalValue,
                }))}
              >
                <CartesianGrid stroke="#edf0eb" vertical={false} />
                <XAxis dataKey="name" />
                <Tooltip formatter={(v) => [money(Number(v)), "Deal value"]} />
                <Bar dataKey="value" fill="#638d61" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
      <div className="mt-5">
        <Section eyebrow="Your trade" title="Accepted deals">
          <DealsTable items={deals} role="farmer" update={updateNoop} />
        </Section>
      </div>
    </>
  );
}
function updateNoop() {}
function ChartPrice() {
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={priceHistory}>
          <CartesianGrid stroke="#edf0eb" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          <Line
            name="Farmer"
            dataKey="farmer"
            stroke="#4c8057"
            strokeWidth={2.5}
            dot={false}
          />
          <Line name="Market" dataKey="market" stroke="#d7814f" dot={false} />
          <Line name="Retail" dataKey="retail" stroke="#95a58a" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
        subtitle="Explore bulk buyer requests and available farm produce. This is a local demand board, not a consumer shopping app."
      />
      <div className="grid items-start gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <section>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="inline-flex rounded-md border border-[#e3e8e0] bg-white p-1">
              {(["demand", "supply"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded px-3 py-2 text-[11px] font-semibold capitalize ${tab === key ? "bg-[#315b3d] text-white" : "text-[#6f7b71]"}`}
                >
                  {key === "demand" ? "Buyer demand" : "Available produce"}
                </button>
              ))}
            </div>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="input-field !h-[38px] !w-auto text-[11px]"
            >
              <option>All crops</option>
              {crops.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search crop or place"
              className="input-field !h-[38px] min-w-[145px] flex-1 text-[11px] sm:max-w-[190px]"
            />
          </div>
          <div className="space-y-3">
            {tab === "demand"
              ? demands.map((item) => (
                  <article key={item.id} className="panel p-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <span className="tag tag-amber">{item.buyerType}</span>
                        <h3 className="mt-2.5 text-sm font-semibold">
                          {item.buyerName}
                        </h3>
                        <p className="mt-1 text-[11px] text-[#788279]">
                          Looking for {item.quantityKg} kg <b>{item.produce}</b>
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-right text-xs font-semibold">
                        Up to {money(item.targetPricePerKg)}
                        <span className="mt-1 block text-[10px] font-normal text-[#7a857b]">
                          per kg
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 flex justify-between border-t border-[#edf0eb] pt-3 text-[10px] text-[#788279]">
                      <span>
                        <MapPin size={12} className="mr-1 inline" />
                        {item.location} · due {dayLabel(item.requiredBy)}
                      </span>
                      <span>
                        {findFarmerMatches(item, state.produce).length} possible
                        matches
                      </span>
                    </div>
                  </article>
                ))
              : produce.map((item) => (
                  <article key={item.id} className="panel p-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <span className="tag tag-green">Available produce</span>
                        <h3 className="mt-2.5 text-sm font-semibold">
                          {item.farmerName}
                        </h3>
                        <p className="mt-1 text-[11px] text-[#788279]">
                          {item.quantityKg} kg <b>{item.produce}</b>
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-right text-xs font-semibold">
                        {money(item.askingPricePerKg)}
                        <span className="mt-1 block text-[10px] font-normal text-[#7a857b]">
                          per kg
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 flex justify-between border-t border-[#edf0eb] pt-3 text-[10px] text-[#788279]">
                      <span>
                        <MapPin size={12} className="mr-1 inline" />
                        {item.location} · available {dayLabel(item.availableBy)}
                      </span>
                      <span>
                        {findDemandMatches(item, state.demands).length} possible
                        matches
                      </span>
                    </div>
                  </article>
                ))}
            {(tab === "demand" ? demands.length : produce.length) === 0 && (
              <div className="panel">
                <Empty
                  title="No local listings found"
                  body="Try another crop or search term."
                />
              </div>
            )}
          </div>
        </section>
        <aside className="panel overflow-hidden p-3">
          <div className="flex items-center justify-between px-2 pb-3 pt-1">
            <div>
              <p className="eyebrow mb-1">OpenStreetMap</p>
              <h2 className="text-sm font-semibold">Local supply & demand</h2>
            </div>
            <span className="text-[10px] text-[#768078]">
              ● farmers　● buyers
            </span>
          </div>
          <DemandMap demands={demands} produce={produce} />
          <p className="px-2 pt-3 text-[10px] leading-5 text-[#808a81]">
            Map points are approximate city locations. Prices and volumes are
            illustrative demo data.
          </p>
        </aside>
      </div>
    </>
  );
}

function Transparency() {
  const values = [
    { name: "Farmer realization", value: 25 },
    { name: "Local market reference", value: 30 },
    { name: "Retail estimate", value: 38 },
  ];
  return (
    <>
      <Heading
        eyebrow="Know the numbers"
        title="See the price, end to end."
        subtitle="Illustrative tomato prices between the farm gate, local market and retail shelf."
        action={<span className="tag tag-amber">Demo price data</span>}
      />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Section
          eyebrow="Greater Noida · Tomato"
          title="Estimated price per kg"
        >
          <div className="grid grid-cols-3 gap-3">
            {values.map((item, i) => (
              <div key={item.name} className="rounded-md bg-[#f7f8f4] p-3">
                <p className="text-[10px] leading-4 text-[#748076]">
                  {item.name}
                </p>
                <p
                  className={`mt-2 font-serif text-[25px] ${i === 0 ? "text-[#58825b]" : i === 1 ? "text-[#d99a56]" : "text-[#879b78]"}`}
                >
                  {money(item.value)}
                </p>
                <p className="mt-1 text-[10px] text-[#89938a]">per kg</p>
              </div>
            ))}
          </div>
          <div className="mt-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={values}
                layout="vertical"
                margin={{ left: 12, right: 24 }}
              >
                <CartesianGrid stroke="#edf0eb" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 42]}
                  tickFormatter={(x) => `₹${x}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(v) => [money(Number(v)), "Estimated price"]}
                />
                <Bar dataKey="value" fill="#638d61" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section eyebrow="Where value changes" title="The price gap, explained">
          <div className="space-y-4">
            {[
              [
                "1",
                "At the farm gate · ₹25/kg",
                "The estimated amount received by the farmer for a direct sale.",
              ],
              [
                "2",
                "Local market · ₹30/kg",
                "A reference for sorting, aggregation, handling and market movement.",
              ],
              [
                "3",
                "Retail shelf · ₹38/kg",
                "An indicative consumer price that may include transport, storage, wastage and retail costs.",
              ],
            ].map(([n, title, body]) => (
              <div key={n} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#edf3e9] text-[11px] font-bold text-[#4b7853]">
                  {n}
                </span>
                <div>
                  <p className="text-xs font-semibold">{title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#788279]">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-[#e2e9de] bg-[#f4f7f1] p-3.5 text-[10px] leading-5 text-[#758078]">
            Direct local trade may reduce avoidable handoffs. It does not remove
            real handling, transport or retail costs.
          </div>
          <div className="mt-4 rounded-md border border-[#f0dfcd] bg-[#fbf5ee] p-3.5 text-[10px] leading-5 text-[#81694f]">
            All prices shown are mock estimates, not live mandi or retail data.
            No external price feed is connected.
          </div>
        </Section>
      </div>
      <div className="mt-5">
        <Section
          eyebrow="Mock history"
          title="A week of local reference prices"
        >
          <ChartPrice />
        </Section>
      </div>
    </>
  );
}

function Impact({ state }: { state: PlatformState }) {
  const volume = state.deals
    .filter((deal) => deal.status !== "pending")
    .reduce((sum, deal) => sum + deal.quantityKg, 18400);
  const income = volume * 4.2;
  const growth = [
    { month: "Apr", farmers: 92, buyers: 38 },
    { month: "May", farmers: 135, buyers: 57 },
    { month: "Jun", farmers: 176, buyers: 75 },
    { month: "Jul", farmers: 228, buyers: 98 },
    { month: "Aug", farmers: 274, buyers: 121 },
    { month: "Sep", farmers: 326, buyers: 148 },
  ];
  const volumes = [
    { crop: "Tomato", kg: 4800 },
    { crop: "Potato", kg: 3950 },
    { crop: "Onion", kg: 3100 },
    { crop: "Rice", kg: 2750 },
    { crop: "Wheat", kg: 2300 },
  ];
  return (
    <>
      <Heading
        eyebrow="Platform impact · illustrative"
        title="More value, closer to the farm."
        subtitle="A demo view of local participants, matched deals, produce moving and potential farmer income retained."
        action={<span className="tag tag-amber">Prototype estimates</span>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Metric
          label="Farmers onboarded"
          value="326"
          helper="Across demo region"
          icon={Sprout}
        />
        <Metric
          label="Local buyers"
          value="148"
          helper="Restaurants, shops & more"
          icon={Store}
        />
        <Metric
          label="Matched deals"
          value={`${42 + state.deals.filter((d) => d.status !== "pending").length}`}
          helper="Confirmed agreements"
          icon={Handshake}
        />
        <Metric
          label="Produce volume"
          value={`${volume.toLocaleString("en-IN")} kg`}
          helper="Direct trade recorded"
          icon={Package}
        />
        <Metric
          label="Farmer price avg."
          value="₹26/kg"
          helper="Illustrative farm-gate"
          icon={TrendingUp}
        />
        <Metric
          label="Market ref. avg."
          value="₹31/kg"
          helper="Illustrative reference"
          icon={BarChart3}
          warm
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Section
          eyebrow="Local network growth"
          title="More people finding each other"
        >
          <div className="h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
                <CartesianGrid stroke="#edf0eb" vertical={false} />
                <XAxis dataKey="month" />
                <Tooltip />
                <Legend />
                <Area
                  name="Farmers"
                  dataKey="farmers"
                  stroke="#58825b"
                  fill="#dce8d4"
                />
                <Area
                  name="Buyers"
                  dataKey="buyers"
                  stroke="#d7814f"
                  fill="#f8eee5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section eyebrow="Local supply" title="Produce moved through matches">
          <div className="h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumes} layout="vertical">
                <CartesianGrid stroke="#edf0eb" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="crop" />
                <Tooltip />
                <Bar dataKey="kg" fill="#638d61" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Section
          eyebrow="Estimated farmer benefit"
          title={`${money(income)} potential income retained`}
        >
          <p className="mt-3 text-[11px] leading-5 text-[#788279]">
            Illustrative estimate: traded volume × an assumed ₹4.20/kg farm-gate
            improvement. This is not measured platform impact or a guaranteed
            farmer outcome.
          </p>
        </Section>
        <Section eyebrow="What we measure" title="Impact, made legible.">
          <p className="text-[11px] leading-5 text-[#748076]">
            Direct connections reduce unnecessary handoffs. Open price
            references help participants negotiate with shared context. Matched
            demand improves the odds produce finds a nearby buyer before losing
            value.
          </p>
        </Section>
      </div>
    </>
  );
}

export default function PlatformApp({ route }: { route: string }) {
  const {
    state,
    signIn,
    signOut,
    addProduce,
    postDemand,
    acceptMatch,
    updateDealStatus,
  } = usePlatform();
  const parts = route.split("/");
  const routeRole: "farmer" | "buyer" =
    parts[0] === "buyer" ? "buyer" : "farmer";
  const name =
    state.user?.name ??
    (routeRole === "farmer" ? "Ravi Kumar" : "Green Table Kitchen");
  const userId =
    state.user?.role === routeRole
      ? state.user.id
      : routeRole === "farmer"
        ? "farmer-demo"
        : "buyer-demo";
  const onAuth = (role: UserRole, userName: string, email: string) =>
    signIn(role, userName, email);
  if (!route) return <Home />;
  if (route === "login" || route === "register")
    return <Auth register={route === "register"} onAuth={onAuth} />;
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
        name={state.user?.name ?? "Platform Admin"}
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
        name={state.user?.name ?? "Ravi Kumar"}
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
        name={state.user?.name ?? "Green Table Kitchen"}
        signOut={signOut}
      >
        <BuyerDashboard state={state} userId={userId} />
      </Workspace>
    );
  if (route === "farmer/produce")
    return (
      <Workspace
        route={route}
        role="farmer"
        name={state.user?.name ?? "Ravi Kumar"}
        signOut={signOut}
      >
        <FarmerProduce
          state={state}
          id={userId}
          name={state.user?.name ?? "Ravi Kumar"}
          add={addProduce}
        />
      </Workspace>
    );
  if (route === "buyer/demand")
    return (
      <Workspace
        route={route}
        role="buyer"
        name={state.user?.name ?? "Green Table Kitchen"}
        signOut={signOut}
      >
        <BuyerDemand
          state={state}
          id={userId}
          name={state.user?.name ?? "Green Table Kitchen"}
          post={postDemand}
        />
      </Workspace>
    );
  if (route === "farmer/demand" || route === "farmer/matches")
    return (
      <Workspace
        route={route}
        role="farmer"
        name={state.user?.name ?? "Ravi Kumar"}
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
        name={state.user?.name ?? "Green Table Kitchen"}
        signOut={signOut}
      >
        <Matches state={state} role="buyer" id={userId} accept={acceptMatch} />
      </Workspace>
    );
  if (route === "farmer/orders" || route === "buyer/orders")
    return (
      <Workspace route={route} role={routeRole} name={name} signOut={signOut}>
        <Orders
          state={state}
          role={routeRole}
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
        name={state.user?.name ?? "Ravi Kumar"}
        signOut={signOut}
      >
        <Earnings state={state} id={userId} />
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
}: {
  state: PlatformState;
  userId: string;
}) {
  const demands = state.demands.filter(
    (item) => item.buyerId === userId && item.status === "open" && item.quantityKg > 0,
  );
  const deals = state.deals.filter((item) => item.buyerId === userId);
  const matches = demands.reduce(
    (sum, item) => sum + findFarmerMatches(item, state.produce).length,
    0,
  );
  const purchases = deals
    .filter((item) => item.status !== "pending")
    .reduce((sum, item) => sum + item.totalValue, 0);
  const average = deals.length
    ? Math.round(
        deals.reduce((sum, item) => sum + item.agreedPricePerKg, 0) /
          deals.length,
      )
    : 27;
  return (
    <>
      <Heading
        eyebrow="Buyer workspace · NCR"
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
          label="Total purchases"
          value={money(purchases)}
          helper="Confirmed direct orders"
          icon={TrendingUp}
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
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
        <Section eyebrow="Your sourcing" title="Price paid per kg">
          <p className="font-serif text-[34px] text-[#315b3d]">
            {money(average)}
            <span className="ml-1 text-xs text-[#788279]">
              average direct price
            </span>
          </p>
          <p className="mt-2 text-[11px] leading-5 text-[#7a857b]">
            Demo estimate from confirmed orders and open listings.
          </p>
          <div className="mt-4 h-[185px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceHistory}>
                <CartesianGrid stroke="#edf0eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <Tooltip />
                <Area
                  dataKey="farmer"
                  stroke="#58825b"
                  fill="#dce8d4"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Link
            href="/price-transparency"
            className="text-[11px] font-semibold text-[#507b55]"
          >
            Compare local prices →
          </Link>
        </Section>
      </div>
      <div className="mt-5">
        <Section eyebrow="Direct agreements" title="Recent orders">
          <DealsTable
            items={deals.slice(0, 4)}
            role="buyer"
            update={updateNoop}
          />
        </Section>
      </div>
    </>
  );
}
