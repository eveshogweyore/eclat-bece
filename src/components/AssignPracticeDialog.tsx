import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { BookOpen, Clock, Target, ChevronRight, ChevronLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LinkedChild } from "@/types/parent";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

interface AssignPracticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: LinkedChild | null;
}

type Step = "subject" | "topics" | "config" | "summary";

export function AssignPracticeDialog({ open, onOpenChange, child }: AssignPracticeDialogProps) {
  const [step, setStep] = useState<Step>("subject");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Metadata from backend
  const [subjectsMetadata, setSubjectsMetadata] = useState<Record<string, string[]>>({});
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  // Form State
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [duration, setDuration] = useState<number>(20);
  const [maxAvailableQuestions, setMaxAvailableQuestions] = useState<number>(10);

  // Limits
  const questionLimit = child?.is_premium ? 60 : 10;

  // Reset form when dialog closes or child changes
  useEffect(() => {
    if (!open) {
      setStep("subject");
      setSelectedSubject("");
      setSelectedTopics([]);
      setNumQuestions(10);
      setDuration(20);
    } else if (child) {
      fetchMetadata();
    }
  }, [open, child]);

  const fetchMetadata = async () => {
    if (!child?.class_year) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("quiz-utilities", {
        body: { 
          classYear: child.class_year, 
          action: "get-metadata" 
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const metadata = data.metadata || {};
      setSubjectsMetadata(metadata);
      setAvailableSubjects(Object.keys(metadata).sort());
    } catch (error: unknown) {
      console.error("Error fetching metadata:", error);
      toast.error("Failed to load subjects and topics");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestionCount = async (subject: string, topics: string[]) => {
    if (!child?.class_year) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("quiz-utilities", {
        body: { 
          classYear: child.class_year, 
          action: "get-question-count",
          subject,
          topics
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const count = data.count || 0;
      setMaxAvailableQuestions(Math.min(count, questionLimit));
      // Adjust numQuestions if it exceeds available
      if (numQuestions > Math.min(count, questionLimit)) {
        setNumQuestions(Math.min(count, questionLimit));
      }
    } catch (error) {
      console.error("Error fetching question count:", error);
    }
  };

  const handleSubjectChange = (val: string) => {
    setSelectedSubject(val);
    setSelectedTopics([]); // Reset topics
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic) 
        : [...prev, topic]
    );
  };

  const handleNext = async () => {
    if (step === "subject") {
      if (!selectedSubject) {
        toast.error("Please select a subject");
        return;
      }
      setStep("topics");
    } else if (step === "topics") {
      if (selectedTopics.length === 0) {
        toast.error("Please select at least one topic");
        return;
      }
      setIsLoading(true);
      await fetchQuestionCount(selectedSubject, selectedTopics);
      setIsLoading(false);
      setStep("config");
    } else if (step === "config") {
      setStep("summary");
    }
  };

  const handleBack = () => {
    if (step === "topics") setStep("subject");
    else if (step === "config") setStep("topics");
    else if (step === "summary") setStep("config");
  };

  const { user } = useAuth();

  const handleAssignTask = async () => {
    if (!child || !user?.id) return;
    
    setIsSubmitting(true);
    try {
      const { data: parentData, error: parentError } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", user.id)
        .single();
        
      if (parentError || !parentData) throw new Error("Could not find parent profile");

      const { error } = await supabase
        .from("practice_assignments")
        .insert({
          student_id: child.id,
          parent_id: parentData.id,
          subject: selectedSubject,
          topics: selectedTopics,
          num_questions: numQuestions,
          duration: duration,
          status: 'pending'
        });

      if (error) throw error;

      // Send in-app notification to the child
      await supabase
        .from("notifications")
        .insert({
          user_id: child.user_id,
          title: "New Task Assigned",
          message: `Your parent has assigned you a new ${selectedSubject} practice task: "${selectedTopics.join(', ')}".`,
          type: "parent_assignment",
          read: false,
          metadata: {
            subject: selectedSubject,
            num_questions: numQuestions,
            duration: duration,
            topics: selectedTopics
          }
        });

      toast.success("Task assigned successfully!", {
        description: `${child.profile.full_name} will see this in their dashboard.`,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error assigning task:", error);
      toast.error(getErrorMessage(error, "Failed to assign task"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">
            Assign Practice Task
          </DialogTitle>
          <DialogDescription>
            {child ? `Creating a custom practice set for ${child.profile.full_name}` : "Set up a new learning task"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-1 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 -z-10" />
          {["subject", "topics", "config", "summary"].map((s, idx) => (
            <div 
              key={s} 
              className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold transition-all
                ${step === s ? 'bg-primary border-primary text-white scale-110' : 
                  idx < ["subject", "topics", "config", "summary"].indexOf(step) ? 'bg-emerald-500 border-emerald-500 text-white' : 
                  'bg-background border-muted text-muted-foreground'}
              `}
            >
              {idx < ["subject", "topics", "config", "summary"].indexOf(step) ? <CheckCircle2 size={16} /> : idx + 1}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-2 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium animate-pulse">Loading subjects and topics...</p>
            </div>
          ) : (
            <>
              {step === "subject" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-3">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Select Subject</label>
                    <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                      <SelectTrigger className="h-14 rounded-2xl border-2 hover:border-primary/50 transition-all text-lg font-bold">
                        <SelectValue placeholder="Choose a subject..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-xl">
                        {availableSubjects.map(sub => (
                          <SelectItem key={sub} value={sub} className="rounded-xl font-bold py-3">
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedSubject && (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3">
                      <BookOpen className="text-primary shrink-0" size={24} />
                      <p className="text-sm text-muted-foreground">
                        Great! Now you'll choose specific topics within <span className="font-bold text-foreground">{selectedSubject}</span>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === "topics" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Choose Topics</label>
                      <Badge variant="outline" className="font-black text-[10px]">{selectedTopics.length} selected</Badge>
                    </div>
                    
                    <ScrollArea className="h-[280px] rounded-2xl border-2 p-4">
                      <div className="space-y-4">
                        {(subjectsMetadata[selectedSubject] || []).map(topic => (
                          <div 
                            key={topic} 
                            className={`flex items-center space-x-3 p-3 rounded-xl transition-colors cursor-pointer hover:bg-muted/50 ${selectedTopics.includes(topic) ? 'bg-primary/5 border border-primary/20' : 'border border-transparent'}`}
                            onClick={() => toggleTopic(topic)}
                          >
                            <Checkbox 
                              id={topic} 
                              checked={selectedTopics.includes(topic)}
                              onCheckedChange={() => toggleTopic(topic)}
                              className="rounded-md h-5 w-5 border-2"
                            />
                            <label htmlFor={topic} className="text-base font-bold cursor-pointer flex-1 leading-tight">
                              {topic}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {step === "config" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Number of Questions</label>
                      <Badge variant="hero" className="font-black text-sm rounded-lg px-3">{numQuestions}</Badge>
                    </div>
                    <div className="px-2 pt-2 pb-6">
                      <Slider 
                        value={[numQuestions]} 
                        min={1} 
                        max={maxAvailableQuestions || 10} 
                        step={1} 
                        onValueChange={(val) => setNumQuestions(val[0])}
                      />
                      <div className="flex justify-between mt-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                        <span>1 Question</span>
                        <span>{maxAvailableQuestions} Questions Max</span>
                      </div>
                    </div>
                    
                    {!child?.is_premium && maxAvailableQuestions >= 10 && (
                      <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 flex gap-3">
                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                        <p className="text-[11px] text-amber-700/80 font-medium leading-relaxed">
                          Standard accounts are limited to 10 questions. <span className="font-black">Upgrade to Premium</span> for up to 60.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Duration (Minutes)</label>
                      <Badge variant="outline" className="font-black text-sm rounded-lg px-3 border-2">{duration}m</Badge>
                    </div>
                    <div className="px-2 pt-2">
                      <Slider 
                        value={[duration]} 
                        min={5} 
                        max={120} 
                        step={5} 
                        onValueChange={(val) => setDuration(val[0])}
                      />
                      <div className="flex justify-between mt-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                        <span>5 min</span>
                        <span>2 hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === "summary" && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-400">
                  <div className="bg-muted/30 rounded-3xl p-6 border-2 border-dashed border-border/60 space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/40 pb-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-hero flex items-center justify-center text-xl font-black text-white shadow-lg">
                        {child?.profile.full_name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-xl leading-tight">{child?.profile.full_name}</h4>
                        <p className="text-sm font-bold text-muted-foreground">{child?.class_year === 'year_6' ? 'Year 6 • Common Entrance' : 'Year 9 • BECE'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center group/item">
                        <span className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Subject</span>
                        <span className="font-bold text-foreground bg-primary/10 px-3 py-1 rounded-lg text-sm">{selectedSubject}</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Topic(s)</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedTopics.map(t => (
                            <Badge key={t} variant="outline" className="font-bold border-2 rounded-lg">{t}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3 bg-background rounded-2xl border border-border/50">
                        <div className="flex items-center gap-2">
                          <Target className="text-emerald-500" size={18} />
                          <span className="text-sm font-bold">{numQuestions} Questions</span>
                        </div>
                        <div className="h-4 w-px bg-border/60" />
                        <div className="flex items-center gap-2">
                          <Clock className="text-blue-500" size={18} />
                          <span className="text-sm font-bold">{duration} Minutes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex gap-3 text-emerald-800 dark:text-emerald-400">
                    <CheckCircle2 size={24} className="shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">
                      Everything looks good! Once you click assign, the student will be notified and can start the task immediately.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-6 border-t mt-4 flex sm:justify-between items-center gap-4">
          {step !== "subject" && !isLoading && (
            <Button 
              variant="ghost" 
              onClick={handleBack}
              disabled={isSubmitting}
              className="font-black rounded-xl px-4"
            >
              <ChevronLeft className="mr-2" size={20} /> Back
            </Button>
          )}
          
          <div className="flex-1" />

          {step !== "summary" ? (
            <Button 
              variant="hero" 
              onClick={handleNext} 
              disabled={isLoading || (step === "subject" && !selectedSubject) || (step === "topics" && selectedTopics.length === 0)}
              className="w-full sm:w-auto min-w-[140px] font-black rounded-xl h-12 shadow-lg shadow-primary/20"
            >
              Next <ChevronRight className="ml-2" size={20} />
            </Button>
          ) : (
            <Button 
              variant="hero" 
              onClick={handleAssignTask}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[200px] font-black rounded-xl h-12 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...
                </>
              ) : (
                <>
                  <Target className="mr-2" size={20} /> Assign Quiz Task
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
