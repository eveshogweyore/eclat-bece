import { useState, useEffect, useRef } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Loader2, Plus, Trash2, CheckCircle2, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CSVUploadForm } from "./CSVUploadForm";
import { validateImageFile, compressImage } from "@/lib/imageUtils";

const formSchema = z.object({
    classYear: z.enum(["year_6", "year_9"]),
    questionType: z.enum(["standard", "comprehension"]),
    passageMode: z.enum(["select", "create"]).optional(),
    passageId: z.string().optional(),
    newPassageTitle: z.string().optional(),
    newPassageText: z.string().optional(),
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
    (data) => {
        if (data.questionType === "comprehension") {
            if (data.passageMode === "select" && !data.passageId) {
                return false;
            }
            if (data.passageMode === "create") {
                if (!data.newPassageText || data.newPassageText.length < 10) return false;
                if (!data.newPassageTitle || data.newPassageTitle.trim().length === 0) return false;
            }
        }
        return true;
    },
    { message: "Please complete passage selection or creation (Title and Text required for new passages)", path: ["passageId"] }
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

    // Image upload state
    const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
    const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
    const [optionImageFiles, setOptionImageFiles] = useState<(File | null)[]>([null, null, null, null]);
    const [optionImagePreviews, setOptionImagePreviews] = useState<(string | null)[]>([null, null, null, null]);
    const [isUploadingImages, setIsUploadingImages] = useState(false);

    const questionImageInputRef = useRef<HTMLInputElement>(null);
    const optionImageInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            classYear: "year_6",
            questionType: "standard",
            passageMode: "select",
            passageId: "",
            newPassageTitle: "",
            newPassageText: "",
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
    const passageMode = form.watch("passageMode");

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
                .from(tableName)
                .select('id, title, passage_text')
                .order('title', { ascending: true, nullsFirst: false });

            if (error) throw error;
            setPassages(data || []);
        } catch (error: any) {
            console.error('Error fetching passages:', error);
            toast.error(`Failed to load passages: ${error.message || 'Unknown error'}`);
        }
    };

    // --- Image helper functions ---
    const handleQuestionImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const error = validateImageFile(file);
        if (error) {
            toast.error(error);
            return;
        }
        if (questionImagePreview) URL.revokeObjectURL(questionImagePreview);
        setQuestionImageFile(file);
        setQuestionImagePreview(URL.createObjectURL(file));
        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    const handleOptionImageSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const error = validateImageFile(file);
        if (error) {
            toast.error(error);
            return;
        }
        if (optionImagePreviews[index]) URL.revokeObjectURL(optionImagePreviews[index]!);
        setOptionImageFiles(prev => { const next = [...prev]; next[index] = file; return next; });
        setOptionImagePreviews(prev => { const next = [...prev]; next[index] = URL.createObjectURL(file); return next; });
        e.target.value = '';
    };

    const removeQuestionImage = () => {
        if (questionImagePreview) URL.revokeObjectURL(questionImagePreview);
        setQuestionImageFile(null);
        setQuestionImagePreview(null);
    };

    const removeOptionImage = (index: number) => {
        if (optionImagePreviews[index]) URL.revokeObjectURL(optionImagePreviews[index]!);
        setOptionImageFiles(prev => { const next = [...prev]; next[index] = null; return next; });
        setOptionImagePreviews(prev => { const next = [...prev]; next[index] = null; return next; });
    };

    const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
        const compressedFile = await compressImage(file);
        const { error } = await supabase.storage
            .from('question-images')
            .upload(path, compressedFile, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage
            .from('question-images')
            .getPublicUrl(path);
        return urlData.publicUrl;
    };

    const resetImageState = () => {
        if (questionImagePreview) URL.revokeObjectURL(questionImagePreview);
        optionImagePreviews.forEach(url => { if (url) URL.revokeObjectURL(url); });
        setQuestionImageFile(null);
        setQuestionImagePreview(null);
        setOptionImageFiles([null, null, null, null]);
        setOptionImagePreviews([null, null, null, null]);
        setIsUploadingImages(false);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        setLoading(true);

        try {
            const tableName = values.classYear === 'year_6' ? 'quiz_questions_year6' : 'quiz_questions_year9';
            const optionsTableName = values.classYear === 'year_6' ? 'quiz_options_year6' : 'quiz_options_year9';
            const passageTableName = values.classYear === 'year_6' ? 'comprehension_passages_year6' : 'comprehension_passages_year9';

            let finalPassageId = values.passageId;

            // If creating a new passage, insert it first
            if (values.questionType === "comprehension" && values.passageMode === "create" && values.newPassageText) {
                if (!values.newPassageText || !values.newPassageTitle) return;

                const { data: newPassage, error: passageError } = await supabase
                    .from(passageTableName)
                    .insert({
                        title: values.newPassageTitle,
                        passage_text: values.newPassageText,
                        subject: values.subject // Passages inherit subject from the question being created
                    })
                    .select()
                    .single();

                if (passageError) throw passageError;
                finalPassageId = newPassage.id;
            }

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
                    passage_id: values.questionType === "comprehension" ? finalPassageId : null,
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

            const { data: optionsData, error: optionsError } = await supabase
                .from(optionsTableName as any)
                .insert(optionsToInsert)
                .select();

            if (optionsError) throw optionsError;

            // 2b. Upload images if any
            const hasAnyImage = questionImageFile || optionImageFiles.some(f => f !== null);
            if (hasAnyImage) {
                setIsUploadingImages(true);
                try {
                    // Upload question image
                    if (questionImageFile) {
                        const publicUrl = await uploadImageToStorage(
                            questionImageFile,
                            `${values.classYear}/questions/${questionData.id}.webp`
                        );
                        await supabase
                            .from(tableName as any)
                            .update({ image_url: publicUrl })
                            .eq('id', questionData.id);
                    }

                    // Upload option images
                    if (optionsData) {
                        for (let i = 0; i < optionImageFiles.length; i++) {
                            const optFile = optionImageFiles[i];
                            if (optFile && optionsData[i]) {
                                const publicUrl = await uploadImageToStorage(
                                    optFile,
                                    `${values.classYear}/options/${optionsData[i].id}.webp`
                                );
                                await supabase
                                    .from(optionsTableName as any)
                                    .update({ image_url: publicUrl })
                                    .eq('id', optionsData[i].id);
                            }
                        }
                    }
                } finally {
                    setIsUploadingImages(false);
                }
            }

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
            resetImageState();
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

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetImageState();
        }
        setOpen(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
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
                                                    <SelectItem value="English Language">English Language</SelectItem>
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
                                            <FormLabel>Topic</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Algebra" {...field} />
                                            </FormControl>
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

                            {/* Passage Mode Selection (only for comprehension questions) */}
                            {questionType === "comprehension" && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="passageMode"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>Passage Options</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                        className="flex flex-col space-y-1"
                                                    >
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="select" />
                                                            </FormControl>
                                                            <FormLabel className="font-normal cursor-pointer">
                                                                Choose a Passage
                                                            </FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="create" />
                                                            </FormControl>
                                                            <FormLabel className="font-normal cursor-pointer">
                                                                Create New Passage
                                                            </FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Select Existing Passage */}
                                    {passageMode === "select" && (
                                        <>
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

                                            {/* Passage Preview */}
                                            {form.watch("passageId") && (
                                                <div className="p-4 bg-muted rounded-lg border">
                                                    <h4 className="font-semibold mb-2 text-sm">Passage Preview:</h4>
                                                    <p className="text-sm whitespace-pre-wrap">
                                                        {passages.find(p => p.id === form.watch("passageId"))?.passage_text}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Create New Passage */}
                                    {passageMode === "create" && (
                                        <>
                                            <FormField
                                                control={form.control}
                                                name="newPassageTitle"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Passage Title</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. The Lion and the Mouse" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="newPassageText"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Passage</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Enter the reading passage here..."
                                                                className="min-h-[150px] font-serif"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            Minimum 10 characters required
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </>
                                    )}
                                </>
                            )}

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

                            {/* Question Image (Optional) */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Question Image <span className="text-muted-foreground">(Optional)</span></Label>
                                {questionImagePreview ? (
                                    <div className="relative inline-block">
                                        <img src={questionImagePreview} alt="Question preview" className="max-h-40 rounded-xl border shadow-sm object-contain" />
                                        <button type="button" onClick={removeQuestionImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:scale-110 transition-transform">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => questionImageInputRef.current?.click()}
                                        className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                    >
                                        <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground/50 group-hover:text-primary/70 transition-colors mb-2" />
                                        <p className="text-sm text-muted-foreground">Click to add an image</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">JPEG, PNG, WebP, GIF • Max 3 MB</p>
                                    </div>
                                )}
                                <input ref={questionImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleQuestionImageSelect} />
                            </div>

                            <div className="space-y-2">
                                <FormLabel>Options</FormLabel>
                                <FormDescription>Mark the correct answer using the radio button.</FormDescription>
                                {form.watch("options").map((option, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-center gap-2">
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
                                        <div className="flex items-center gap-2 mt-1 ml-10">
                                            <button type="button" onClick={() => optionImageInputRefs.current[index]?.click()} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                                                <ImagePlus className="h-3.5 w-3.5" />
                                                {optionImagePreviews[index] ? 'Change' : 'Add'} Image
                                            </button>
                                            {optionImagePreviews[index] && (
                                                <button type="button" onClick={() => removeOptionImage(index)} className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1">
                                                    <X className="h-3 w-3" /> Remove
                                                </button>
                                            )}
                                            <input ref={el => { optionImageInputRefs.current[index] = el; }} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleOptionImageSelect(index, e)} />
                                        </div>
                                        {optionImagePreviews[index] && (
                                            <img src={optionImagePreviews[index]!} alt={`Option ${index + 1} preview`} className="max-h-16 rounded-lg border object-contain mt-1 ml-10" />
                                        )}
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
                                <Button type="submit" disabled={loading || isUploadingImages}>
                                    {(loading || isUploadingImages) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isUploadingImages ? 'Uploading Images...' : 'Save Question'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
