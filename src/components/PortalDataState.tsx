import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortalDataStateProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Full-content placeholder for student/parent pages while their data loads or
 * when loading fails. Prevents the "authoritative empty state" flash where a
 * failed fetch renders as "No children" / "No assignments" with zeroed metrics.
 */
export function PortalDataState({ loading, error, onRetry }: PortalDataStateProps) {
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive/60" />
      <div>
        <p className="font-semibold text-foreground">Couldn't load your data</p>
        <p className="mt-1 text-sm text-muted-foreground">{error ?? "Something went wrong."}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
