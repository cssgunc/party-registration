"use client";
import { createContext, ReactNode, useContext, useState } from "react";

type SidebarContextType = {
  isOpen: boolean;
  content: ReactNode | null;
  openSidebar: (content: ReactNode) => void;
  closeSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ReactNode | null>(null);

  const openSidebar = (content: ReactNode) => {
    setContent(content);
    setIsOpen(true);
  };

  const closeSidebar = () => {
    setIsOpen(false);
    setContent(null);
  };

  return (
    <SidebarContext.Provider
      value={{ isOpen, content, openSidebar, closeSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context)
    throw new Error("useSidebar must be used within SidebarProvider");
  return context;
};
