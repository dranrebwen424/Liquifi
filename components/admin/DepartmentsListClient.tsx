"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, SearchX, Building2, FolderPlus, Loader2, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { createDepartment } from "@/actions/departments";
import { CssBottomSheet } from "@/components/ui/CssBottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { DepartmentCard } from "@/components/admin/DepartmentCard";
import {
  filterDepartments,
  type DepartmentSummary,
  type DepartmentStatusFilter,
  type DepartmentStaffingFilter,
  type DepartmentSort,
} from "@/lib/admin-departments";

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
  const [localSearch, setLocalSearch] = useState("");
  const isUrlSearch = searchParams.get("search") === "1";
  const search = isUrlSearch ? searchParams.get("q") ?? "" : localSearch;

  const [statusFilter, setStatusFilter] = useState<DepartmentStatusFilter>("all");
  const [staffingFilter, setStaffingFilter] = useState<DepartmentStaffingFilter>("all");
  const [sort, setSort] = useState<DepartmentSort>("name");
  const [filterOpen, setFilterOpen] = useState(false);

  const [createView, setCreateView] = useState<null | "modal" | "sheet">(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const filtered = useMemo(
    () => filterDepartments(departments, { query: search, status: statusFilter, staffing: staffingFilter, sort }),
    [departments, search, statusFilter, staffingFilter, sort],
  );

  const clearFilters = () => {
    if (isUrlSearch) {
      const params = new URLSearchParams({ search: "1" });
      router.replace(`/admin/departments?${params.toString()}`, { scroll: false });
    }
    setLocalSearch("");
    setStatusFilter("all");
    setStaffingFilter("all");
    setSort("name");
  };

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

  const filterContent = (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-muted">Status</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DepartmentStatusFilter)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-muted">Staffing</span>
        <select
          value={staffingFilter}
          onChange={(e) => setStaffingFilter(e.target.value as DepartmentStaffingFilter)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
        >
          <option value="all">All</option>
          <option value="fully_staffed">Fully staffed</option>
          <option value="needs_adviser">Needs adviser</option>
          <option value="needs_treasurer">Needs treasurer</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-muted">Sort</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as DepartmentSort)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
        >
          <option value="name">Name</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Welcome header ───────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-5 pb-8 pt-10 md:pt-14">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-[42px]">
          Welcome Back!
        </h1>

        {/* Search + actions */}
        <div className="flex w-full max-w-lg items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                const value = event.target.value;
                if (!isUrlSearch) {
                  setLocalSearch(value);
                  return;
                }
                const params = new URLSearchParams({ search: "1" });
                if (value) params.set("q", value);
                router.replace(`/admin/departments?${params.toString()}`, { scroll: false });
              }}
              placeholder="Search Department...."
              className="w-full rounded-full bg-surface-secondary py-3.5 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-all focus:ring-2 focus:ring-accent/10 focus:shadow-[0_0_0_4px_rgba(17,17,20,0.04)]"
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary md:hidden"
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCreateView("modal")}
            className="hidden shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] md:inline-flex"
          >
            <FolderPlus className="h-4 w-4" />
            New Department
          </button>
        </div>

        {/* Desktop inline filters */}
        <div className="hidden w-full max-w-lg items-center gap-3 md:flex">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DepartmentStatusFilter)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={staffingFilter}
            onChange={(e) => setStaffingFilter(e.target.value as DepartmentStaffingFilter)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary"
          >
            <option value="all">All staffing</option>
            <option value="fully_staffed">Fully staffed</option>
            <option value="needs_adviser">Needs adviser</option>
            <option value="needs_treasurer">Needs treasurer</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as DepartmentSort)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary"
          >
            <option value="name">Sort: Name</option>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
          </select>
        </div>
      </div>

      {/* ── Query failure banner ─────────────────────────────────── */}
      {loadError && (
        <div className="mx-auto mb-6 w-full max-w-lg rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {loadError}
        </div>
      )}

      {/* ── Department grid ──────────────────────────────────────── */}
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
          description="Try another search or clear the current filters."
          action={
            <button
              onClick={clearFilters}
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
          className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5"
        >
          {filtered.map((dept) => (
            <motion.div key={dept.id} variants={fadeUpItem}>
              <DepartmentCard department={dept} />
            </motion.div>
          ))}
        </motion.div>
      )}

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
        <div className="fixed inset-0 z-50 bg-overlay-alpha backdrop-blur-sm md:hidden" onClick={closeCreate} />
      )}
      <CssBottomSheet open={createView === "sheet"} hideAt="md" onClose={closeCreate}>
        <div
          className="rounded-t-3xl border-t border-border bg-surface p-6 pb-8 shadow-card"
          role="dialog"
          aria-modal="true"
        >
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
      </CssBottomSheet>

      {/* ── Mobile filter bottom sheet ───────────────────────────── */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 bg-overlay-alpha backdrop-blur-sm md:hidden" onClick={() => setFilterOpen(false)} />
      )}
      <CssBottomSheet open={filterOpen} hideAt="md" onClose={() => setFilterOpen(false)}>
        <div className="rounded-t-3xl border-t border-border bg-surface p-6 pb-8 shadow-card">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong" />
          <h2 className="mb-5 text-base font-semibold text-text-primary">Filters</h2>
          {filterContent}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setFilterOpen(false)}
              className="flex flex-1 items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
            >
              Apply
            </button>
            <button
              onClick={() => { clearFilters(); setFilterOpen(false); }}
              className="flex-1 rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
            >
              Clear
            </button>
          </div>
        </div>
      </CssBottomSheet>

      {/* ── Mobile FAB ───────────────────────────────────────────── */}
      {!createView && !filterOpen && (
        <button
          onClick={() => setCreateView("sheet")}
          className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 md:hidden"
          aria-label="New department"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
