import { useRouter } from "expo-router";
import { Pressable, ScrollView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HomeScreen() {
  const router = useRouter();
  return <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 20 }}>
    <ThemedText style={{ fontSize: 28 }}>CostPilot</ThemedText>
    <ThemedText>Track recorded expenses. Amounts retain their original currency.</ThemedText>
    <ThemedView><Pressable accessibilityRole="button" onPress={() => router.push("/expenses")}><ThemedText>View expenses</ThemedText></Pressable></ThemedView>
    <ThemedView><Pressable accessibilityRole="button" onPress={() => router.push("/add-expense")}><ThemedText>Add a personal expense</ThemedText></Pressable></ThemedView>
  </ScrollView>;
}
