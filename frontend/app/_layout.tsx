import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import "react-native-gesture-handler";

import { getAccessToken } from "@/services/api";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let cancelled = false;

    async function guard() {
      const token = await getAccessToken();
      if (cancelled) return;

      const onLoginScreen = segments[0] === "login";

      if (!token && !onLoginScreen) {
        router.replace("/login");
      } else if (token && onLoginScreen) {
        router.replace("/");
      }
    }

    guard();

    return () => {
      cancelled = true;
    };
  }, [segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
