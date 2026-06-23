"use client";
import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Global right-hand sidebar sheet rendered once in the staff layout.
 *
 * Reads open/close state, title, description, and the portal target refs
 * from `SidebarContext`. Individual panels portal their content into the
 * `bodyNode` div via `SidebarContent`.
 */
function Sidebar() {
  const {
    isOpen,
    closeSidebar,
    title,
    description,
    setBodyNode,
    setHeaderActionNode,
  } = useSidebar();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeSidebar();
      }}
    >
      <SheetContent
        side="right"
        // Radix wires aria-describedby automatically when a SheetDescription
        // is rendered; opt out explicitly when there is no description so it
        // doesn't warn about a dangling reference.
        {...(description ? {} : { "aria-describedby": undefined })}
        className="w-full max-w-[25em] gap-0 bg-card p-0 sm:max-w-[25em]"
        onInteractOutside={(e) => {
          // Radix portals (Popover, Select, DatePicker, etc.) render outside the
          // Sheet's DOM but are logically inside it. Prevent them from closing the sheet.
          if (
            (e.target as Element | null)?.closest(
              "[data-radix-popper-content-wrapper]"
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader className="mb-2 gap-0 px-6 pb-2 pt-12">
          <div className="flex items-center justify-between">
            <SheetTitle className="subhead-title text-foreground">
              {title ?? ""}
            </SheetTitle>
            <div ref={setHeaderActionNode} />
          </div>
          {description && (
            <SheetDescription className="text-sm text-muted-foreground">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        {/* Scrollable content portal target */}
        <div ref={setBodyNode} className="flex-1 overflow-y-auto px-6 pb-6" />
      </SheetContent>
    </Sheet>
  );
}

export default Sidebar;
