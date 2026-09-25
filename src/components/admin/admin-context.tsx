"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StorageMode } from "@/lib/storage/client";

interface AdminContextValue {
  storageMode: StorageMode;
  siteUrl: string;
  exhibitionTitle: string;
  organizer: string;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ value, children }: { value: AdminContextValue; children: ReactNode }) {
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
