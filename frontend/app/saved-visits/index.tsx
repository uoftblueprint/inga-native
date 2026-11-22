import {useEffect, useState} from 'react';
import {getSubmissions} from "@/services/submissions";
import {View, Text, FlatList, StyleSheet} from "react-native";
import {SubmissionBody} from "@/types/form";
import {SafeAreaView} from "react-native-safe-area-context";

export default function SavedVisits() {
  const [completedSubmissions, setCompletedSubmissions] = useState([] as SubmissionBody[]);

  async function loadCompleted() {
    let res: SubmissionBody[];
    res = await getSubmissions();
    return res;
  }

  useEffect(() => {
    let active = true;

    loadCompleted().then((result) => {
      if (active) setCompletedSubmissions(result);
    });

    return () => {
      active = false;
    };

    // TODO: reload on screen change
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>Saved visits</Text>

      <FlatList
        style={styles.list}
        data={completedSubmissions}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.heading}>Site #{item.site}</Text>

              {Object.entries(item.metadata).map(([key, value]) => (
                <View key={key} style={styles.metadata}>
                  <Text><Text style={styles.bold}>{key}</Text>: {String(value)}</Text>
                </View>
              ))}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text>No saved visits yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
  },
  heading: {
    fontSize: 24,
    fontWeight: "600",
  },
  list: {
    // maxHeight: "70%",
  },
  item: {
    paddingVertical: 16,
  },
  metadata: {
    flexDirection: "row",
    gap: "5"
  },
  bold: {
    fontWeight: 700,
  },
  separator: { height: 1, backgroundColor: "#ddd" },
});
