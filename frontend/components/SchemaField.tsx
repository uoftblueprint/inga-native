import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { FieldType } from "@/types/form";

type Props = {
  label: string;
  type: FieldType;
  value: string | boolean | null;
  onChange: (v: string | boolean) => void;
  error?: string;
};

export function SchemaField({ label, type, value, onChange, error }: Props) {
  return (
    <View style={styles.field}>
      <Text>{label}</Text>

      {type === "boolean" ? (
        <View style={styles.booleanRow}>
          {(["Yes", "No"] as const).map((answer) => {
            const checked = answer === "Yes" ? value === true : value === false;
            return (
              <Pressable
                key={answer}
                style={[styles.choice, checked && styles.choiceSelected]}
                onPress={() => onChange(answer === "Yes")}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
              >
                <Text>{answer}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={typeof value === "string" ? value : ""}
          onChangeText={onChange}
          keyboardType={type === "numerical" ? "numeric" : "default"}
          multiline={type === "text" && label.trim().toLowerCase() === "notes"}
          numberOfLines={type === "text" && label.toLowerCase() === "notes" ? 4 : 1}
        />
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { alignItems: "center", padding: 8 },
  input: {
    width: 240,
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 6,
    padding: 10,
  },
  booleanRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  choice: { borderWidth: 1, borderColor: "#999", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 16 },
  choiceSelected: { backgroundColor: "#cfe8cf", borderColor: "#2d7a2d" },
  error: { color: "#8b1e1e", marginTop: 4 },
});