import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CoachMarks } from '@/components/coach-marks';
import { OptionSheet } from '@/components/option-sheet';
import { RestaurantCard } from '@/components/restaurant-card';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Body, Chip, Heading, IconCircleButton, Screen } from '@/components/ui';
import { CATEGORIES } from '@/data/categories';
import { notify } from '@/lib/alert';
import {
  allCuisineTags,
  type BrowseFilters,
  browseRestaurants,
  DEFAULT_FILTERS,
  type SortOption,
} from '@/lib/browse';
import { useAllRestaurants, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name (A–Z)' },
];

const COACH_STEPS = [
  {
    title: 'Explore Food Categories',
    body: 'Tap a category like Vegan or Late Night Bites to see kitchens that specialize in it.',
  },
  {
    title: 'Narrow it down',
    body: 'Sort, pick cuisines, or show only top-rated kitchens and offers with the filters above the list.',
  },
  {
    title: 'Track everything',
    body: 'Your cart and live order status live in the tabs at the bottom.',
  },
];

export default function FoodieHome() {
  const { state, dispatch } = useStore();
  const restaurants = useAllRestaurants();
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState<'sort' | 'cuisines' | null>(null);
  const now = new Date();

  const results = useMemo(
    () => browseRestaurants(restaurants, filters, new Date()),
    [restaurants, filters],
  );
  const cuisineOptions = useMemo(
    () => allCuisineTags(restaurants).map((c) => ({ value: c, label: c })),
    [restaurants],
  );
  const update = (changes: Partial<BrowseFilters>) => setFilters((f) => ({ ...f, ...changes }));
  const address = state.user?.deliveryAddress;

  const header = (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change delivery address"
          onPress={() => router.navigate('/foodie/profile')}
          style={styles.location}>
          <MaterialCommunityIcons name="map-marker" size={32} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <View style={styles.row}>
              <Text style={styles.locationTitle}>{address ? 'Deliver to' : 'Set address'}</Text>
              <MaterialCommunityIcons name="chevron-down" size={22} color={colors.text} />
            </View>
            <Text numberOfLines={1} style={styles.locationSub}>
              {address || 'Add a delivery address'}
            </Text>
          </View>
        </Pressable>
        <IconCircleButton
          icon="bell"
          label="Notifications"
          size={52}
          onPress={() => notify('Notifications', 'You’re all caught up.')}
        />
      </View>

      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={24} color={colors.textMuted} />
        <TextInput
          value={filters.query}
          onChangeText={(query) => update({ query })}
          placeholder="Search for meals, chefs, or restaurants"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search for meals, chefs, or restaurants"
        />
        {filters.query ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => update({ query: '' })} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : (
          <MaterialCommunityIcons name="microphone" size={24} color={colors.gold} />
        )}
      </View>

      <Heading size={26}>Fuel your Food Desire</Heading>
      <View style={styles.grid}>
        {CATEGORIES.map((c) => {
          const selected = filters.category === c.id;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => update({ category: selected ? null : c.id })}
              style={[styles.category, selected && styles.categorySelected]}>
              <MaterialCommunityIcons name={c.icon} size={38} color={colors.gold} />
              <Text style={styles.categoryLabel}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Heading size={26}>All Restaurants</Heading>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={{ marginHorizontal: -spacing.lg }}>
        <Chip
          label={filters.sort === 'recommended' ? 'Sort By' : SORT_OPTIONS.find((s) => s.value === filters.sort)!.label}
          icon="chevron-down"
          selected={filters.sort !== 'recommended'}
          onPress={() => setSheet('sort')}
        />
        <Chip
          label={filters.cuisines.length ? `Cuisines (${filters.cuisines.length})` : 'Cuisines'}
          icon="chevron-down"
          selected={filters.cuisines.length > 0}
          onPress={() => setSheet('cuisines')}
        />
        <Chip
          label="Rating 4.0+"
          selected={filters.minRating !== null}
          onPress={() => update({ minRating: filters.minRating === null ? 4 : null })}
        />
        <Chip label="Offers" selected={filters.offersOnly} onPress={() => update({ offersOnly: !filters.offersOnly })} />
        <Chip label="New" selected={filters.newOnly} onPress={() => update({ newOnly: !filters.newOnly })} />
      </ScrollView>
    </View>
  );

  return (
    <Screen edges={['top']}>
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + spacing.lg }]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            now={now}
            favorite={state.favoriteRestaurantIds.includes(item.id)}
            onToggleFavorite={() => dispatch({ type: 'toggleFavorite', restaurantId: item.id })}
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="silverware-clean" size={48} color={colors.border} />
            <Body muted style={{ textAlign: 'center' }}>
              No kitchens match those filters yet.
            </Body>
            <Pressable onPress={() => setFilters(DEFAULT_FILTERS)}>
              <Text style={styles.reset}>Reset filters</Text>
            </Pressable>
          </View>
        }
      />

      <OptionSheet
        visible={sheet === 'sort'}
        title="Sort By"
        options={SORT_OPTIONS}
        selected={[filters.sort]}
        onSelect={([sort]) => update({ sort: sort ?? 'recommended' })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'cuisines'}
        title="Cuisines"
        multiple
        options={cuisineOptions}
        selected={filters.cuisines}
        onSelect={(cuisines) => update({ cuisines })}
        onClose={() => setSheet(null)}
      />
      <CoachMarks
        steps={COACH_STEPS}
        visible={!state.hasSeenCoachMarks}
        onDone={() => dispatch({ type: 'completeCoachMarks' })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  location: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationTitle: { fontFamily: fonts.headingSemi, fontSize: 20, color: colors.text },
  locationSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  category: {
    width: '25%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  categorySelected: { backgroundColor: colors.goldTint },
  categoryLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.text, textAlign: 'center' },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  reset: { fontFamily: fonts.bodySemi, color: colors.gold, fontSize: 16 },
});
