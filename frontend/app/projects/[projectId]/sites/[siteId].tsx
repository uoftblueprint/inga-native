import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { DeliveryEditor } from "@/components/DeliveryEditor";
import { ProgrammeFields } from "@/components/ProgrammeFields";
import { SavedDraftPhotos } from "@/components/SavedDraftPhotos";
import { useProject } from "@/hooks/useForm";
import { useVisitDraft } from "@/hooks/useVisitDraft";
import { buildPayload } from "@/lib/buildPayload";
import { validateDeliveries } from "@/lib/deliveries";
import { isUuidConflict, parseErrors } from "@/lib/parseErrors";
import { queueVisit } from "@/lib/queueVisit";
import { getDb } from "@/services/db";
import { postSubmission } from "@/services/submissions";

export default function LogFormScreen() {
  const { projectId, siteId } = useLocalSearchParams<{
    projectId: string;
    siteId: string;
  }>();
  const router = useRouter();
  const project = useProject(Number(projectId));
  const visit = useVisitDraft(
    Number(projectId),
    Number(siteId),
    project.data?.log_schema ?? {},
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deliveryErrors, setDeliveryErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const inFlight = useRef(false);

  function confirmDiscard() {
    if (!visit.draft || !visit.workerId) return;
    Alert.alert(
      "Discard unfinished visit?",
      "This unfinished visit will be removed.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            if (await visit.discard()) router.back();
          },
        },
      ],
    );
  }

  async function handleSubmit() {
    if (inFlight.current || !visit.draft || !visit.workerId) return;

    const { errors: nextDeliveryErrors, payload } = validateDeliveries(
      visit.catalogue,
      visit.deliveries,
    );
    const formSchema = Object.fromEntries(
      Object.entries(visit.schema).filter(
        ([key]) => key.trim().toLowerCase() !== "additional notes",
      ),
    );
    const { metadata, invalid } = buildPayload(formSchema, visit.values);

    const hasNotes = Object.keys(formSchema).some(
      (key) => key.trim().toLowerCase() === "notes",
    );
    if (!hasNotes && typeof visit.values.Notes === "string" && visit.values.Notes.trim()) {
      metadata.Notes = visit.values.Notes.trim();
    }

    setDeliveryErrors(nextDeliveryErrors);
    setErrors(invalid);
    if (Object.keys(nextDeliveryErrors).length || Object.keys(invalid).length) return;
    if (!payload.length && !Object.keys(metadata).length && !visit.photos.length) {
      visit.setBanner("Add a delivery, answer or photo before submitting.");
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    visit.setBanner(null);
    try {
      await visit.saveSnapshot(payload, metadata);

      const db = await getDb();
      const displaySnapshot = Object.fromEntries(
        visit.catalogue.map((item) => [
          String(item.id),
          {
            name: item.name,
            unit: item.unit,
            quantity_kind: item.quantity_kind,
          },
        ]),
      );
      await queueVisit(db, {
        workerId: String(visit.workerId),
        projectId: Number(projectId),
        siteId: Number(siteId),
        uuid: visit.draft.uuid,
        recordedAt: visit.draft.recorded_at,
        deliveries: payload,
        metadata,
        photos: visit.photos,
        formDefinition: visit.schema,
        displaySnapshot,
      });

      try {
        await postSubmission({
          site: Number(siteId),
          metadata,
          uuid: visit.draft.uuid,
        });
      } catch (error) {
        if (!isUuidConflict(error)) {
          const parsed = parseErrors(error, formSchema);
          setErrors((current) => ({ ...current, ...parsed.fieldErrors }));
          visit.setBanner(
            parsed.general ??
              "Saved to the queue. It will be sent when connection is available.",
          );
        }
      }
      setDone(true);
    } catch (error) {
      visit.setBanner(
        error instanceof Error
          ? error.message
          : "Could not save the visit to the queue.",
      );
    } finally {
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  if (project.isPending || !visit.ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (project.isError || !project.data) {
    return (
      <View style={styles.center}>
        <Text>Project not found.</Text>
        <Button title="Retry" onPress={project.refetch} />
      </View>
    );
  }
  if (done) {
    return (
      <View style={styles.center}>
        <Text>Visit queued.</Text>
        <Button title="Back to Projects" onPress={() => router.replace("/projects")} />
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
        {!!visit.banner && <Text style={styles.banner}>{visit.banner}</Text>}
        <Button title="Back to Projects" onPress={() => router.replace("/projects")} />

        <DeliveryEditor
          deliveries={visit.deliveries}
          catalogue={visit.catalogue}
          errors={deliveryErrors}
          onAdd={visit.addDelivery}
          onRemove={visit.removeDelivery}
          onChange={visit.changeDelivery}
        />

        <ProgrammeFields
          schema={visit.schema}
          values={visit.values}
          errors={errors}
          onChange={(key, value) => {
            visit.setValues((current) => ({ ...current, [key]: value }));
            setErrors((current) => ({ ...current, [key]: "" }));
          }}
        />

        <SavedDraftPhotos photos={visit.photos} />

        <Button
          title={submitting ? "Submitting..." : "Submit"}
          onPress={handleSubmit}
          disabled={submitting}
        />
        <Pressable onPress={confirmDiscard} style={styles.discard}>
          <Text style={styles.discardText}>Discard draft</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingBottom: 40,
    gap: 8,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  banner: { color: "#8b1e1e", textAlign: "center", paddingHorizontal: 16 },
  discard: { padding: 12 },
  discardText: { color: "#8b1e1e", fontWeight: "600" },
});
