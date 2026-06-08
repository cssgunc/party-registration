"use client";
import { ReactNode, createContext, useContext, useState } from "react";

type SidebarContextType = {
  isOpen: boolean;
  title: string | null;
  description: string | null;
  selectedKey: string | null;
  bodyNode: HTMLElement | null;
  headerActionNode: HTMLElement | null;
  setBodyNode: (node: HTMLElement | null) => void;
  setHeaderActionNode: (node: HTMLElement | null) => void;
  openSidebar: (key: string, title: string, description: string) => void;
  closeSidebar: () => void;
};

interface SidebarProviderProps {
  children: ReactNode;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [bodyNode, setBodyNode] = useState<HTMLElement | null>(null);
  const [headerActionNode, setHeaderActionNode] = useState<HTMLElement | null>(
    null
  );

  const openSidebar = (key: string, title: string, description: string) => {
    setSelectedKey(key);
    setTitle(title);
    setDescription(description);
    setIsOpen(true);
  };

  const closeSidebar = () => {
    setIsOpen(false);
    setSelectedKey(null);
    setTitle(null);
    setDescription(null);
  };

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        title,
        description,
        selectedKey,
        bodyNode,
        headerActionNode,
        setBodyNode,
        setHeaderActionNode,
        openSidebar,
        closeSidebar,
      }}
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
