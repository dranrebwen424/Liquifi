"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Building2, SearchX, FolderPlus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { createDepartment } from "@/actions/departments";
import { CssBottomSheet } from "@/components/ui/CssBottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { DepartmentCard } from "@/components/admin/DepartmentCard";
import { filterDepartments, type DepartmentSummary } from "@/lib/admin-departments";

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

type Props = {
  initialDepartments: DepartmentSummary[];
  loadError?: string;
};

export function DepartmentsListClient({ initialDepartments, loadError }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [departments, setDepartments] = useState(initialDepartments);
  const [createView, setCreateView] = useState<null | "modal" | "sheet">(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Search lives in the top bars (desktop AdminTopBar / mobile AdminMobileTopBar), both write ?q=.
  const search = searchParams.get("q") ?? "";

  const filtered = useMemo(
    () => filterDepartments(departments, { query: search, status: "all", staffing: "all", sort: "name" }),
    [departments, search],
  );

  const clearSearch = () => router.replace("/admin/departments", { scroll: false });

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
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          id="dept-name"
          type="text"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setCreateError(""); }}
          placeholder=" "
          className="peer w-full rounded-lg border border-border-strong bg-surface pb-2 pl-4 pr-4 pt-6 text-sm text-text-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <label
          htmlFor="dept-name"
          className="pointer-events-none absolute left-4 top-1/2 z-10 origin-left -translate-y-1/2 text-sm text-text-muted transition-all duration-150 peer-focus:top-2 peer-focus:translate-y-0 peer-focus:scale-90 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-xs"
        >
          Department Name
        </label>
      </div>
      <div className="relative">
        <input
          id="dept-code"
          type="text"
          value={newCode}
          onChange={(e) => { setNewCode(e.target.value); setCreateError(""); }}
          placeholder=" "
          maxLength={10}
          className="peer w-full rounded-lg border border-border-strong bg-surface pb-2 pl-4 pr-4 pt-6 text-sm uppercase text-text-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <label
          htmlFor="dept-code"
          className="pointer-events-none absolute left-4 top-1/2 z-10 origin-left -translate-y-1/2 text-sm text-text-muted transition-all duration-150 peer-focus:top-2 peer-focus:translate-y-0 peer-focus:scale-90 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-xs"
        >
          Code
        </label>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative pt-1 md:pt-3">
        <h1 className="text-center text-base font-bold uppercase text-text-primary md:text-xl">
          Welcome Back!
        </h1>
        <div className="mt-10 flex items-end justify-between gap-3 md:mt-14">
          <div>
            <h2 className="text-base font-medium text-text-primary md:text-xl">Departments</h2>
            <p className="text-xs text-text-muted">
              Total of {filtered.length} {filtered.length === 1 ? "Department" : "Departments"}
            </p>
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

      {/* ── Query failure banner ─────────────────────────────────── */}
      {loadError && (
        <div className="mx-auto mt-5 w-full max-w-lg rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {loadError}
        </div>
      )}

      <div className="mb-24 mt-4 px-1.5 md:mb-12 md:mt-8 md:px-0">
        {departments.length === 0 && !loadError ? (
          <EmptyState
            icon={<Building2 />}
            title="No departments yet"
            description="Create a department to start organizing events, reports, and accounts."
            action={
              <button
                onClick={() => setCreateView("modal")}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
              >
                Create Department
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="No matching departments"
            description="Try another search or clear the current search."
            action={
              <button
                onClick={clearSearch}
                className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
              >
                Clear search
              </button>
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5 xl:grid-cols-3"
          >
            {filtered.map((dept) => (
              <motion.div key={dept.id} variants={fadeUpItem}>
                <DepartmentCard department={dept} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

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
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light text-accent">
                <FolderPlus className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-text-primary">New Department</h2>
            </div>
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
        <div className="fixed inset-0 z-50 bg-overlay-alpha backdrop-blur-sm md:hidden" onClick={closeCreate} />
      )}
      <CssBottomSheet open={createView === "sheet"} hideAt="md" onClose={closeCreate}>
        <div
          className="rounded-t-3xl border-t border-border bg-surface p-6 pb-8 shadow-card"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong" />
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light text-accent">
              <FolderPlus className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">New Department</h2>
          </div>
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
      </CssBottomSheet>

      {/* ── Mobile FAB ───────────────────────────────────────────── */}
      {!createView && (
        <button
          onClick={() => setCreateView("sheet")}
          className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] md:hidden"
          aria-label="New department"
        >
          <Plus className="h-8 w-8" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
