import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { PracticeAssignment, Assignment } from "@/components/PracticeAssignment";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function StudentAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data: studentData } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!studentData?.id) {
          setAssignments([]);
          return;
        }

        const { data, error } = await supabase
          .from("practice_assignments")
          .select("*")
          .eq("student_id", studentData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAssignments((data || []) as Assignment[]);
      } catch (error) {
        console.error("Error fetching assignments:", error);
        setAssignments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <ClipboardList className="text-primary" size={32} />
          Practice Assignments
        </h2>
        <p className="text-muted-foreground">Complete your assigned practice sessions</p>
      </div>

      <div className="animate-scale-in">
        <PracticeAssignment assignments={assignments} isLoading={isLoading} />
      </div>
    </div>
  );
}
