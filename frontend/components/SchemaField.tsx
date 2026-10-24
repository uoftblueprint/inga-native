import { Switch, Text, TextInput, View } from "react-native";
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
    <View>
      <Text>{label}</Text>

      {type === "boolean" ? (
        <Switch value={value === true} onValueChange={onChange} />
      ) : (
        <TextInput
          value={typeof value === "string" ? value : ""}
          onChangeText={onChange}
          keyboardType={type === "numerical" ? "numeric" : "default"}
        />
      )}

      {!!error && <Text>{error}</Text>}
    </View>
  );
}