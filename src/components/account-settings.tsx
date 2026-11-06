import Constants from 'expo-constants';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { notify } from '@/lib/alert';
import { resetTo } from '@/lib/navigation';
import { formatE164UsPhone, isValidEmail } from '@/lib/validation';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

import { GoldButton, Heading, type IconName, TextField, Wordmark } from './ui';
import { Icon } from './icon';

/** Profile editing plus role switching and sign out; shared by Foodie and Chef. */
export function AccountSettings() {
  const { state, dispatch } = useStore();
  const user = state.user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const save = () => {
    if (!name.trim()) return setError('Name can’t be empty.');
    if (!isValidEmail(email)) return setError('Please enter a valid email.');
    setError(null);
    dispatch({
      type: 'updateProfile',
      changes: { name: name.trim(), email: email.trim() },
    });
    notify('Saved', 'Your profile is up to date.');
  };

  const switchRole = () => {
    dispatch({ type: 'chooseRole', role: user.role === 'chef' ? 'foodie' : 'chef' });
    resetTo('/');
  };

  const signOut = () => {
    dispatch({ type: 'signOut' });
    resetTo('/');
  };

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials || 'M'}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Heading size={22}>{user.name || 'Your name'}</Heading>
          <Text style={styles.role}>{user.role === 'chef' ? 'Culinary Entrepreneur' : 'Foodie'}</Text>
        </View>
      </View>

      <View style={{ gap: spacing.lg }}>
        <TextField label="Full name" icon="account-outline" value={name} onChangeText={setName} />
        <TextField
          label="Email"
          icon="email-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextField label="Phone number" icon="lock-outline" value={formatE164UsPhone(user.phone)} editable={false} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <GoldButton title="Save changes" variant="outline" onPress={save} />
      </View>

      <View style={styles.list}>
        <Row
          icon={user.role === 'chef' ? 'silverware-variant' : 'chef-hat'}
          label={user.role === 'chef' ? 'Switch to Foodie' : 'Become a Culinary Entrepreneur'}
          onPress={switchRole}
        />
        <View style={styles.rowDivider} />
        <Row icon="logout" label="Sign out" onPress={signOut} danger />
      </View>

      <View style={styles.list}>
        <Row
          icon="lifebuoy"
          label="Help & support"
          onPress={() => notify('Help & support', 'Live support arrives with the public launch. For now, reach out to the Manna team directly.')}
        />
        <View style={styles.rowDivider} />
        <Row
          icon="file-document-outline"
          label="Terms of Service"
          onPress={() => notify('Terms of Service', 'Our terms are being finalized with our attorneys before launch.')}
        />
        <View style={styles.rowDivider} />
        <Row
          icon="shield-lock-outline"
          label="Privacy Policy"
          onPress={() =>
            notify('Privacy Policy', 'Right now your information stays on this device. A full privacy policy will be published before launch.')
          }
        />
      </View>

      <View style={styles.footer}>
        <Wordmark width={96} />
        <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '0.1.0'} · Made with care</Text>
        <Text style={styles.version}>Demo kitchen photos: Wikimedia Commons contributors (CC licenses)</Text>
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.goldTint }]}>
      <Icon name={icon} size={20} color={danger ? colors.danger : colors.gold} />
      <Text style={[styles.rowText, danger && { color: colors.danger }]}>{label}</Text>
      {!danger ? <Icon name="chevron-right" size={20} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  initials: { fontFamily: fonts.display, fontSize: 24, color: colors.gold },
  role: { fontFamily: fonts.displayItalic, fontSize: 15, color: colors.textMuted },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 14 },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
  rowText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  footer: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg, opacity: 0.8 },
  version: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint, letterSpacing: 0.4 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 52 },
});
