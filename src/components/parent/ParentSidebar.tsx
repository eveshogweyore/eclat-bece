import { LayoutDashboard, Users, ClipboardCheck, BarChart3, CreditCard, HelpCircle, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { parentNavItems } from "./parentNav";
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

export function ParentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (url: string) => {
    if (url.includes("#")) {
      return currentPath + location.hash === url;
    }
    return currentPath === url && !location.hash;
  };

    return (
        <Sidebar collapsible="icon" className="border-r border-border/50 bg-sidebar text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(141,191,255,0.06)]">
            <SidebarContent className="bg-sidebar">
                <SidebarGroup>
                    {!isCollapsed && (
                        <SidebarGroupLabel className="mb-3 px-4 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                            Parent Portal
                        </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-1 px-2">
                            {parentNavItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.url);
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <SidebarMenuButton
                                                    onClick={() => { 
                                                        if (item.url.includes("#") && currentPath === item.url.split("#")[0]) {
                                                            const el = document.getElementById(item.url.split("#")[1]);
                                                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                                                        } else {
                                                            navigate(item.url);
                                                        }
                                                    }}
                                                    className={`h-11 rounded-xl border border-transparent transition-all duration-200 ${active ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(125,211,252,0.2)] font-bold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                                >
                                                    <Icon className={`${isCollapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5'} transition-transform duration-200 group-hover:scale-110`} />
                                                    {!isCollapsed && <span className="text-[15px] font-medium">{item.title}</span>}
                                                </SidebarMenuButton>
                                            </TooltipTrigger>
                                            {isCollapsed && (
                                                <TooltipContent side="right" className="border border-border/40 bg-popover text-foreground">
                                                    <p className="font-medium">{item.title}</p>
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

            <SidebarFooter className="border-t border-border/50 bg-sidebar p-4">
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => signOut()}
                            className="h-11 w-full justify-start rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        >
                            <LogOut className={isCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"} />
                            {!isCollapsed && <span className="text-[15px] font-medium">Log out</span>}
                        </Button>
                    </TooltipTrigger>
                    {isCollapsed && (
                        <TooltipContent side="right" className="border border-border/40 bg-popover text-foreground">
                            <p className="font-medium">Log out</p>
                        </TooltipContent>
                    )}
                </Tooltip>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    className="mt-2 h-8 w-full justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <ChevronLeft className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Collapse</span>
                        </div>
                    )}
                </Button>
            </SidebarFooter>
        </Sidebar>
    );
}
