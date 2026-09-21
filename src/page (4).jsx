"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useNotifications, useApiMutation } from "@/hooks/useApi";
import { api } from "@/lib/client";
import { PageHeader, Spinner, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markAll = useApiMutation(() => api.post("/api/notifications/read-all"), ["notifications"]);
  const markOne = useApiMutation((id) => api.post(`/api/notifications/${id}/read`), ["notifications"]);

  if (isLoading) return <Spinner />;
  const items = data?.items || [];
  const isUnread = (n) => !n.read || Number(n.read) === 0;

  return (
    <div>
      <PageHeader title="Notifications" description="Your activity and announcements.">
        {data?.unread > 0 && <Button variant="outline" onClick={() => markAll.mutateAsync()}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      </PageHeader>

      {!items.length ? (
        <EmptyState title="No notifications" description="You're all caught up." icon={Bell} />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={isUnread(n) ? "border-primary/40" : ""}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {isUnread(n) && <Badge>New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.type} • {formatDate(n.createdAt)}</p>
                  </div>
                </div>
                {isUnread(n) && (
                  <Button size="sm" variant="ghost" onClick={() => markOne.mutateAsync(n.id)}>Mark read</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
