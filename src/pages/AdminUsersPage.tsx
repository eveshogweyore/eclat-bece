import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    MoreHorizontal,
    Search,
    Shield,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AddAdminDialog } from "@/components/admin/AddAdminDialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AdminUser {
    id: string;
    user_id: string;
    full_name: string;
    is_super_admin: boolean;
    is_active: boolean;
    created_at: string;
    profiles?: {
        email: string;
    };
}

export default function AdminUsersPage() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        checkSuperAdminStatus();
        fetchAdmins();
    }, [user]);

    const checkSuperAdminStatus = async () => {
        if (!user) return;
        const { data } = await supabase.rpc('is_super_admin', { _user_id: user.id });
        setCurrentUserIsSuperAdmin(!!data);
    };

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            // 1. Fetch all admins
            const { data: adminsData, error: adminsError } = await supabase
                .from("admins" as any)
                .select("*")
                .order("created_at", { ascending: false });

            if (adminsError) throw adminsError;

            if (!adminsData || adminsData.length === 0) {
                setAdmins([]);
                return;
            }

            // 2. Fetch profiles for these admins to get emails
            const userIds = adminsData.map((admin: any) => admin.user_id);
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("id, email")
                .in("id", userIds);

            if (profilesError) {
                console.error("Error fetching profiles:", profilesError);
                // Continue even if profiles fail, just won't show emails
            }

            // 3. Merge data
            const mergedAdmins = adminsData.map((admin: any) => {
                const profile = profilesData?.find((p) => p.id === admin.user_id);
                return {
                    ...admin,
                    profiles: profile ? { email: profile.email } : { email: "Unknown" }
                };
            });

            setAdmins(mergedAdmins);
        } catch (error) {
            console.error("Error fetching admins:", error);
            toast.error("Failed to load admin users");
        } finally {
            setLoading(false);
        }
    };

    const toggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
        if (!user) return;

        try {
            // Get admin details before update for logging
            const adminToUpdate = admins.find(a => a.id === adminId);

            const { error } = await supabase
                .from("admins" as any)
                .update({ is_active: !currentStatus })
                .eq("id", adminId);

            if (error) throw error;

            // Log the action
            try {
                await supabase.rpc('log_admin_action', {
                    _admin_id: (await supabase.rpc('get_admin_id', { _user_id: user.id })).data,
                    _action: currentStatus ? 'deactivate_admin' : 'reactivate_admin',
                    _resource_type: 'admin',
                    _resource_id: adminId,
                    _details: {
                        admin_name: adminToUpdate?.full_name,
                        admin_email: adminToUpdate?.email,
                        is_super_admin: adminToUpdate?.is_super_admin,
                        previous_status: currentStatus ? 'active' : 'inactive',
                        new_status: currentStatus ? 'inactive' : 'active'
                    }
                });
            } catch (logError) {
                console.error('Error logging admin status change:', logError);
            }

            toast.success(`Admin ${currentStatus ? 'deactivated' : 'activated'} successfully`);
            fetchAdmins();
        } catch (error) {
            console.error("Error updating admin status:", error);
            toast.error("Failed to update admin status");
        }
    };

    const filteredAdmins = admins.filter(admin =>
        admin.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Users</h1>
                    <p className="text-muted-foreground">
                        Manage administrators and their permissions.
                    </p>
                </div>
                {currentUserIsSuperAdmin && (
                    <AddAdminDialog onSuccess={fetchAdmins} />
                )}
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search admins..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Admin</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading admins...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredAdmins.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No admins found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAdmins.map((admin) => (
                                <TableRow key={admin.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{admin.full_name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {admin.profiles?.email || "Email hidden"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {admin.is_super_admin ? (
                                            <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                                                <ShieldAlert className="mr-1 h-3 w-3" />
                                                Super Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                <Shield className="mr-1 h-3 w-3" />
                                                Admin
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {admin.is_active ? (
                                            <div className="flex items-center gap-1 text-green-600 text-sm">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Active</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-destructive text-sm">
                                                <XCircle className="h-4 w-4" />
                                                <span>Inactive</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(admin.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {currentUserIsSuperAdmin && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(admin.user_id)}>
                                                        Copy User ID
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                                                        className={admin.is_active ? "text-destructive" : "text-green-600"}
                                                    >
                                                        {admin.is_active ? "Deactivate Account" : "Activate Account"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
