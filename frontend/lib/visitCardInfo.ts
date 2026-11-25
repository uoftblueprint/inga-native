import { parseISO } from "date-fns";
import type { QueuedVisit } from "@/services/queue"
import type { VisitCardInfo } from "@/components/VisitCard";

export type DisplaySnapshot = {
  siteName: string;
  address: string;
};

export function toCardInfo(v: QueuedVisit): VisitCardInfo {
  const snap = v.display_snapshot as DisplaySnapshot;
  return {
    uuid: v.uuid,
    recordedAt: parseISO(v.request.recorded_at),
    status: v.status,
    siteName: snap.siteName,
    address: snap.address,
    lastError: v.last_error,
  };
}