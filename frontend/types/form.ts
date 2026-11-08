export type FieldType = "numerical" | "boolean" | "text";
export type LogSchema = Record<string, FieldType>;

export type Project = {
  id: number;
  name: string;
  description: string;
  active: boolean;
  log_schema: LogSchema;
};

export type Region = {
  id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
};

export type Site = {
  id: number;
  project: number;
  region: Region;
  name: string;
  address: string;
  description: string;
};

export type FieldValue = string | number | boolean;

export type SubmissionBody = {
  site: number;
  uuid: string;
  metadata: Record<string, FieldValue>;
};