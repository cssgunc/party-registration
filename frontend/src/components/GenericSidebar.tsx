"use client";
import { useSidebar } from "@/components/SidebarContext";
import { Sheet } from "lucide-react";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

function GenericSidebar() {
  const { isOpen, title, description, content } = useSidebar();

  if (!isOpen) return null;

  return (
    <Sheet>
      <SheetTrigger>{/* Add sheet trigger*/}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}

export default GenericSidebar;
