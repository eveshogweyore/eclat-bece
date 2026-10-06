import { useState, useMemo } from "react";
import {
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  Trophy,
  Star,
  Pin,
  Flame,
  Target,
  Shield,
  Filter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { INITIAL_18_BADGES, BadgeDefinition, BadgeRarity } from "@/services/gamification/badgeEngine";

interface BadgeGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earnedBadgeIds: string[];
  // Pins are always left-packed sequentially (no interior gaps).
  pinnedBadgeIds: string[];
  onTogglePinBadge?: (badgeId: string) => Promise<void>;
  currentStreak?: number;
  completedQuizzesCount?: number;
  averageScore?: number;
}

const getRarityConfig = (rarity: BadgeRarity) => {
  switch (rarity) {
    case "mythic":
      return {
        label: "Mythic",
        border: "border-fuchsia-500/80 bg-fuchsia-950/20 text-fuchsia-300 shadow-fuchsia-500/20",
        badge: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
      };
    case "legendary":
      return {
        label: "Legendary",
        border: "border-amber-400/80 bg-amber-950/20 text-amber-300 shadow-amber-500/20",
        badge: "bg-amber-400/20 text-amber-300 border-amber-400/40",
      };
    case "epic":
      return {
        label: "Epic",
        border: "border-purple-500/70 bg-purple-950/20 text-purple-300 shadow-purple-500/15",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      };
    case "rare":
      return {
        label: "Rare",
        border: "border-sky-500/60 bg-sky-950/20 text-sky-300 shadow-sky-500/10",
        badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
      };
    case "uncommon":
      return {
        label: "Uncommon",
        border: "border-emerald-500/50 bg-emerald-950/20 text-emerald-300 shadow-emerald-500/10",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      };
    case "common":
    default:
      return {
        label: "Common",
        border: "border-slate-600/50 bg-slate-900/30 text-slate-300",
        badge: "bg-slate-700/30 text-slate-300 border-slate-600/40",
      };
  }
};

