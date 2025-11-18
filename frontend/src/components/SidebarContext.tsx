"use client";
import { createContext, ReactNode, useContext, useState } from "react";

type SidebarContextType = {
  isOpen: boolean;
  content: ReactNode | null;
  selectedKey: string | null;
  openSidebar: (key: string, content: ReactNode) => void;
  closeSidebar: () => void;
};
interface SidebarProviderProps {
  children: ReactNode;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ReactNode | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const openSidebar = (key: string, content: ReactNode) => {
    setContent(content);
    setSelectedKey(key);
    setIsOpen(true);
  };

  const closeSidebar = () => {
    setIsOpen(false);
    setContent(null);
    setSelectedKey(null);
  };

  return (
    <SidebarContext.Provider
      value={{ isOpen, content, selectedKey, openSidebar, closeSidebar }}
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
