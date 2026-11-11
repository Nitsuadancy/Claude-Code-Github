import { useScrollToTop } from "expo-router";
import { type ComponentRef, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AccountSettings } from "@/components/account-settings";
import { Passport } from "@/components/passport";
import { DietPreferences } from "@/components/diet";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import { Heading, Screen } from "@/components/ui";
import { endedWithoutSale } from "@/lib/orders";
import { marketFor } from "@/data/regions";
import { nearbyKitchens, userPlace } from "@/lib/location";
import { lookupZip } from "@/lib/zips";
import { passportStamps } from "@/lib/passport";
import { useAllRestaurants, useStore } from "@/state/store";
import { colors, fonts, radius, spacing } from "@/theme";

export default function Profile() {
  const { state } = useStore();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTop(scroll);
  const userId = state.user?.id;
  const orders = state.orders.filter(
    (o) => o.customerId === userId && !endedWithoutSale(o.status),
  ).length;
  const kitchens = new Set(
    state.orders
      .filter((o) => o.customerId === userId)
      .map((o) => o.restaurantId),
  ).size;
  const reviews = state.reviews.filter((r) => r.customerId === userId).length;
  const restaurants = useAllRestaurants();
  const here = userPlace(state.user);
  const stamps = passportStamps(state.orders, userId ?? "");
  // Every open kitchen within reach is a spot in the passport, plus any you've stamped elsewhere.
  const near = new Set(nearbyKitchens(restaurants, here).map((k) => k.r.id));
  const passportKitchens = restaurants.filter(
    (r) =>
      r.status === "live" &&
      (near.has(r.id) || stamps.some((s) => s.restaurantId === r.id)),
  );
  const city = state.user?.zip
    ? (lookupZip(state.user.zip)?.city ?? here.label)
    : (marketFor(here.label)?.city ?? here.label);
  const initials = (state.user?.name ?? "")
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Screen edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.xl,
            paddingBottom: TAB_BAR_SPACE + spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{initials || "M"}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Heading size={28}>{state.user?.name || "Your profile"}</Heading>
              <Text style={styles.since}>{here.label} · Foodie</Text>
            </View>
          </View>
          <View style={styles.stats}>
            <Stat value={orders} label={orders === 1 ? "Order" : "Orders"} />
            <Stat
              value={kitchens}
              label={kitchens === 1 ? "Kitchen tried" : "Kitchens tried"}
            />
            <Stat
              value={state.favoriteRestaurantIds.length}
              label="Favorites"
            />
            <Stat
              value={reviews}
              label={reviews === 1 ? "Review" : "Reviews"}
            />
          </View>
          <Passport city={city} stamps={stamps} kitchens={passportKitchens} />
          <DietPreferences />
          <AccountSettings showIdentity={false} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View
      style={styles.stat}
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: fonts.semibold, fontSize: 22, color: colors.gold },
  since: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  stats: {
    flexDirection: "row",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4 },
  value: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.ivory,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});
