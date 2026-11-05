import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { BackButton, GoldButton, Heading, Screen, TextField, Watermark } from '@/components/ui';
import { resetTo } from '@/lib/navigation';
import { formatE164UsPhone, isValidEmail } from '@/lib/validation';
import { useStore } from '@/state/store';
import { spacing } from '@/theme';

export default function AboutYou() {
  const { state, dispatch } = useStore();
  const user = state.user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const save = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Please enter your name.';
    if (!isValidEmail(email)) next.email = 'Please enter a valid email.';
    setErrors(next);
    if (Object.keys(next).length) return;
    dispatch({ type: 'updateProfile', changes: { name: name.trim(), email: email.trim() } });
    resetTo('/');
  };

  return (
    <Screen>
      <Watermark corner size={320} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton
            onPress={() => {
              dispatch({ type: 'signOut' });
              router.replace('/login');
            }}
          />
          <Heading style={styles.title}>Please tell us{'\n'}about yourself</Heading>
          <View style={{ gap: spacing.lg }}>
            <TextField
              label="Name"
              placeholder="Your Name"
              icon="account-outline"
              textContentType="name"
              autoComplete="name"
              value={name}
              onChangeText={setName}
              error={errors.name}
            />
            <TextField
              label="Email"
              placeholder="Email"
              icon="email-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />
            <TextField
              label="Phone Number"
              icon="phone-outline"
              value={formatE164UsPhone(user?.phone ?? '')}
              editable={false}
            />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <GoldButton title="Save & Continue" onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { marginTop: spacing.xxl, marginBottom: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});
