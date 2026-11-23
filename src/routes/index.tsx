import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Highlighter,
  Image,
  Minus,
  MoreHorizontal,
  PackageCheck,
  Paperclip,
  PenLine,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Smartphone,
  Upload,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XeroxExpress — College printing made easy" },
      {
        name: "description",
        content:
          "Order Xerox prints and stationery from your campus shop, without waiting in line.",
      },
      { property: "og:title", content: "XeroxExpress — College printing made easy" },
      {
        property: "og:description",
        content: "Upload documents, order stationery, and collect everything on campus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Role = "student" | "staff";
const orderStatuses = ["New", "Printing", "Binding", "Ready", "Completed"] as const;
type OrderStatus = (typeof orderStatuses)[number];

const studentOrders = [
  {
    id: "CP-2408",
    name: "Data Structures Notes",
    meta: "42 pages · B&W · 2 copies",
    status: "Ready",
    price: "₹126",
  },
  {
    id: "CP-2391",
    name: "Physics Lab Manual",
    meta: "28 pages · Color cover · Spiral",
    status: "Printing",
    price: "₹94",
  },
];

const staffQueue = [
  {
    id: "CP-2412",
    student: "Riya Sharma",
    detail: "18 pages · B&W · 1 copy",
    due: "10 min",
    status: "New",
  },
  {
    id: "CP-2411",
    student: "Arjun Nair",
    detail: "64 pages · B&W · 2 copies",
    due: "20 min",
    status: "Printing",
  },
  {
    id: "CP-2410",
    student: "Meera Shah",
    detail: "12 pages · Color · 1 copy",
    due: "35 min",
    status: "Binding",
  },
  {
    id: "CP-2409",
    student: "Kavya Iyer",
    detail: "24 pages · B&W · 1 copy",
    due: "45 min",
    status: "New",
  },
  {
    id: "CP-2408",
    student: "Rohan Das",
    detail: "32 pages · Color · 1 copy",
    due: "50 min",
    status: "Printing",
  },
  {
    id: "CP-2407",
    student: "Neha Kapoor",
    detail: "10 pages · B&W · 3 copies",
    due: "1 hr",
    status: "Ready",
  },
] satisfies { id: string; student: string; detail: string; due: string; status: OrderStatus }[];

function Index() {
  const [role, setRole] = useState<Role>("student");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [signInRole, setSignInRole] = useState<Role | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const openSignIn = (nextRole: Role) => {
    setSignInRole(nextRole);
    setIdentifier("");
    setPassword("");
  };

  const completeSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signInRole || !identifier.trim() || !password.trim()) return;
    setRole(signInRole);
    setSignInRole(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Printer className="size-5" />
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-none">XeroxExpress</p>
              <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
                Central Xerox & Stationery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openSignIn("student")}
              className="px-2 text-xs sm:px-3 sm:text-sm"
            >
              Student sign in
            </Button>
            <Button variant="outline" size="sm" onClick={() => openSignIn("staff")}>
              Staff sign in
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="hidden sm:inline-flex"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="size-5" />
            </Button>
            <div
              className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
              aria-label={role === "staff" ? "Staff account" : "Student account"}
            >
              {role === "staff" ? "ST" : "SU"}
            </div>
          </div>
        </div>
      </header>

      {role === "student" ? <StudentPortal /> : <StaffDashboard />}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Notifications</DialogTitle>
            <DialogDescription>
              You’re all caught up. New order updates will appear here.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Dialog
        open={signInRole !== null}
        onOpenChange={(open) => {
          if (!open) setSignInRole(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {signInRole === "staff" ? "Staff sign in" : "Student sign in"}
            </DialogTitle>
            <DialogDescription>
              {signInRole === "staff"
                ? "Use your shop employee account to access the private dashboard."
                : "Sign in with your student account to place and track print orders."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={completeSignIn} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="sign-in-identifier" className="text-sm font-semibold">
                {signInRole === "staff" ? "Employee ID" : "Student email"}
              </label>
              <Input
                id="sign-in-identifier"
                type={signInRole === "staff" ? "text" : "email"}
                placeholder={signInRole === "staff" ? "STAFF-001" : "you@college.edu"}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="sign-in-password" className="text-sm font-semibold">
                Password
              </label>
              <Input
                id="sign-in-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Sign in as {signInRole === "staff" ? "staff" : "student"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentPortal() {
  const [file, setFile] = useState<File | null>(null);
  const [printType, setPrintType] = useState<"bw" | "color">("bw");
  const [paperSize, setPaperSize] = useState<"A4" | "A3">("A4");
  const [sides, setSides] = useState<"single" | "double">("double");
  const [copies, setCopies] = useState(0);
  const [pages, setPages] = useState(12);
  const [pageRange, setPageRange] = useState("All pages");
  const [fileError, setFileError] = useState<string | null>(null);
  const [stationery, setStationery] = useState<string[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Card" | "Wallet">("UPI");
  const [token, setToken] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const stationeryOptions = [
    { name: "Pens", price: 20 },
    { name: "Bluebook", price: 35 },
    { name: "Folder", price: 30 },
    { name: "Stapler", price: 85 },
  ];
  const printCost =
    pages * copies * (printType === "color" ? 5 : 1.5) * (paperSize === "A3" ? 2 : 1);
  const stationeryCost = stationeryOptions
    .filter((item) => stationery.includes(item.name))
    .reduce((sum, item) => sum + item.price, 0);
  const total = useMemo(() => Math.round(printCost + stationeryCost), [printCost, stationeryCost]);

  useEffect(() => {
    if (!token || progress >= 3) return;
    const timer = window.setInterval(
      () => setProgress((current) => Math.min(current + 1, 3)),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [token, progress]);

  const addFiles = (files: FileList | null) => {
    const next = files?.[0];
    if (!next) return;
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    if (next.size > 25 * 1024 * 1024) {
      setFile(null);
      setFileError("Choose a file that is 25 MB or smaller.");
      return;
    }
    if (!allowed.includes(next.type)) {
      setFile(null);
      setFileError("This file type isn’t supported. Choose a PDF, DOCX, JPG, or PNG.");
      return;
    }
    setFile(next);
    setFileError(null);
  };

  const completePayment = () => {
    setToken(`#CP-${Math.floor(1000 + Math.random() * 9000)}`);
    setProgress(0);
    setPaymentOpen(false);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">What do you need today?</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Place your order before class and pick it up when it’s ready.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
          <Clock3 className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Shop closes at</p>
            <p className="text-sm font-bold">7:30 PM today</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.42fr_.58fr] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-primary">New order</p>
                <h2 className="mt-1 font-display text-xl font-bold">Upload your document</h2>
              </div>
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <FileText className="size-5" />
              </div>
            </div>
            <label
              className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/40 px-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                addFiles(event.dataTransfer.files);
              }}
            >
              <input
                type="file"
                className="sr-only"
                onChange={(event) => addFiles(event.target.files)}
                accept=".pdf,.docx,.jpg,.jpeg,.png"
              />
              <div className="mb-3 grid size-11 place-items-center rounded-full bg-card text-primary shadow-sm">
                <Upload className="size-5" />
              </div>
              <span className="font-semibold">Drop files here or choose from device</span>
              <span className="mt-1 text-xs text-muted-foreground">
                PDF, DOCX, JPG or PNG · up to 25 MB
              </span>
            </label>
            {fileError && (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                {fileError}
              </p>
            )}
            {file && (
              <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-background p-3">
                <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                  {file.type.startsWith("image/") ? (
                    <Image className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setFile(null)}
                  aria-label="Remove file"
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="size-4" /> Your file is removed after printing
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase text-primary">Print setup</p>
              <h2 className="mt-1 font-display text-xl font-bold">Printing options</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <OptionGroup
                label="Print type"
                options={["Black & White", "Color"]}
                value={printType === "bw" ? "Black & White" : "Color"}
                onChange={(value) => setPrintType(value === "Color" ? "color" : "bw")}
              />
              <OptionGroup
                label="Paper size"
                options={["A4", "A3"]}
                value={paperSize}
                onChange={(value) => setPaperSize(value as "A4" | "A3")}
              />
              <OptionGroup
                label="Sides"
                options={["Single-sided", "Double-sided"]}
                value={sides === "single" ? "Single-sided" : "Double-sided"}
                onChange={(value) => setSides(value === "Single-sided" ? "single" : "double")}
              />
              <div>
                <label className="mb-2 block text-sm font-bold">Number of copies</label>
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() => setCopies(Math.max(0, copies - 1))}
                    disabled={copies === 0}
                    aria-label="Decrease copies"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <strong>{copies}</strong>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() => setCopies(Math.min(100, copies + 1))}
                    aria-label="Increase copies"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label htmlFor="page-count" className="mb-2 block text-sm font-bold">
                  Number of pages
                </label>
                <Input
                  id="page-count"
                  type="number"
                  min={1}
                  max={1000}
                  value={pages}
                  onChange={(event) =>
                    setPages(Math.max(1, Math.min(1000, Number(event.target.value) || 1)))
                  }
                />
              </div>
              <div>
                <label htmlFor="page-range" className="mb-2 block text-sm font-bold">
                  Page range
                </label>
                <Input
                  id="page-range"
                  value={pageRange}
                  maxLength={60}
                  onChange={(event) => setPageRange(event.target.value)}
                  placeholder="All pages or 1-5, 8"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase text-primary">Add-ons</p>
              <h2 className="mt-1 font-display text-xl font-bold">Stationery items</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stationeryOptions.map((item) => (
                <label
                  key={item.name}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors",
                    stationery.includes(item.name)
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                >
                  <Checkbox
                    checked={stationery.includes(item.name)}
                    onCheckedChange={(checked) =>
                      setStationery((current) =>
                        checked
                          ? [...current, item.name]
                          : current.filter((value) => value !== item.name),
                      )
                    }
                  />
                  <span className="flex-1 text-sm font-semibold">{item.name}</span>
                  <span className="text-sm text-muted-foreground">₹{item.price}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <div className="rounded-lg bg-primary p-6 text-primary-foreground shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-primary-foreground/75">Estimated total</p>
                <p className="mt-1 font-display text-4xl font-bold">₹{total}</p>
              </div>
              <CreditCard className="size-7" />
            </div>
            <div className="my-5 h-px bg-primary-foreground/20" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-foreground/75">
                  Printing ({pages} × {copies})
                </span>
                <strong>₹{Math.round(printCost)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-foreground/75">Stationery</span>
                <strong>₹{stationeryCost}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-foreground/75">Pickup</span>
                <strong>Free</strong>
              </div>
            </div>
            <Button
              className="mt-6 w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              disabled={!file}
              onClick={() => setPaymentOpen(true)}
            >
              Proceed to payment <ArrowRight className="size-4" />
            </Button>
            {!file && (
              <p className="mt-2 text-center text-xs text-primary-foreground/70">
                Upload a document to continue
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                <PackageCheck className="size-5" />
              </div>
              <div>
                <p className="font-display font-bold">Pickup at Block C</p>
                <p className="text-xs text-muted-foreground">Average wait: 18 minutes</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-8 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Live tracking</p>
            <h2 className="mt-1 font-display text-xl font-bold">Order status & token</h2>
          </div>
          {token && (
            <span className="rounded-md bg-foreground px-3 py-1.5 font-mono text-sm font-bold text-background">
              {token}
            </span>
          )}
        </div>
        {token ? (
          <OrderTracker progress={progress} />
        ) : (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Clock3 className="size-5" />
            </div>
            <p className="font-semibold">No active order yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your token and live progress will appear after payment.
            </p>
          </div>
        )}
      </section>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Complete your payment</DialogTitle>
            <DialogDescription>
              This is a simulated payment. No money will be charged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(
              [
                { name: "UPI", icon: Smartphone },
                { name: "Card", icon: CreditCard },
                { name: "Wallet", icon: WalletCards },
              ] as const
            ).map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => setPaymentMethod(name)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border p-4 text-left transition-colors",
                  paymentMethod === name
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted",
                )}
              >
                <div className="grid size-9 place-items-center rounded-md bg-muted">
                  <Icon className="size-4" />
                </div>
                <span className="flex-1 font-semibold">{name}</span>
                {paymentMethod === name && <CheckCircle2 className="size-5 text-primary" />}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted p-4">
            <span className="text-sm text-muted-foreground">Amount payable</span>
            <strong className="font-display text-xl">₹{total}</strong>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={completePayment}>Pay ₹{total}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold">{label}</p>
      <div className="grid grid-cols-2 rounded-md bg-muted p-1">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-9 rounded-sm px-2 text-xs font-semibold transition-all",
              value === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderTracker({ progress }: { progress: number }) {
  const stages = ["Submitted", "Printing", "Ready for Pickup", "Completed"];
  const progressWidth = ["w-0", "w-1/3", "w-2/3", "w-full"][progress] ?? "w-0";
  return (
    <div className="px-1 py-8 sm:px-5">
      <div className="relative grid grid-cols-4">
        <div className="absolute left-[12.5%] right-[12.5%] top-4 h-1 bg-muted">
          <div className={cn("h-full bg-primary transition-all duration-700", progressWidth)} />
        </div>
        {stages.map((stage, index) => (
          <div key={stage} className="relative z-10 flex flex-col items-center text-center">
            <div
              className={cn(
                "grid size-9 place-items-center rounded-full border-2 bg-card transition-colors",
                index <= progress
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {index < progress ? (
                <Check className="size-4" />
              ) : (
                <span className="text-xs font-bold">{index + 1}</span>
              )}
            </div>
            <p
              className={cn(
                "mt-3 text-xs font-semibold sm:text-sm",
                index <= progress ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {stage}
            </p>
            {index === progress && (
              <p className="mt-1 hidden text-xs text-primary sm:block">In progress</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  icon: Icon,
  name,
  detail,
  price,
  tone,
}: {
  icon: typeof PenLine;
  name: string;
  detail: string;
  price: string;
  tone: string;
}) {
  return (
    <article className="group rounded-lg border border-border bg-card p-4 shadow-xs transition-transform hover:-translate-y-1">
      <div
        className={cn("mb-5 grid aspect-[4/3] place-items-center rounded-md", `product-${tone}`)}
      >
        <Icon className="size-10" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-bold">{name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      <div className="mt-4 flex items-center justify-between">
        <strong className="text-sm">{price}</strong>
        <Button size="icon" variant="outline" aria-label={`Add ${name}`} className="size-8">
          <ShoppingBag className="size-4" />
        </Button>
      </div>
    </article>
  );
}

function StaffDashboard() {
  const [counterOpen, setCounterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleteQueue, setShowCompleteQueue] = useState(false);
  const [allOrdersOpen, setAllOrdersOpen] = useState(false);
  const [queue, setQueue] = useState(staffQueue);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredQueue = queue.filter((item) =>
    `${item.student} ${item.id}`.toLowerCase().includes(normalizedSearch),
  );
  const visibleQueue = showCompleteQueue ? filteredQueue : filteredQueue.slice(0, 3);

  const advanceOrder = (orderId: string) => {
    setQueue((current) =>
      current.map((item) => {
        if (item.id !== orderId) return item;
        const currentIndex = orderStatuses.indexOf(item.status);
        return {
          ...item,
          status: orderStatuses[Math.min(currentIndex + 1, orderStatuses.length - 1)],
        };
      }),
    );
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">Wednesday, 7 October</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Good afternoon, team</h1>
          <p className="mt-2 text-muted-foreground">
            Here’s what’s happening at the shop right now.
          </p>
        </div>
        <Button onClick={() => setCounterOpen((open) => !open)}>
          <Check className="size-4" /> {counterOpen ? "Close counter" : "Mark counter open"}
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={Printer} label="Active orders" value="12" change="3 new" />
        <Metric icon={Clock3} label="Avg. wait time" value="18 min" change="4 min faster" />
        <Metric icon={PackageCheck} label="Ready for pickup" value="7" change="2 overdue" />
        <Metric icon={ShoppingBag} label="Today's sales" value="₹4,860" change="+12%" />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_.55fr]">
        <div className="rounded-lg border border-border bg-card shadow-xs">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-display text-lg font-bold">Live print queue</h2>
              <p className="text-xs text-muted-foreground">Orders sorted by pickup time</p>
            </div>
            <div className="flex gap-2">
              {searchOpen && (
                <Input
                  autoFocus
                  aria-label="Search by student or order ID"
                  placeholder="Search orders"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              )}
              <Button
                size="icon"
                variant="outline"
                aria-label={searchOpen ? "Close order search" : "Search orders"}
                onClick={() => {
                  setSearchOpen((open) => !open);
                  setSearchQuery("");
                }}
              >
                {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAllOrdersOpen(true)}>
                All orders
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {visibleQueue.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-4 px-5 py-5 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:px-6"
              >
                <div className="grid size-10 place-items-center rounded-md bg-muted font-display text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{item.student}</p>
                    <span className="text-xs text-muted-foreground">{item.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pickup in</p>
                  <p className="text-sm font-bold">{item.due}</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Status status={item.status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Advance order ${item.id}`}
                    title="Advance order status"
                    disabled={item.status === "Completed"}
                    onClick={() => advanceOrder(item.id)}
                  >
                    <MoreHorizontal className="size-5" />
                  </Button>
                </div>
              </div>
            ))}
            {visibleQueue.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No orders match your search.
              </p>
            )}
          </div>
          <div className="border-t border-border px-5 py-4 sm:px-6">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowCompleteQueue((show) => !show)}
            >
              {showCompleteQueue ? "Show fewer orders" : "View complete queue"}{" "}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Order mix</h2>
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="order-ring grid size-36 place-items-center rounded-full">
                <div className="grid size-24 place-items-center rounded-full bg-card text-center">
                  <div>
                    <p className="font-display text-2xl font-bold">46</p>
                    <p className="text-xs text-muted-foreground">orders</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <Legend color="bg-primary" label="B&W printing" value="58%" />
              <Legend color="bg-chart-2" label="Color printing" value="24%" />
              <Legend color="bg-chart-4" label="Stationery" value="18%" />
            </div>
          </div>
          <div className="rounded-lg bg-secondary p-5 text-secondary-foreground">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-md bg-card">
                <UserRound className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold">Counter workload</p>
                <p className="text-xs text-muted-foreground">3 staff active</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-card">
              <div className="h-full w-3/4 rounded-full bg-accent-strong" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Moderate · capacity at 74%</p>
          </div>
        </div>
      </section>
      <Dialog open={allOrdersOpen} onOpenChange={setAllOrdersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">All orders</DialogTitle>
            <DialogDescription>Current orders in the print queue.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 divide-y divide-border overflow-y-auto">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">{item.student}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.id} · {item.detail}
                  </p>
                </div>
                <Status status={item.status} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  change,
}: {
  icon: typeof Printer;
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5">
      <div className="mb-5 flex items-start justify-between">
        <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <span className="text-xs font-semibold text-positive">{change}</span>
      </div>
      <p className="font-display text-2xl font-bold sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</p>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const tone =
    status === "Ready" || status === "Completed"
      ? "status-ready"
      : status === "New"
        ? "status-new"
        : status === "Binding"
          ? "status-binding"
          : "status-printing";
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-bold",
        tone,
      )}
    >
      {status}
    </span>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", color)} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
