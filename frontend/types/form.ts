export type FieldType = 'numerical' | 'boolean' | 'text';
export type LogSchema = Record<string, FieldType>;

export type Project = { id: number; name: string; log_schema: LogSchema };
export type Site = { id: number; projectId: number; name: string };

export type FieldValue = string | number | boolean;

export type SubmissionBody = {
  site: number;
  uuid: string;
  metadata: Record<string, FieldValue>;
};