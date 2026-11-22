import type { SupplyItem } from "@/services/catalogue";

export type DeliveryRow = { item: number | null; quantity: string };

export type DeliveryErrorMap = Record<number, string>;

export function findDeliveryItem(
  catalogue: SupplyItem[],
  row: DeliveryRow,
): SupplyItem | null {
  return catalogue.find((item) => item.id === row.item) ?? null;
}

export function validateDeliveries(
  catalogue: SupplyItem[],
  deliveries: DeliveryRow[],
) {
  const errors: DeliveryErrorMap = {};
  const seen = new Set<number>();
  const payload: { item: number; quantity: number }[] = [];

  deliveries.forEach((row, index) => {
    if (row.item == null && row.quantity.trim() === "") return;

    const item = findDeliveryItem(catalogue, row);
    if (row.item == null) {
      errors[index] = "Choose an item.";
      return;
    }
    if (seen.has(row.item)) {
      errors[index] = "Choose each item only once.";
      return;
    }
    seen.add(row.item);

    const quantity = Number(row.quantity.replace(",", "."));
    if (!row.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      errors[index] = "Enter a quantity greater than zero.";
      return;
    }
    if (item?.quantity_kind === "count" && !Number.isInteger(quantity)) {
      errors[index] = "Enter a whole number.";
      return;
    }
    payload.push({ item: row.item, quantity });
  });

  return { errors, payload };
}
