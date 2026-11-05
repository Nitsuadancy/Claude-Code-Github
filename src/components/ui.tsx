import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, goldGlow, radius, spacing } from '@/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Tone = 'light' | 'dark';

/* ---------- Text ---------- */

export function Heading({
  style,
  size = 30,
  ...props
}: TextProps & { size?: number }) {
  return (
    <Text
      accessibilityRole="header"
      {...props}
      style={[styles.heading, { fontSize: size, lineHeight: size * 1.25 }, style]}
    />
  );
}

export function Body({
  style,
  tone = 'light',
  muted,
  ...props
}: TextProps & { tone?: Tone; muted?: boolean }) {
  return (
    <Text
      {...props}
      style={[
        styles.body,
        { color: muted ? colors.textMuted : tone === 'dark' ? colors.textOnDark : colors.text },
        style,
      ]}
    />
  );
}

/* ---------- Layout ---------- */

export function Screen({
  children,
  tone = 'light',
  style,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <SafeAreaView
      edges={edges}
      style={[
        { flex: 1, backgroundColor: tone === 'dark' ? colors.black : colors.white },
        style,
      ]}>
      {children}
    </SafeAreaView>
  );
}

/** Faint crossed fork & knife used as a background watermark across the app. */
export function Watermark({
  icon = 'silverware-variant',
  size = 260,
  tone = 'light',
  corner = false,
}: {
  icon?: IconName;
  size?: number;
  tone?: Tone;
  /** Tuck the watermark into the bottom-right corner instead of centering it. */
  corner?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={
        corner
          ? { position: 'absolute', right: -size * 0.2, bottom: -size * 0.1 }
          : [StyleSheet.absoluteFill, styles.center]
      }>
      <MaterialCommunityIcons
        name={icon}
        size={size}
        color={tone === 'dark' ? 'rgba(227,174,10,0.16)' : 'rgba(227,174,10,0.14)'}
      />
    </View>
  );
}

/* ---------- Buttons ---------- */

export function GoldButton({
  title,
  onPress,
  tone = 'light',
  chevron = true,
  disabled,
  loading,
  style,
  fullWidth = true,
}: {
  title: string;
  onPress: () => void;
  tone?: Tone;
  chevron?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}) {
  const textColor = tone === 'dark' ? colors.textOnDark : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.goldButton,
        { backgroundColor: tone === 'dark' ? colors.black : colors.white },
        !disabled && goldGlow,
        fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'center', paddingHorizontal: 40 },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.gold} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
          {chevron && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={26}
              color={textColor}
              style={{ marginLeft: spacing.sm }}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

export function IconCircleButton({
  icon,
  onPress,
  tone = 'light',
  label,
  size = 44,
}: {
  icon: IconName;
  onPress: () => void;
  tone?: Tone;
  label: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.circleButton,
        {
          width: size,
          height: size,
          borderColor: tone === 'dark' ? 'rgba(255,255,255,0.7)' : colors.border,
          backgroundColor: tone === 'dark' ? 'rgba(0,0,0,0.25)' : colors.white,
        },
        pressed && { opacity: 0.7 },
      ]}>
      <MaterialCommunityIcons
        name={icon}
        size={size * 0.5}
        color={tone === 'dark' ? colors.white : colors.text}
      />
    </Pressable>
  );
}

export function BackButton({ tone = 'light', onPress }: { tone?: Tone; onPress?: () => void }) {
  return (
    <IconCircleButton
      icon="arrow-left"
      label="Go back"
      tone={tone}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
    />
  );
}

export function TextLink({
  title,
  onPress,
  style,
}: {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={style}>
      <Text style={styles.link}>{title}</Text>
    </Pressable>
  );
}

/* ---------- Form fields ---------- */

export function FieldLabel({ children, tone = 'light' }: { children: ReactNode; tone?: Tone }) {
  return (
    <Text
      style={[styles.label, { color: tone === 'dark' ? colors.textOnDark : colors.text }]}>
      {children}
    </Text>
  );
}

export function TextField({
  label,
  icon,
  error,
  tone = 'light',
  containerStyle,
  ...input
}: TextInputProps & {
  label?: string;
  icon?: IconName;
  error?: string | null;
  tone?: Tone;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const dark = tone === 'dark';
  return (
    <View style={[{ gap: spacing.sm }, containerStyle]}>
      {label ? <FieldLabel tone={tone}>{label}</FieldLabel> : null}
      <View
        style={[
          styles.field,
          { borderColor: error ? colors.danger : dark ? colors.borderDark : colors.border },
        ]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label ?? input.placeholder}
          {...input}
          style={[
            styles.input,
            { color: dark ? colors.white : colors.text },
            input.multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 14 },
          ]}
        />
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={dark ? colors.textOnDark : colors.text}
          />
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** A field-shaped button that opens a picker (dropdowns, time selects). */
export function PickerField({
  label,
  value,
  placeholder,
  icon = 'chevron-down',
  onPress,
  error,
  containerStyle,
}: {
  label?: string;
  value: string | null;
  placeholder: string;
  icon?: IconName;
  onPress: () => void;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: spacing.sm }, containerStyle]}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${value ?? placeholder}` : (value ?? placeholder)}
        onPress={onPress}
        style={[styles.field, { borderColor: error ? colors.danger : colors.border }]}>
        <Text
          numberOfLines={1}
          style={[styles.input, { color: value ? colors.text : colors.textMuted }]}>
          {value ?? placeholder}
        </Text>
        <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: TextProps['style'] }) {
  return <Heading size={24} style={[{ marginTop: spacing.md }, style]}>{children}</Heading>;
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected && { borderColor: colors.gold, backgroundColor: colors.goldTint },
      ]}>
      <Text style={styles.chipText}>{label}</Text>
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={colors.text}
          style={{ marginLeft: 4 }}
        />
      ) : null}
    </Pressable>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />;
}

export const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  heading: { fontFamily: fonts.heading, color: colors.gold },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  goldButton: {
    minHeight: 56,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontFamily: fonts.button, fontSize: 18 },
  circleButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { fontFamily: fonts.bodySemi, color: colors.gold, fontSize: 15 },
  label: { fontFamily: fonts.body, fontSize: 16 },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingVertical: 12,
    // The field border already shows focus; hide the browser's extra outline on web.
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
  },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 13 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  chipText: { fontFamily: fonts.bodySemi, color: colors.text, fontSize: 14 },
});
