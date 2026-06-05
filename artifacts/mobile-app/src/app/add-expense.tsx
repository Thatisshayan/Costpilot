import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiFetch } from '@/lib/api';

const CATEGORIES = [
  'ai-tokens',
  'compute',
  'storage',
  'networking',
  'database',
  'monitoring',
  'other',
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const [amount, setAmount] = useState('');
  const [platform, setPlatform] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !platform) {
      Alert.alert('Missing Fields', 'Please enter an amount and platform name.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulated-user-id': 'dev-user-1',
        },
        body: JSON.stringify({
          amount: parsedAmount,
          platformName: platform,
          description: description || `${platform} expense`,
          category,
          spentAt: new Date(date).toISOString(),
        }),
      });

      Alert.alert('Success', 'Expense added successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <View
        style={[
          styles.header,
          {
            paddingTop: safeAreaInsets.top + Spacing.three,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Cancel</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>Add Expense</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.formContent,
            { paddingBottom: safeAreaInsets.bottom + Spacing.five },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Amount</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              placeholder="0.00"
              placeholderTextColor="#9499C3"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </ThemedView>

          <ThemedView style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Platform</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              placeholder="e.g. AWS, Azure, GCP"
              placeholderTextColor="#9499C3"
              value={platform}
              onChangeText={setPlatform}
              autoCapitalize="characters"
            />
          </ThemedView>

          <ThemedView style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              placeholder="What is this expense for?"
              placeholderTextColor="#9499C3"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ThemedView>

          <ThemedView style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Category</ThemedText>
            <Pressable
              style={[
                styles.input,
                styles.pickerButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <ThemedText>{category}</ThemedText>
              <ThemedText style={styles.pickerArrow}>
                {showCategoryPicker ? '▲' : '▼'}
              </ThemedText>
            </Pressable>
            {showCategoryPicker && (
              <ThemedView
                type="backgroundElement"
                style={styles.pickerDropdown}
              >
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={({ pressed }) => [
                      styles.pickerItem,
                      cat === category && styles.pickerItemSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.pickerItemText,
                        cat === category && styles.pickerItemTextSelected,
                      ]}
                    >
                      {cat}
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            )}
          </ThemedView>

          <ThemedView style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Date</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9499C3"
              value={date}
              onChangeText={setDate}
              autoCapitalize="none"
            />
          </ThemedView>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#0B0C10" size="small" />
            ) : (
              <ThemedText style={styles.submitButtonText}>
                Add Expense
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: Spacing.one,
    paddingRight: Spacing.two,
  },
  backButtonText: {
    fontSize: 16,
    color: '#66FCF1',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },
  formContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9499C3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.two + 2,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerArrow: {
    fontSize: 10,
    color: '#9499C3',
  },
  pickerDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222530',
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  pickerItem: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2833',
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(102, 252, 241, 0.1)',
  },
  pickerItemText: {
    fontSize: 15,
  },
  pickerItemTextSelected: {
    color: '#66FCF1',
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#66FCF1',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    shadowColor: '#66FCF1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#0B0C10',
    fontSize: 16,
    fontWeight: '700',
  },
});
