import { LayoutDashboard, Users, ClipboardCheck, BarChart3, CreditCard, HelpCircle, Activity } from "lucide-react";

/**
 * Single source of truth for parent-portal navigation. Consumed by both the
 * desktop sidebar and the mobile bottom nav so the two lists cannot drift.
 * Order matters: the mobile nav renders the first five entries plus sign-out.
 */
export const parentNavItems = [
  { title: "Dashboard", url: "/dashboard/parent", icon: LayoutDashboard },
  { title: "Children", url: "/dashboard/parent/children", icon: Users },
  { title: "Assignments", url: "/dashboard/parent/assignments", icon: ClipboardCheck },
  { title: "Reports", url: "/dashboard/parent/reports", icon: BarChart3 },
  { title: "Billing", url: "/dashboard/parent/subscriptions", icon: CreditCard },
  { title: "Activities", url: "/dashboard/parent/activities", icon: Activity },
  { title: "Resources", url: "/dashboard/parent/resources", icon: HelpCircle },
] as const;
