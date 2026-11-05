import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { StyleSheet } from 'react-native';

// Use Router's own accessible triggers so refs match the current React Native API.
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={styles.navigation}>
        <TabTrigger name="home" href="/">Home</TabTrigger>
        <TabTrigger name="expenses" href="/expenses">Expenses</TabTrigger>
        <TabTrigger name="login" href="/login">Profile</TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navigation: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
});
