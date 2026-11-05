import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { CoachMarks } from '@/components/coach-marks';
import { OptionSheet } from '@/components/option-sheet';
import { FeaturedCard, isOpenNow, RestaurantCard } from '@/components/restaurant-card';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import {
  Body,
  Chip,
  Eyebrow,
  Heading,
  IconCircleButton,
  Rays,
  Screen,
  SectionHeader,
  webNoOutline,
} from '@/components/ui';
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
import type { Restaurant } from '@/types';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name (A–Z)' },
];

const COACH_STEPS = [
  {
    title: 'Explore by craving',
    body: 'Tap a category like Vegan or Late Night Bites to see kitchens that specialize in it.',
  },
  {
    title: 'Refine your search',
    body: 'Sort, choose cuisines, or show only top-rated kitchens and offers with the filters above the list.',
  },
  {
    title: 'Follow every order',
    body: 'Your cart and live order status are always one tap away in the bar below.',
  },
];

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function FoodieHome() {
  const { state, dispatch } = useStore();
  const restaurants = useAllRestaurants();
  const { width } = useWindowDimensions();
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState<'sort' | 'cuisines' | null>(null);
  const now = new Date();

  const results = useMemo(() => browseRestaurants(restaurants, filters, new Date()), [restaurants, filters]);
  const featured = useMemo(() => {
    const ranked = browseRestaurants(restaurants, DEFAULT_FILTERS, new Date());
    const open = ranked.filter((r) => isOpenNow(r, new Date()));
    return (open.length >= 2 ? open : ranked).slice(0, 5);
  }, [restaurants]);
  const cuisineOptions = useMemo(
    () => allCuisineTags(restaurants).map((c) => ({ value: c, label: c })),
    [restaurants],
  );
  const update = (changes: Partial<BrowseFilters>) => setFilters((f) => ({ ...f, ...changes }));
  const address = state.user?.deliveryAddress;
  const firstName = state.user?.name.split(' ')[0];
  const searching = filters.query.trim().length > 0;
  const open = (r: Restaurant) => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } });

  const header = (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.lg }}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change delivery address"
            onPress={() => router.navigate('/foodie/profile')}
            style={{ flex: 1, gap: 2 }}>
            <Eyebrow>Deliver to</Eyebrow>
            <View style={styles.row}>
              <Text numberOfLines={1} style={styles.address}>
                {address || 'Add your address'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={colors.gold} />
            </View>
          </Pressable>
          <IconCircleButton
            icon="bell-outline"
            label="Notifications"
            dot
            onPress={() => notify('Notifications', 'You’re all caught up.')}
          />
        </View>

        <Heading size={30}>
          {greeting(now)}
          {firstName ? `,\n${firstName}` : ''}
        </Heading>

        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.gold} />
          <TextInput
            value={filters.query}
            onChangeText={(query) => update({ query })}
            placeholder="Search meals, chefs or kitchens"
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.gold}
            keyboardAppearance="dark"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search meals, chefs or kitchens"
          />
          {filters.query ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => update({ query: '' })} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : (
            <MaterialCommunityIcons name="tune-variant" size={20} color={colors.textMuted} />
          )}
        </View>
      </View>

      {!searching && featured.length ? (
        <View style={{ gap: spacing.md }}>
          <SectionHeader eyebrow="Curated for you" title="Tonight’s table" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.68 + spacing.md}
            decelerationRate="fast"
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
            style={{ marginHorizontal: -spacing.lg }}>
            {featured.map((r) => (
              <FeaturedCard key={r.id} restaurant={r} width={width * 0.68} onPress={() => open(r)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <SectionHeader eyebrow="Explore" title="Fuel your food desire" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          style={{ marginHorizontal: -spacing.lg }}>
          {CATEGORIES.map((c) => {
            const selected = filters.category === c.id;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={c.label}
                onPress={() => update({ category: selected ? null : c.id })}
                style={styles.category}>
                <View style={[styles.categoryRing, selected && styles.categoryRingOn]}>
                  <MaterialCommunityIcons name={c.icon} size={28} color={selected ? colors.onGold : colors.gold} />
                </View>
                <Text style={[styles.categoryLabel, selected && { color: colors.gold }]} numberOfLines={2}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionHeader
          eyebrow={`${results.length} ${results.length === 1 ? 'kitchen' : 'kitchens'}`}
          title={searching ? 'Results' : 'All kitchens'}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={{ marginHorizontal: -spacing.lg }}>
          <Chip
            label={
              filters.sort === 'recommended'
                ? 'Sort'
                : SORT_OPTIONS.find((s) => s.value === filters.sort)!.label
            }
            icon="chevron-down"
            selected={filters.sort !== 'recommended'}
            onPress={() => setSheet('sort')}
          />
          <Chip
            label={filters.cuisines.length ? `Cuisines · ${filters.cuisines.length}` : 'Cuisines'}
            icon="chevron-down"
            selected={filters.cuisines.length > 0}
            onPress={() => setSheet('cuisines')}
          />
          <Chip
            label="Rated 4.5+"
            selected={filters.minRating !== null}
            onPress={() => update({ minRating: filters.minRating === null ? 4.5 : null })}
          />
          <Chip label="Offers" selected={filters.offersOnly} onPress={() => update({ offersOnly: !filters.offersOnly })} />
          <Chip label="New" selected={filters.newOnly} onPress={() => update({ newOnly: !filters.newOnly })} />
        </ScrollView>
      </View>
    </View>
  );

  return (
    <Screen edges={['top']}>
      <Rays size={520} opacity={0.1} style={{ top: -300 }} />
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: spacing.md }}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + spacing.lg }]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            now={now}
            favorite={state.favoriteRestaurantIds.includes(item.id)}
            onToggleFavorite={() => dispatch({ type: 'toggleFavorite', restaurantId: item.id })}
            onPress={() => open(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="silverware-variant" size={40} color={colors.goldDeep} />
            <Body muted style={{ textAlign: 'center' }}>
              No kitchens match those filters yet.
            </Body>
            <Pressable onPress={() => setFilters(DEFAULT_FILTERS)} hitSlop={8}>
              <Text style={styles.reset}>Reset filters</Text>
            </Pressable>
          </View>
        }
      />

      <OptionSheet
        visible={sheet === 'sort'}
        title="Sort by"
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
  content: { padding: spacing.lg, paddingTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  address: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, flexShrink: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + 2,
    minHeight: 54,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
    minWidth: 0,
    ...webNoOutline,
  },
  category: { width: 76, alignItems: 'center', gap: spacing.sm },
  categoryRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRingOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  categoryLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.text,
    textAlign: 'center',
  },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  reset: { fontFamily: fonts.semibold, color: colors.gold, fontSize: 14 },
});
