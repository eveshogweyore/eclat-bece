import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface QuizOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

export interface QuizQuestion {
  id: string;
  subject: string;
  topic: string;
  question_text: string;
  correct_answer: string;
  explanation: string;
  difficulty: string;
  quiz_options?: QuizOption[];
}

export const useQuizQuestions = (subject?: string, difficulty?: string) => {
  return useQuery({
    queryKey: ['quiz-questions', subject, difficulty],
    queryFn: async () => {
      let query = supabase
        .from('quiz_questions')
        .select(`
          *,
          quiz_options (
            id,
            option_text,
            is_correct,
            display_order
          )
        `)
        .order('created_at', { ascending: false });

      if (subject) {
        query = query.eq('subject', subject);
      }

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching quiz questions:', error);
        throw error;
      }

      return data as QuizQuestion[];
    },
  });
};

export const useQuizQuestionsBySubject = () => {
  return useQuery({
    queryKey: ['quiz-questions-by-subject'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('subject')
        .order('subject');

      if (error) {
        console.error('Error fetching subjects:', error);
        throw error;
      }

      // Group questions by subject and count them
      const subjectCounts = data.reduce((acc: Record<string, number>, curr) => {
        acc[curr.subject] = (acc[curr.subject] || 0) + 1;
        return acc;
      }, {});

      return subjectCounts;
    },
  });
};