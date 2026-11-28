import { parseISO } from "date-fns";
import type { QueuedVisit } from "@/services/queue"
import type { VisitCardInfo } from "@/components/VisitCard";
import {getSite} from "@/services/sites";

export async function toCardInfo(v: QueuedVisit): Promise<VisitCardInfo> {
  let siteName = `Site ${v.site_id}`;
  let address = "";

  try {
    const site = await getSite(v.site_id);
    siteName = site.name;
    address = site.address;
  } catch {
    // keep the fallbacks
  }

  return {
    uuid: v.uuid,
    recordedAt: parseISO(v.request.recorded_at),
    status: v.status,
    siteName,
    address,
    lastError: v.last_error,
  };
}
