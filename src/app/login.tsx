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
import { saveProfile, sendCode as remoteSendCode, verifyCode as remoteVerifyCode } from '@/lib/remote/api';
import { signInWithApple, signInWithGoogle, type SocialSignIn } from '@/lib/remote/social';
import { parseProviders, signInProviders, type SocialProvider } from '@/lib/sign-in-options';
import { isBackendConfigured, supabase } from '@/lib/supabase';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * Phone sign-in. With the backend on, Supabase texts a real code (through
 * Twilio) and checks it. Without it, demo mode accepts any 6 digits.
 */
export default function Login() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { dispatch } = useStore();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const e164 = `+1${digitsOnly(phone)}`;
  const providers = signInProviders(parseProviders(process.env.EXPO_PUBLIC_SIGN_IN_WITH), Platform.OS, isBackendConfigured);

  const social = async (provider: SocialProvider) => {
    if (!supabase) return;
    setError(null);
    setBusy(true);
    let who: SocialSignIn | null = null;
    try {
      who = provider === 'apple' ? await signInWithApple(supabase) : await signInWithGoogle(supabase);
      // Apple shares the name only the first time; keep it on the profile.
      if (who?.name) await saveProfile(supabase, who.userId, { name: who.name }).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t work. Try again or use your phone number.');
    } finally {
      setBusy(false);
    }
    if (!who) return;
    dispatch({ type: 'signIn', userId: who.userId, phone: '', name: who.name, email: who.email });
    resetTo('/');
  };

  const sendCode = async () => {
    if (!isValidUsPhone(phone)) {
      setError('Enter a 10-digit US mobile number.');
      return;
    }
    setError(null);
    if (supabase) {
      setBusy(true);
      try {
        await remoteSendCode(supabase, e164);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'We couldn’t send a code. Try again.');
        return;
      } finally {
        setBusy(false);
      }
    }
    setStage('code');
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    let userId = newId('user');
    if (supabase) {
      setBusy(true);
      try {
        userId = await remoteVerifyCode(supabase, e164, code);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That code didn’t work.');
        return;
      } finally {
        setBusy(false);
      }
    }
    dispatch({ type: 'signIn', userId, phone: e164 });
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
                  onSubmitEditing={() => void sendCode()}
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <GoldButton title="Send code" chevron loading={busy} onPress={() => void sendCode()} />

              {providers.length ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={styles.or}>or</Text>
                  {providers.map((p) => (
                    <GoldButton
                      key={p}
                      title={p === 'apple' ? 'Continue with Apple' : 'Continue with Google'}
                      icon={p}
                      variant="outline"
                      disabled={busy}
                      onPress={() => void social(p)}
                    />
                  ))}
                </View>
              ) : null}

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
                onSubmitEditing={() => void verify()}
                error={error}
                accessibilityLabel="Verification code"
              />
              {supabase ? (
                <TextLink title="Send a new code" onPress={() => void sendCode()} style={{ alignSelf: 'flex-start' }} />
              ) : (
                <Body muted style={{ fontSize: 13 }}>
                  Demo mode: text messages aren’t connected yet, so any 6 digits will work.
                </Body>
              )}
              <GoldButton title="Verify" chevron loading={busy} onPress={() => void verify()} />
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
  or: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
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
