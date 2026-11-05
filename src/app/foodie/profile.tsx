import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AccountSettings } from '@/components/account-settings';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Eyebrow, Heading, Screen } from '@/components/ui';
import { spacing } from '@/theme';

export default function Profile() {
  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: TAB_BAR_SPACE + spacing.lg }}
          keyboardShouldPersistTaps="handled">
          <View style={{ gap: spacing.xs }}>
            <Eyebrow>Your account</Eyebrow>
            <Heading>Profile</Heading>
          </View>
          <AccountSettings showAddress />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