export function BadgeGalleryModal({
  open,
  onOpenChange,
  earnedBadgeIds,
  pinnedBadgeIds,
  onTogglePinBadge,
  currentStreak = 0,
  completedQuizzesCount = 0,
  averageScore = 0,
}: BadgeGalleryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "earned" | "locked">("all");
  const [pinningBadgeId, setPinningBadgeId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(INITIAL_18_BADGES.map((b) => b.category));
    return ["all", ...Array.from(set)];
  }, []);

  const totalEarnedRewardEP = useMemo(() => {
    return INITIAL_18_BADGES.filter((b) => earnedBadgeIds.includes(b.id)).reduce(
      (sum, b) => sum + b.rewardEP,
      0
    );
  }, [earnedBadgeIds]);

  const filteredBadges = useMemo(() => {
    return INITIAL_18_BADGES.filter((badge) => {
      const isEarned = earnedBadgeIds.includes(badge.id);
      if (filterStatus === "earned" && !isEarned) return false;
      if (filterStatus === "locked" && isEarned) return false;
      if (selectedCategory !== "all" && badge.category !== selectedCategory) return false;
      return true;
    });
  }, [earnedBadgeIds, filterStatus, selectedCategory]);

  const computeBadgeProgress = (badge: BadgeDefinition) => {
    if (earnedBadgeIds.includes(badge.id)) {
      return { percent: 100, label: "Completed" };
    }

    switch (badge.id) {
      case "first_step":
        return {
          percent: completedQuizzesCount >= 1 ? 100 : 0,
          label: `${Math.min(1, completedQuizzesCount)} / 1 session`,
        };
      case "getting_serious":
        return {
          percent: Math.min(100, Math.round((currentStreak / 3) * 100)),
          label: `${Math.min(3, currentStreak)} / 3 days`,
        };
      case "one_week_strong":
        return {
          percent: Math.min(100, Math.round((currentStreak / 7) * 100)),
          label: `${Math.min(7, currentStreak)} / 7 days`,
        };
      case "sharp_shooter":
        return {
          percent: averageScore >= 80 ? 100 : Math.round((averageScore / 80) * 100),
          label: `Avg: ${averageScore}% / 80%`,
        };
      default:
        return null;
    }
  };

  const handlePinClick = async (badgeId: string) => {
    if (!onTogglePinBadge) return;
    setPinningBadgeId(badgeId);
    try {
      await onTogglePinBadge(badgeId);
    } finally {
      setPinningBadgeId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-hidden flex flex-col p-6 border-[#2b3a54] bg-[#0c1527] text-slate-100">
        <DialogHeader className="pb-3 border-b border-[#1f2d42]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                Badge Gallery & Hall of Honors
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-1">
                Official milestone badges across all academic and consistency disciplines
              </DialogDescription>
            </div>

            {/* Overview Stats Pills */}
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-[#23354f] bg-[#111e33] px-3 py-1.5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Unlocked</p>
                <p className="text-sm font-black text-amber-300">
                  {earnedBadgeIds.length} / {INITIAL_18_BADGES.length}
                </p>
              </div>
              <div className="rounded-lg border border-[#23354f] bg-[#111e33] px-3 py-1.5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Bonus EP Earned</p>
                <p className="text-sm font-black text-sky-300">+{totalEarnedRewardEP.toLocaleString()} EP</p>
              </div>
            </div>
          </div>

          {/* Filter Bars */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-[#23354f] bg-[#101b2f] p-1">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`rounded px-3 py-1 text-xs font-semibold transition ${
                  filterStatus === "all" ? "bg-sky-500/20 text-sky-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                All ({INITIAL_18_BADGES.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("earned")}
                className={`rounded px-3 py-1 text-xs font-semibold transition ${
                  filterStatus === "earned"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Earned ({earnedBadgeIds.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("locked")}
                className={`rounded px-3 py-1 text-xs font-semibold transition ${
                  filterStatus === "locked"
                    ? "bg-amber-500/20 text-amber-300 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Locked ({INITIAL_18_BADGES.length - earnedBadgeIds.length})
              </button>
            </div>

            {/* Category Dropdown/Pill Filter */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap transition border ${
                    selectedCategory === cat
                      ? "border-sky-400 bg-sky-500/10 text-sky-300 font-bold"
                      : "border-[#202e44] text-slate-400 hover:text-white"
                  }`}
                >
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Badges Grid View */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-3">
          {filteredBadges.length === 0 ? (
            <div className="text-center py-16 text-slate-400 border border-dashed border-[#202e44] rounded-xl">
              <Award className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-sm">No badges match the selected filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBadges.map((badge) => {
                const isEarned = earnedBadgeIds.includes(badge.id);
                const isPinned = pinnedBadgeIds.includes(badge.id);
                const rarity = getRarityConfig(badge.rarity);
                const progress = computeBadgeProgress(badge);

                return (
                  <div
                    key={badge.id}
                    className={`relative rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      isEarned
                        ? `${rarity.border} shadow-md`
                        : "border-slate-800 bg-[#0d1627]/60 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div>
                      {/* Top Row: Icon, Title, Rarity, Reward */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl border shadow-inner ${
                              isEarned
                                ? "bg-[#16253d] border-white/10"
                                : "bg-slate-900/60 border-slate-800 grayscale"
                            }`}
                          >
                            {badge.icon}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white leading-tight">
                                {badge.title}
                              </h4>
                              {isEarned && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge
                                variant="outline"
                                className={`text-[9px] uppercase px-1.5 py-0 font-bold border ${rarity.badge}`}
                              >
                                {rarity.label}
                              </Badge>
                              <span className="text-[10px] text-slate-400">
                                {badge.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Reward EP */}
                        <div className="text-right shrink-0">
                          <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs font-black text-sky-300 border border-sky-500/20">
                            +{badge.rewardEP} EP
                          </span>
                        </div>
                      </div>

                      {/* Criteria or Celebration Copy */}
                      <div className="mt-2 text-xs">
                        {isEarned ? (
                          <p className="text-emerald-300 font-medium leading-relaxed italic">
                            &ldquo;{badge.celebrationCopy}&rdquo;
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-slate-400 flex items-start gap-1.5">
                              <Lock className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
                              <span>{badge.triggerCriteria}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status / Pin Action */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                      {isEarned ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked & Claimed
                          </span>
                          {onTogglePinBadge && (
                            <Button
                              type="button"
                              size="sm"
                              variant={isPinned ? "secondary" : "outline"}
                              disabled={pinningBadgeId === badge.id}
                              onClick={() => handlePinClick(badge.id)}
                              className={`h-7 px-2.5 text-[11px] font-bold gap-1 rounded-md ${
                                isPinned
                                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                  : "border-[#2b3a54] bg-[#111d32] text-slate-300 hover:text-white"
                              }`}
                            >
                              <Pin className={`w-3 h-3 ${isPinned ? "fill-current" : ""}`} />
                              {isPinned ? "Pinned ★" : "Pin to Showcase"}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full">
                          {progress ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                <span>Progress</span>
                                <span>{progress.label}</span>
                              </div>
                              <Progress value={progress.percent} className="h-1.5 rounded-full" />
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] flex items-center gap-1 font-medium">
                              <Lock className="w-3 h-3" /> Locked milestone
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#1f2d42] flex items-center justify-between text-xs text-slate-400">
          <span>Earn Éclat Points, conquer weak topics, and build streaks to unlock all 18 badges.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-[#2b3a54] bg-[#111e33] text-xs hover:bg-[#192b47]"
          >
            Close Gallery
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
