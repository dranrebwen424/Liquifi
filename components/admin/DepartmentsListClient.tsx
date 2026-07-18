"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreVertical, Folder, LayoutGrid, CheckCircle2, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createDepartment } from "@/actions/departments";
import { MobileBottomNav } from "@/components/admin/MobileBottomNav";

// ─── Animation variants ───────────────────────────────────────────────
const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20, duration: 0.2 },
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

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
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
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
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm uppercase text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary md:text-2xl">Departments</h1>
        <p className="mt-1 text-xs text-text-muted">Manage department accounts</p>
      </div>

      {/* New Department — Desktop Modal */}
      {createView === "modal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-overlay-alpha" onClick={closeCreate} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-card">
            <h2 className="mb-6 text-base font-semibold text-text-primary">New Department</h2>
            {newDepartmentForm}
            {createError && (
              <p className="mt-3 text-sm text-error">{createError}</p>
            )}
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || !newCode.trim() || creating}
                className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={closeCreate}
                disabled={creating}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Department — Mobile Bottom Sheet */}
      {createView === "sheet" && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-overlay-alpha" onClick={closeCreate} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-6 pb-8 shadow-card">
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
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={closeCreate}
                disabled={creating}
                className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + New */}
      <>
        <div className="hidden items-center gap-3 md:flex">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search department"
              className="w-full rounded-full border border-accent bg-surface py-3 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            onClick={() => setCreateView("modal")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            New Department
          </button>
        </div>
        <div className="flex items-center gap-3 md:hidden">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search department"
              className="w-full rounded-full border border-accent bg-surface py-3 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      </>

      {/* Empty state or grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No departments found"
          description={search ? "No departments match your search." : "No departments yet. Create your first department."}
          action={
            !search ? (
              <button
                onClick={() => setCreateView("modal")}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                New Department
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Web: folder cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="hidden grid-cols-1 gap-x-5 gap-y-8 sm:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          >
            {filtered.map((dept) => (
              <motion.div key={dept.id} variants={fadeUpItem}>
                <Link
                  href={`/admin/departments/${dept.id}`}
                  className="mx-auto flex h-[200px] w-full max-w-[280px] flex-col rounded-xl border border-border-strong bg-surface p-6 transition-all duration-200 hover:border-accent hover:shadow-lg hover:scale-[1.02]"
                >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 text-lg font-semibold leading-6 text-text-primary line-clamp-2">
                    {dept.name}
                  </h3>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light text-accent">
                    <Folder className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                  {dept.code}
                </p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                  <div className="flex flex-col gap-0.5 text-[11px] leading-4 text-text-muted">
                    <span>Adviser: {dept.adviser ?? "None"}</span>
                    <span>Treasurer: {dept.treasurer ?? "None"}</span>
                  </div>
                  <StatusBadge variant={dept.is_active ? "success" : "neutral"}>
                    {dept.is_active ? "Active" : "Inactive"}
                  </StatusBadge>
                </div>
              </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Mobile: folder card stack */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4 md:hidden"
          >
            {filtered.map((dept) => (
              <motion.div key={dept.id} variants={fadeUpItem} className="relative flex items-start justify-between gap-3 rounded-xl border border-border-strong bg-surface p-4">
                <Link href={`/admin/departments/${dept.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-text-primary">
                    {dept.name}
                  </p>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                    {dept.code}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-text-muted">
                    {dept.adviser ?? "No adviser"} · {dept.treasurer ?? "No treasurer"}
                  </p>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge variant={dept.is_active ? "success" : "neutral"}>
                    {dept.is_active ? "Active" : "Inactive"}
                  </StatusBadge>
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === dept.id ? null : dept.id)}
                    className="-mr-1 rounded-md p-1 text-text-muted hover:bg-surface-tertiary hover:text-text-primary"
                    aria-label="Open menu"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
                {menuOpenId === dept.id && (
                  <div className="absolute right-3 top-14 z-10 w-36 rounded-lg border border-border bg-surface py-1 shadow-card">
                    <Link
                      href={`/admin/departments/${dept.id}`}
                      className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                      onClick={() => setMenuOpenId(null)}
                    >
                      View details
                    </Link>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </>
      )}

      {/* Mobile FAB */}
      {!createView && (
        <button
          onClick={() => setCreateView("sheet")}
          className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-95 md:hidden"
          aria-label="New department"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <MobileBottomNav />
    </div>
  );
}
