import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getHealth } from "@/services/api";

type ConnectionState = "loading" | "connected" | "error";

export default function HomeScreen() {
  const [state, setState] = useState<ConnectionState>("loading");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then(() => {
        if (!cancelled) {
          setState("connected");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState("error");
          setDetail(error instanceof Error ? error.message : "Request failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel =
    state === "loading"
      ? "API Status: Checking"
      : state === "connected"
        ? "API Status: Connected"
        : "API Status: Not connected";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Inga</Text>
        <Text style={styles.status}>{statusLabel}</Text>
        {state === "loading" ? <ActivityIndicator /> : null}
        {state === "error" ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
  },
  status: {
    fontSize: 18,
  },
  detail: {
    fontSize: 14,
    color: "#8b1e1e",
    textAlign: "center",
  },
});
