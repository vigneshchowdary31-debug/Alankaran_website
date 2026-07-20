import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Grid,
  List,
  Search,
  UploadCloud,
  Eye,
  Trash2,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Layers,
  Edit3,
  FolderTree,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Send,
  Images,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/admin/ui";
import { SkeletonGalleryGrid } from "@/components/admin/ui/SkeletonGalleryGrid";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { ErrorState } from "@/components/admin/ui/ErrorState";
import { BulkUploadModal } from "./BulkUploadModal";
import { GalleryMetadataModal } from "./GalleryMetadataModal";
import { GalleryPreviewModal } from "./GalleryPreviewModal";
import { TrashModal } from "../TrashModal";
import { cmsService } from "@/domains/cms/services/cms.service";
import { showSuccess, showError } from "@/utils/toast";
import { useUndoStack } from "@/hooks/useUndoStack";
import { useAuth } from "@/context/AuthContext";
import type {
  CMSSlotMetadata,
  CMSSectionWithPublishing,
  CMSTrashRecord,
} from "@/domains/cms/types";

type GallerySlotRow = CMSSlotMetadata & { _isPublished?: boolean };

export function GalleryManager() {
  const { currentUser } = useAuth();
  const { executeWithUndo } = useUndoStack();

  const [section, setSection] = useState<CMSSectionWithPublishing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pageSize, setPageSize] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "trashed">("all");
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [bulkCategoryModalOpen, setBulkCategoryModalOpen] = useState(false);
  const [targetBulkCategory, setTargetBulkCategory] = useState("Royal Weddings");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [trashItems, setTrashItems] = useState<CMSTrashRecord[]>([]);
  const [editingSlot, setEditingSlot] = useState<GallerySlotRow | null>(null);

  const loadGallerySection = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await cmsService.loadSection("gallery");
      setSection(
        (data as CMSSectionWithPublishing) || {
          sectionKey: "gallery", slots: {}, updatedAt: Date.now(), updatedBy: "system",
        }
      );
    } catch (err: any) {
      setLoadError(err.message || "Failed to load Gallery section from Firestore.");
    }
  }, []);

  const loadTrashItems = useCallback(async () => {
    try {
      const items = await cmsService.getTrashItems();
      setTrashItems(items.filter((i) => i.originalLocation?.sectionKey === "gallery"));
    } catch {
      setTrashItems([]);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadGallerySection(), loadTrashItems()]).finally(() => setIsLoading(false));
    const unsubscribe = cmsService.subscribeSection("gallery", (updated) => {
      if (updated) setSection(updated as CMSSectionWithPublishing);
    });
    return () => unsubscribe();
  }, [loadGallerySection, loadTrashItems]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadGallerySection(), loadTrashItems()]);
    setIsRefreshing(false);
  };

  const allSlots = useMemo<GallerySlotRow[]>(() => {
    if (!section) return [];
    const drafts = (section as any).draftSlots || section.slots || {};
    const published = (section as any).publishedSlots || {};
    return Object.values(drafts).map((slot: any) => ({
      ...(slot as CMSSlotMetadata),
      _isPublished: Boolean(published[slot.slotName]),
    }));
  }, [section]);

  const filteredSlots = useMemo<GallerySlotRow[]>(() => {
    return allSlots
      .filter((slot) => {
        if (statusFilter === "trashed") return slot.isDeleted === true;
        if (slot.isDeleted === true) return false;
        if (statusFilter === "published" && !slot._isPublished) return false;
        if (statusFilter === "draft" && slot._isPublished) return false;
        if (categoryFilter !== "All" && (slot.category || "Royal Weddings") !== categoryFilter) return false;
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase();
          const matchName = slot.slotName.toLowerCase().includes(q);
          const matchAlt = (slot.altText || "").toLowerCase().includes(q);
          const matchCaption = (slot.caption || "").toLowerCase().includes(q);
          const matchCategory = (slot.category || "").toLowerCase().includes(q);
          const matchTags = (slot.tags || []).some((t: string) => t.toLowerCase().includes(q));
          if (!matchName && !matchAlt && !matchCaption && !matchCategory && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => (a.order || 99) - (b.order || 99));
  }, [allSlots, statusFilter, categoryFilter, searchQuery]);

  const totalPages = Math.ceil(filteredSlots.length / pageSize) || 1;
  const paginatedSlots = useMemo<GallerySlotRow[]>(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSlots.slice(start, start + pageSize);
  }, [filteredSlots, currentPage, pageSize]);

  const categoriesList = useMemo(() => {
    const set = new Set(allSlots.filter((s) => !s.isDeleted).map((s) => s.category || "Royal Weddings"));
    return ["All", ...Array.from(set)];
  }, [allSlots]);

  const toggleSelectSlot = (slotName: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotName)) next.delete(slotName);
      else next.add(slotName);
      return next;
    });
  };

  const selectAllPaginated = () => {
    const next = new Set(selectedSlots);
    paginatedSlots.forEach((s) => next.add(s.slotName));
    setSelectedSlots(next);
  };

  const clearSelection = () => setSelectedSlots(new Set());

  // ─── Reordering with Undo (Task 2) ────────────────────────────────────────
  const handleReorderIndex = async (slot: GallerySlotRow, direction: "up" | "down") => {
    const currentIndex = filteredSlots.findIndex((s) => s.slotName === slot.slotName);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= filteredSlots.length) return;
    const targetSlot = filteredSlots[targetIndex];
    const oldOrder = slot.order || currentIndex + 1;
    const targetOldOrder = targetSlot.order || targetIndex + 1;

    const originalSlot = { ...slot };
    const originalTarget = { ...targetSlot };

    await executeWithUndo(
      "Order updated",
      `Moved "${slot.altText || slot.slotName}" ${direction}. Click Undo to reverse.`,
      async () => {
        // Commit: apply the swap
        await cmsService.saveSlot("gallery", slot.slotName, { ...slot, order: targetOldOrder, updatedAt: Date.now() });
        await cmsService.saveSlot("gallery", targetSlot.slotName, { ...targetSlot, order: oldOrder, updatedAt: Date.now() });
      },
      async () => {
        // Undo: restore original orders
        await cmsService.saveSlot("gallery", slot.slotName, { ...originalSlot, updatedAt: Date.now() });
        await cmsService.saveSlot("gallery", targetSlot.slotName, { ...originalTarget, updatedAt: Date.now() });
        showSuccess("Reorder Undone", "Original display order has been restored.");
      }
    );
  };

  // ─── Delete with Undo grace window (Tasks 2 & 4) ──────────────────────────
  const handleDeleteSlot = async (slot: GallerySlotRow) => {
    if (slot._isPublished) {
      const confirmed = window.confirm(
        `"${slot.slotName}" is currently live on your published website. Soft-deleting will move it to Trash. Proceed?`
      );
      if (!confirmed) return;
    }

    const slotSnapshot = { ...slot };

    await executeWithUndo(
      "Image moved to Trash",
      `"${slot.altText || slot.slotName}" will be deleted in 5 seconds. Click Undo to cancel.`,
      async () => {
        // Commit: actually soft-delete after 5s grace
        await cmsService.softDeleteSlot("gallery", slot.slotName, currentUser?.email || "admin@alankaran.com");
        setSelectedSlots((prev) => { const next = new Set(prev); next.delete(slot.slotName); return next; });
        await loadTrashItems();
      },
      async () => {
        // Undo: restore the slot from the snapshot (before the deletion timer fires)
        await cmsService.saveSlot("gallery", slot.slotName, { ...slotSnapshot, isDeleted: false, updatedAt: Date.now() });
        showSuccess("Delete Cancelled", `"${slot.altText || slot.slotName}" has been kept in your gallery.`);
      }
    );
  };

  // ─── Bulk Actions ──────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedSlots.size === 0) return;
    const confirmed = window.confirm(
      `Are you sure you want to soft delete ${selectedSlots.size} selected gallery image(s)? They will be moved to Trash.`
    );
    if (!confirmed) return;
    let count = 0;
    for (const slotName of selectedSlots) {
      const ok = await cmsService.softDeleteSlot("gallery", slotName, currentUser?.email || "admin@alankaran.com");
      if (ok) count++;
    }
    showSuccess("Bulk Delete Complete", `Soft deleted ${count} gallery image(s).`);
    clearSelection();
    await loadTrashItems();
  };

  const handleBulkPublish = async () => {
    if (selectedSlots.size === 0) return;
    try {
      await cmsService.publishSection("gallery", currentUser?.email || "admin@alankaran.com");
      showSuccess("Published", "Gallery section published to live site!");
      clearSelection();
    } catch (err: any) {
      showError("Publish Error", err.message || "Could not publish gallery section.");
    }
  };

  const handleBulkCategoryUpdate = async () => {
    if (selectedSlots.size === 0) return;
    let count = 0;
    for (const slotName of selectedSlots) {
      const slot = allSlots.find((s) => s.slotName === slotName);
      if (slot) {
        await cmsService.saveSlot("gallery", slotName, { ...slot, category: targetBulkCategory, updatedAt: Date.now() });
        count++;
      }
    }
    showSuccess("Bulk Category Update", `Updated ${count} image(s) to "${targetBulkCategory}".`);
    setBulkCategoryModalOpen(false);
    clearSelection();
  };

  const handleTrashRestore = async (trashId: string): Promise<boolean> => {
    const ok = await cmsService.restoreFromTrash(trashId, currentUser?.email || "admin@alankaran.com");
    if (ok) await loadTrashItems();
    return ok;
  };

  const handleTrashPermanentDelete = async (trashId: string): Promise<boolean> => {
    const ok = await cmsService.permanentDeleteTrash(trashId, currentUser?.email || "admin@alankaran.com");
    if (ok) await loadTrashItems();
    return ok;
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 select-none animate-fade-in" role="region" aria-label="Gallery Manager">

      {/* Top Action Toolbar — wraps on mobile (Task 5) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/60 border border-stone-800 p-4 rounded-2xl shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setUploadModalOpen(true)}
            size="sm"
            className="gap-2 bg-gold text-nizami-dark hover:bg-gold-light font-semibold text-xs font-sans shadow"
            aria-label="Add new gallery images"
          >
            <UploadCloud className="size-4" aria-hidden="true" />
            <span>Add Images</span>
          </Button>

          <Button
            onClick={() => setPreviewModalOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 border-gold/40 text-gold hover:bg-gold/10 text-xs font-sans"
            aria-label="Open live device preview"
          >
            <Eye className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Live Preview</span>
            <span className="sm:hidden">Preview</span>
          </Button>

          <Button
            onClick={() => setTrashModalOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 border-stone-700 text-stone-300 hover:text-red-400 text-xs font-sans"
            aria-label={`Open trash bin${trashItems.length > 0 ? ` (${trashItems.length} items)` : ""}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Trash{trashItems.length > 0 ? ` (${trashItems.length})` : ""}</span>
            <span className="sm:hidden">Trash{trashItems.length > 0 ? ` (${trashItems.length})` : ""}</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0 text-stone-400 hover:text-gold"
            aria-label="Sync latest gallery data"
            title="Refresh gallery data"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin text-gold" : ""}`} aria-hidden="true" />
          </Button>

          <div className="h-4 w-px bg-stone-800" aria-hidden="true" />

          {/* Grid/List Toggle (Task 6 — aria-pressed) */}
          <div className="flex items-center bg-black/60 border border-stone-800 rounded-lg p-0.5" role="group" aria-label="View mode">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="Grid view"
              className={`h-7 px-2.5 gap-1.5 text-xs font-sans rounded-md ${viewMode === "grid" ? "bg-gold text-nizami-dark font-semibold" : "text-stone-400"}`}
            >
              <Grid className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              aria-label="List view"
              className={`h-7 px-2.5 gap-1.5 text-xs font-sans rounded-md ${viewMode === "list" ? "bg-gold text-nizami-dark font-semibold" : "text-stone-400"}`}
            >
              <List className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Filters (Task 5 mobile: scrollable pills) */}
      <div className="bg-black/30 border border-gold/15 p-4 rounded-2xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="size-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search name, caption, tag, category..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 bg-black/60 border-stone-800 text-xs text-stone-200 h-9 rounded-xl focus:border-gold"
              aria-label="Search gallery images"
            />
          </div>

          {/* Category pills — horizontal scroll on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 md:flex-nowrap" role="group" aria-label="Category filter">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => { setCategoryFilter(cat); setCurrentPage(1); }}
                aria-pressed={categoryFilter === cat}
                className={`px-3 py-1 rounded-full text-xs font-sans transition-all shrink-0 border ${
                  categoryFilter === cat
                    ? "bg-gold text-nizami-dark font-semibold border-gold shadow"
                    : "bg-stone-900/60 text-stone-300 border-stone-800 hover:border-gold/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="size-3.5 text-gold" aria-hidden="true" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:border-gold outline-none"
              aria-label="Filter by status"
            >
              <option value="all">All Active</option>
              <option value="published">Published Only</option>
              <option value="draft">Draft Only</option>
              <option value="trashed">Trashed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar — horizontal scroll on mobile (Task 5) */}
      {selectedSlots.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gold/15 border border-gold/40 rounded-2xl p-3.5 shadow-xl animate-fade-in" role="toolbar" aria-label="Bulk actions">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gold font-bold bg-black/80 px-3 py-1 rounded-lg border border-gold/30" aria-live="polite">
              {selectedSlots.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs font-sans text-stone-300 hover:text-white h-7">
              Deselect All
            </Button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Button size="sm" onClick={handleBulkPublish} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-sans font-semibold h-8 shrink-0">
              <Send className="size-3.5" aria-hidden="true" /> Publish All
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkCategoryModalOpen(true)} className="gap-1.5 border-gold/40 text-gold hover:bg-gold/10 text-xs font-sans h-8 shrink-0">
              <FolderTree className="size-3.5" aria-hidden="true" /> Move Category
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDelete} className="gap-1.5 border-red-700/80 text-red-400 hover:bg-red-950/40 text-xs font-sans h-8 shrink-0">
              <Trash2 className="size-3.5" aria-hidden="true" /> Bulk Delete
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        // Task 3: Skeleton loader instead of blank screen
        <SkeletonGalleryGrid count={8} />
      ) : loadError ? (
        // Task 9: Error state with retry
        <ErrorState
          type={navigator.onLine ? "firestore_unavailable" : "offline"}
          title="Gallery Could Not Load"
          description={loadError}
          onRetry={handleManualRefresh}
          retryLabel="Retry"
        />
      ) : paginatedSlots.length === 0 ? (
        // Task 8: Designed empty state
        <EmptyState
          icon={Images}
          title={searchQuery || categoryFilter !== "All" ? "No Images Match Your Filter" : "Gallery Is Empty"}
          description={
            searchQuery || categoryFilter !== "All"
              ? "Try clearing your search or selecting 'All' from the category filter to see all gallery images."
              : "Your gallery doesn't have any images yet. Click 'Add Images' to bulk upload your luxury wedding moments to Cloudinary and save them to your Draft."
          }
          actionLabel={
            searchQuery || categoryFilter !== "All" ? "Clear Filters" : "Add Gallery Images"
          }
          onAction={
            searchQuery || categoryFilter !== "All"
              ? () => { setSearchQuery(""); setCategoryFilter("All"); }
              : () => setUploadModalOpen(true)
          }
        />
      ) : viewMode === "grid" ? (
        /* ── Grid View ─────────────────────────────────────────────────── */
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          role="grid"
          aria-rowcount={filteredSlots.length}
          aria-label="Gallery image grid"
        >
          {paginatedSlots.map((slot, idx) => {
            const isSelected = selectedSlots.has(slot.slotName);
            return (
              <Card
                key={slot.slotName}
                className={`group relative overflow-hidden bg-stone-900/80 border rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-xl ${
                  isSelected ? "border-gold ring-1 ring-gold bg-gold/5" : "border-stone-800 hover:border-gold/40"
                }`}
                role="gridcell"
                aria-selected={isSelected}
              >
                <div className="relative aspect-[4/3] bg-black overflow-hidden">
                  <img
                    src={slot.url}
                    alt={slot.altText || slot.slotName}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Selection checkbox (Task 6 — aria-label) */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSelectSlot(slot.slotName); }}
                    className="absolute top-3 left-3 size-7 rounded-lg bg-black/80 backdrop-blur-md border border-stone-700 flex items-center justify-center text-gold hover:border-gold transition-colors z-10 focus:outline-none focus:ring-1 focus:ring-gold"
                    aria-label={isSelected ? `Deselect ${slot.altText || slot.slotName}` : `Select ${slot.altText || slot.slotName}`}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? <CheckSquare className="size-4" aria-hidden="true" /> : <Square className="size-4 text-stone-400" aria-hidden="true" />}
                  </button>

                  {/* Badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 z-10" aria-hidden="true">
                    <span className="bg-black/80 backdrop-blur-md border border-gold/30 px-2 py-0.5 rounded text-[10px] font-mono text-gold flex items-center gap-1 shadow">
                      <Layers className="size-2.5" /> #{slot.order || idx + 1}
                    </span>
                    {slot._isPublished ? (
                      <span className="bg-emerald-950/90 border border-emerald-800 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-mono shadow">LIVE</span>
                    ) : (
                      <span className="bg-amber-950/90 border border-amber-800 text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-mono shadow">DRAFT</span>
                    )}
                  </div>

                  {/* Reorder arrows (Task 6 — aria-labels) */}
                  <div
                    className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/80 backdrop-blur-md border border-stone-700 rounded-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    role="group"
                    aria-label="Reorder image"
                  >
                    <button
                      type="button"
                      onClick={() => handleReorderIndex(slot, "up")}
                      disabled={idx === 0 && currentPage === 1}
                      className="p-1 hover:text-gold text-stone-300 disabled:opacity-30 focus:outline-none focus:text-gold"
                      aria-label={`Move ${slot.altText || slot.slotName} up`}
                    >
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorderIndex(slot, "down")}
                      disabled={idx === paginatedSlots.length - 1 && currentPage === totalPages}
                      className="p-1 hover:text-gold text-stone-300 disabled:opacity-30 focus:outline-none focus:text-gold"
                      aria-label={`Move ${slot.altText || slot.slotName} down`}
                    >
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gold truncate">
                        {slot.category || "Royal Weddings"}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500" aria-hidden="true">{slot.width}×{slot.height}</span>
                    </div>
                    <h4 className="font-serif text-sm text-stone-100 truncate" title={slot.altText || slot.slotName}>
                      {slot.altText || slot.slotName}
                    </h4>
                    {slot.caption ? (
                      <p className="font-sans text-xs text-stone-400 line-clamp-2 mt-1 font-light leading-relaxed">{slot.caption}</p>
                    ) : (
                      <p className="font-sans text-[11px] text-stone-600 italic mt-1">No caption set.</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSlot(slot)}
                      className="flex-1 gap-1.5 border-stone-700 bg-black/40 text-stone-200 hover:border-gold text-[11px] h-8 focus:ring-1 focus:ring-gold"
                      aria-label={`Edit metadata for ${slot.altText || slot.slotName}`}
                    >
                      <Edit3 className="size-3" aria-hidden="true" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSlot(slot)}
                      className="px-2.5 border-stone-800 text-stone-400 hover:text-red-400 hover:border-red-900/60 h-8 shrink-0 focus:ring-1 focus:ring-red-700"
                      aria-label={`Delete ${slot.altText || slot.slotName}`}
                      title="Move to Trash (can be undone)"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── List View — collapses to card stack on mobile (Task 5) ────── */
        <div className="bg-black/30 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse" role="table" aria-label="Gallery images list">
              <thead>
                <tr className="bg-stone-900/80 border-b border-stone-800 text-[11px] font-mono uppercase text-gold" role="row">
                  <th className="p-3.5 w-10 text-center" scope="col">
                    <button
                      type="button"
                      onClick={paginatedSlots.every((s) => selectedSlots.has(s.slotName)) ? clearSelection : selectAllPaginated}
                      aria-label={paginatedSlots.every((s) => selectedSlots.has(s.slotName)) ? "Deselect all" : "Select all on this page"}
                    >
                      {paginatedSlots.length > 0 && paginatedSlots.every((s) => selectedSlots.has(s.slotName)) ? (
                        <CheckSquare className="size-4 text-gold" aria-hidden="true" />
                      ) : (
                        <Square className="size-4 text-stone-500" aria-hidden="true" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5 w-16" scope="col">Thumb</th>
                  <th className="p-3.5" scope="col">Slot & Alt Text</th>
                  <th className="p-3.5" scope="col">Category</th>
                  <th className="p-3.5 w-24 text-center" scope="col">Order</th>
                  <th className="p-3.5 w-28 text-center" scope="col">Status</th>
                  <th className="p-3.5 w-36 text-right" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-xs font-sans" role="rowgroup">
                {paginatedSlots.map((slot, idx) => {
                  const isSelected = selectedSlots.has(slot.slotName);
                  return (
                    <tr key={slot.slotName} className={`hover:bg-stone-900/50 transition-colors ${isSelected ? "bg-gold/10" : ""}`} role="row">
                      <td className="p-3.5 text-center" role="cell">
                        <button type="button" onClick={() => toggleSelectSlot(slot.slotName)} aria-label={isSelected ? `Deselect ${slot.altText || slot.slotName}` : `Select ${slot.altText || slot.slotName}`} aria-pressed={isSelected}>
                          {isSelected ? <CheckSquare className="size-4 text-gold" aria-hidden="true" /> : <Square className="size-4 text-stone-500" aria-hidden="true" />}
                        </button>
                      </td>
                      <td className="p-3.5" role="cell">
                        <div className="size-11 rounded-lg overflow-hidden border border-stone-700 bg-black">
                          <img src={slot.url} alt={slot.altText || slot.slotName} loading="lazy" className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="p-3.5 min-w-[200px]" role="cell">
                        <p className="font-serif text-stone-100 font-medium">{slot.altText || slot.slotName}</p>
                        <p className="font-mono text-[10px] text-stone-400 truncate">{slot.slotName}</p>
                      </td>
                      <td className="p-3.5" role="cell">
                        <span className="bg-stone-900 border border-stone-700 px-2.5 py-1 rounded-full text-[11px] font-mono text-gold">
                          {slot.category || "Royal Weddings"}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono" role="cell">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => handleReorderIndex(slot, "up")} className="p-1 hover:text-gold text-stone-400 focus:outline-none" aria-label={`Move ${slot.altText || slot.slotName} up`}>
                            <ArrowUp className="size-3" aria-hidden="true" />
                          </button>
                          <span className="font-bold text-stone-200" aria-label={`Display order ${slot.order || idx + 1}`}>#{slot.order || idx + 1}</span>
                          <button type="button" onClick={() => handleReorderIndex(slot, "down")} className="p-1 hover:text-gold text-stone-400 focus:outline-none" aria-label={`Move ${slot.altText || slot.slotName} down`}>
                            <ArrowDown className="size-3" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono" role="cell">
                        {slot._isPublished ? (
                          <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">PUBLISHED</span>
                        ) : (
                          <span className="text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded text-[10px]">DRAFT</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-2" role="cell">
                        <Button variant="outline" size="sm" onClick={() => setEditingSlot(slot)} className="h-7 px-2.5 text-[11px] border-stone-700 bg-black/40 text-stone-300 hover:border-gold" aria-label={`Edit ${slot.altText || slot.slotName}`}>
                          <Edit3 className="size-3 mr-1" aria-hidden="true" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteSlot(slot)} className="h-7 px-2 border-stone-800 text-stone-400 hover:text-red-400 hover:border-red-900/60" aria-label={`Delete ${slot.altText || slot.slotName}`} title="Move to Trash">
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card-based list (Task 5 — responsive) */}
          <div className="sm:hidden divide-y divide-stone-800/50">
            {paginatedSlots.map((slot) => {
              const isSelected = selectedSlots.has(slot.slotName);
              return (
                <div key={slot.slotName} className={`p-4 flex items-start gap-3 ${isSelected ? "bg-gold/5" : ""}`}>
                  <button type="button" onClick={() => toggleSelectSlot(slot.slotName)} aria-pressed={isSelected} aria-label={isSelected ? "Deselect" : "Select"} className="mt-0.5 shrink-0">
                    {isSelected ? <CheckSquare className="size-4 text-gold" /> : <Square className="size-4 text-stone-500" />}
                  </button>
                  <div className="size-16 rounded-lg overflow-hidden border border-stone-700 bg-black shrink-0">
                    <img src={slot.url} alt={slot.altText || slot.slotName} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm text-stone-100 truncate">{slot.altText || slot.slotName}</p>
                    <p className="text-[10px] font-mono text-gold mt-0.5">{slot.category || "Royal Weddings"} · #{slot.order}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingSlot(slot)} className="h-7 px-2.5 text-[11px] border-stone-700 bg-black/40 text-stone-300" aria-label={`Edit ${slot.altText}`}>
                        <Edit3 className="size-3 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteSlot(slot)} className="h-7 px-2 border-stone-800 text-stone-400 hover:text-red-400" aria-label={`Delete ${slot.altText}`}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !loadError && filteredSlots.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-900/40 border border-stone-800 px-5 py-3 rounded-xl text-xs font-mono text-stone-400" role="navigation" aria-label="Gallery pagination">
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }} className="bg-black/60 border border-stone-700 rounded-lg px-2 py-1 text-stone-200 focus:border-gold outline-none" aria-label="Items per page">
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span aria-live="polite">
              Page <strong className="text-gold">{currentPage}</strong> / {totalPages} ({filteredSlots.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="h-7 w-7 p-0 border-stone-700 bg-black/60 text-stone-300 disabled:opacity-30" aria-label="Previous page">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="h-7 w-7 p-0 border-stone-700 bg-black/60 text-stone-300 disabled:opacity-30" aria-label="Next page">
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <BulkUploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} sectionKey="gallery" existingSlotCount={allSlots.length} onUploadComplete={loadGallerySection} />
      <GalleryMetadataModal isOpen={Boolean(editingSlot)} onClose={() => setEditingSlot(null)} slot={editingSlot} onSave={() => { setEditingSlot(null); loadGallerySection(); }} />
      <GalleryPreviewModal isOpen={previewModalOpen} onClose={() => setPreviewModalOpen(false)} slots={((section as any)?.draftSlots || section?.slots || {}) as Record<string, CMSSlotMetadata>} isPreviewingDraft={true} />
      <TrashModal isOpen={trashModalOpen} onClose={() => { setTrashModalOpen(false); loadGallerySection(); }} items={trashItems} onRestore={handleTrashRestore} onPermanentDelete={handleTrashPermanentDelete} />

      {/* Bulk Category Modal */}
      {bulkCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Assign bulk category">
          <div className="bg-stone-950 border border-gold/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-serif text-lg text-stone-100 flex items-center gap-2">
              <FolderTree className="size-4 text-gold" aria-hidden="true" /> Assign Bulk Category
            </h3>
            <p className="font-sans text-xs text-stone-400">Assign {selectedSlots.size} item(s) to:</p>
            <select value={targetBulkCategory} onChange={(e) => setTargetBulkCategory(e.target.value)} className="w-full bg-black/60 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-gold outline-none" aria-label="Select target category">
              {categoriesList.filter((c) => c !== "All").map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
              <Button variant="outline" size="sm" onClick={() => setBulkCategoryModalOpen(false)} className="text-xs font-sans border-stone-700 bg-stone-900 text-stone-300">Cancel</Button>
              <Button size="sm" onClick={handleBulkCategoryUpdate} className="text-xs font-sans bg-gold text-nizami-dark font-semibold">Apply Category</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
