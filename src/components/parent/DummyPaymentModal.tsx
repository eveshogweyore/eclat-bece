import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

interface DummyPaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentId: string;
    studentName: string;
    onSuccess: () => void;
}

export function DummyPaymentModal({
    open,
    onOpenChange,
    studentId,
    studentName,
    onSuccess,
}: DummyPaymentModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = async () => {
        setIsProcessing(true);

        try {
            // Simulate payment processing delay
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const { data, error } = await supabase.functions.invoke("manage-student-account", {
                body: { studentId, action: "upgrade-premium" },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success(`${studentName} now has Premium Access!`);
            onSuccess();
            onOpenChange(false);
        } catch (error: unknown) {
            console.error("Error processing payment:", error);
            toast.error(getErrorMessage(error, "Payment failed. Please try again."));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                        <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl">Unlock Premium Features</DialogTitle>
                    <DialogDescription className="text-center">
                        Upgrade {studentName}'s account for unlimited practice questions and detailed analytics.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                    <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-medium text-foreground">1 Year Subscription</p>
                            <p className="text-sm text-muted-foreground">Billed annually</p>
                        </div>
                        <p className="text-2xl font-bold">₦15,000</p>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-sm text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded inline-block">
                            Notice: This is a dummy payment process for testing. No real charges will be made.
                        </p>
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="hero"
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Pay Now (Test)"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
