import { LayoutDashboard, BookOpen, ClipboardList, TrendingUp, Trophy, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  { title: "Progress", url: "/dashboard/student/progress", icon: TrendingUp },
  { title: "Leaderboard", url: "/dashboard/student/leaderboard", icon: Trophy },
];

export function StudentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
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
                          className={active ? "bg-accent text-accent-foreground font-medium" : ""}
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
              onClick={signOut}
              className="w-full justify-start hover:bg-destructive/20 hover:text-destructive mb-2"
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
          className="w-full justify-start"
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
