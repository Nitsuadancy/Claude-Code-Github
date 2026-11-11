import { StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ProLocked, useProKitchen } from '@/components/pro-gate';
import { Body, SectionTitle } from '@/components/ui';
import { hourLabel, kitchenInsights } from '@/lib/insights';
import { formatCents } from '@/lib/money';
import { relativeDay } from '@/lib/reviews';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Restaurant } from '@/types';

const PITCH = 'See your regulars, best sellers, best days and busiest pickup times, so you know what to bake and when.';
const BAR_HEIGHT = 88;

export default function Insights() {
  const { restaurant, pro } = useProKitchen();
  if (!restaurant || !pro) return <ProLocked title="Insights" icon="chart-bar" pitch={PITCH} />;
  return <InsightsScreen restaurant={restaurant} />;
}

function InsightsScreen({ restaurant }: { restaurant: Restaurant }) {
  const { state } = useStore();
  const now = new Date();
  const ins = kitchenInsights(state.orders, restaurant.id, now);
  const monthName = now.toLocaleDateString(undefined, { month: 'long' });
  const change = ins.lastMonth.payoutCents
    ? Math.round(((ins.month.payoutCents - ins.lastMonth.payoutCents) / ins.lastMonth.payoutCents) * 100)
    : null;
  const empty = ins.month.orders === 0 && ins.lastMonth.orders === 0 && ins.bestSellers.length === 0;

  return (
    <FormScreen title="Insights">
      {empty ? (
        <Body muted>Your numbers show up here after your first completed orders.</Body>
      ) : null}

      <View style={styles.tiles}>
        <Tile
          label={`${monthName} take-home`}
          value={formatCents(ins.month.payoutCents)}
          note={change === null ? undefined : `${change >= 0 ? '+' : ''}${change}% vs last month`}
        />
        <Tile label="Orders" value={String(ins.month.orders)} note={`${ins.lastMonth.orders} last month`} />
        <Tile label="Average order" value={formatCents(ins.month.avgOrderCents)} />
        <Tile label="Come back" value={`${Math.round(ins.repeatRate * 100)}%`} note="of customers, last 90 days" />
      </View>

      <SectionTitle>Best days</SectionTitle>
      <Bars
        data={ins.weekdays.map((d) => ({ label: d.label, value: d.cents, text: formatCents(d.cents) }))}
        caption="Take-home by the day orders came in, last 90 days."
      />

      {ins.pickupHours.length ? (
        <>
          <SectionTitle>Busiest pickup times</SectionTitle>
          <Bars
            data={ins.pickupHours.map((h) => ({ label: hourLabel(h.hour), value: h.count, text: `${h.count} pickups` }))}
            caption="Pickups by hour, last 90 days. Have your best batch ready before the peak."
          />
        </>
      ) : null}

      {ins.bestSellers.length ? (
        <>
          <SectionTitle>Best sellers · last 30 days</SectionTitle>
          <View style={styles.list}>
            {ins.bestSellers.map((b, i) => (
              <View key={b.name} style={[styles.row, i > 0 && styles.rule]}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {b.name}
                </Text>
                <Text style={styles.value}>{b.quantity} sold</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle>Your regulars</SectionTitle>
      {ins.regulars.length ? (
        <View style={styles.list}>
          {ins.regulars.map((r, i) => (
            <View key={`${r.name}-${i}`} style={[styles.row, i > 0 && styles.rule]}>
              <Text style={styles.name} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={styles.value}>
                {r.orders} orders · last {relativeDay(r.lastAt, now).toLowerCase()}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Body muted style={{ fontSize: 14 }}>
          Customers who order twice or more show up here. A discount code for a second order can help.
        </Body>
      )}
    </FormScreen>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {note ? <Text style={styles.tileNote}>{note}</Text> : null}
    </View>
  );
}

/** One series of thin gold bars on a quiet baseline; the screen reader gets every value. */
function Bars({ data, caption }: { data: { label: string; value: number; text: string }[]; caption: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const best = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  return (
    <View
      style={styles.chartCard}
      accessible
      accessibilityLabel={`${caption} ${data.map((d) => `${d.label}: ${d.text}`).join(', ')}`}>
      <View style={styles.chart}>
        {data.map((d) => (
          <View key={d.label} style={styles.col}>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { height: d.value === 0 ? 2 : Math.max(6, (d.value / max) * BAR_HEIGHT) },
                  d === best && d.value > 0 ? { backgroundColor: colors.gold } : null,
                ]}
              />
            </View>
            <Text style={[styles.barLabel, d === best && d.value > 0 && { color: colors.ivory }]} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
      {best && best.value > 0 ? (
        <Text style={styles.caption}>
          Peak: {best.label} · {best.text}. {caption}
        </Text>
      ) : (
        <Text style={styles.caption}>{caption}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  tileLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  tileValue: { fontFamily: fonts.display, fontSize: 26, color: colors.ivory, fontVariant: ['tabular-nums'] },
  tileNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  chartCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  track: { height: BAR_HEIGHT, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', maxWidth: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: 'rgba(212, 178, 110, 0.55)' },
  barLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rank: { fontFamily: fonts.display, fontSize: 18, color: colors.gold, width: 18 },
  name: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  value: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
