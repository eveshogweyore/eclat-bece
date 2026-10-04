import { LayoutDashboard, Users, ClipboardCheck, LogOut } from "lucide-react";
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
  { title: "Dashboard", url: "/dashboard/teacher", icon: LayoutDashboard },
  { title: "My Students", url: "/dashboard/teacher/students", icon: Users },
  { title: "Assignments", url: "/dashboard/teacher/assignments", icon: ClipboardCheck },
];

export function TeacherSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <span className="text-sm font-black tracking-tight text-foreground">
          {isCollapsed ? "T" : "Teacher Portal"}
        </span>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          onClick={() => navigate(item.url)}
                          className={active
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                        >
                          <Icon size={18} />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">{item.title}</TooltipContent>
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
        <div className="px-2 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-start text-muted-foreground"
          >
            {isCollapsed ? "»" : "« Collapse"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
