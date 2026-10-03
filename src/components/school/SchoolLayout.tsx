import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SchoolSidebar } from "@/components/school/SchoolSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ContentLoader } from "@/components/PageLoader";

/**
 * Persistent school portal shell — mounted once as the /dashboard/school layout
 * route element. Child pages render through the Outlet inside a local Suspense
 * boundary so lazy page chunks never blank the sidebar or header.
 */
export function SchoolLayout() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground dashboard-theme">
        <SchoolSidebar />

        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          {/* Top Bar / Header */}
          <header className="flex h-14 sm:h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8 z-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent md:hidden flex-shrink-0" />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground sm:flex">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span>{currentDate}</span>
              </div>
              <ThemeToggle />
            </div>
          </header>

          {/* Main Content Area with safe scrolling and bounded width */}
          <main className="flex-1 min-h-0 min-w-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
              <Suspense fallback={<ContentLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
