import { useState } from "react";
import { Award, Plus, Sparkles, Check, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INITIAL_18_BADGES } from "@/services/gamification/badgeEngine";
import { BadgeGalleryModal } from "./BadgeGalleryModal";
import { toast } from "sonner";

interface BadgeShowcaseProps {
  earnedBadgeIds: string[];
  // Pins are always left-packed sequentially (no interior gaps); the array
  // length equals the number of filled slots.
  pinnedBadgeIds: string[];
  onUpdatePinnedBadges: (newPinnedIds: string[]) => Promise<void>;
  unlockedSlotsCount?: number;
  currentStreak?: number;
  completedQuizzesCount?: number;
  averageScore?: number;
}

export function BadgeShowcase({
  earnedBadgeIds,
  pinnedBadgeIds,
  onUpdatePinnedBadges,
  unlockedSlotsCount = 5,
  currentStreak = 0,
  completedQuizzesCount = 0,
  averageScore = 0,
}: BadgeShowcaseProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const earnedBadges = INITIAL_18_BADGES.filter((b) => earnedBadgeIds.includes(b.id));

  const slots = Array(5).fill(null).map((_, i) => {
    const isUnlocked = i < unlockedSlotsCount;
    const badgeId = pinnedBadgeIds[i];
    const badge = badgeId ? INITIAL_18_BADGES.find((b) => b.id === badgeId) : null;
    return { index: i, isUnlocked, badge };
  });

  const handleSlotClick = (index: number, isUnlocked: boolean, hasBadge: boolean) => {
    // Occupied slots stay clickable even when locked so legacy pins (from a
    // higher-slot era or before earned-count gating) can be moved or cleared.
    if (!isUnlocked && !hasBadge) return;
    setSelectedSlotIndex(index);
    setDialogOpen(true);
  };

  const handleSelectBadge = async (badgeId: string) => {
    if (selectedSlotIndex === null) return;
    // Re-picking the badge already in this slot is a no-op.
    if (pinnedBadgeIds[selectedSlotIndex] === badgeId) {
      setDialogOpen(false);
      return;
    }
    setSaving(true);
    try {
      // Vacate the badge's old slot (move semantics), then either replace the
      // clicked slot's badge or append at the first free position — appending
      // keeps the showcase left-packed, so gaps can never form.
      const nextPinned = pinnedBadgeIds.filter((id) => id !== badgeId);
      if (selectedSlotIndex < nextPinned.length) nextPinned[selectedSlotIndex] = badgeId;
      else nextPinned.push(badgeId);
      await onUpdatePinnedBadges(nextPinned);
      setDialogOpen(false);
    } catch {
      // Failure already toasted and rolled back by the mutation handlers;
      // keep the dialog open so the student can retry.
    } finally {
      setSaving(false);
    }
  };

  const handleClearSlot = async () => {
    if (selectedSlotIndex === null) return;
    setSaving(true);
    try {
      // Splice shifts later badges left, preserving sequential order.
      const nextPinned = [...pinnedBadgeIds];
      nextPinned.splice(selectedSlotIndex, 1);
      await onUpdatePinnedBadges(nextPinned);
      setDialogOpen(false);
    } catch {
      // Failure already toasted and rolled back by the mutation handlers;
      // keep the dialog open so the student can retry.
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePinBadge = async (badgeId: string) => {
    try {
      if (pinnedBadgeIds.includes(badgeId)) {
        await onUpdatePinnedBadges(pinnedBadgeIds.filter((id) => id !== badgeId));
      } else {
        if (pinnedBadgeIds.length >= unlockedSlotsCount) {
          toast.error(`Showcase is full (${unlockedSlotsCount} slots max). Unpin a badge first!`);
          return;
        }
        // Compact arrays mean appending lands in the first free slot.
        await onUpdatePinnedBadges([...pinnedBadgeIds, badgeId]);
      }
    } catch {
      // Failure already toasted and rolled back by the mutation handlers.
    }
  };

  return (
    <div className="rounded-xl border border-[#1d2a40] bg-[#0e192b] p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Badge Showcase (5 Slots)
          </h3>
          <p className="text-xs text-muted-foreground">Pin your proudest achievements to your public profile</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setGalleryOpen(true)}
            className="h-8 border-border bg-[#111e33] text-xs font-bold text-sky-300 hover:bg-[#182944] shadow-xs"
          >
            <Trophy className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            View All Badges ({earnedBadgeIds.length}/{INITIAL_18_BADGES.length})
          </Button>
        </div>
      </div>

      {/* 5-Slot Visual Showcase Grid */}
      <div className="grid grid-cols-5 gap-3">
        {slots.map(({ index, isUnlocked, badge }) => (
          <button
            key={index}
            type="button"
            disabled={!isUnlocked && !badge}
            onClick={() => handleSlotClick(index, isUnlocked, Boolean(badge))}
            className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all ${
              badge
                ? "bg-[#183149] border-primary/50 hover:scale-105 shadow-md cursor-pointer"
                : isUnlocked
                ? "border-dashed border-slate-700 bg-slate-900/40 hover:border-slate-500 cursor-pointer"
                : "border-slate-800 bg-slate-950/40 opacity-40 cursor-not-allowed"
            }`}
            title={badge ? `${badge.title} (${badge.rarity})` : isUnlocked ? "Click to pin badge" : "Locked slot"}
          >
            {badge ? (
              <>
                <span className="text-2xl sm:text-3xl">{badge.icon}</span>
                <span className="text-[10px] font-bold text-slate-200 mt-1 truncate max-w-full">
                  {badge.title}
                </span>
              </>
            ) : isUnlocked ? (
              <Plus className="w-5 h-5 text-slate-500" />
            ) : (
              <span className="text-xs text-slate-600 font-bold">Slot {index + 1}</span>
            )}
          </button>
        ))}
      </div>

      {/* Quick Slot Selection Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Select a Badge to Pin
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose from your unlocked badges for Slot {Math.min(selectedSlotIndex ?? 0, pinnedBadgeIds.length) + 1}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto space-y-2 py-3">
            {earnedBadges.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">
                You haven&apos;t earned any badges yet. Complete practice sessions to unlock badges!
              </p>
            ) : (
              earnedBadges.map((badge) => {
                const isSelected = pinnedBadgeIds.includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    type="button"
                    disabled={saving}
                    onClick={() => handleSelectBadge(badge.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border/60 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{badge.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                          {badge.title}
                          <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                            {badge.rarity}
                          </Badge>
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{badge.celebrationCopy}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSlot}
              disabled={saving || selectedSlotIndex === null || !pinnedBadgeIds[selectedSlotIndex]}
              className="text-destructive hover:text-destructive"
            >
              Clear Slot
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Badge Gallery & Hall of Honors Modal */}
      <BadgeGalleryModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        earnedBadgeIds={earnedBadgeIds}
        pinnedBadgeIds={pinnedBadgeIds}
        onTogglePinBadge={handleTogglePinBadge}
        currentStreak={currentStreak}
        completedQuizzesCount={completedQuizzesCount}
        averageScore={averageScore}
      />
    </div>
  );
}
