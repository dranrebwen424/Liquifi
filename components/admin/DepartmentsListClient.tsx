"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Folder, Loader2, FolderPlus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { createDepartment } from "@/actions/departments";
import { AdminMobileBottomNav } from "@/components/admin/MobileBottomNav";

// ─── Animation variants ───────────────────────────────────────────────
const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 18, duration: 0.4 },
  },
};

export type DepartmentWithUsers = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  adviser: string | null;
  treasurer: string | null;
};

type Props = {
  initialDepartments: DepartmentWithUsers[];
};

export function DepartmentsListClient({ initialDepartments }: Props) {
  const router = useRouter();
  const [departments, setDepartments] = useState(initialDepartments);
  const [search, setSearch] = useState("");
  const [createView, setCreateView] = useState<null | "modal" | "sheet">(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const filtered = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()),
  );

  const closeCreate = () => {
    setCreateView(null);
    setNewName("");
    setNewCode("");
    setCreateError("");
  };

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || !newCode.trim()) return;
    setCreating(true);
    setCreateError("");
    const result = await createDepartment(newName.trim(), newCode.trim());
    if (result.success && result.department) {
      closeCreate();
      setDepartments((prev) => [
        ...prev,
        { ...result.department, created_at: new Date().toISOString(), adviser: null, treasurer: null },
      ]);
      router.refresh();
    } else {
      setCreateError(result.error);
    }
    setCreating(false);
  }, [newName, newCode, router]);

  const newDepartmentForm = (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex-1">
        <label htmlFor="dept-name" className="mb-1.5 block text-xs font-medium text-text-muted">
          Department Name
        </label>
        <input
          id="dept-name"
          type="text"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setCreateError(""); }}
          placeholder="e.g. College of Engineering"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
      </div>
      <div className="w-full sm:w-32">
        <label htmlFor="dept-code" className="mb-1.5 block text-xs font-medium text-text-muted">
          Code
        </label>
        <input
          id="dept-code"
          type="text"
          value={newCode}
          onChange={(e) => { setNewCode(e.target.value); setCreateError(""); }}
          placeholder="e.g. COE"
          maxLength={10}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm uppercase text-text-primary placeholder:text-text-muted transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Welcome header ───────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-5 pb-8 pt-10 md:pt-14">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-[42px]">
          Welcome Back!
        </h1>

        {/* Search + New Department */}
        <div className="flex w-full max-w-lg items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Department...."
              className="w-full rounded-full bg-surface-secondary py-3.5 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-all focus:ring-2 focus:ring-accent/10 focus:shadow-[0_0_0_4px_rgba(17,17,20,0.04)]"
            />
          </div>
          <button
            onClick={() => setCreateView("modal")}
            className="hidden shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] md:inline-flex"
          >
            <FolderPlus className="h-4 w-4" />
            New Department
          </button>
        </div>
      </div>

      {/* ── Department card grid ─────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-5"
      >
        {filtered.map((dept) => (
          <motion.div key={dept.id} variants={fadeUpItem}>
            <Link
              href={`/admin/departments/${dept.id}`}
              className="group flex h-full min-h-[230px] w-full flex-col rounded-[24px] border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_8px_30px_-8px_rgba(17,17,20,0.12)]"
            >
              {/* Top row: folder icon + checkmark */}
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-secondary text-text-muted transition-colors duration-200 group-hover:bg-accent group-hover:text-accent-foreground">
                  <Folder className="h-5 w-5" />
                </div>
                {dept.is_active && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Department name + code */}
              <div className="mt-4">
                <h3 className="text-[15px] font-semibold leading-snug text-text-primary line-clamp-2">
                  {dept.name}
                </h3>
                <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  {dept.code}
                </p>
              </div>

              {/* Divider + Adviser / Treasurer */}
              <div className="mt-auto border-t border-border-light pt-3">
                <div className="flex items-center justify-between py-1 text-[12px]">
                  <span className="text-text-muted">Adviser</span>
                  <span className="truncate ml-3 max-w-[60%] text-right font-medium text-text-dark">
                    {dept.adviser ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-[12px]">
                  <span className="text-text-muted">Treasurer</span>
                  <span className="truncate ml-3 max-w-[60%] text-right font-medium text-text-dark">
                    {dept.treasurer ?? "—"}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* ── New Department — Desktop Modal ────────────────────────── */}
      {createView === "modal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-overlay-alpha backdrop-blur-sm" onClick={closeCreate} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-card"
          >
            <h2 className="mb-6 text-base font-semibold text-text-primary">New Department</h2>
            {newDepartmentForm}
            {createError && (
              <p className="mt-3 text-sm text-error">{createError}</p>
            )}
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || !newCode.trim() || creating}
                className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={closeCreate}
                disabled={creating}
                className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── New Department — Mobile Bottom Sheet ──────────────────── */}
      {createView === "sheet" && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-overlay-alpha backdrop-blur-sm" onClick={closeCreate} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-surface p-6 pb-8 shadow-card">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong" />
            <h2 className="mb-5 text-base font-semibold text-text-primary">New Department</h2>
            {newDepartmentForm}
            {createError && (
              <p className="mt-3 text-sm text-error">{createError}</p>
            )}
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || !newCode.trim() || creating}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={closeCreate}
                disabled={creating}
                className="flex-1 rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile FAB ───────────────────────────────────────────── */}
      {!createView && (
        <button
          onClick={() => setCreateView("sheet")}
          className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 sm:hidden"
          aria-label="New department"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <AdminMobileBottomNav />
    </div>
  );
}
