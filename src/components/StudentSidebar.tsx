import { LayoutDashboard, BookOpen, ClipboardList, TrendingUp, Trophy, Swords, Settings, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  { title: "Dashboard", url: "/dashboard/student", icon: LayoutDashboard },
  { title: "Practice", url: "/dashboard/student/practice", icon: BookOpen },
  { title: "Assignments", url: "/dashboard/student/assignments", icon: ClipboardList },
  { title: "Duel of Minds", url: "/dashboard/student/duel-of-minds", icon: Swords },
  { title: "Progress", url: "/dashboard/student/progress", icon: TrendingUp },
  { title: "Leaderboard", url: "/dashboard/student/leaderboard", icon: Trophy },
  { title: "Settings", url: "/dashboard/student/settings", icon: Settings },
];

export function StudentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { resolvedTheme } = useTheme();
  const { state, toggleSidebar } = useSidebar();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const isDark = resolvedTheme === "dark";
  const logo = isDark ? logoLight : logoDark;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <img src={logo} alt="Éclat" className="h-8 w-auto" />
      </div>
      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel className="px-4 pt-7 pb-6 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/70">Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          onClick={() => navigate(item.url)}
                          className={`mx-2 h-10 rounded-md text-sm transition-colors ${
                            active
                              ? "bg-sky-100 text-sky-950 font-bold shadow-[inset_3px_0_0_#0284c7] dark:bg-[#334158] dark:text-white dark:shadow-[inset_3px_0_0_#0c9dcc]"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <Icon className={isCollapsed ? "" : "mr-2 h-4 w-4"} />
                          {!isCollapsed && <span>{item.title}</span>}
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="mb-2 w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className={isCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
              {!isCollapsed && <span>Logout</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <p>Logout</p>
            </TooltipContent>
          )}
        </Tooltip>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
