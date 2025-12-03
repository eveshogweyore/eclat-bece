import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CSVUploadForm } from "./CSVUploadForm";

const formSchema = z.object({
    classYear: z.enum(["year_6", "year_9"]),
    questionType: z.enum(["standard", "comprehension"]),
    passageId: z.string().optional(),
    subject: z.string().min(1, "Subject is required"),
    topic: z.string().min(1, "Topic is required"),
    questionText: z.string().min(1, "Question text is required"),
    explanation: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    options: z.array(z.object({
        text: z.string().min(1, "Option text is required"),
        isCorrect: z.boolean(),
    })).min(2, "At least 2 options are required").refine(
        (options) => options.filter(o => o.isCorrect).length === 1,
        "Exactly one option must be marked as correct"
    ),
}).refine(
    (data) => data.questionType === "standard" || (data.questionType === "comprehension" && data.passageId),
    { message: "Please select a passage for comprehension questions", path: ["passageId"] }
);

interface AddQuestionDialogProps {
    onSuccess: () => void;
}

export function AddQuestionDialog({ onSuccess }: AddQuestionDialogProps) {
    const [open, setOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState<"individual" | "csv">("individual");
    const [loading, setLoading] = useState(false);
    const [passages, setPassages] = useState<Array<{ id: string; title: string | null; passage_text: string }>>([]);
    const { user } = useAuth();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            classYear: "year_6",
            questionType: "standard",
            passageId: "",
            subject: "",
            topic: "",
            questionText: "",
            explanation: "",
            difficulty: "medium",
            options: [
                { text: "", isCorrect: true },
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
            ],
        },
    });

    const classYear = form.watch("classYear");
    const questionType = form.watch("questionType");

    useEffect(() => {
        if (questionType === "comprehension") {
            fetchPassages();
        }
    }, [questionType, classYear]);

    const fetchPassages = async () => {
        try {
            const tableName = classYear === 'year_6'
                ? 'comprehension_passages_year6'
                : 'comprehension_passages_year9';

            const { data, error } = await supabase
                .from(tableName as any)
                .select('id, title, passage_text')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPassages(data || []);
        } catch (error) {
            console.error('Error fetching passages:', error);
            toast.error('Failed to load passages');
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        setLoading(true);

        try {
            const tableName = values.classYear === 'year_6' ? 'quiz_questions_year6' : 'quiz_questions_year9';
            const optionsTableName = values.classYear === 'year_6' ? 'quiz_options_year6' : 'quiz_options_year9';

            // 1. Insert Question
            const { data: questionData, error: questionError } = await supabase
                .from(tableName as any)
                .insert({
                    subject: values.subject,
                    topic: values.topic,
                    question_text: values.questionText,
                    correct_answer: values.options.find(o => o.isCorrect)?.text,
                    explanation: values.explanation,
                    difficulty: values.difficulty,
                    passage_id: values.questionType === "comprehension" ? values.passageId : null,
                })
                .select()
                .single();

            if (questionError) throw questionError;

            // 2. Insert Options
            const optionsToInsert = values.options.map((opt, index) => ({
                question_id: questionData.id,
                option_text: opt.text,
                is_correct: opt.isCorrect,
                display_order: index,
            }));

            const { error: optionsError } = await supabase
                .from(optionsTableName as any)
                .insert(optionsToInsert);

            if (optionsError) throw optionsError;

            // 3. Log Action
            await supabase.rpc('log_admin_action', {
                _admin_id: (await supabase.rpc('get_admin_id', { _user_id: user.id })).data,
                _action: 'create_question',
                _resource_type: 'question',
                _resource_id: questionData.id,
                _details: {
                    class_year: values.classYear,
                    subject: values.subject
                }
            });

            toast.success("Question added successfully");
            setOpen(false);
            form.reset();
            onSuccess();
        } catch (error: any) {
            console.error("Error adding question:", error);
            toast.error(error.message || "Failed to add question");
        } finally {
            setLoading(false);
        }
    };

    const updateOption = (index: number, text: string) => {
        const newOptions = [...form.getValues("options")];
        newOptions[index].text = text;
        form.setValue("options", newOptions);
    };

    const setCorrectOption = (index: number) => {
        const newOptions = form.getValues("options").map((opt, i) => ({
            ...opt,
            isCorrect: i === index,
        }));
        form.setValue("options", newOptions);
    };

    const handleSuccess = () => {
        setOpen(false);
        onSuccess();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Question</DialogTitle>
                    <DialogDescription>
                        Create a new quiz question for students.
                    </DialogDescription>
                </DialogHeader>

                {/* Mode Selection */}
                <div className="space-y-2">
                    <Label>Upload Method</Label>
                    <Select value={uploadMode} onValueChange={(v: "individual" | "csv") => setUploadMode(v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="individual">Add Questions Individually</SelectItem>
                            <SelectItem value="csv">Add Questions via CSV</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Conditional Rendering Based on Mode */}
                {uploadMode === "csv" ? (
                    <CSVUploadForm onSuccess={handleSuccess} />
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="classYear"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Class Year</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select year" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="year_6">Year 6 (Common Entrance)</SelectItem>
                                                    <SelectItem value="year_9">Year 9 (BECE)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="difficulty"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Difficulty</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select difficulty" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="easy">Easy</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="hard">Hard</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Question Type Selection */}
                            <FormField
                                control={form.control}
                                name="questionType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Question Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="standard">Standard Question</SelectItem>
                                                <SelectItem value="comprehension">Comprehension Question</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Passage Selection (only for comprehension questions) */}
                            {questionType === "comprehension" && (
                                <FormField
                                    control={form.control}
                                    name="passageId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Passage</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choose a passage" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {passages.length === 0 ? (
                                                        <SelectItem value="none" disabled>
                                                            No passages available
                                                        </SelectItem>
                                                    ) : (
                                                        passages.map((passage) => (
                                                            <SelectItem key={passage.id} value={passage.id}>
                                                                {passage.title || passage.passage_text.substring(0, 50) + "..."}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Passage Preview */}
                            {questionType === "comprehension" && form.watch("passageId") && (
                                <div className="p-4 bg-muted rounded-lg border">
                                    <h4 className="font-semibold mb-2 text-sm">Passage Preview:</h4>
                                    <p className="text-sm whitespace-pre-wrap">
                                        {passages.find(p => p.id === form.watch("passageId"))?.passage_text}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subject</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select subject" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                                                    <SelectItem value="English">English</SelectItem>
                                                    <SelectItem value="General Paper">General Paper</SelectItem>
                                                    <SelectItem value="Basic Science">Basic Science</SelectItem>
                                                    <SelectItem value="Social Studies">Social Studies</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="topic"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Topic (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Algebra" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="questionText"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Question</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Enter the question here..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-2">
                                <FormLabel>Options</FormLabel>
                                <FormDescription>Mark the correct answer using the radio button.</FormDescription>
                                {form.watch("options").map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div
                                            className={`cursor-pointer p-2 rounded-full ${option.isCorrect ? 'text-green-600 bg-green-100' : 'text-muted-foreground hover:bg-muted'}`}
                                            onClick={() => setCorrectOption(index)}
                                        >
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <Input
                                            value={option.text}
                                            onChange={(e) => updateOption(index, e.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            className={option.isCorrect ? "border-green-500 ring-1 ring-green-500" : ""}
                                        />
                                    </div>
                                ))}
                                <FormMessage>
                                    {form.formState.errors.options?.message || form.formState.errors.options?.root?.message}
                                </FormMessage>
                            </div>

                            <FormField
                                control={form.control}
                                name="explanation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Explanation (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Explain why the answer is correct..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Question
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
