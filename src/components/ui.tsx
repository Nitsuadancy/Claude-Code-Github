import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '@/theme';
import { Icon, type IconName } from './icon';

export type { IconName } from './icon';

const LOGO = require('@/assets/images/logo.png');
const WORDMARK = require('@/assets/images/wordmark.png');
const RAYS = require('@/assets/images/rays.png');

/* ---------- Brand ---------- */

/** The full Manna logo: ivory wordmark inside gold rays. */
export function Logo({ size = 220 }: { size?: number }) {
  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="Manna"
    />
  );
}

/** Just the MANNA lettering, for headers. Aspect ratio 859:156. */
export function Wordmark({ width = 120 }: { width?: number }) {
  return (
    <Image
      source={WORDMARK}
      style={{ width, height: (width * 156) / 859 }}
      contentFit="contain"
      accessibilityLabel="Manna"
    />
  );
}

/** The logo's gold sunburst, used faintly behind hero content. */
export function Rays({
  size = 520,
  opacity = 0.35,
  style,
}: {
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[styles.raysWrap, style]}>
      <Image source={RAYS} style={{ width: size, height: size, opacity }} contentFit="contain" />
    </View>
  );
}

/* ---------- Text ---------- */

/** Serif display text for titles, restaurant and dish names. */
export function Heading({
  style,
  size = 32,
  italic,
  ...props
}: TextProps & { size?: number; italic?: boolean }) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.4}
      {...props}
      style={[
        styles.heading,
        { fontSize: size, lineHeight: Math.round(size * 1.08), letterSpacing: -size * 0.028 },
        italic && { fontFamily: fonts.displayItalic },
        style,
      ]}
    />
  );
}

/** A quiet label above or beside a title, e.g. "7 kitchens". Use only when it carries information. */
export function Eyebrow({ style, ...props }: TextProps) {
  return <Text maxFontSizeMultiplier={1.3} {...props} style={[styles.eyebrow, style]} />;
}

export function Body({ style, muted, ...props }: TextProps & { muted?: boolean }) {
  return <Text {...props} style={[styles.body, muted && { color: colors.textMuted }, style]} />;
}

/** A serif section title with an optional quiet label and an action on the right. */
export function SectionHeader({
  eyebrow,
  title,
  action,
  style,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1, gap: 4 }}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading size={22}>{title}</Heading>
      </View>
      {action}
    </View>
  );
}

/** Smaller serif title used inside forms. */
export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Heading size={20} style={[{ marginTop: spacing.md }, style]}>
      {children}
    </Heading>
  );
}

/* ---------- Layout ---------- */

export function Screen({
  children,
  style,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      {children}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  highlight,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.card, highlight && { borderColor: colors.hairline }, style]}>{children}</View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />;
}

/** A short gold rule, used under hero titles. */
export function GoldRule({ width = 40, style }: { width?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width, height: 1.5, backgroundColor: colors.gold }, style]} />;
}

/* ---------- Buttons ---------- */

export type ButtonVariant = 'primary' | 'outline' | 'ghost';

export function GoldButton({
  title,
  onPress,
  variant = 'primary',
  chevron = false,
  icon,
  disabled,
  loading,
  style,
  fullWidth = true,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  chevron?: boolean;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}) {
  const primary = variant === 'primary';
  const textColor = primary ? colors.bg : variant === 'outline' ? colors.ivory : colors.gold;
  const surface =
    variant === 'primary'
      ? { backgroundColor: colors.ivory }
      : variant === 'outline'
        ? { borderWidth: 1, borderColor: colors.borderStrong }
        : null;
  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <View style={styles.row}>
      {icon ? (
        <Icon name={icon} size={20} color={textColor} style={{ marginRight: spacing.sm }} />
      ) : null}
      <Text maxFontSizeMultiplier={1.3} style={[styles.buttonText, { color: textColor }]}>
        {title}
      </Text>
      {chevron ? (
        <Icon name="arrow-right" size={16} color={textColor} style={{ marginLeft: spacing.sm }} />
      ) : null}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'center', minWidth: 220 },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}>
      <View style={[styles.button, surface]}>{content}</View>
    </Pressable>
  );
}

