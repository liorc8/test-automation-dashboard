import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import InlineNotes from "../InlineNotes";

// The note store is module-level and shared across instances, so each test uses a
// unique entityId to stay isolated.

function addNote(placeholder: RegExp, text: string, scope?: HTMLElement) {
  const root = scope ? within(scope) : screen;
  fireEvent.click(root.getByRole("button", { name: "Add note" }));
  fireEvent.change(root.getByPlaceholderText(placeholder), { target: { value: text } });
  fireEvent.click(root.getByLabelText("Save note"));
}

describe("InlineNotes — visibility logic", () => {
  it("renders Add/Edit/Delete actions in the editable (expanded) view", () => {
    render(<InlineNotes scope="test" entityId="vis-edit" />);
    expect(screen.getByRole("button", { name: "Add note" })).toBeInTheDocument();

    addNote(/Note for this test/i, "remember to retry");

    expect(screen.getByText("remember to retry")).toBeInTheDocument();
    expect(screen.getByLabelText("Edit note")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete note")).toBeInTheDocument();
    // Add stays available to append more notes.
    expect(screen.getByRole("button", { name: "Add note" })).toBeInTheDocument();
  });

  it("read-only (collapsed) view shows labels but no write actions", () => {
    const id = "vis-readonly";
    // Seed a note through an editable instance...
    const { unmount } = render(<InlineNotes scope="test" entityId={id} />);
    addNote(/Note for this test/i, "collapsed label");
    unmount();

    // ...then the read-only view shows the chip with no Add/Edit/Delete.
    render(<InlineNotes scope="test" entityId={id} readOnly />);
    expect(screen.getByText("collapsed label")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add note" })).toBeNull();
    expect(screen.queryByLabelText("Edit note")).toBeNull();
    expect(screen.queryByLabelText("Delete note")).toBeNull();
  });

  it("renders nothing in read-only mode when there are no notes", () => {
    const { container } = render(<InlineNotes scope="test" entityId="empty-readonly" readOnly />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("InlineNotes — JIRA auto-linking", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("turns a JIRA ticket id into a safe new-tab link", () => {
    render(<InlineNotes scope="test" entityId="jira-static" />);
    addNote(/Note for this test/i, "Fixes URM-88888");

    const link = screen.getByRole("link", { name: "URM-88888" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("href")).toMatch(/URM-88888$/);
  });

  it("uses the mocked VITE_JIRA_BASE_URL for link hrefs", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_JIRA_BASE_URL", "https://jira.test/browse/");
    const { default: FreshInlineNotes } = await import("../InlineNotes");

    render(<FreshInlineNotes scope="test" entityId="jira-env" />);
    addNote(/Note for this test/i, "see URM-5 for details");

    const link = screen.getByRole("link", { name: "URM-5" });
    expect(link).toHaveAttribute("href", "https://jira.test/browse/URM-5");
  });
});

describe("InlineNotes — cascading logic", () => {
  it("adding a reason note propagates to all child tests; deleting removes it from all", () => {
    const reasonId = "reason:AREA:R1";
    const t1 = "test:AREA:Test_A";
    const t2 = "test:AREA:Test_B";

    render(
      <>
        <div data-testid="reason"><InlineNotes scope="reason" entityId={reasonId} cascadeTo={[t1, t2]} /></div>
        <div data-testid="t1"><InlineNotes scope="test" entityId={t1} readOnly /></div>
        <div data-testid="t2"><InlineNotes scope="test" entityId={t2} readOnly /></div>
      </>,
    );

    const reason = screen.getByTestId("reason");
    addNote(/Note for this reason/i, "shared infra issue", reason);

    // Cascaded to both child tests.
    expect(within(screen.getByTestId("t1")).getByText("shared infra issue")).toBeInTheDocument();
    expect(within(screen.getByTestId("t2")).getByText("shared infra issue")).toBeInTheDocument();

    // Delete at the reason level cascades the removal to every child test.
    fireEvent.click(within(reason).getByLabelText("Delete note"));

    expect(within(screen.getByTestId("t1")).queryByText("shared infra issue")).toBeNull();
    expect(within(screen.getByTestId("t2")).queryByText("shared infra issue")).toBeNull();
  });
});
