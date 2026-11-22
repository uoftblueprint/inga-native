import { StyleSheet, Text, View } from "react-native";

import { SchemaField } from "@/components/SchemaField";
import type { LogSchema } from "@/types/form";

type Props = {
  schema: LogSchema;
  values: Record<string, string | boolean | null>;
  errors: Record<string, string>;
  onChange: (key: string, value: string | boolean) => void;
};

export function ProgrammeFields({ schema, values, errors, onChange }: Props) {
  const notesKey = Object.keys(schema).find((key) => {
    const normalized = key.trim().toLowerCase();
    return normalized === "notes";
  });
  const fields = Object.entries(schema).filter(([key]) => {
    const normalized = key.trim().toLowerCase();
    return normalized !== "notes" && normalized !== "additional notes";
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Questions</Text>
      {fields.map(([key, type]) => (
        <SchemaField
          key={key}
          label={key}
          type={type}
          value={values[key] ?? null}
          error={errors[key]}
          onChange={(value) => onChange(key, value)}
        />
      ))}
      {notesKey ? (
        <SchemaField
          label={notesKey}
          type="text"
          value={(values[notesKey] as string) ?? ""}
          error={errors[notesKey]}
          onChange={(value) => onChange(notesKey, value)}
        />
      ) : (
        <SchemaField
          label="Notes"
          type="text"
          value={(values.Notes as string) ?? ""}
          onChange={(value) => onChange("Notes", value)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "600", marginTop: 12 },
});
