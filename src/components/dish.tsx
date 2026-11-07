import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { DietProfile } from '@/lib/diet';
import { allergenSentence, DIETARY_TAGS } from '@/lib/dietary';
import { stockLabel } from '@/lib/limits';
import { formatCents } from '@/lib/money';
import { colors, fonts, radius, spacing } from '@/theme';
import type { DietaryTag, MenuItem } from '@/types';

import { DietNote } from './diet';
import { Body, Eyebrow, GoldButton, Heading } from './ui';
import { Icon } from './icon';
import { Photo } from './photo';


/**
 * Dietary marks as restaurant menus print them: small letter codes (V, VG,
 * GF…) in a fine gold outline, with full labels where there's room.
 */
export function DietaryIcons({ tags, withLabels }: { tags: DietaryTag[]; withLabels?: boolean }) {
  const shown = DIETARY_TAGS.filter((t) => tags.includes(t.value));
  if (!shown.length) return null;
  return (
    <View style={styles.dietRow} accessibilityLabel={shown.map((t) => t.label).join(', ')}>
      {shown.map((t) =>
        withLabels ? (
          <View key={t.value} style={styles.dietPill}>
            <Text style={styles.code}>{t.code}</Text>
            <Text style={styles.dietText}>{t.label}</Text>
          </View>
        ) : (
          <Text key={t.value} style={styles.codeBox}>
            {t.code}
          </Text>
        ),
      )}
    </View>
  );
}

/** "Only 3 left today" / "Sold out today" in gold or muted text. */
export function StockNote({ remaining }: { remaining: number | null }) {
  const label = stockLabel(remaining);
  if (!label) return null;
  return (
    <View style={styles.stock}>
      <Icon
        name={remaining === 0 ? 'clock-outline' : 'fire'}
        size={13}
        color={remaining === 0 ? colors.textMuted : colors.gold}
      />
      <Text style={[styles.stockText, remaining === 0 && { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

/**
 * Full dish details in a bottom sheet: big photo, description, dietary tags,
 * allergens and an add button.
 */
export function DishSheet({
  item,
  signature,
  remaining,
  quantityInCart,
  canOrder,
  diet,
  onAdd,
  onClose,
}: {
  item: MenuItem | null;
  signature: boolean;
  remaining: number | null;
  quantityInCart: number;
  canOrder: boolean;
  diet?: DietProfile;
  onAdd: () => void;
  onClose: () => void;
}) {
  const soldOut = remaining !== null && remaining - quantityInCart <= 0;
  const allergens = item ? allergenSentence(item.allergens) : null;
  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      {item ? (
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <ScrollView bounces={false}>
            <View style={styles.photo}>
              {item.photoUri ? (
                <Photo uri={item.photoUri} size="card" style={StyleSheet.absoluteFill} />
              ) : (
                <LinearGradient colors={['#221D13', '#0E0C09']} style={[StyleSheet.absoluteFill, styles.center]}>
                  <Icon name="silverware-variant" size={40} color={colors.gold} />
                </LinearGradient>
              )}
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
                <Icon name="close" size={20} color={colors.ivory} />
              </Pressable>
            </View>
            <View style={styles.body}>
              {signature ? <Eyebrow>Signature dish</Eyebrow> : null}
              <Heading size={28}>{item.name}</Heading>
              <Text style={styles.price}>{formatCents(item.priceCents)}</Text>
              {item.description ? <Body muted>{item.description}</Body> : null}
              <DietaryIcons tags={item.dietary} withLabels />
              {allergens ? (
                <View style={styles.allergens}>
                  <Icon name="alert-outline" size={16} color={colors.gold} />
                  <Text style={styles.allergenText}>{allergens}</Text>
                </View>
              ) : null}
              <StockNote remaining={remaining} />
              {diet ? <DietNote item={item} profile={diet} /> : null}
            </View>
          </ScrollView>
          <View style={styles.footer}>
            {canOrder && item.available ? (
              <GoldButton
                title={
                  soldOut
                    ? remaining === 0
                      ? 'Sold out today'
                      : 'You have the last ones'
                    : quantityInCart
                      ? `Add another · ${formatCents(item.priceCents)}`
                      : `Add to cart · ${formatCents(item.priceCents)}`
                }
                icon={soldOut ? undefined : 'plus'}
                disabled={soldOut}
                onPress={onAdd}
              />
            ) : (
              <GoldButton title="Close" variant="outline" onPress={onClose} />
            )}
          </View>
        </SafeAreaView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  dietRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center' },
  dietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dietText: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  code: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.6, color: colors.gold },
  codeBox: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.4, color: colors.textMuted },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockText: { fontFamily: fonts.medium, fontSize: 12, color: colors.gold },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  photo: { height: 260, backgroundColor: colors.surfaceRaised },
  close: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10,9,7,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.lg, gap: spacing.sm },
  price: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gold, fontVariant: ['tabular-nums'] },
  allergens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  allergenText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text, flex: 1 },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
