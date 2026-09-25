"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type PasswordChangeContextValue = {
  newPassword: string;
  setNewPassword: (value: string) => void;
};

const PasswordChangeContext = createContext<PasswordChangeContextValue | null>(null);

export function PasswordChangeProvider({ children }: { children: ReactNode }) {
  const [newPassword, setNewPassword] = useState("");

  return (
    <PasswordChangeContext.Provider value={{ newPassword, setNewPassword }}>
      {children}
    </PasswordChangeContext.Provider>
  );
}

export function usePendingNewPassword(): PasswordChangeContextValue {
  const context = useContext(PasswordChangeContext);
  if (!context) {
    throw new Error("usePendingNewPassword must be used within PasswordChangeProvider");
  }
  return context;
}
