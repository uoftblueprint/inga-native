import {View} from "react-native";

export default function Separator({height = 1} : {height?: number}) {
  return <View style={{width: "100%", height: height, backgroundColor: "#ddd"}} />
}
