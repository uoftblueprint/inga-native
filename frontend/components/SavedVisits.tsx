import {useEffect, useState} from 'react';
import {getSubmissions} from "@/services/submissions";
import {View, Text} from "react-native";

export default function SavedVisits() {
  const [visits, setVisits] = useState([]);

  async function loadSavedVisits() {
    let res: unknown;
    res = await getSubmissions();
    console.log(res);
    return res;
  }

  useEffect(() => {
    let active = true;

    loadSavedVisits().then((result) => {
      if (active) setVisits(result);
    });

    return () => {
      active = false; // cleanup when the screen loses focus
    };
  }, []);

  return (
    <View>
      <Text>Saved visits</Text>
    </View>
  );
}