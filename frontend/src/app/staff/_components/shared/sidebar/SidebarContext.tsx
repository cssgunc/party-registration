"use client";
import { ReactNode, createContext, useContext, useState } from "react";

type SidebarContextType = {
  isOpen: boolean;
  title: string | null;
  description: string | null;
  content: ReactNode | null;
  selectedKey: string | null;
  openSidebar: (
    key: string,
    title: string,
    description: string,
    content: ReactNode
  ) => void;
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
  const [content, setContent] = useState<ReactNode | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const openSidebar = (
    key: string,
    title: string,
    description: string,
    content: ReactNode
  ) => {
    setContent(content);
    setTitle(title);
    setDescription(description);
    setSelectedKey(key);
    setIsOpen(true);
  };

  const closeSidebar = () => {
    setIsOpen(false);
    setContent(null);
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
        content,
        selectedKey,
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
