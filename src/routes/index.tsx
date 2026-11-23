import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  Filter,
  Highlighter,
  Image,
  Minus,
  MoreHorizontal,
  PackageCheck,
  Paperclip,
  PenLine,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
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
export type OrderDbStatus =
  "pending" | "accepted" | "printing" | "binding" | "ready" | "collected" | "cancelled";

export interface AppOrder {
  id: string;
  orderNumber: string;
  student: string;
  documentName: string;
  pageCount: number;
  copies: number;
  printColor: "bw" | "color";
  pageSize: "a4" | "a3";
  duplex: boolean;
  binding: "none" | "staple" | "spiral";
  stationeryItems: string[];
  status: OrderDbStatus;
  totalAmount: number;
  dueTime: string;
  createdAt: string;
}

const statusDisplayMap: Record<OrderDbStatus, { label: string; tone: string; stageIndex: number }> =
  {
    pending: { label: "New", tone: "status-new", stageIndex: 0 },
    accepted: { label: "Accepted", tone: "status-new", stageIndex: 0 },
    printing: { label: "Printing", tone: "status-printing", stageIndex: 1 },
    binding: { label: "Binding", tone: "status-binding", stageIndex: 1 },
    ready: { label: "Ready", tone: "status-ready", stageIndex: 2 },
    collected: { label: "Completed", tone: "status-ready", stageIndex: 3 },
    cancelled: { label: "Cancelled", tone: "bg-destructive/15 text-destructive", stageIndex: -1 },
  };

