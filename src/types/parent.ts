export interface QuizResult {
    id: string;
    student_id?: string;
    subject: string;
    score: number;
    correct_answers: number;
    total_questions: number;
    completed_at: string;
}

export interface ChildAnalytics {
    studentId: string;
    averageScore: number;
    totalQuizzes: number;
    subjectPerformance: { subject: string; avgScore: number; count: number }[];
    recentQuizzes: QuizResult[];
}

export interface LinkedChild {
    id: string;
    user_id: string;
    class_year: string | null;
    is_premium?: boolean;
    profile: {
        full_name: string | null;
        unique_id: string;
        username?: string;
    };
}
