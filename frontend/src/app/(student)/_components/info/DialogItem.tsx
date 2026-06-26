"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { ReactNode, useState } from "react";

type DialogItemProps = {
  title: string;
  children: ReactNode;
};

/**
 * An expandable info item that renders as a full-width button row and opens a
 * scrollable modal dialog containing its children when clicked.
 */
export default function DialogItem({ title, children }: DialogItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="flex h-auto w-full items-center justify-between gap-4 rounded-none border-b px-6 has-[>svg]:px-4 py-4 text-left last:border-b-0 hover:bg-muted/50"
      >
        <span>{title}</span>
        <Info className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-text">
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Modal with detailed information for this section.
            </DialogDescription>
          </DialogHeader>
          <div className="content space-y-4">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
