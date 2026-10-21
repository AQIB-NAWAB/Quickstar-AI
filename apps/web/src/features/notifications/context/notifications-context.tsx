"use client";

import React,{ createContext,useCallback,useContext,useEffect,useState } from "react";
import { notificationsPreviewStore } from "../lib/preview-store";
import { getNotificationsRepository } from "../lib/repository";
import type { NotificationsRepository,WorkspaceNotification } from "../lib/types";

interface NotificationsContextType {
  unreadCount: number | null;
  notifications: WorkspaceNotification[];
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  workspaceId: string;
  isPreview: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({
  workspaceId,
  isPreview = false,
  children,
}: {
  workspaceId: string;
  isPreview?: boolean;
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const repo: NotificationsRepository = getNotificationsRepository(isPreview);

  const fetchState = useCallback(async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        repo.getUnreadCount(workspaceId),
        repo.listNotifications(workspaceId),
      ]);

      if (countRes.status === "ready") {
        setUnreadCount(countRes.data);
      } else {
        setUnreadCount(null);
      }

      if (listRes.status === "ready") {
        setNotifications(listRes.data.notifications);
        if (countRes.status !== "ready") {
          setUnreadCount(listRes.data.unreadCount);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [repo, workspaceId]);

  useEffect(() => {
    fetchState();

    // Subscribe to in-memory store changes in preview
    if (isPreview) {
      const unsub = notificationsPreviewStore.subscribe(() => {
        fetchState();
      });
      return () => unsub();
    }
  }, [fetchState, isPreview]);

  // Periodic 30-second poll for real state when active
  useEffect(() => {
    if (isPreview) return;

    let timer: NodeJS.Timeout | null = null;
    function schedulePoll() {
      timer = setTimeout(async () => {
        if (!document.hidden) {
          await fetchState();
        }
        schedulePoll();
      }, 30000);
    }

    schedulePoll();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [fetchState, isPreview]);

  const markAsRead = async (id: string) => {
    await repo.markAsRead(workspaceId, id);
    await fetchState();
  };

  const markAllAsRead = async () => {
    await repo.markAllAsRead(workspaceId);
    await fetchState();
  };

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchState,
        workspaceId,
        isPreview,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    // Return sensible fallback if used outside provider
    return {
      unreadCount: null,
      notifications: [],
      loading: false,
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      refresh: async () => {},
      workspaceId: "",
      isPreview: false,
    };
  }
  return ctx;
}
