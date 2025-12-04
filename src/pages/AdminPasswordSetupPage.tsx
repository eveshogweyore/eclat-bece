import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

interface InvitationDetails {
    email: string;
    full_name: string;
    is_super_admin: boolean;
}

export default function AdminPasswordSetupPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        loadInvitation();
    }, [token]);

    const loadInvitation = async () => {
        try {
            // Load invitation details (no auth required)
            const { data: invitationData, error: invitationError } = await supabase
                .from("admin_invitations" as any)
                .select("target_email, full_name, is_super_admin, status, expires_at")
                .eq("token", token)
                .maybeSingle();

            if (invitationError) throw invitationError;

            if (!invitationData) {
                setError("Invalid invitation link.");
                setLoading(false);
                return;
            }

            // Check if already accepted
            if (invitationData.status === "accepted") {
                setError("This invitation has already been used.");
                setLoading(false);
                return;
            }

            // Check if expired
            const expiresAt = new Date(invitationData.expires_at);
            if (expiresAt < new Date() || invitationData.status === "expired") {
                setError("This invitation has expired.");
                setLoading(false);
                return;
            }

            setInvitation({
                email: invitationData.target_email,
                full_name: invitationData.full_name,
                is_super_admin: invitationData.is_super_admin,
            });

            setLoading(false);
        } catch (error: any) {
            console.error("Error loading invitation:", error);
            setError(error.message || "Failed to load invitation details.");
            setLoading(false);
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!token) return;
        setCreating(true);

        try {
            // Call Edge Function to create admin user
            const { data, error } = await supabase.functions.invoke('create-admin-user', {
                body: {
                    token: token,
                    password: values.password
                }
            });

            if (error) throw error;

            const result = data as any;
            if (!result.success) {
                throw new Error(result.error || "Failed to create admin account");
            }

            toast.success("Admin account created successfully!");
            toast.info("Please login with your credentials");

            // Redirect to admin login
            setTimeout(() => {
                navigate("/admin/login");
            }, 2000);
        } catch (error: any) {
            console.error("Error creating admin account:", error);
            toast.error(error.message || "Failed to create admin account");
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/20 to-background flex items-center justify-center p-4">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading invitation...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/20 to-background flex items-center justify-center p-4">
                <div className="fixed top-4 right-4 z-50">
                    <ThemeToggle />
                </div>
                <Card className="w-full max-w-md shadow-2xl border-2">
                    <CardHeader className="text-center pb-8">
                        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mb-4">
                            <XCircle className="w-10 h-10 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Invalid Invitation</CardTitle>
                        <CardDescription className="text-base mt-2">{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate("/")} className="w-full">
                            Go to Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!invitation) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/20 to-background flex items-center justify-center p-4">
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md shadow-2xl border-2">
                <CardHeader className="space-y-4 text-center pb-8">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg">
                        <Shield className="w-10 h-10 text-primary-foreground" />
                    </div>

                    <div>
                        <CardTitle className="text-3xl font-bold">Complete Your Admin Setup</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Create your password to activate your admin account
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Account Details */}
                    <div className="space-y-3 bg-muted/50 border border-border rounded-lg p-4">
                        <div>
                            <Label className="text-sm text-muted-foreground">Full Name</Label>
                            <p className="text-base font-medium">{invitation.full_name}</p>
                        </div>
                        <div>
                            <Label className="text-sm text-muted-foreground">Email</Label>
                            <p className="text-base font-medium">{invitation.email}</p>
                        </div>
                        <div>
                            <Label className="text-sm text-muted-foreground">Role</Label>
                            <p className="text-base font-medium">
                                {invitation.is_super_admin ? "Super Administrator" : "Administrator"}
                            </p>
                        </div>
                    </div>

                    {/* Password Form */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Enter your password"
                                                    {...field}
                                                    disabled={creating}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    disabled={creating}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm your password"
                                                    {...field}
                                                    disabled={creating}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    disabled={creating}
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Password requirements:</strong> Minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={creating}
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Create Admin Account
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
