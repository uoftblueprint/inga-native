import { useState } from "react";
import { Button, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { DeliveryRow } from "@/lib/deliveries";
import type { SupplyItem } from "@/services/catalogue";

type Props = {
  deliveries: DeliveryRow[];
  catalogue: SupplyItem[];
  errors: Record<number, string>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, patch: Partial<DeliveryRow>) => void;
};

export function DeliveryEditor({
  deliveries,
  catalogue,
  errors,
  onAdd,
  onRemove,
  onChange,
}: Props) {
  const [openRow, setOpenRow] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deliveries</Text>
      {deliveries.map((row, index) => {
        const item = catalogue.find((choice) => choice.id === row.item) ?? null;
        const used = new Set(
          deliveries
            .filter((_, rowIndex) => rowIndex !== index)
            .map((delivery) => delivery.item)
            .filter((itemId): itemId is number => itemId != null),
        );

        return (
          <View key={index} style={styles.row}>
            <Pressable
              style={styles.dropdown}
              onPress={() => setOpenRow(openRow === index ? null : index)}
              accessibilityRole="button"
            >
              <Text>{item?.name ?? "Choose item"}</Text>
            </Pressable>

            {openRow === index && (
              <View style={styles.options}>
                {catalogue.map((choice) => (
                  <Pressable
                    key={choice.id}
                    disabled={used.has(choice.id)}
                    style={[styles.option, used.has(choice.id) && styles.optionDisabled]}
                    onPress={() => {
                      onChange(index, { item: choice.id, quantity: row.quantity });
                      setOpenRow(null);
                    }}
                  >
                    <Text>{choice.name}{used.has(choice.id) ? " (selected)" : ""}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.quantityRow}>
              <TextInput
                style={styles.quantityInput}
                value={row.quantity}
                onChangeText={(quantity) => onChange(index, { quantity })}
                keyboardType={item?.quantity_kind === "measure" ? "decimal-pad" : "number-pad"}
                placeholder="Quantity"
              />
              {!!item && <Text>{item.unit}</Text>}
            </View>
            {!!errors[index] && <Text style={styles.error}>{errors[index]}</Text>}
            <Button title="Remove" onPress={() => onRemove(index)} />
          </View>
        );
      })}
      <Button title="Add delivery" onPress={onAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "600", marginTop: 12 },
  row: { width: "92%", maxWidth: 360, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, gap: 8 },
  dropdown: { borderWidth: 1, borderColor: "#999", borderRadius: 6, padding: 10 },
  options: { borderWidth: 1, borderColor: "#ddd", borderRadius: 6, maxHeight: 180 },
  option: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  optionDisabled: { opacity: 0.45 },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  quantityInput: { flex: 1, borderWidth: 1, borderColor: "#999", borderRadius: 6, padding: 10 },
  error: { color: "#8b1e1e" },
});