const initialOrders: AppOrder[] = [
  {
    id: "ord-seed-1",
    orderNumber: "CP-2412",
    student: "Riya Sharma",
    documentName: "Digital Systems Lab.pdf",
    pageCount: 18,
    copies: 1,
    printColor: "bw",
    pageSize: "a4",
    duplex: true,
    binding: "none",
    stationeryItems: ["Pens"],
    status: "pending",
    totalAmount: 47,
    dueTime: "10 min",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "ord-seed-2",
    orderNumber: "CP-2411",
    student: "Arjun Nair",
    documentName: "Operating Systems Notes.pdf",
    pageCount: 64,
    copies: 2,
    printColor: "bw",
    pageSize: "a4",
    duplex: true,
    binding: "staple",
    stationeryItems: [],
    status: "printing",
    totalAmount: 202,
    dueTime: "20 min",
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "ord-seed-3",
    orderNumber: "CP-2410",
    student: "Meera Shah",
    documentName: "Design Project Presentation.pdf",
    pageCount: 12,
    copies: 1,
    printColor: "color",
    pageSize: "a4",
    duplex: false,
    binding: "spiral",
    stationeryItems: ["Folder"],
    status: "binding",
    totalAmount: 115,
    dueTime: "35 min",
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: "ord-seed-4",
    orderNumber: "CP-2409",
    student: "Kavya Iyer",
    documentName: "Chemistry Assignment.docx",
    pageCount: 24,
    copies: 1,
    printColor: "bw",
    pageSize: "a4",
    duplex: true,
    binding: "none",
    stationeryItems: [],
    status: "pending",
    totalAmount: 36,
    dueTime: "45 min",
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    id: "ord-seed-5",
    orderNumber: "CP-2408",
    student: "Alekhya",
    documentName: "Data Structures Notes.pdf",
    pageCount: 42,
    copies: 2,
    printColor: "bw",
    pageSize: "a4",
    duplex: true,
    binding: "none",
    stationeryItems: ["Bluebook"],
    status: "ready",
    totalAmount: 161,
    dueTime: "Ready now",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "ord-seed-6",
    orderNumber: "CP-2391",
    student: "Alekhya",
    documentName: "Physics Lab Manual.pdf",
    pageCount: 28,
    copies: 1,
    printColor: "color",
    pageSize: "a4",
    duplex: true,
    binding: "spiral",
    stationeryItems: ["Folder"],
    status: "collected",
    totalAmount: 195,
    dueTime: "Collected",
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
];

const stationeryCatalog = [
  {
    id: "stat-1",
    name: "Spiral Notebook (160 Pages)",
    detail: "Single ruled, A4 size, 70 GSM paper",
    price: 65,
    icon: BookOpen,
    tone: "yellow",
  },
  {
    id: "stat-2",
    name: "Gel Pen Pack (5 Colors)",
    detail: "Smooth 0.5mm tip, waterproof ink",
    price: 45,
    icon: PenLine,
    tone: "blue",
  },
  {
    id: "stat-3",
    name: "Pastel Highlighters Set",
    detail: "Chisel tip, 4 neon & pastel shades",
    price: 60,
    icon: Highlighter,
    tone: "coral",
  },
  {
    id: "stat-4",
    name: "Clear Project File Folder",
    detail: "Button closure, water-resistant",
    price: 25,
    icon: FileText,
    tone: "green",
  },
];

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

function Index() {
  const [role, setRole] = useState<Role>("student");
  const [signInRole, setSignInRole] = useState<Role | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [counterOpen, setCounterOpen] = useState(true);
  const [orders, setOrders] = useState<AppOrder[]>(initialOrders);
  const [activeToken, setActiveToken] = useState<string | null>("CP-2408");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "Order CP-2408 is Ready!",
      message: "Your Data Structures Notes are printed and ready for pickup at Block C counter.",
      timestamp: "10 min ago",
      read: false,
    },
    {
      id: "notif-2",
      title: "Shop counter is open",
      message: "Central Xerox & Stationery is now open until 7:30 PM today.",
      timestamp: "1 hour ago",
      read: true,
    },
  ]);
  const [isSyncing, setIsSyncing] = useState(false);

  const openSignIn = (nextRole: Role) => {
    setSignInRole(nextRole);
    setIdentifier("");
    setPassword("");
  };

  const completeSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signInRole || isSigningIn) return;

    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier.trim(),
        password,
      });

      if (error || !data.user) {
        toast.error(error?.message ?? "Sign-in failed. Please try again.");
        return;
      }

      const { data: userRoles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      if (roleError) {
        const { error: signOutError } = await supabase.auth.signOut();
        toast.error(
          signOutError
            ? `Could not verify account access or sign out: ${roleError.message}`
            : `Could not verify account access: ${roleError.message}`,
        );
        return;
      }

      const permittedRole =
        signInRole === "staff"
          ? userRoles.some(({ role: userRole }) => userRole === "staff" || userRole === "admin")
          : userRoles.some(({ role: userRole }) => userRole === "student");

      if (!permittedRole) {
        const { error: signOutError } = await supabase.auth.signOut();
        toast.error(
          signOutError
            ? "This account cannot access this portal, and sign-out failed. Please close this page and try again."
            : `This account does not have ${signInRole} access.`,
        );
        return;
      }

      setRole(signInRole);
      setSignInRole(null);
      toast.success(`Signed in as ${signInRole}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  // Sync with Supabase on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSupabaseOrders() {
      setIsSyncing(true);
      try {
        const { data, error } = await supabase
          .from("print_orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0 && isMounted) {
          const mapped: AppOrder[] = data.map((item) => {
            let noteItems: string[] = [];
            if (item.notes && item.notes.startsWith("Stationery:")) {
              noteItems = item.notes
                .replace("Stationery:", "")
                .split(",")
                .map((s) => s.trim());
            }
            return {
              id: item.id,
              orderNumber: item.order_number,
              student: "Alekhya",
              documentName: item.document_name,
              pageCount: item.page_count,
              copies: item.copies,
              printColor: item.print_color === "color" ? "color" : "bw",
              pageSize: item.page_size === "a3" ? "a3" : "a4",
              duplex: item.duplex,
              binding: (item.binding as "none" | "staple" | "spiral") || "none",
              stationeryItems: noteItems,
              status: item.status as OrderDbStatus,
              totalAmount: Number(item.total_amount),
              dueTime:
                item.status === "ready"
                  ? "Ready now"
                  : item.status === "collected"
                    ? "Done"
                    : "15 min",
              createdAt: item.created_at,
            };
          });

          // Merge with initial seed orders so user retains both
          setOrders((current) => {
            const existingIds = new Set(mapped.map((m) => m.id));
            const retained = current.filter((c) => !existingIds.has(c.id));
            return [...mapped, ...retained];
          });
        }
      } catch (err) {
        console.warn("Supabase fetch notice:", err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    }

    loadSupabaseOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const addOrder = async (
    newOrderData: Omit<AppOrder, "id" | "orderNumber" | "createdAt" | "dueTime">,
  ) => {
    const generatedOrderNumber = `CP-${Math.floor(2400 + Math.random() * 600)}`;
    const tempId = `ord-${Date.now()}`;
    const newOrder: AppOrder = {
      ...newOrderData,
      id: tempId,
      orderNumber: generatedOrderNumber,
      createdAt: new Date().toISOString(),
      dueTime: "15 min",
    };

    // Update local state immediately for instant feedback
    setOrders((current) => [newOrder, ...current]);
    setActiveToken(generatedOrderNumber);

    // Add notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `Order ${generatedOrderNumber} placed!`,
        message: `${newOrder.documentName || "Stationery"} is queued. Track status in live tracker.`,
        timestamp: "Just now",
        read: false,
      },
      ...prev,
    ]);

    // Save to Supabase
    try {
      const { data, error } = await supabase
        .from("print_orders")
        .insert({
          order_number: generatedOrderNumber,
          document_name: newOrder.documentName || "Stationery Order",
          storage_path: `documents/${generatedOrderNumber}`,
          page_count: newOrder.pageCount,
          copies: newOrder.copies,
          print_color: newOrder.printColor,
          page_size: newOrder.pageSize,
          duplex: newOrder.duplex,
          binding: newOrder.binding,
          total_amount: newOrder.totalAmount,
          status: newOrder.status,
          notes:
            newOrder.stationeryItems.length > 0
              ? `Stationery: ${newOrder.stationeryItems.join(", ")}`
              : null,
          user_id: "110721e5-4bdf-475c-909c-cda4cfd6832d",
        })
        .select()
        .single();

      if (!error && data) {
        setOrders((current) =>
          current.map((item) => (item.id === tempId ? { ...item, id: data.id } : item)),
        );
      }
    } catch (err) {
      console.warn("Supabase insert notice (persisted locally):", err);
    }
  };

  const updateOrderStatus = async (orderId: string, nextStatus: OrderDbStatus) => {
    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, status: nextStatus } : item)),
    );

    const targetOrder = orders.find((o) => o.id === orderId);
    const orderNum = targetOrder?.orderNumber ?? orderId;
    toast.success(`Order ${orderNum} updated to ${statusDisplayMap[nextStatus].label}`);

    // If order reaches ready, add notification
    if (nextStatus === "ready") {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: `Order ${orderNum} is Ready!`,
          message: "Please show your token at Block C counter to collect.",
          timestamp: "Just now",
          read: false,
        },
        ...prev,
      ]);
    }

    // Update in Supabase
    try {
      await supabase.from("print_orders").update({ status: nextStatus }).eq("id", orderId);
    } catch (err) {
      console.warn("Supabase update notice (persisted locally):", err);
    }
  };

  const cancelOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, "cancelled");
    toast.info("Order has been cancelled.");
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("Notifications marked as read");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
                Central Xerox & Stationery · Campus Hub
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
              className="relative hidden sm:inline-flex"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex size-2.5 items-center justify-center rounded-full bg-primary" />
              )}
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

      {/* Counter status banner */}
      <div
        className={cn(
          "border-b px-4 py-2 text-center text-xs font-semibold sm:text-sm transition-colors",
          counterOpen
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
            : "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              counterOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500",
            )}
          />
          <span>
            {counterOpen
              ? "Shop Counter is OPEN at Block C (Closes at 7:30 PM today) · Average wait: 15 mins"
              : "Shop Counter is currently CLOSED · Digital orders placed now will be printed in next shift"}
          </span>
        </div>
      </div>

      {role === "student" ? (
        <StudentPortal
          orders={orders}
          activeToken={activeToken}
          setActiveToken={setActiveToken}
          onAddOrder={addOrder}
          onCancelOrder={cancelOrder}
          counterOpen={counterOpen}
        />
      ) : (
        <StaffDashboard
          orders={orders}
          onUpdateStatus={updateOrderStatus}
          onAddOrder={addOrder}
          counterOpen={counterOpen}
          setCounterOpen={setCounterOpen}
          isSyncing={isSyncing}
        />
      )}

      {/* Notifications Dialog */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl">Notifications</DialogTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllNotificationsRead}>
                  <CheckCheck className="mr-1 size-4" /> Mark all read
                </Button>
              )}
            </div>
            <DialogDescription>Latest alerts and order status updates</DialogDescription>
          </DialogHeader>

          <div className="max-h-80 divide-y divide-border overflow-y-auto">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "p-3 text-left transition-colors",
                  !notif.read ? "bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">{notif.title}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {notif.timestamp}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{notif.message}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notifications right now.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNotifications([]);
                setNotificationsOpen(false);
              }}
            >
              Clear all
            </Button>
            <Button size="sm" onClick={() => setNotificationsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
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
                {signInRole === "staff" ? "Staff email" : "Student email"}
              </label>
              <Input
                id="sign-in-identifier"
                type="email"
                placeholder={signInRole === "staff" ? "name@xeroxexpress.in" : "you@college.edu"}
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
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn
                ? "Signing in..."
                : `Sign in as ${signInRole === "staff" ? "staff" : "student"}`}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Student Portal
// ─────────────────────────────────────────────────────────────────
function StudentPortal({
  orders,
  activeToken,
  setActiveToken,
  onAddOrder,
  onCancelOrder,
  counterOpen,
}: {
  orders: AppOrder[];
  activeToken: string | null;
  setActiveToken: (token: string | null) => void;
  onAddOrder: (
    order: Omit<AppOrder, "id" | "orderNumber" | "createdAt" | "dueTime">,
  ) => Promise<void>;
  onCancelOrder: (id: string) => Promise<void>;
  counterOpen: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [printType, setPrintType] = useState<"bw" | "color">("bw");
  const [paperSize, setPaperSize] = useState<"A4" | "A3">("A4");
  const [sides, setSides] = useState<"single" | "double">("double");
  const [binding, setBinding] = useState<"none" | "staple" | "spiral">("none");
  const [copies, setCopies] = useState(0);
  const [pages, setPages] = useState(12);
  const [pageRange, setPageRange] = useState("All pages");
  const [fileError, setFileError] = useState<string | null>(null);
  const [stationeryAddons, setStationeryAddons] = useState<string[]>([]);
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<string[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Card" | "Wallet">("UPI");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stationeryAddonOptions = [
    { name: "Exam Bluebook (x2)", price: 35 },
    { name: "Ballpoint Pens (Black/Blue)", price: 20 },
    { name: "Clear Project Folder", price: 30 },
    { name: "Stapler & Pin Set", price: 85 },
  ];

  // Price calculations
  const bindingCost = binding === "spiral" ? 25 : binding === "staple" ? 5 : 0;
  const printCost = file
    ? pages * copies * (printType === "color" ? 5 : 1.5) * (paperSize === "A3" ? 2 : 1) +
      bindingCost * copies
    : 0;

  const addonCost = stationeryAddonOptions
    .filter((item) => stationeryAddons.includes(item.name))
    .reduce((sum, item) => sum + item.price, 0);

  const catalogCost = stationeryCatalog
    .filter((item) => selectedCatalogItems.includes(item.id))
    .reduce((sum, item) => sum + item.price, 0);

  const stationeryCost = addonCost + catalogCost;
  const total = useMemo(() => Math.round(printCost + stationeryCost), [printCost, stationeryCost]);

  // Find the active order in orders list
  const activeOrder = orders.find((o) => o.orderNumber === activeToken) || orders[0];

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
    toast.success(`Attached "${next.name}"`);
  };

  const handleToggleCatalogItem = (itemId: string, itemName: string) => {
    setSelectedCatalogItems((prev) => {
      const exists = prev.includes(itemId);
      if (exists) {
        toast.info(`Removed "${itemName}" from order`);
        return prev.filter((id) => id !== itemId);
      } else {
        toast.success(`Added "${itemName}" to order`);
        return [...prev, itemId];
      }
    });
  };

  const completePayment = async () => {
    setIsSubmitting(true);
    try {
      const allStationeryNames = [
        ...stationeryAddons,
        ...stationeryCatalog
          .filter((item) => selectedCatalogItems.includes(item.id))
          .map((item) => item.name),
      ];

      await onAddOrder({
        student: "Alekhya",
        documentName: file ? file.name : "Stationery Only Order",
        pageCount: file ? pages : 0,
        copies: file ? copies : 1,
        printColor: printType,
        pageSize: paperSize === "A3" ? "a3" : "a4",
        duplex: sides === "double",
        binding: binding,
        stationeryItems: allStationeryNames,
        status: "pending",
        totalAmount: total,
      });

      toast.success("Payment completed! Order submitted to print queue.");
      setPaymentOpen(false);
      // Reset form
      setFile(null);
      setStationeryAddons([]);
      setSelectedCatalogItems([]);
    } catch (e) {
      toast.error("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTokenToClipboard = (tokenText: string) => {
    navigator.clipboard.writeText(tokenText);
    toast.success(`Copied token "${tokenText}" to clipboard!`);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Welcome header */}
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">What do you need today?</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Place your print order and stationery essentials online before class and pick it up
            without waiting in line.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
          <Clock3 className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Central Shop Hours</p>
            <p className="text-sm font-bold">8:30 AM – 7:30 PM</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.42fr_.58fr] lg:items-start">
        <div className="space-y-6">
          {/* File Upload card */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Step 1 · Document</p>
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
                  title="Remove file"
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="size-4" /> Your file is securely deleted from storage after
              printing
            </div>
          </div>

          {/* Printing Options */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase text-primary">Step 2 · Print Setup</p>
              <h2 className="mt-1 font-display text-xl font-bold">Printing specifications</h2>
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
              <OptionGroup
                label="Binding"
                options={["No binding", "Staple (+₹5)", "Spiral (+₹25)"]}
                value={
                  binding === "none"
                    ? "No binding"
                    : binding === "staple"
                      ? "Staple (+₹5)"
                      : "Spiral (+₹25)"
                }
                onChange={(value) =>
                  setBinding(
                    value.includes("Spiral")
                      ? "spiral"
                      : value.includes("Staple")
                        ? "staple"
                        : "none",
                  )
                }
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
              <div className="sm:col-span-2">
                <label htmlFor="page-range" className="mb-2 block text-sm font-bold">
                  Page range (optional)
                </label>
                <Input
                  id="page-range"
                  value={pageRange}
                  maxLength={60}
                  onChange={(event) => setPageRange(event.target.value)}
                  placeholder="e.g. All pages, or 1-10, 15, 20-22"
                />
              </div>
            </div>
          </div>

          {/* Quick Stationery Add-ons Checkboxes */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase text-primary">Step 3 · Quick Add-ons</p>
              <h2 className="mt-1 font-display text-xl font-bold">Desk & Exam Essentials</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stationeryAddonOptions.map((item) => (
                <label
                  key={item.name}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors",
                    stationeryAddons.includes(item.name)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <Checkbox
                    checked={stationeryAddons.includes(item.name)}
                    onCheckedChange={(checked) =>
                      setStationeryAddons((current) =>
                        checked
                          ? [...current, item.name]
                          : current.filter((value) => value !== item.name),
                      )
                    }
                  />
                  <span className="flex-1 text-sm font-semibold">{item.name}</span>
                  <span className="text-sm font-bold text-muted-foreground">₹{item.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Campus Stationery Storefront (ProductCards) */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Stationery Store</p>
                <h2 className="mt-1 font-display text-xl font-bold">Campus Stationery Catalog</h2>
              </div>
              <span className="text-xs text-muted-foreground">Click bag to add to order</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {stationeryCatalog.map((item) => {
                const isSelected = selectedCatalogItems.includes(item.id);
                return (
                  <ProductCard
                    key={item.id}
                    icon={item.icon}
                    name={item.name}
                    detail={item.detail}
                    price={`₹${item.price}`}
                    tone={item.tone}
                    isSelected={isSelected}
                    onToggle={() => handleToggleCatalogItem(item.id, item.name)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
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
              {file ? (
                <div className="flex justify-between">
                  <span className="text-primary-foreground/75">
                    Printing ({pages} pages × {copies} {copies > 1 ? "copies" : "copy"})
                  </span>
                  <strong>₹{Math.round(printCost)}</strong>
                </div>
              ) : (
                <div className="flex justify-between text-primary-foreground/60 italic">
                  <span>No document attached</span>
                  <span>—</span>
                </div>
              )}

              {binding !== "none" && (
                <div className="flex justify-between">
                  <span className="text-primary-foreground/75">
                    {binding === "spiral" ? "Spiral binding" : "Staple binding"}
                  </span>
                  <strong>₹{bindingCost * copies}</strong>
                </div>
              )}

              {stationeryCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-primary-foreground/75">
                    Stationery ({stationeryAddons.length + selectedCatalogItems.length} items)
                  </span>
                  <strong>₹{stationeryCost}</strong>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-primary-foreground/75">Campus pickup</span>
                <strong className="text-emerald-300">Free</strong>
              </div>
            </div>

            <Button
              className="mt-6 w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold"
              disabled={!file && stationeryCost === 0}
              onClick={() => setPaymentOpen(true)}
            >
              Proceed to payment <ArrowRight className="size-4 ml-1" />
            </Button>
            {!file && stationeryCost === 0 && (
              <p className="mt-2 text-center text-xs text-primary-foreground/70">
                Upload a document or choose stationery to continue
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                <PackageCheck className="size-5" />
              </div>
              <div>
                <p className="font-display font-bold">Pickup at Block C Counter</p>
                <p className="text-xs text-muted-foreground">
                  {counterOpen
                    ? "Counter is ready · Average wait: 15 minutes"
                    : "Counter opens next shift"}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Live tracking section */}
      <section className="mt-8 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Live tracking</p>
            <h2 className="mt-1 font-display text-xl font-bold">Order status & token</h2>
          </div>
          {activeToken && (
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-foreground px-3 py-1.5 font-mono text-sm font-bold text-background">
                {activeToken}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => copyTokenToClipboard(activeToken)}
                title="Copy token to clipboard"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        {activeOrder ? (
          <div className="space-y-4">
            <OrderTracker status={activeOrder.status} />
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/80 px-5 pt-4 text-xs sm:text-sm">
              <div>
                <p className="font-semibold text-foreground">{activeOrder.documentName}</p>
                <p className="text-muted-foreground">
                  {activeOrder.pageCount > 0
                    ? `${activeOrder.pageCount} pages · ${activeOrder.copies} copies · `
                    : ""}
                  ₹{activeOrder.totalAmount} · Placed{" "}
                  {new Date(activeOrder.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Est. wait: {activeOrder.dueTime}</span>
                {activeOrder.status === "pending" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onCancelOrder(activeOrder.id)}
                  >
                    Cancel order
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Clock3 className="size-5" />
            </div>
            <p className="font-semibold">No active order yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your token and live progress will appear here after placing an order.
            </p>
          </div>
        )}
      </section>

      {/* Student Past Orders / Order History */}
      <section className="mt-8 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Your History</p>
            <h2 className="mt-1 font-display text-xl font-bold">My Recent Orders</h2>
          </div>
          <span className="text-xs text-muted-foreground">{orders.length} orders total</span>
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {orders.map((ord) => {
            const isCurrent = ord.orderNumber === activeToken;
            return (
              <div
                key={ord.id}
                className={cn(
                  "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors",
                  isCurrent ? "bg-primary/5" : "hover:bg-muted/40",
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {ord.orderNumber}
                    </span>
                    <Status status={ord.status} />
                    {isCurrent && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Active Tracked
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm">{ord.documentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ord.pageCount > 0 ? `${ord.pageCount} pages · ${ord.copies} copies · ` : ""}
                    {ord.binding !== "none" ? `${ord.binding} · ` : ""}
                    Total: ₹{ord.totalAmount}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveToken(ord.orderNumber);
                      toast.info(`Now tracking order ${ord.orderNumber}`);
                    }}
                  >
                    Track order
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => copyTokenToClipboard(ord.orderNumber)}
                    title="Copy token"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  {ord.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10"
                      onClick={() => onCancelOrder(ord.id)}
                      title="Cancel order"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Complete your payment</DialogTitle>
            <DialogDescription>
              Select payment method to submit order to the Xerox counter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {(
              [
                { name: "UPI", icon: Smartphone, desc: "GPay, PhonePe, Paytm" },
                { name: "Card", icon: CreditCard, desc: "Debit / Credit / Campus Card" },
                { name: "Wallet", icon: WalletCards, desc: "Student Wallet / Cash at Counter" },
              ] as const
            ).map(({ name, icon: Icon, desc }) => (
              <button
                key={name}
                type="button"
                onClick={() => setPaymentMethod(name)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border p-3.5 text-left transition-colors",
                  paymentMethod === name
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border hover:bg-muted",
                )}
              >
                <div className="grid size-10 place-items-center rounded-md bg-muted">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold block">{name}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
                {paymentMethod === name && <CheckCircle2 className="size-5 text-primary" />}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted p-4">
            <span className="text-sm text-muted-foreground">Amount payable</span>
            <strong className="font-display text-2xl font-bold">₹{total}</strong>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={completePayment} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : `Pay ₹${total}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────
// Staff Dashboard
// ─────────────────────────────────────────────────────────────────
function StaffDashboard({
  orders,
  onUpdateStatus,
  onAddOrder,
  counterOpen,
  setCounterOpen,
  isSyncing,
}: {
  orders: AppOrder[];
  onUpdateStatus: (orderId: string, status: OrderDbStatus) => Promise<void>;
  onAddOrder: (
    order: Omit<AppOrder, "id" | "orderNumber" | "createdAt" | "dueTime">,
  ) => Promise<void>;
  counterOpen: boolean;
  setCounterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSyncing: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ready" | "completed">("all");
  const [showCompleteQueue, setShowCompleteQueue] = useState(false);
  const [allOrdersOpen, setAllOrdersOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);

  // Walk-in form state
  const [walkInStudent, setWalkInStudent] = useState("");
  const [walkInDoc, setWalkInDoc] = useState("");
  const [walkInPages, setWalkInPages] = useState(10);
  const [walkInCopies, setWalkInCopies] = useState(1);
  const [walkInColor, setWalkInColor] = useState<"bw" | "color">("bw");

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      const matchSearch = `${item.student} ${item.orderNumber} ${item.documentName}`
        .toLowerCase()
        .includes(normalizedSearch);
      if (!matchSearch) return false;

      if (statusFilter === "active") {
        return (
          item.status === "pending" ||
          item.status === "accepted" ||
          item.status === "printing" ||
          item.status === "binding"
        );
      }
      if (statusFilter === "ready") return item.status === "ready";
      if (statusFilter === "completed") return item.status === "collected";
      return true;
    });
  }, [orders, normalizedSearch, statusFilter]);

  const visibleQueue = showCompleteQueue ? filteredOrders : filteredOrders.slice(0, 5);

  // Dynamic metrics
  const activeOrdersCount = orders.filter((o) =>
    ["pending", "accepted", "printing", "binding"].includes(o.status),
  ).length;
  const readyOrdersCount = orders.filter((o) => o.status === "ready").length;
  const totalSales = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const handleNextStage = (order: AppOrder) => {
    const progression: Record<OrderDbStatus, OrderDbStatus | null> = {
      pending: "printing",
      accepted: "printing",
      printing: order.binding !== "none" ? "binding" : "ready",
      binding: "ready",
      ready: "collected",
      collected: null,
      cancelled: null,
    };

    const next = progression[order.status];
    if (next) {
      onUpdateStatus(order.id, next);
    }
  };

  const handleCreateWalkIn = async () => {
    if (!walkInStudent.trim()) {
      toast.error("Please enter student name or ID");
      return;
    }
    const cost = walkInPages * walkInCopies * (walkInColor === "color" ? 5 : 1.5);
    await onAddOrder({
      student: walkInStudent,
      documentName: walkInDoc.trim() || "Walk-in Counter Print",
      pageCount: walkInPages,
      copies: walkInCopies,
      printColor: walkInColor,
      pageSize: "a4",
      duplex: true,
      binding: "none",
      stationeryItems: [],
      status: "printing",
      totalAmount: Math.round(cost),
    });
    toast.success(`Created walk-in order for ${walkInStudent}!`);
    setWalkInOpen(false);
    setWalkInStudent("");
    setWalkInDoc("");
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Top dashboard bar */}
      <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">
            Today’s Operations · Central Xerox Counter
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Shop Staff Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Manage incoming student print jobs, queue statuses, and walk-in orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setWalkInOpen(true)}>
            <Plus className="mr-1.5 size-4" /> New Walk-in Order
          </Button>
          <Button
            variant={counterOpen ? "default" : "secondary"}
            onClick={() => {
              setCounterOpen((open) => {
                const next = !open;
                toast.info(next ? "Shop Counter marked OPEN" : "Shop Counter marked CLOSED");
                return next;
              });
            }}
          >
            <Check className="mr-1.5 size-4" />{" "}
            {counterOpen ? "Close counter" : "Mark counter open"}
          </Button>
        </div>
      </section>

      {/* Metrics overview */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          icon={Printer}
          label="Active orders in queue"
          value={String(activeOrdersCount)}
          change={`${activeOrdersCount} in progress`}
        />
        <Metric
          icon={Clock3}
          label="Avg. processing wait"
          value={`${Math.max(8, activeOrdersCount * 3)} min`}
          change="Smooth pace"
        />
        <Metric
          icon={PackageCheck}
          label="Ready for pickup"
          value={String(readyOrdersCount)}
          change="Awaiting collection"
        />
        <Metric
          icon={ShoppingBag}
          label="Today's sales volume"
          value={`₹${totalSales.toLocaleString()}`}
          change={`${orders.length} total orders`}
        />
      </section>

      {/* Main Queue & Analytics */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_.55fr]">
        <div className="rounded-lg border border-border bg-card shadow-xs">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold">Live Print Queue</h2>
                {isSyncing && <RefreshCw className="size-3.5 animate-spin text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Orders synced live with Supabase database
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {searchOpen && (
                <Input
                  autoFocus
                  aria-label="Search by student or order ID"
                  placeholder="Search student, token..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-9 w-40 sm:w-48"
                />
              )}
              <Button
                size="icon"
                variant="outline"
                className="size-9"
                aria-label={searchOpen ? "Close order search" : "Search orders"}
                onClick={() => {
                  setSearchOpen((open) => !open);
                  if (searchOpen) setSearchQuery("");
                }}
              >
                {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setAllOrdersOpen(true)}
              >
                All orders ({orders.length})
              </Button>
            </div>
          </div>

          {/* Quick Filter tabs */}
          <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-5 py-2 text-xs">
            <span className="mr-2 flex items-center gap-1 font-semibold text-muted-foreground">
              <Filter className="size-3" /> Filter:
            </span>
            {(
              [
                { id: "all", label: "All" },
                { id: "active", label: `Active (${activeOrdersCount})` },
                { id: "ready", label: `Ready (${readyOrdersCount})` },
                { id: "completed", label: "Completed" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  statusFilter === tab.id
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Order list items */}
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
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {item.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {item.documentName} ·{" "}
                    {item.pageCount > 0
                      ? `${item.pageCount}p · ${item.printColor.toUpperCase()} · ${item.copies} ${item.copies > 1 ? "copies" : "copy"}`
                      : "Stationery"}
                    {item.binding !== "none" ? ` · ${item.binding}` : ""} · ₹{item.totalAmount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-sm font-bold">{item.dueTime}</p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Status status={item.status} />

                  {/* Direct 1-click Advance button */}
                  {item.status !== "collected" && item.status !== "cancelled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      onClick={() => handleNextStage(item)}
                      title="Advance to next step"
                    >
                      Advance ➔
                    </Button>
                  )}

                  {/* Dropdown menu for full status control */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Manage order ${item.orderNumber}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Set Status: {item.orderNumber}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onUpdateStatus(item.id, "printing")}>
                        Mark Printing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(item.id, "binding")}>
                        Mark Binding
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(item.id, "ready")}>
                        Mark Ready for Pickup
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(item.id, "collected")}>
                        Mark Completed (Collected)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onUpdateStatus(item.id, "cancelled")}
                      >
                        Cancel Order
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {visibleQueue.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No orders match your search or filter.
              </p>
            )}
          </div>

          <div className="border-t border-border px-5 py-4 sm:px-6">
            <Button
              variant="ghost"
              className="w-full font-medium"
              onClick={() => setShowCompleteQueue((show) => !show)}
            >
              {showCompleteQueue
                ? "Show fewer orders"
                : `View complete queue (${filteredOrders.length})`}{" "}
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Sidebar Analytics & Capacity */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Order Mix</h2>
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="order-ring grid size-36 place-items-center rounded-full">
                <div className="grid size-24 place-items-center rounded-full bg-card text-center">
                  <div>
                    <p className="font-display text-2xl font-bold">{orders.length}</p>
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
                <p className="text-sm font-bold">Counter Status</p>
                <p className="text-xs text-muted-foreground">
                  {counterOpen
                    ? "3 staff on duty · Online orders active"
                    : "Closed for shift change"}
                </p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-card">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  counterOpen ? "w-3/4 bg-emerald-500" : "w-1/4 bg-amber-500",
                )}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {counterOpen ? "Operating at standard 74% capacity" : "Paused"}
            </p>
          </div>
        </div>
      </section>

      {/* All Orders Dialog */}
      <Dialog open={allOrdersOpen} onOpenChange={setAllOrdersOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              All Print & Stationery Orders
            </DialogTitle>
            <DialogDescription>
              Complete history of submitted jobs ({orders.length} records)
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 divide-y divide-border overflow-y-auto">
            {orders.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{item.student}</p>
                    <span className="font-mono text-xs text-muted-foreground font-bold">
                      {item.orderNumber}
                    </span>
                    <Status status={item.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.documentName} · ₹{item.totalAmount} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {item.status !== "collected" && item.status !== "cancelled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      onClick={() => handleNextStage(item)}
                    >
                      Advance ➔
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onUpdateStatus(item.id, "printing")}>
                        Set Printing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(item.id, "ready")}>
                        Set Ready
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(item.id, "collected")}>
                        Set Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onUpdateStatus(item.id, "cancelled")}
                      >
                        Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setAllOrdersOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Walk-in Order Dialog */}
      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create Walk-in Counter Order</DialogTitle>
            <DialogDescription>
              Log an in-person student print order directly into the shop queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold uppercase mb-1 block">Student Name or ID</label>
              <Input
                placeholder="e.g. Rahul Verma or 2026-CS-042"
                value={walkInStudent}
                onChange={(e) => setWalkInStudent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase mb-1 block">Document Description</label>
              <Input
                placeholder="e.g. Lab Record / Notes"
                value={walkInDoc}
                onChange={(e) => setWalkInDoc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase mb-1 block">Pages</label>
                <Input
                  type="number"
                  min={1}
                  value={walkInPages}
                  onChange={(e) => setWalkInPages(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase mb-1 block">Copies</label>
                <Input
                  type="number"
                  min={1}
                  value={walkInCopies}
                  onChange={(e) => setWalkInCopies(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
            <OptionGroup
              label="Color Mode"
              options={["Black & White", "Color"]}
              value={walkInColor === "bw" ? "Black & White" : "Color"}
              onChange={(val) => setWalkInColor(val === "Color" ? "color" : "bw")}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWalkInOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWalkIn}>Add to Queue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────
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
      <div
        className={cn(
          "grid rounded-md bg-muted p-1",
          options.length === 2
            ? "grid-cols-2"
            : options.length === 3
              ? "grid-cols-3"
              : "grid-cols-2",
        )}
      >
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

function OrderTracker({ status }: { status: OrderDbStatus }) {
  const stages = ["Submitted", "Printing", "Ready for Pickup", "Completed"];
  const stageIndex = statusDisplayMap[status]?.stageIndex ?? 0;

  if (status === "cancelled") {
    return (
      <div className="py-6 text-center text-destructive">
        <AlertCircle className="mx-auto mb-2 size-8" />
        <p className="font-bold">This order was cancelled</p>
        <p className="text-xs text-muted-foreground">
          Contact the shop staff if this was an error.
        </p>
      </div>
    );
  }

  const progressWidth = ["w-0", "w-1/3", "w-2/3", "w-full"][Math.max(0, stageIndex)] ?? "w-0";

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
                index <= stageIndex
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {index < stageIndex ? (
                <Check className="size-4" />
              ) : (
                <span className="text-xs font-bold">{index + 1}</span>
              )}
            </div>
            <p
              className={cn(
                "mt-3 text-xs font-semibold sm:text-sm",
                index <= stageIndex ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {stage}
            </p>
            {index === stageIndex && (
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
  isSelected,
  onToggle,
}: {
  icon: typeof PenLine;
  name: string;
  detail: string;
  price: string;
  tone: string;
  isSelected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <article
      className={cn(
        "group rounded-lg border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5",
        isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border",
      )}
    >
      <div
        className={cn("mb-4 grid aspect-[4/3] place-items-center rounded-md", `product-${tone}`)}
      >
        <Icon className="size-9" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-bold truncate">{name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{detail}</p>
      <div className="mt-4 flex items-center justify-between">
        <strong className="text-sm font-display">{price}</strong>
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          aria-label={isSelected ? `Remove ${name}` : `Add ${name}`}
          className="h-8 gap-1.5 text-xs font-semibold"
          onClick={onToggle}
        >
          {isSelected ? (
            <>
              <Check className="size-3.5" /> Added
            </>
          ) : (
            <>
              <ShoppingBag className="size-3.5" /> Add
            </>
          )}
        </Button>
      </div>
    </article>
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
      <div className="mb-4 flex items-start justify-between">
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

function Status({ status }: { status: OrderDbStatus }) {
  const config = statusDisplayMap[status] || {
    label: status,
    tone: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
        config.tone,
      )}
    >
      {config.label}
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