export function IconCircleButton({
  icon,
  onPress,
  label,
  size = 44,
  dot,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  /** Show a small gold notification dot. */
  dot?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.circleButton,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && { opacity: 0.7 },
      ]}>
      <Icon name={icon} size={size * 0.48} color={colors.ivory} />
      {dot ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <IconCircleButton
      icon="arrow-left"
      label="Go back"
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
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={style}>
      <Text style={styles.link}>{title}</Text>
    </Pressable>
  );
}

/* ---------- Form fields ---------- */

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function TextField({
  label,
  icon,
  error,
  containerStyle,
  ...input
}: TextInputProps & {
  label?: string;
  icon?: IconName;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const readOnly = input.editable === false;
  return (
    <View style={[{ gap: spacing.sm }, containerStyle]}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View
        style={[
          styles.field,
          focused && { borderColor: colors.gold },
          error ? { borderColor: colors.danger } : null,
          readOnly && { backgroundColor: 'transparent' },
        ]}>
        <TextInput
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.gold}
          cursorColor={colors.gold}
          keyboardAppearance="dark"
          accessibilityLabel={label ?? input.placeholder}
          numberOfLines={input.multiline ? 5 : undefined}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[
            styles.input,
            readOnly && { color: colors.textMuted },
            input.multiline && { minHeight: 120, textAlignVertical: 'top', paddingTop: 14, paddingBottom: 14 },
          ]}
        />
        {icon ? (
          <Icon name={icon} size={20} color={focused ? colors.gold : colors.textMuted} />
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
        style={[styles.field, error ? { borderColor: colors.danger } : null]}>
        <Text numberOfLines={1} style={[styles.input, { color: value ? colors.text : colors.textFaint }]}>
          {value ?? placeholder}
        </Text>
        <Icon name={icon} size={20} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
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
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && { color: colors.bg }]}>{label}</Text>
      {icon ? (
        <Icon
          name={icon}
          size={16}
          color={selected ? colors.bg : colors.textMuted}
          style={{ marginLeft: 4 }}
        />
      ) : null}
    </Pressable>
  );
}

/** A small status mark: a colored dot and a word, e.g. "Open now" or "Offer". */
export function Badge({
  label,
  tone = 'gold',
  onPhoto,
}: {
  label: string;
  tone?: 'gold' | 'success' | 'muted';
  /** Sits on a photo: gets a dark glass backing so it stays legible. */
  onPhoto?: boolean;
}) {
  const color =
    tone === 'gold' ? colors.gold : tone === 'success' ? colors.success : onPhoto ? colors.text : colors.textMuted;
  return (
    <View style={[styles.badge, onPhoto && styles.badgeOnPhoto]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color: onPhoto ? colors.ivory : color }]}>{label}</Text>
    </View>
  );
}

/** Hide the browser's own focus ring on web; fields show focus with a gold border instead. */
export const webNoOutline = (Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {}) as TextStyle;

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  raysWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  heading: { fontFamily: fonts.display, color: colors.ivory },
  eyebrow: {
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.1,
    color: colors.textMuted,
  },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.text },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  button: {
    minHeight: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.1 },
  circleButton: {
    backgroundColor: 'rgba(10, 9, 7, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  link: { fontFamily: fonts.semibold, color: colors.gold, fontSize: 14 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  field: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 14,
    minWidth: 0,
    ...webNoOutline,
  },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 13 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.ivory, backgroundColor: colors.ivory },
  chipText: { fontFamily: fonts.medium, color: colors.text, fontSize: 13 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeOnPhoto: { backgroundColor: 'rgba(10, 9, 7, 0.7)', borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 9 },
  badgeText: { fontFamily: fonts.medium, fontSize: 12 },
});
