import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { FieldType } from "@/types/form";

type Props = {
  label: string;
  type: FieldType;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
  error?: string;
};

export function SchemaField({ label, type, value, onChange, error }: Props) {
  return (
    <View style={styles.field}>
      <Text>{label}</Text>

      {type === "boolean" ? (
        <Switch value={value === true} onValueChange={onChange} />
      ) : (
        <TextInput
          style={styles.input}
          value={typeof value === "string" ? value : ""}
          onChangeText={onChange}
          keyboardType={type === "numerical" ? "numeric" : "default"}
        />
      )}

      {!!error && <Text>{error}</Text>}
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
});