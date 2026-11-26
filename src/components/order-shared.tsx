import { Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

export const statusDisplayMap: Record<
  OrderDbStatus,
  { label: string; tone: string; stageIndex: number }
> = {
  pending: { label: "New", tone: "status-new", stageIndex: 0 },
  accepted: { label: "Accepted", tone: "status-new", stageIndex: 0 },
  printing: { label: "Printing", tone: "status-printing", stageIndex: 1 },
  binding: { label: "Binding", tone: "status-binding", stageIndex: 1 },
  ready: { label: "Ready", tone: "status-ready", stageIndex: 2 },
  collected: { label: "Completed", tone: "status-ready", stageIndex: 3 },
  cancelled: { label: "Cancelled", tone: "bg-destructive/15 text-destructive", stageIndex: -1 },
};

export const initialOrders: AppOrder[] = [
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
];

/** Fetches recent print orders from Supabase and maps them to AppOrder records. */
export async function fetchOrdersFromSupabase(): Promise<AppOrder[]> {
  const { data, error } = await supabase
    .from("print_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((item) => {
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
      student: "Campus Student",
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
        item.status === "ready" ? "Ready now" : item.status === "collected" ? "Done" : "15 min",
      createdAt: item.created_at,
    };
  });
}

/** Inserts a newly placed print order into Supabase and returns the persisted id if available. */
export async function insertOrderToSupabase(order: AppOrder): Promise<string | null> {
  const { data, error } = await supabase
    .from("print_orders")
    .insert({
      order_number: order.orderNumber,
      document_name: order.documentName || "Stationery Order",
      storage_path: `documents/${order.orderNumber}`,
      page_count: order.pageCount,
      copies: order.copies,
      print_color: order.printColor,
      page_size: order.pageSize,
      duplex: order.duplex,
      binding: order.binding,
      total_amount: order.totalAmount,
      status: order.status,
      notes:
        order.stationeryItems.length > 0
          ? `Student: ${order.student} | Stationery: ${order.stationeryItems.join(", ")}`
          : `Student: ${order.student}`,
      user_id: "110721e5-4bdf-475c-909c-cda4cfd6832d",
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id;
}

/** Segmented toggle group for print and staff form options. */
export function OptionGroup({
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

/** KPI summary card used on the staff operations view. */
export function Metric({
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

/** Pill badge displaying an order's current fulfillment status. */
export function Status({ status }: { status: OrderDbStatus }) {
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

/** Legend row for the staff order-mix chart. */
export function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", color)} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
