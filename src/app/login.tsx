import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  Body,
  Eyebrow,
  GoldButton,
  Heading,
  Logo,
  TextField,
  TextLink,
} from '@/components/ui';
import { resetTo } from '@/lib/navigation';
import { digitsOnly, formatUsPhone, isValidUsPhone, newId } from '@/lib/validation';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * Phone sign-in. Until the backend is connected this runs in demo mode:
 * any 6-digit code is accepted. See docs/ARCHITECTURE.md (Auth).
 */
export default function Login() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { dispatch } = useStore();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);

  const sendCode = () => {
    if (!isValidUsPhone(phone)) {
      setError('Enter a 10-digit US mobile number.');
      return;
    }
    setError(null);
    setStage('code');
  };

  const verify = () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    dispatch({ type: 'signIn', userId: newId('user'), phone: `+1${digitsOnly(phone)}` });
    resetTo('/');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.black }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.lg }}>
            <BackButton
              onPress={() => (stage === 'code' ? setStage('phone') : resetTo('/choose-role'))}
            />
          </View>
          <View style={styles.brand}>
            <Logo size={Math.min(240, height * 0.28)} />
          </View>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={{ gap: spacing.xs }}>
            <Eyebrow>{stage === 'phone' ? 'Sign in or join' : 'Verify'}</Eyebrow>
            <Heading size={28}>{stage === 'phone' ? 'What’s your number?' : 'Check your messages'}</Heading>
          </View>

          {stage === 'phone' ? (
            <>
              <View style={styles.phoneRow}>
                <View style={styles.country}>
                  <Text style={styles.flag}>US</Text>
                  <Text style={styles.countryCode}>+1</Text>
                </View>
                <TextField
                  containerStyle={{ flex: 1 }}
                  placeholder="Mobile number"
                  icon="cellphone"
                  keyboardType="phone-pad"
                  autoFocus
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  value={formatUsPhone(phone)}
                  onChangeText={(t) => {
                    setPhone(digitsOnly(t).slice(0, 10));
                    setError(null);
                  }}
                  onSubmitEditing={sendCode}
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <GoldButton title="Send code" chevron onPress={sendCode} />

              <Body muted style={styles.legal}>
                By continuing you agree to Manna’s{' '}
                <Text accessibilityRole="link" style={styles.legalLink} onPress={() => router.push('/legal/terms')}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text accessibilityRole="link" style={styles.legalLink} onPress={() => router.push('/legal/privacy')}>
                  Privacy Policy
                </Text>
                .
              </Body>
            </>
          ) : (
            <>
              <Body muted>Enter the 6-digit code sent to +1 {formatUsPhone(phone)}.</Body>
              <TextField
                placeholder="• • • • • •"
                keyboardType="number-pad"
                autoFocus
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                value={code}
                onChangeText={(t) => {
                  setCode(digitsOnly(t));
                  setError(null);
                }}
                onSubmitEditing={verify}
                error={error}
                accessibilityLabel="Verification code"
              />
              <Body muted style={{ fontSize: 13 }}>
                Demo mode: text messages aren’t connected yet, so any 6 digits will work.
              </Body>
              <GoldButton title="Verify" chevron onPress={verify} />
              <TextLink
                title="Use a different number"
                onPress={() => {
                  setCode('');
                  setError(null);
                  setStage('phone');
                }}
                style={{ alignSelf: 'center' }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  legalLink: { color: colors.text, textDecorationLine: 'underline' },
  hero: { paddingBottom: spacing.xl },
  brand: { alignItems: 'center', justifyContent: 'center', paddingTop: spacing.md },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.hairline,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 54,
  },
  flag: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6, color: colors.textMuted },
  countryCode: { fontFamily: fonts.medium, color: colors.text, fontSize: 16 },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: -spacing.sm },
  legal: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
