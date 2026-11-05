import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  Body,
  GoldButton,
  Heading,
  type IconName,
  TextField,
  TextLink,
} from '@/components/ui';
import { notify } from '@/lib/alert';
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

  const comingSoon = (provider: string) =>
    notify(`${provider} sign-in`, `${provider} sign-in is coming soon. Use your mobile number for now.`);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.black }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={['#3B2A10', '#1A1206', colors.black]}
          style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.lg }}>
            <BackButton
              tone="dark"
              onPress={() => (stage === 'code' ? setStage('phone') : router.replace('/choose-role'))}
            />
          </View>
          <View style={styles.brand}>
            <MaterialCommunityIcons name="silverware-variant" size={72} color={colors.gold} />
            <Text style={styles.wordmark}>MANNA</Text>
            <Body tone="dark" style={{ textAlign: 'center' }}>
              Your neighborhood’s kitchens, in one place.
            </Body>
          </View>
        </LinearGradient>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Heading size={28}>Login to Continue</Heading>

          {stage === 'phone' ? (
            <>
              <Body tone="dark" style={styles.prompt}>
                Please enter mobile number
              </Body>
              <View style={styles.phoneRow}>
                <View style={styles.country}>
                  <Text style={styles.flag}>🇺🇸</Text>
                  <Text style={styles.countryCode}>+1</Text>
                </View>
                <TextField
                  tone="dark"
                  containerStyle={{ flex: 1 }}
                  placeholder="Mobile Number"
                  icon="account-outline"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  value={formatUsPhone(phone)}
                  onChangeText={(t) => setPhone(digitsOnly(t).slice(0, 10))}
                  onSubmitEditing={sendCode}
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <GoldButton title="Login" tone="dark" chevron={false} onPress={sendCode} />

              <Body tone="dark" muted style={styles.or}>
                or login with
              </Body>
              <View style={styles.socialRow}>
                {(
                  [
                    ['google', 'Google'],
                    ['facebook', 'Facebook'],
                    ['apple', 'Apple'],
                  ] as [IconName, string][]
                ).map(([icon, name]) => (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={`Login with ${name}`}
                    onPress={() => comingSoon(name)}
                    style={({ pressed }) => [styles.social, pressed && { opacity: 0.7 }]}>
                    <MaterialCommunityIcons name={icon} size={34} color={colors.white} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Body tone="dark" style={styles.prompt}>
                Enter the 6-digit code sent to +1 {formatUsPhone(phone)}
              </Body>
              <TextField
                tone="dark"
                placeholder="Verification code"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                value={code}
                onChangeText={(t) => setCode(digitsOnly(t))}
                onSubmitEditing={verify}
                error={error}
              />
              <Body tone="dark" muted style={{ fontSize: 13 }}>
                Demo mode: text messages aren’t connected yet, so any 6 digits will work.
              </Body>
              <GoldButton title="Verify" tone="dark" chevron={false} onPress={verify} />
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
  hero: { minHeight: 340, paddingBottom: spacing.xxl },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  wordmark: { fontFamily: fonts.heading, color: colors.gold, fontSize: 40, letterSpacing: 10 },
  sheet: {
    flex: 1,
    marginTop: -spacing.lg,
    backgroundColor: colors.black,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderDark,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  prompt: { fontSize: 18 },
  phoneRow: { flexDirection: 'row', gap: spacing.md },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  flag: { fontSize: 24 },
  countryCode: { fontFamily: fonts.body, color: colors.white, fontSize: 18 },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: -spacing.sm },
  or: { textAlign: 'center' },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  social: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
