import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { notify } from '@/lib/alert';
import { resetTo } from '@/lib/navigation';
import { formatE164UsPhone, isValidEmail } from '@/lib/validation';
import { useStore } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';

import { Divider, GoldButton, TextField } from './ui';

/** Profile editing plus role switching and sign out; shared by Foodie and Chef. */
export function AccountSettings({ showAddress }: { showAddress: boolean }) {
  const { state, dispatch } = useStore();
  const user = state.user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [address, setAddress] = useState(user?.deliveryAddress ?? '');
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

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
    <View style={{ gap: spacing.lg }}>
      <TextField label="Name" icon="account-outline" value={name} onChangeText={setName} />
      <TextField
        label="Email"
        icon="email-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextField label="Phone Number" icon="phone-outline" value={formatE164UsPhone(user.phone)} editable={false} />
      {showAddress ? (
        <TextField
          label="Delivery address"
          icon="map-marker"
          placeholder="Street address, apt, city"
          value={address}
          onChangeText={setAddress}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <GoldButton title="Save" chevron={false} onPress={save} />
      <Divider />
      <Pressable accessibilityRole="button" onPress={switchRole} style={styles.action}>
        <Text style={styles.actionText}>
          {user.role === 'chef' ? 'Switch to Foodie' : 'Become a Culinary Entrepreneur'}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={signOut} style={styles.action}>
        <Text style={[styles.actionText, { color: colors.danger }]}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 14 },
  action: { minHeight: 44, justifyContent: 'center' },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.goldDark },
});
