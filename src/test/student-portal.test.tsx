import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  },
}));

import { Route } from "@/routes/index";

describe("StudentPortal access, initial state, and multi-doc upload", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hides the staff dashboard and prompts for student roll number at entry", async () => {
    const Page = Route.options.component!;
    render(<Page />);

    expect(await screen.findByLabelText("Roll Number")).toBeInTheDocument();
    expect(screen.queryByText(/Staff sign in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Shop Staff Dashboard/i)).not.toBeInTheDocument();
  });

  it("signs in with roll number, starts at 0 files selected and ₹0, and supports multiple docs", async () => {
    const Page = Route.options.component!;
    const { container } = render(<Page />);

    fireEvent.change(await screen.findByLabelText("Roll Number"), {
      target: { value: "22cs101" },
    });
    fireEvent.change(screen.getByLabelText(/Student Name/i), {
      target: { value: "Alekhya" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Student Portal/i }));

    expect(await screen.findByText("Roll No: 22CS101")).toBeInTheDocument();
    expect(screen.getByText("0 files selected")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of pages")).toHaveValue(0);
    expect(screen.getAllByText("₹0").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /Proceed to payment/i })).toBeDisabled();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toHaveAttribute("multiple");

    const pdfOne = new File(["doc1"], "lab1.pdf", { type: "application/pdf" });
    const pdfTwo = new File(["doc2"], "notes.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [pdfOne, pdfTwo] } });

    expect(screen.getByText("2 files selected")).toBeInTheDocument();
    expect(screen.getByText("lab1.pdf")).toBeInTheDocument();
    expect(screen.getByText("notes.pdf")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of pages")).toHaveValue(2);
    expect(screen.getByRole("button", { name: /Proceed to payment/i })).toBeEnabled();

    fireEvent.change(screen.getByLabelText("Pages for lab1.pdf"), {
      target: { value: "4" },
    });
    expect(screen.getByLabelText("Number of pages")).toHaveValue(5);

    fireEvent.click(screen.getByRole("button", { name: "Remove lab1.pdf" }));
    expect(screen.getByText("1 file selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove notes.pdf" }));
    expect(screen.getByText("0 files selected")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of pages")).toHaveValue(0);
    expect(screen.getAllByText("₹0").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /Proceed to payment/i })).toBeDisabled();
  });
});
