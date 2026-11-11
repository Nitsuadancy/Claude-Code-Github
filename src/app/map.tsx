import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Text as SvgText,
} from "react-native-svg";

import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/motion";
import { RestaurantCover } from "@/components/restaurant-card";
import { BackButton, Body, Screen } from "@/components/ui";
import {
  LANDMARK_LAKES,
  type LatLng,
  placeLabels,
  project,
  spread,
} from "@/lib/geo";
import { driveBetween, nearbyKitchens, userPlace } from "@/lib/location";
import { orderingLine } from "@/lib/ordering";
import { canOrderFrom } from "@/lib/taste";
import { useAllRestaurants, useStore } from "@/state/store";
import { colors, fonts, radius, spacing } from "@/theme";
import type { Restaurant } from "@/types";

/**
 * Kitchens near you, drawn on a quiet map of the city's neighborhoods. Each
 * gold dot is a kitchen in its neighborhood (never its address); the ivory
 * dot is you. Drive times are rough estimates from neighborhood centers.
 */
export default function KitchenMap() {
  const { state } = useStore();
  const all = useAllRestaurants();
  const { width } = useWindowDimensions();
  const [now] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const here = userPlace(state.user);
  const home = here.label;
  const homeCenter: LatLng = here;

  // Kitchens within reach, nearest first; each sits at its neighborhood's (or ZIP's) center.
  const kitchens = nearbyKitchens(
    all.filter((r) => r.status === "live"),
    here,
  );

  const mapW = width - spacing.lg * 2;
  const mapH = Math.round(mapW * 0.92);
  const points = [...kitchens.map((k) => k.place), homeCenter];
  const toScreen = project(points, mapW, mapH, 44);

  // Areas that appear, each labeled once, with their center and the kitchens in each.
  const byHood = new Map<string, Restaurant[]>();
  const centers = new Map<string, LatLng>();
  for (const { r, place } of kitchens) {
    byHood.set(place.label, [...(byHood.get(place.label) ?? []), r]);
    if (!centers.has(place.label)) centers.set(place.label, place);
  }
  if (!byHood.has(home)) {
    byHood.set(home, []);
    centers.set(home, homeCenter);
  }
  const drive = new Map(
    kitchens.map((k) => [k.r.id, driveBetween(here, k.place)]),
  );

  const you = toScreen(homeCenter);
  // The map's scale, measured with a one-kilometre step north (one degree of latitude is about 110.6 km).
  const pxPerKm = (() => {
    const ref = points[0];
    if (!ref) return 0;
    const a = toScreen(ref);
    const b = toScreen({ lat: ref.lat + 1 / 110.574, lng: ref.lng });
    return Math.abs(a.y - b.y);
  })();
  // Rings a mile apart around you (1 mile = 1.609 km).
  const ring = pxPerKm * 1.609;

  const hoods = [...byHood.entries()].map(([hood, rs]) => ({
    hood,
    rs,
    c: toScreen(centers.get(hood)!),
  }));
  // Your own neighborhood gets first pick of label spots.
  hoods.sort((a, b) => Number(b.hood === home) - Number(a.hood === home));
  const labels = placeLabels(
    hoods.map(({ hood, rs, c }) => ({
      x: c.x,
      y: c.y,
      text: hood,
      gap: rs.length > 1 ? 24 : 12,
    })),
    { width: mapW, height: mapH },
    // Labels keep clear of every dot, not just of each other.
    hoods.flatMap(({ rs, c }) =>
      rs.length ? rs.map((_, i) => spread(c, i, rs.length)) : [c],
    ),
  );

  const open = (r: Restaurant) =>
    router.push({ pathname: "/restaurant/[id]", params: { id: r.id } });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        <View style={{ gap: spacing.xs }}>
          <Text style={styles.title}>Kitchens near you</Text>
          <Body muted style={{ fontSize: 14 }}>
            {kitchens.length
              ? `From ${home}. Times are rough drive estimates; the exact pickup address is shared once a kitchen accepts your order.`
              : `No kitchens within 25 miles of ${home} yet.`}
          </Body>
        </View>

        <View style={[styles.map, { width: mapW, height: mapH }]}>
          <Svg width={mapW} height={mapH}>
            {/* A fine dot grid gives the map texture without pretending to show streets. */}
            <G opacity={0.5}>
              {Array.from({ length: Math.ceil(mapW / 22) }, (_, i) =>
                Array.from({ length: Math.ceil(mapH / 22) }, (__, j) => (
                  <Circle
                    key={`${i}-${j}`}
                    cx={11 + i * 22}
                    cy={11 + j * 22}
                    r={0.9}
                    fill={colors.hairline}
                  />
                )),
              )}
            </G>
            {you && ring > 0
              ? [1, 2, 3].map((n) => (
                  <Circle
                    key={n}
                    cx={you.x}
                    cy={you.y}
                    r={ring * n}
                    fill="none"
                    stroke={colors.hairline}
                    strokeWidth={1}
                    strokeDasharray="2 5"
                  />
                ))
              : null}
            {you && ring > 0 ? (
              <SvgText
                x={you.x + ring * 0.72}
                y={you.y - ring * 0.72}
                fill={colors.textFaint}
                fontSize={10}
                fontFamily={fonts.medium}
              >
                1 mi
              </SvgText>
            ) : null}
            {pxPerKm > 0
              ? LANDMARK_LAKES.map((lake) => {
                  const p = toScreen(lake.center);
                  const r = Math.max(4, lake.radiusKm * pxPerKm);
                  if (p.x < -r || p.y < -r || p.x > mapW + r || p.y > mapH + r)
                    return null;
                  return (
                    <Ellipse
                      key={lake.name}
                      cx={p.x}
                      cy={p.y}
                      rx={r * 1.15}
                      ry={r * 0.85}
                      fill={LAKE}
                    />
                  );
                })
              : null}
            {hoods.map(({ hood, rs, c }, h) => (
              <G key={hood}>
                {rs.map((r, i) => {
                  const p = spread(c, i, rs.length);
                  const on = selected === r.id;
                  const live = canOrderFrom(r, now);
                  return (
                    <G key={r.id}>
                      {you && on ? (
                        <Line
                          x1={you.x}
                          y1={you.y}
                          x2={p.x}
                          y2={p.y}
                          stroke={colors.gold}
                          strokeWidth={1}
                          strokeDasharray="3 4"
                        />
                      ) : null}
                      <Circle
                        cx={p.x}
                        cy={p.y}
                        r={on ? 13 : 9}
                        fill={colors.gold}
                        opacity={on ? 0.25 : 0.14}
                      />
                      <Circle
                        cx={p.x}
                        cy={p.y}
                        r={on ? 7 : 5.5}
                        fill={live ? colors.gold : colors.bg}
                        stroke={colors.gold}
                        strokeWidth={1.5}
                        onPress={() => setSelected(r.id)}
                      />
                    </G>
                  );
                })}
                <SvgText
                  x={labels[h].x}
                  y={labels[h].y}
                  fill={hood === home ? colors.ivory : colors.textMuted}
                  fontSize={11}
                  fontFamily={fonts.medium}
                  textAnchor={labels[h].anchor}
                >
                  {hood}
                </SvgText>
              </G>
            ))}
            {you ? (
              <G>
                <Circle
                  cx={you.x}
                  cy={you.y}
                  r={14}
                  fill={colors.ivory}
                  opacity={0.12}
                />
                <Circle
                  cx={you.x}
                  cy={you.y}
                  r={6}
                  fill={colors.ivory}
                  stroke={colors.bg}
                  strokeWidth={2}
                />
              </G>
            ) : null}
          </Svg>
          <View style={styles.legend} pointerEvents="none">
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.ivory }]}
              />
              <Text style={styles.legendText}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.gold }]}
              />
              <Text style={styles.legendText}>Taking orders</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendHollow]} />
              <Text style={styles.legendText}>Opens later</Text>
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          {kitchens.map(({ r }) => {
            const on = selected === r.id;
            return (
              <PressableScale
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`${r.name}, ${r.neighborhood}, ${drive.get(r.id) ?? ""}`}
                onPress={() => (on ? open(r) : setSelected(r.id))}
                style={[styles.row, on && styles.rowOn]}
              >
                <RestaurantCover
                  restaurant={r}
                  style={styles.thumb}
                  monogramSize={28}
                  size="thumb"
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text
                    style={[
                      styles.line,
                      canOrderFrom(r, now) && { color: colors.success },
                    ]}
                    numberOfLines={1}
                  >
                    {orderingLine(r, now)}
                  </Text>
                  <Text style={styles.drive} numberOfLines={1}>
                    {r.neighborhood} · {drive.get(r.id)}
                  </Text>
                </View>
                {on ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${r.name}`}
                    onPress={() => open(r)}
                    hitSlop={8}
                    style={styles.go}
                  >
                    <Text style={styles.goText}>Open</Text>
                  </Pressable>
                ) : (
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={colors.textMuted}
                  />
                )}
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Lakes are a cool, quiet tint so the gold kitchens stay the focus. */
const LAKE = "rgba(96, 132, 158, 0.16)";

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: -0.6,
    color: colors.ivory,
  },
  map: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  legend: {
    position: "absolute",
    left: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendHollow: { borderWidth: 1.5, borderColor: colors.gold },
  legendText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  rowOn: { backgroundColor: colors.surface },
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: "hidden" },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ivory },
  line: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  drive: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  go: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.ivory,
  },
  goText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.bg },
});
