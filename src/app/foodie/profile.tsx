import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { AccountSettings } from '@/components/account-settings';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Heading, Screen } from '@/components/ui';
import { spacing } from '@/theme';

export default function Profile() {
  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: TAB_BAR_SPACE + spacing.lg }}
          keyboardShouldPersistTaps="handled">
          <Heading>Profile</Heading>
          <AccountSettings showAddress />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
