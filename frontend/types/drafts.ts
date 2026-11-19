export type DraftDelivery = {
  item: number | null;
  quantity: string | number | null;
};

export type DraftData = {
  project_id?: number | null;
  site_id?: number | null;
  deliveries?: DraftDelivery[];
  metadata?: Record<string, unknown>;
  form_definition?: Record<string, "numerical" | "boolean" | "text">;
  supply_snapshot?: Record<
    string,
    {
      name: string;
      unit: string;
      quantity_kind: "count" | "measure";
    }
  >;
};

export type DraftPhoto = {
  client_photo_id: string;
  local_path: string;
  content_type: string | null;
  size_bytes: number | null;
};

export type Draft = {
  uuid: string;
  recorded_at: string;
  data: DraftData;
  photos: DraftPhoto[];
  created_at: string;
  updated_at: string;
};
