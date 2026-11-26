import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Clock3,
  Filter,
  LogOut,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type AppOrder,
  type OrderDbStatus,
  Legend,
  Metric,
  OptionGroup,
  Status,
  fetchOrdersFromSupabase,
  initialOrders,
  insertOrderToSupabase,
  statusDisplayMap,
} from "@/components/order-shared";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [{ title: "XeroxExpress — Staff Operations" }],
  }),
  component: StaffPortalPage,
});

function StaffPortalPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [counterOpen, setCounterOpen] = useState(true);
  const [orders, setOrders] = useState<AppOrder[]>(initialOrders);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    let isMounted = true;
    setIsSyncing(true);
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
      })
      .finally(() => {
        if (isMounted) setIsSyncing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authenticated]);

  const handleStaffSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
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
        await supabase.auth.signOut();
        toast.error(`Could not verify account access: ${roleError.message}`);
        return;
      }

      const isStaff = userRoles.some(
        ({ role: userRole }) => userRole === "staff" || userRole === "admin",
      );
      if (!isStaff) {
        await supabase.auth.signOut();
        toast.error("This account does not have staff access.");
        return;
      }

      setAuthenticated(true);
      toast.success("Signed in as staff.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
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

  const updateOrderStatus = async (orderId: string, nextStatus: OrderDbStatus) => {
    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, status: nextStatus } : item)),
    );
    const targetOrder = orders.find((o) => o.id === orderId);
    toast.success(
      `Order ${targetOrder?.orderNumber ?? orderId} updated to ${statusDisplayMap[nextStatus].label}`,
    );
    try {
      await supabase.from("print_orders").update({ status: nextStatus }).eq("id", orderId);
    } catch (err) {
      console.warn("Supabase update notice (persisted locally):", err);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Printer className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Staff Sign In</h1>
              <p className="text-xs text-muted-foreground">Authorized shop staff access only</p>
            </div>
          </div>

          <form onSubmit={handleStaffSignIn} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="staff-email" className="text-sm font-semibold">
                Staff email
              </label>
              <Input
                id="staff-email"
                type="email"
                placeholder="name@xeroxexpress.in"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="staff-password" className="text-sm font-semibold">
                Password
              </label>
              <Input
                id="staff-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn ? "Signing in..." : "Sign in as staff"}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Printer className="size-5" />
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-none">XeroxExpress</p>
              <p className="mt-1 text-xs text-muted-foreground">Shop Staff Operations</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              setAuthenticated(false);
            }}
          >
            <LogOut className="mr-1.5 size-4" /> Sign out
          </Button>
        </div>
      </header>

      <StaffDashboard
        orders={orders}
        onUpdateStatus={updateOrderStatus}
        onAddOrder={addOrder}
        counterOpen={counterOpen}
        setCounterOpen={setCounterOpen}
        isSyncing={isSyncing}
      />
    </div>
  );
}

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
                  <p className="max-w-md truncate text-xs text-muted-foreground">
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
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>

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
                    <p className="text-sm font-semibold">{item.student}</p>
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {item.orderNumber}
                    </span>
                    <Status status={item.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
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
              <label className="mb-1 block text-xs font-bold uppercase">Student Name or ID</label>
              <Input
                placeholder="e.g. Rahul Verma or 2026-CS-042"
                value={walkInStudent}
                onChange={(e) => setWalkInStudent(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase">Document Description</label>
              <Input
                placeholder="e.g. Lab Record / Notes"
                value={walkInDoc}
                onChange={(e) => setWalkInDoc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase">Pages</label>
                <Input
                  type="number"
                  min={1}
                  value={walkInPages}
                  onChange={(e) => setWalkInPages(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase">Copies</label>
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
