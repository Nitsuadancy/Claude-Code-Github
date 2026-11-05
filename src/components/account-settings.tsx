import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { notify } from '@/lib/alert';
import { resetTo } from '@/lib/navigation';
import { formatE164UsPhone, isValidEmail } from '@/lib/validation';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

import { GoldButton, Heading, type IconName, TextField } from './ui';

/** Profile editing plus role switching and sign out; shared by Foodie and Chef. */
export function AccountSettings({ showAddress }: { showAddress: boolean }) {
  const { state, dispatch } = useStore();
  const user = state.user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [address, setAddress] = useState(user?.deliveryAddress ?? '');
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
      changes: { name: name.trim(), email: email.trim(), deliveryAddress: address.trim() },
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
        {showAddress ? (
          <TextField
            label="Delivery address"
            icon="map-marker-outline"
            placeholder="Street address, apt, city"
            value={address}
            onChangeText={setAddress}
          />
        ) : null}
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
      <MaterialCommunityIcons name={icon} size={20} color={danger ? colors.danger : colors.gold} />
      <Text style={[styles.rowText, danger && { color: colors.danger }]}>{label}</Text>
      {!danger ? <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textFaint} /> : null}
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
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 52 },
});
