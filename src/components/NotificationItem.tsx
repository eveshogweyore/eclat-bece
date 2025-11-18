import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    metadata: any;
    created_at: string;
  };
  onMarkAsRead: (id: string) => void;
  onAction: () => void;
}

export function NotificationItem({ notification, onMarkAsRead, onAction }: NotificationItemProps) {
  const handleAcceptLinkRequest = async () => {
    const requestId = notification.metadata?.request_id;
    if (!requestId) return;

    try {
      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from("parent_child_link_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      // Get parent user_id
      const { data: parentData, error: parentError } = await supabase
        .from("parents")
        .select("user_id")
        .eq("id", request.parent_id)
        .single();

      if (parentError) throw parentError;

      // Update request status
      const { error: updateError } = await supabase
        .from("parent_child_link_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Link student to parent
      const { error: linkError } = await supabase
        .from("students")
        .update({ parent_id: request.parent_id })
        .eq("id", request.student_id);

      if (linkError) throw linkError;

      // Create notification for parent
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: parentData.user_id,
          type: "link_accepted",
          title: "Link Request Accepted",
          message: "Your link request has been accepted!",
          metadata: { student_id: request.student_id },
        });

      if (notifError) throw notifError;

      // Mark this notification as read
      await onMarkAsRead(notification.id);

      toast.success("Link request accepted!");
      onAction();
    } catch (error) {
      console.error("Error accepting link request:", error);
      toast.error("Failed to accept link request");
    }
  };

  const handleRejectLinkRequest = async () => {
    const requestId = notification.metadata?.request_id;
    if (!requestId) return;

    try {
      const { error } = await supabase
        .from("parent_child_link_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      await onMarkAsRead(notification.id);
      toast.success("Link request rejected");
      onAction();
    } catch (error) {
      console.error("Error rejecting link request:", error);
      toast.error("Failed to reject link request");
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
        !notification.read ? "bg-primary-light/20" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{notification.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        {!notification.read && (
          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
        )}
      </div>

      {notification.type === "link_request" && notification.metadata?.request_id && (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="default"
            onClick={(e) => {
              e.stopPropagation();
              handleAcceptLinkRequest();
            }}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleRejectLinkRequest();
            }}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
