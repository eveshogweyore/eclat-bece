import { useState, useEffect } from "react";
import { User, Shield, Moon, Sun, Laptop } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";

export default function StudentSettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [classYear, setClassYear] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username, unique_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setFullName(profile.full_name || "");
          setUsername(profile.username || "");
          setUniqueId(profile.unique_id || "");
        }

        const { data: student } = await supabase
          .from("students")
          .select("class_year")
          .eq("user_id", user.id)
          .maybeSingle();

        if (student?.class_year) {
          setClassYear(student.class_year === "year_6" ? "Year 6 (Primary)" : "Year 9 (JSS 3 / BECE)");
        }
      } catch (err) {
        console.error("Error loading student profile:", err);
      }
    };

    loadProfile();
  }, [user]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences and view your student profile information.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Profile Details</CardTitle>
            </div>
            <CardDescription>
              Your account information as configured by your parent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullname">Full Name</Label>
              <Input id="fullname" value={fullName} disabled className="bg-muted/50" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} disabled className="bg-muted/50" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code">Link Code</Label>
              <div className="flex items-center gap-2">
                <Input id="code" value={uniqueId || "N/A"} disabled className="font-mono bg-muted/50" />
                {uniqueId && <Badge variant="secondary">Active</Badge>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="classYear">Exam Level</Label>
              <Input id="classYear" value={classYear || "Standard"} disabled className="bg-muted/50" />
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Appearance & Theme</CardTitle>
            </div>
            <CardDescription>
              Customize how Éclat looks on your screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Theme Preference</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={theme === "light" ? "default" : "outline"}
                  className="flex flex-col items-center gap-1.5 h-20"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-xs font-semibold">Light</span>
                </Button>
                <Button
                  type="button"
                  variant={theme === "dark" ? "default" : "outline"}
                  className="flex flex-col items-center gap-1.5 h-20"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-xs font-semibold">Dark</span>
                </Button>
                <Button
                  type="button"
                  variant={theme === "system" ? "default" : "outline"}
                  className="flex flex-col items-center gap-1.5 h-20"
                  onClick={() => setTheme("system")}
                >
                  <Laptop className="h-5 w-5" />
                  <span className="text-xs font-semibold">System</span>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
              <strong>Need to update password or profile?</strong>
              <p className="mt-1">
                Student accounts are managed through the Parent Portal. Please ask your parent to make changes to your username or password from their dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
