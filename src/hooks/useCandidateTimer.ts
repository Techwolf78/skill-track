import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { detectTimeExtension, formatSeconds } from "@/lib/exam/sessionLogic";

export interface HeartbeatSyncResponse {
  timerRemainingSecs?: number;
  remainingSeconds?: number;
  remainingTimeSecs?: number;
  expiresAt?: string;
  status?: string;
  [key: string]: unknown;
}

export interface UseCandidateTimerProps {
  sessionId?: string;
  initialRemainingSecs?: number;
  onExpire?: () => void;
  syncIntervalMs?: number;
  enableAutoSync?: boolean;
}

export function useCandidateTimer({
  sessionId,
  initialRemainingSecs = 0,
  onExpire,
  syncIntervalMs = 60000,
  enableAutoSync = true,
}: UseCandidateTimerProps) {
  const [remainingSecs, setRemainingSecs] = useState<number>(initialRemainingSecs || 0);
  const [timeAddedNotice, setTimeAddedNotice] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const prevRemainingRef = useRef<number>(initialRemainingSecs || 0);
  const onExpireRef = useRef(onExpire);
  const noticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callback ref updated to avoid re-triggering timers
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Update initial remaining seconds if prop changes and not yet initialized
  useEffect(() => {
    if (initialRemainingSecs > 0 && prevRemainingRef.current === 0) {
      setRemainingSecs(initialRemainingSecs);
      prevRemainingRef.current = initialRemainingSecs;
    }
  }, [initialRemainingSecs]);

  // Keep track of local seconds via ref for comparison during async heartbeats
  useEffect(() => {
    prevRemainingRef.current = remainingSecs;
  }, [remainingSecs]);

  // 1. Local 1-second countdown tick
  useEffect(() => {
    if (remainingSecs <= 0) return;

    const timer = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          if (onExpireRef.current) {
            onExpireRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSecs]);

  // 2. Heartbeat Sync Handler (Processes incoming timer updates from server)
  const handleHeartbeatResponse = useCallback((response: HeartbeatSyncResponse | null | undefined) => {
    if (!response || typeof response !== "object") return;

    const serverSecs =
      response.timerRemainingSecs ??
      response.remainingSeconds ??
      response.remainingTimeSecs;

    if (typeof serverSecs !== "number" || isNaN(serverSecs) || serverSecs < 0) return;

    const currentLocalSecs = prevRemainingRef.current;

    // Detect if time was extended by administrator
    const { extended, addedMinutes } = detectTimeExtension(serverSecs, currentLocalSecs, 10);
    if (extended) {
      const notice = `+${addedMinutes} mins added by administrator`;
      setTimeAddedNotice(notice);

      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
      noticeTimeoutRef.current = setTimeout(() => {
        setTimeAddedNotice(null);
      }, 8000);
    }

    setRemainingSecs(serverSecs);
    prevRemainingRef.current = serverSecs;
    if (serverSecs > 0) {
      setIsExpired(false);
    }
  }, []);

  // 3. Periodic Background Server Sync (Heartbeat)
  useEffect(() => {
    if (!sessionId || !enableAutoSync || syncIntervalMs <= 0) return;

    const syncTimer = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        // Attempt heartbeat endpoint or resume endpoint
        let data: HeartbeatSyncResponse | null = null;
        try {
          const res = await apiClient.post(`/test-sessions/${sessionId}/heartbeat`, {});
          data = res.data?.data ?? res.data;
        } catch {
          const res = await apiClient.get(`/test-sessions/${sessionId}/resume`);
          data = res.data?.data ?? res.data;
        }

        if (data) {
          handleHeartbeatResponse(data);
        }
      } catch (err) {
        console.warn("[useCandidateTimer] Heartbeat sync error:", err);
      }
    }, syncIntervalMs);

    return () => clearInterval(syncTimer);
  }, [sessionId, enableAutoSync, syncIntervalMs, handleHeartbeatResponse]);

  // Clean up notice timeout on unmount
  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  return {
    remainingSecs,
    setRemainingSecs,
    timeAddedNotice,
    setTimeAddedNotice,
    isExpired,
    handleHeartbeatResponse,
    formattedTime: formatSeconds(remainingSecs, true),
    formattedTimeCompact: formatSeconds(remainingSecs, false),
  };
}
