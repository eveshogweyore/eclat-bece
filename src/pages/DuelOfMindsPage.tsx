import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Swords,
  Trophy,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Flame,
  Shield,
  Zap,
  Users,
  Award,
  Plus,
  RefreshCw,
} from "lucide-react";
import { ChallengeSettings } from "@/components/ChallengeSettings";
import { SendChallenge } from "@/components/SendChallenge";
import { ChallengeConfirmation } from "@/components/ChallengeConfirmation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  createDuelChallenge,
  fetchIncomingChallenges,
  fetchStudentDuelHistory,
  updateChallengeStatus,
} from "@/services/gamification/arenaService";
import { ArenaChallenge } from "@/services/gamification/types";

type Step = "hub" | "settings" | "send" | "confirmation" | "sent";

interface ChallengeConfig {
  challengeName: string;
  subject: string;
  numberOfQuestions: number;
  topics: string[];
  maxTime: number;
  maxTimeUnit: "min" | "sec";
}

interface Student {
  id: string;
  name: string;
  username: string;
  school: string;
  grade: string;
}

export default function DuelOfMindsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("hub");
  const [config, setConfig] = useState<ChallengeConfig | null>(null);
  const [opponent, setOpponent] = useState<Student | null>(null);
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Hub data states
  const [incomingChallenges, setIncomingChallenges] = useState<ArenaChallenge[]>([]);
  const [duelHistory, setDuelHistory] = useState<ArenaChallenge[]>([]);
  const [loadingHub, setLoadingHub] = useState(true);

  const loadHubData = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingHub(true);
      const { data: studentRecord } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!studentRecord) return;
      setCurrentStudentId(studentRecord.id);

      const [incoming, history] = await Promise.all([
        fetchIncomingChallenges(studentRecord.id),
        fetchStudentDuelHistory(studentRecord.id),
      ]);

      setIncomingChallenges(incoming);
      setDuelHistory(history);
    } catch (err) {
      console.error("Error loading arena hub:", err);
    } finally {
      setLoadingHub(false);
    }
  }, [user]);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  const handleSettingsNext = (challengeConfig: ChallengeConfig) => {
    setConfig(challengeConfig);
    setStep("send");
  };

  const handleSendNext = (selectedOpponent: Student) => {
    setOpponent(selectedOpponent);
    setStep("confirmation");
  };

  const handleConfirm = async () => {
    if (!config || !opponent || !user) return;

    setIsSending(true);
    try {
      const { data: studentRecord } = await supabase
        .from("students")
        .select("id, class_year")
        .eq("user_id", user.id)
        .single();

      if (!studentRecord) throw new Error("Student profile not found");

      const tableName =
        studentRecord.class_year === "year_6"
          ? "quiz_questions_year6"
          : "quiz_questions_year9";

      // Pull from the real question bank, filtered by the selected subject AND
      // topics — the confirmation screen promises topic-filtered questions.
      let query = supabase.from(tableName).select("id").eq("subject", config.subject);
      if (config.topics.length > 0) {
        query = query.in("topic", config.topics);
      }
      const { data: qData, error: qError } = await query.limit(config.numberOfQuestions * 3);
      if (qError) throw qError;

      const allIds = (qData || []).map((q: any) => q.id);
      if (allIds.length === 0) {
        throw new Error(
          `No questions are available for ${config.subject}${config.topics.length > 0 ? " in the selected topics" : ""} yet. Try different topics.`
        );
      }

      // Fisher-Yates: unbiased shuffle before slicing.
      const pool = [...allIds];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const pickedIds = pool.slice(0, Math.min(config.numberOfQuestions, pool.length));

      if (pickedIds.length < config.numberOfQuestions) {
        toast.info(`Only ${pickedIds.length} question(s) available for this selection — the duel will use all of them.`);
      }

      const maxTimeSeconds =
        config.maxTimeUnit === "min" ? config.maxTime * 60 : config.maxTime;

      const challengeId = await createDuelChallenge({
        challengerId: studentRecord.id,
        opponentId: opponent.id,
        challengeName: config.challengeName,
        subject: config.subject,
        topic: config.topics.join(", "),
        maxTimeSeconds,
        questionIds: pickedIds,
      });

      setCreatedChallengeId(challengeId);
      setStep("sent");
      toast.success("Duel challenge issued successfully!");
      loadHubData();
    } catch (error: any) {
      console.error("Error sending challenge:", error);
      toast.error(error.message || "Failed to send challenge. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptDuel = async (challenge: ArenaChallenge) => {
    if (!currentStudentId) return;
    try {
      const ok = await updateChallengeStatus(challenge.id, currentStudentId, "accepted");
      if (!ok) throw new Error("Could not accept the challenge");
      toast.success("Challenge accepted! Entering battle arena...");
      navigate(`/quiz?mode=duel&duelId=${challenge.id}`);
    } catch (err) {
      toast.error("Failed to accept challenge");
    }
  };

  const handleDeclineDuel = async (challenge: ArenaChallenge) => {
    if (!currentStudentId) return;
    try {
      const ok = await updateChallengeStatus(challenge.id, currentStudentId, "declined");
      if (!ok) throw new Error("Could not decline the challenge");
      toast.info("Challenge declined");
      loadHubData();
    } catch (err) {
      toast.error("Failed to decline challenge");
    }
  };

  const handleBack = () => {
    if (step === "send") {
      setStep("settings");
    } else if (step === "confirmation") {
      setStep("send");
    } else if (step === "settings") {
      setStep("hub");
    } else {
      navigate("/dashboard/student");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      {/* 1. Arena Hub View */}
      {step === "hub" && (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Back to dashboard"
                  className="h-8 w-8 text-muted-foreground hover:text-white"
                  onClick={() => navigate("/dashboard/student")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Swords size={14} />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                  Competitive Arena
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Duel of Minds
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                Challenge fellow scholars in real-time academic showdowns. Earn +50 EP per victory and conquer the leaderboard!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={loadHubData}
                disabled={loadingHub}
                className="h-9 w-9 text-muted-foreground hover:text-white"
                title="Refresh battles"
              >
                <RefreshCw className={`w-4 h-4 ${loadingHub ? "animate-spin" : ""}`} />
              </Button>
              <Button
                onClick={() => setStep("settings")}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold gap-2 shadow-lg shadow-purple-500/20"
              >
                <Plus className="w-4 h-4" />
                Issue New Challenge
              </Button>
            </div>
          </div>

          {/* Point Economy Rules Strip (PRD Section 3.9) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs">
                +50
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Match Victory</div>
                <div className="text-[10px] text-muted-foreground">+50 EP per win</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 font-black text-xs">
                +20
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Match Draw</div>
                <div className="text-[10px] text-muted-foreground">+20 EP for tie</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs">
                +25
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Upset Victory</div>
                <div className="text-[10px] text-muted-foreground">Defeat 2+ higher league</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-black text-xs">
                +200
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Win Streaks</div>
                <div className="text-[10px] text-muted-foreground">+30, +75, +200 EP</div>
              </div>
            </div>
          </div>

          {/* Incoming Challenges Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>Incoming Challenges</span>
                {incomingChallenges.length > 0 && (
                  <Badge className="bg-purple-500 text-white font-bold text-xs px-2 py-0.5">
                    {incomingChallenges.length}
                  </Badge>
                )}
              </h2>
            </div>

            {incomingChallenges.length === 0 ? (
              <Card className="border border-border/60 bg-[#0e192b]/80">
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No pending challenges waiting. Issue a duel to a classmate to ignite the competition!
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomingChallenges.map((challenge) => (
                  <Card key={challenge.id} className="border border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-[#0e192b] to-[#071023] shadow-md">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-purple-500/40">
                            <AvatarFallback className="bg-purple-500/20 text-purple-300 font-bold">
                              {challenge.challengerName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-sm font-bold text-white">
                              {challenge.challengerName}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                              {challenge.challengerSchool || "Peer Scholar"}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-purple-500/40 text-purple-300 text-[10px]">
                          {challenge.subject}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-border/40">
                        <span className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          {challenge.numberOfQuestions} Questions
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          {Math.round(challenge.maxTimeSeconds / 60)} Minutes
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => handleAcceptDuel(challenge)}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs h-9 gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Accept & Duel
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeclineDuel(challenge)}
                          className="border-border/60 text-muted-foreground hover:text-white text-xs h-9"
                        >
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Duel History Section */}
          <div className="space-y-3 pt-4">
            <h2 className="text-lg font-bold">Recent Battle Records</h2>
            {duelHistory.length === 0 ? (
              <Card className="border border-border/60 bg-[#0e192b]/80">
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  You haven't participated in any arena duels yet. Complete your first match to earn the "First Blood" badge!
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border/60 bg-card/90 overflow-hidden">
                <div className="divide-y divide-border/40">
                  {duelHistory.map((battle) => {
                    const isChallenger = battle.challengerId === currentStudentId;
                    const myScore = isChallenger ? battle.challengerScore : battle.opponentScore;
                    const theirScore = isChallenger ? battle.opponentScore : battle.challengerScore;
                    const opponentName = isChallenger ? battle.opponentName : battle.challengerName;
                    const isWinner = battle.winnerId === currentStudentId;
                    const isDraw = battle.winnerId === null && battle.status === "completed";
                    const isPending = battle.status === "pending" || battle.status === "accepted";
                    const myEP = isChallenger ? battle.challengerEP : battle.opponentEP;

                    return (
                      <div
                        key={battle.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 text-sm hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                            {isWinner ? (
                              <span className="text-emerald-400">WIN</span>
                            ) : isDraw ? (
                              <span className="text-sky-400">TIE</span>
                            ) : isPending ? (
                              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                            ) : (
                              <span className="text-rose-400">LOSS</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>vs {opponentName}</span>
                              <Badge variant="outline" className="text-[10px] py-0 border-border/60 text-muted-foreground">
                                {battle.subject}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {isPending ? (
                                myScore !== undefined && myScore !== null
                                  ? `You scored ${myScore}/${battle.numberOfQuestions} • Awaiting opponent`
                                  : `Challenge pending • Ready to play`
                              ) : (
                                `Your Score: ${myScore ?? 0}/${battle.numberOfQuestions} • Opponent: ${theirScore ?? 0}/${battle.numberOfQuestions}`
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          {isPending && myScore === null && (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/quiz?mode=duel&duelId=${battle.id}`)}
                              className="bg-primary text-primary-foreground font-bold text-xs h-8 gap-1.5"
                            >
                              <Play className="w-3 h-3 fill-current" /> Play Turn
                            </Button>
                          )}
                          {myEP !== undefined && myEP > 0 && (
                            <div className="text-right">
                              <span className="font-black text-amber-400 text-sm">+{myEP}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">EP</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 2. Step 1: Challenge Settings */}
      {step === "settings" && (
        <ChallengeSettings onNext={handleSettingsNext} />
      )}

      {/* 3. Step 2: Choose Opponent */}
      {step === "send" && config && (
        <SendChallenge
          onBack={handleBack}
          onNext={handleSendNext}
          config={config}
        />
      )}

      {/* 4. Step 3: Review & Confirm */}
      {step === "confirmation" && config && opponent && (
        <ChallengeConfirmation
          onBack={handleBack}
          onConfirm={handleConfirm}
          opponent={opponent}
          config={config}
        />
      )}

      {/* 5. Step 4: Challenge Sent Celebration */}
      {step === "sent" && (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
          <Card className="max-w-md w-full border-purple-500/30 shadow-2xl bg-card">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center border border-purple-500/30">
                <Swords className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">Challenge Issued!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Your duel against <span className="font-bold text-foreground">{opponent?.name}</span> has been created.
                  You can play your round immediately or await their response in the Arena Hub.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {createdChallengeId && (
                  <Button
                    onClick={() => navigate(`/quiz?mode=duel&duelId=${createdChallengeId}`)}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play Your Round Now
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("hub");
                    loadHubData();
                  }}
                  className="w-full"
                >
                  Return to Arena Hub
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
