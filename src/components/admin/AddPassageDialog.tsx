import { useState } from "react";
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
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
    classYear: z.enum(["year_6", "year_9"]),
    title: z.string().optional(),
    passageText: z.string().min(10, "Passage must be at least 10 characters"),
    topic: z.string().optional(),
});

interface AddPassageDialogProps {
    onSuccess: () => void;
}

export function AddPassageDialog({ onSuccess }: AddPassageDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            classYear: "year_6",
            title: "",
            passageText: "",
            topic: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user) return;
        setLoading(true);

        try {
            const tableName = values.classYear === 'year_6'
                ? 'comprehension_passages_year6'
                : 'comprehension_passages_year9';

            const { error } = await supabase
                .from(tableName as any)
                .insert({
                    title: values.title || null,
                    passage_text: values.passageText,
                    topic: values.topic || null,
                });

            if (error) throw error;

            // Log admin action
            await supabase.rpc('log_admin_action', {
                _admin_id: (await supabase.rpc('get_admin_id', { _user_id: user.id })).data,
                _action: 'create_passage',
                _resource_type: 'comprehension_passage',
                _resource_id: null,
                _details: {
                    class_year: values.classYear,
                    has_title: !!values.title
                }
            });

            toast.success("Passage added successfully");
            setOpen(false);
            form.reset();
            onSuccess();
        } catch (error: any) {
            console.error("Error adding passage:", error);
            toast.error(error.message || "Failed to add passage");
        } finally {
            setLoading(false);
        }
    };

    const passageLength = form.watch("passageText")?.length || 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Passage
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Comprehension Passage</DialogTitle>
                    <DialogDescription>
                        Create a new reading passage for comprehension questions.
                    </DialogDescription>
                </DialogHeader>
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
                                name="topic"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Topic (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Fables, Science" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. The Lion and the Mouse" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="passageText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Passage Text</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter the reading passage here..."
                                            className="min-h-[200px] font-serif"
                                            {...field}
                                        />
                                    </FormControl>
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>{passageLength} characters</span>
                                        <span>{passageLength < 10 ? "Minimum 10 characters" : ""}</span>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Passage
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
