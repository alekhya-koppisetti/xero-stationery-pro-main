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
  Highlighter,
  Image,
  LogOut,
  Minus,
  PackageCheck,
  Paperclip,
  PenLine,
  Plus,
  Printer,
  ShoppingBag,
  Smartphone,
  Trash2,
  Upload,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type AppOrder,
  type OrderDbStatus,
  OptionGroup,
  Status,
  fetchOrdersFromSupabase,
  initialOrders,
  insertOrderToSupabase,
  statusDisplayMap,
} from "@/components/order-shared";
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

interface StudentSession {
  rollNo: string;
  name: string;
}

interface PrintDocumentItem {
  id: string;
  file: File;
  pages: number;
  copies: number;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const STUDENT_SESSION_STORAGE_KEY = "xe_student_session";

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

function formatFileSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb >= 0.1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Index() {
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [rollNoInput, setRollNoInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [orders, setOrders] = useState<AppOrder[]>(initialOrders);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-2",
      title: "Shop counter is open",
      message: "Central Xerox & Stationery is open until 7:30 PM today.",
      timestamp: "1 hour ago",
      read: true,
    },
  ]);

  // Hydrate saved student Roll No session on client mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STUDENT_SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<StudentSession>;
        if (typeof parsed.rollNo === "string" && parsed.rollNo.trim().length >= 3) {
          setStudentSession({
            rollNo: parsed.rollNo.trim().toUpperCase(),
            name: typeof parsed.name === "string" ? parsed.name.trim() : "",
          });
        }
      }
    } catch {
      // Ignore invalid local storage state
    }
  }, []);

  // Sync recent orders from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    fetchOrdersFromSupabase()
      .then((mapped) => {
        if (!isMounted || mapped.length === 0) return;
        setOrders((current) => {
          const existingIds = new Set(mapped.map((m) => m.id));
          return [...mapped, ...current.filter((c) => !existingIds.has(c.id))];
        });
      })
      .catch((err) => {
        console.warn("Supabase fetch notice:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStudentLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedRollNo = rollNoInput.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9/-]{2,23}$/i.test(cleanedRollNo)) {
      setAuthError("Enter a valid roll number (at least 3 letters/numbers, e.g. 22CS101).");
      return;
    }

    const session: StudentSession = {
      rollNo: cleanedRollNo,
      name: nameInput.trim(),
    };
    setAuthError(null);
    setStudentSession(session);
    try {
      window.localStorage.setItem(STUDENT_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage quota issues
    }
    toast.success(`Signed in with Roll No ${session.rollNo}`);
  };

  const handleStudentSignOut = () => {
    setStudentSession(null);
    setActiveToken(null);
    setRollNoInput("");
    setNameInput("");
    try {
      window.localStorage.removeItem(STUDENT_SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage issues
    }
    toast.info("Signed out.");
  };

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

    setOrders((current) => [newOrder, ...current]);
    setActiveToken(generatedOrderNumber);

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

    try {
      const persistedId = await insertOrderToSupabase(newOrder);
      if (persistedId) {
        setOrders((current) =>
          current.map((item) => (item.id === tempId ? { ...item, id: persistedId } : item)),
        );
      }
    } catch (err) {
      console.warn("Supabase insert notice (persisted locally):", err);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, status: "cancelled" } : item)),
    );
    toast.info("Order has been cancelled.");
    try {
      await supabase.from("print_orders").update({ status: "cancelled" }).eq("id", orderId);
    } catch (err) {
      console.warn("Supabase cancel notice (persisted locally):", err);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("Notifications marked as read");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const studentInitials = studentSession
    ? (studentSession.name || studentSession.rollNo).slice(0, 2).toUpperCase()
    : "ST";

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

          {studentSession && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold sm:flex">
                <UserRound className="size-3.5 text-primary" />
                <span>Roll No: {studentSession.rollNo}</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative"
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex size-2.5 items-center justify-center rounded-full bg-primary" />
                )}
              </Button>

              <div
                className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                aria-label={`Signed in as ${studentSession.rollNo}`}
              >
                {studentInitials}
              </div>

              <Button variant="outline" size="sm" onClick={handleStudentSignOut}>
                <LogOut className="mr-1.5 size-3.5" /> Sign out
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-xs font-semibold text-emerald-800 transition-colors dark:text-emerald-300 sm:text-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
          <span>
            Shop Counter is OPEN at Block C (Closes at 7:30 PM today) · Average wait: 15 mins
          </span>
        </div>
      </div>

      {!studentSession ? (
        <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-14 sm:py-20">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase text-primary">Student Access</p>
              <h1 className="mt-1 font-display text-2xl font-bold">Sign in with your Roll No</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your campus roll number to upload documents, order stationery, and track print
                tokens.
              </p>
            </div>

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="student-rollno" className="text-sm font-semibold">
                  Roll Number
                </label>
                <Input
                  id="student-rollno"
                  type="text"
                  placeholder="e.g. 22CS101 or 2026-CS-042"
                  value={rollNoInput}
                  onChange={(event) => {
                    setRollNoInput(event.target.value);
                    if (authError) setAuthError(null);
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="student-name" className="text-sm font-semibold">
                  Student Name <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="student-name"
                  type="text"
                  placeholder="e.g. Alekhya"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                />
              </div>

              {authError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {authError}
                </p>
              )}

              <Button type="submit" className="w-full">
                Continue to Student Portal <ArrowRight className="ml-1 size-4" />
              </Button>
            </form>
          </div>
        </main>
      ) : (
        <StudentPortal
          studentSession={studentSession}
          orders={orders}
          activeToken={activeToken}
          setActiveToken={setActiveToken}
          onAddOrder={addOrder}
          onCancelOrder={cancelOrder}
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
                  <p className="text-sm font-semibold">{notif.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Student Portal
// ─────────────────────────────────────────────────────────────────
function StudentPortal({
  studentSession,
  orders,
  activeToken,
  setActiveToken,
  onAddOrder,
  onCancelOrder,
}: {
  studentSession: StudentSession;
  orders: AppOrder[];
  activeToken: string | null;
  setActiveToken: (token: string | null) => void;
  onAddOrder: (
    order: Omit<AppOrder, "id" | "orderNumber" | "createdAt" | "dueTime">,
  ) => Promise<void>;
  onCancelOrder: (id: string) => Promise<void>;
}) {
  const [docs, setDocs] = useState<PrintDocumentItem[]>([]);
  const [printType, setPrintType] = useState<"bw" | "color">("bw");
  const [paperSize, setPaperSize] = useState<"A4" | "A3">("A4");
  const [sides, setSides] = useState<"single" | "double">("double");
  const [binding, setBinding] = useState<"none" | "staple" | "spiral">("none");
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

  const totalPages = docs.reduce((sum, doc) => sum + doc.pages, 0);
  const totalCopies = docs.reduce((sum, doc) => sum + doc.copies, 0);
  const totalWeightedPages = docs.reduce((sum, doc) => sum + doc.pages * doc.copies, 0);

  const pageRate = (printType === "color" ? 5 : 1.5) * (paperSize === "A3" ? 2 : 1);
  const bindingCostPerCopy = binding === "spiral" ? 25 : binding === "staple" ? 5 : 0;
  const printOnlyCost = docs.reduce((sum, doc) => sum + doc.pages * doc.copies * pageRate, 0);
  const totalBindingCost = docs.length > 0 ? bindingCostPerCopy * totalCopies : 0;
  const printCost = printOnlyCost + totalBindingCost;

  const addonCost = stationeryAddonOptions
    .filter((item) => stationeryAddons.includes(item.name))
    .reduce((sum, item) => sum + item.price, 0);

  const catalogCost = stationeryCatalog
    .filter((item) => selectedCatalogItems.includes(item.id))
    .reduce((sum, item) => sum + item.price, 0);

  const stationeryCost = addonCost + catalogCost;
  const total = useMemo(() => Math.round(printCost + stationeryCost), [printCost, stationeryCost]);

  const studentDisplayLabel = studentSession.name
    ? `${studentSession.name} (${studentSession.rollNo})`
    : studentSession.rollNo;

  const studentOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.student === studentDisplayLabel ||
        o.student.includes(studentSession.rollNo) ||
        (studentSession.name && o.student === studentSession.name),
    );
  }, [orders, studentDisplayLabel, studentSession.name, studentSession.rollNo]);

  const activeOrder = orders.find((o) => o.orderNumber === activeToken) ?? null;

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];

    const validDocs: PrintDocumentItem[] = [];
    const rejectedMessages: string[] = [];

    Array.from(files).forEach((next, index) => {
      if (next.size > 25 * 1024 * 1024) {
        rejectedMessages.push(`"${next.name}" exceeds 25 MB.`);
        return;
      }
      if (!allowed.includes(next.type)) {
        rejectedMessages.push(`"${next.name}" is not a PDF, DOCX, JPG, or PNG.`);
        return;
      }
      validDocs.push({
        id: `doc-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        file: next,
        pages: 1,
        copies: 1,
      });
    });

    if (validDocs.length > 0) {
      setDocs((prev) => [...prev, ...validDocs]);
      toast.success(
        validDocs.length === 1
          ? `Attached "${validDocs[0].file.name}"`
          : `Attached ${validDocs.length} documents`,
      );
    }

    setFileError(rejectedMessages.length > 0 ? rejectedMessages.join(" ") : null);
  };

  const updateDoc = (
    docId: string,
    patch: Partial<Pick<PrintDocumentItem, "pages" | "copies">>,
  ) => {
    setDocs((prev) => prev.map((doc) => (doc.id === docId ? { ...doc, ...patch } : doc)));
  };

  const removeDoc = (docId: string) => {
    setDocs((prev) => prev.filter((doc) => doc.id !== docId));
    setFileError(null);
  };

  const clearAllDocs = () => {
    setDocs([]);
    setFileError(null);
  };

  const handleToggleCatalogItem = (itemId: string, itemName: string) => {
    setSelectedCatalogItems((prev) => {
      const exists = prev.includes(itemId);
      if (exists) {
        toast.info(`Removed "${itemName}" from order`);
        return prev.filter((id) => id !== itemId);
      }
      toast.success(`Added "${itemName}" to order`);
      return [...prev, itemId];
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

      const docSummary =
        docs.length === 0 ? "Stationery Only Order" : docs.map((doc) => doc.file.name).join(", ");

      await onAddOrder({
        student: studentDisplayLabel,
        documentName: docSummary,
        pageCount: docs.length > 0 ? totalPages : 0,
        copies: docs.length > 0 ? totalCopies : 1,
        printColor: printType,
        pageSize: paperSize === "A3" ? "a3" : "a4",
        duplex: sides === "double",
        binding,
        stationeryItems: allStationeryNames,
        status: "pending",
        totalAmount: total,
      });

      toast.success("Payment completed! Order submitted to print queue.");
      setPaymentOpen(false);
      clearAllDocs();
      setStationeryAddons([]);
      setSelectedCatalogItems([]);
    } catch {
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
          <p className="mb-1 text-sm font-semibold text-primary">
            Signed in as {studentDisplayLabel}
          </p>
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
                <p className="text-xs font-bold uppercase text-primary">Step 1 · Documents</p>
                <h2 className="mt-1 font-display text-xl font-bold">Upload your documents</h2>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {docs.length === 1 ? "1 file selected" : `${docs.length} files selected`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {docs.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={clearAllDocs}>
                    Clear all
                  </Button>
                )}
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <FileText className="size-5" />
                </div>
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
                multiple
                className="sr-only"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
                accept=".pdf,.docx,.jpg,.jpeg,.png"
              />
              <div className="mb-3 grid size-11 place-items-center rounded-full bg-card text-primary shadow-sm">
                <Upload className="size-5" />
              </div>
              <span className="font-semibold">Drop files here or choose from device</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Select one or multiple files · PDF, DOCX, JPG or PNG · up to 25 MB each
              </span>
            </label>

            {fileError && (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                {fileError}
              </p>
            )}

            {docs.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        {doc.file.type.startsWith("image/") ? (
                          <Image className="size-4" />
                        ) : (
                          <FileText className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{doc.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor={`pages-${doc.id}`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Pages
                        </label>
                        <Input
                          id={`pages-${doc.id}`}
                          aria-label={`Pages for ${doc.file.name}`}
                          type="number"
                          min={1}
                          max={1000}
                          value={doc.pages}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            updateDoc(doc.id, {
                              pages: Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(1000, parsed)),
                            });
                          }}
                          className="h-8 w-16 text-center text-xs"
                        />
                      </div>

                      <div className="flex items-center rounded-md border border-input bg-card">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => updateDoc(doc.id, { copies: Math.max(1, doc.copies - 1) })}
                          disabled={doc.copies <= 1}
                          aria-label={`Decrease copies for ${doc.file.name}`}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-7 text-center text-xs font-bold">{doc.copies}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            updateDoc(doc.id, { copies: Math.min(100, doc.copies + 1) })
                          }
                          aria-label={`Increase copies for ${doc.file.name}`}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => removeDoc(doc.id)}
                        aria-label={`Remove ${doc.file.name}`}
                        title={`Remove ${doc.file.name}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="size-4" /> Your files are securely deleted from storage after
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
                    onClick={() => {
                      if (docs.length === 1) {
                        updateDoc(docs[0].id, { copies: Math.max(1, docs[0].copies - 1) });
                      }
                    }}
                    disabled={docs.length !== 1 || docs[0].copies <= 1}
                    aria-label="Decrease copies"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <strong>{totalCopies}</strong>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() => {
                      if (docs.length === 1) {
                        updateDoc(docs[0].id, { copies: Math.min(100, docs[0].copies + 1) });
                      }
                    }}
                    disabled={docs.length !== 1}
                    aria-label="Increase copies"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                {docs.length > 1 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Combined copies across {docs.length} documents (edit per file above)
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="page-count" className="mb-2 block text-sm font-bold">
                  Number of pages
                </label>
                <Input
                  id="page-count"
                  type="number"
                  min={docs.length > 0 ? 1 : 0}
                  max={1000}
                  value={totalPages}
                  disabled={docs.length !== 1}
                  onChange={(event) => {
                    if (docs.length !== 1) return;
                    const parsed = Number(event.target.value);
                    updateDoc(docs[0].id, {
                      pages: Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(1000, parsed)),
                    });
                  }}
                />
                {docs.length > 1 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Combined pages across {docs.length} documents (edit per file above)
                  </p>
                )}
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

          {/* Campus Stationery Storefront */}
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
              {docs.length > 0 ? (
                <div className="flex justify-between">
                  <span className="text-primary-foreground/75">
                    Printing ({docs.length} {docs.length === 1 ? "file" : "files"} ·{" "}
                    {totalWeightedPages} {totalWeightedPages === 1 ? "page" : "pages"})
                  </span>
                  <strong>₹{Math.round(printOnlyCost)}</strong>
                </div>
              ) : (
                <div className="flex justify-between text-primary-foreground/75">
                  <span>No document attached</span>
                  <strong>₹0</strong>
                </div>
              )}

              {docs.length > 0 && binding !== "none" && (
                <div className="flex justify-between">
                  <span className="text-primary-foreground/75">
                    {binding === "spiral" ? "Spiral binding" : "Staple binding"} ({totalCopies}{" "}
                    {totalCopies === 1 ? "copy" : "copies"})
                  </span>
                  <strong>₹{totalBindingCost}</strong>
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
              className="mt-6 w-full bg-primary-foreground font-bold text-primary hover:bg-primary-foreground/90"
              disabled={docs.length === 0 && stationeryCost === 0}
              onClick={() => setPaymentOpen(true)}
            >
              Proceed to payment <ArrowRight className="ml-1 size-4" />
            </Button>
            {docs.length === 0 && stationeryCost === 0 && (
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
                  Counter is ready · Average wait: 15 minutes
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

      {/* Student Order History */}
      <section className="mt-8 rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Your History</p>
            <h2 className="mt-1 font-display text-xl font-bold">My Recent Orders</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {studentOrders.length} {studentOrders.length === 1 ? "order" : "orders"}
          </span>
        </div>

        {studentOrders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No orders placed under Roll No {studentSession.rollNo} yet.
          </p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {studentOrders.map((ord) => {
              const isCurrent = ord.orderNumber === activeToken;
              return (
                <div
                  key={ord.id}
                  className={cn(
                    "flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
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
                    <p className="text-sm font-semibold">{ord.documentName}</p>
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
        )}
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
                  <span className="block font-semibold">{name}</span>
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
// Sub-components
// ─────────────────────────────────────────────────────────────────
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
        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
      )}
    >
      <div
        className={cn("mb-4 grid aspect-[4/3] place-items-center rounded-md", `product-${tone}`)}
      >
        <Icon className="size-9" strokeWidth={1.5} />
      </div>
      <p className="truncate text-sm font-bold">{name}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{detail}</p>
      <div className="mt-4 flex items-center justify-between">
        <strong className="font-display text-sm">{price}</strong>
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
