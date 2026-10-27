import { useRef, useState } from "react";
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { useProject } from "@/hooks/useForm";
import { SchemaField } from "@/components/SchemaField";
import { buildPayload } from "@/lib/buildPayload";

export default function LogFormScreen() {
  const { projectId, siteId } = useLocalSearchParams<{
    projectId: string;
    siteId: string;
  }>();
  const router = useRouter();
  const project = useProject(Number(projectId));

  const [uuid, setUuid] = useState(() => Crypto.randomUUID());
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const inFlight = useRef(false);

  if (project.isError || !project.data) {
    return (
      <View style={styles.center}>
        <Text>Project not found.</Text>
      </View>
    );
  }

  const schema = project.data.log_schema;

  function handleSubmit() {
    if (inFlight.current) return;

    // convert numeric strings to numbers and drop blanks
    const { metadata, invalid } = buildPayload(schema, values);
    if (Object.keys(invalid).length) {
      setErrors(invalid); // don't send value that failed conversion
      return;
    }

    inFlight.current = true;
    setSubmitting(true);

    // stand-in for POST
    console.log(
      "SUBMIT",
      JSON.stringify({ site: Number(siteId), uuid, metadata })
    );

    setDone(true);
    setValues({});
    setErrors({});
    setUuid(Crypto.randomUUID());
    setSubmitting(false);
    inFlight.current = false;
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text>Log submitted.</Text>
        <Button title="Back to Sites" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {Object.entries(schema).map(([key, type]) => (
          <SchemaField
            key={key}
            label={key}
            type={type}
            value={values[key] ?? (type === "boolean" ? false : "")}
            error={errors[key]}
            onChange={(v) => {
              setValues((s) => ({ ...s, [key]: v }));
              setErrors((e) => ({ ...e, [key]: "" }));
            }}
          />
        ))}

        <Button
          title={submitting ? "Submitting…" : "Submit"}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
});