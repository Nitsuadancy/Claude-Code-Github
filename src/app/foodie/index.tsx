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
import { CollectionCard } from '@/components/collection-card';
import { DishResult, MiniKitchenCard, OrderAgainCard } from '@/components/home-rows';
import { FadeIn } from '@/components/motion';
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
import { collectionKitchens, COLLECTIONS } from '@/data/collections';
import { buildActivity, unseenCount } from '@/lib/activity';
import { hasDietProfile, kitchenFits } from '@/lib/diet';
import { confirmAction, notify } from '@/lib/alert';
import {
  allCuisineTags,
  type BrowseFilters,
  browseRestaurants,
  DEFAULT_FILTERS,
  type SortOption,
} from '@/lib/browse';
import * as haptics from '@/lib/haptics';
import { formatTime } from '@/lib/hours';
import { buildReorder, recentKitchenOrders, searchDishes } from '@/lib/insights';
import { useAllRestaurants, useDietProfile, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Order, Restaurant } from '@/types';

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

  const diet = useDietProfile();
  const [fitsDiet, setFitsDiet] = useState(false);
  const results = useMemo(() => {
    const list = browseRestaurants(restaurants, filters, new Date());
    return fitsDiet && hasDietProfile(diet) ? list.filter((r) => kitchenFits(r, diet)) : list;
  }, [restaurants, filters, fitsDiet, diet]);
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
  const [searchFocused, setSearchFocused] = useState(false);
  const open = (r: Restaurant) => {
    if (filters.query.trim()) dispatch({ type: 'rememberSearch', query: filters.query });
    router.push({ pathname: '/restaurant/[id]', params: { id: r.id } });
  };
  const popular = useMemo(
    () =>
      browseRestaurants(restaurants, DEFAULT_FILTERS, new Date())
        .map((r) => r.menu.find((m) => m.id === r.signatureItemId)?.name.replace(/\s*\(.*\)$/, ''))
        .filter((n): n is string => !!n)
        .slice(0, 6),
    [restaurants],
  );
  const userId = state.user?.id ?? '';
  const unseen = useMemo(
    () => unseenCount(buildActivity(state.orders, userId), state.activitySeenAt),
    [state.orders, userId, state.activitySeenAt],
  );
  const againOrders = useMemo(() => recentKitchenOrders(state.orders, userId), [state.orders, userId]);
  const favorites = useMemo(
    () => restaurants.filter((r) => r.status === 'live' && state.favoriteRestaurantIds.includes(r.id)),
    [restaurants, state.favoriteRestaurantIds],
  );
  const collections = useMemo(
    () =>
      COLLECTIONS.map((collection) => ({ collection, count: collectionKitchens(collection, restaurants).length })).filter(
        (c) => c.count > 0,
      ),
    [restaurants],
  );
  const dishMatches = useMemo(() => searchDishes(restaurants, filters.query), [restaurants, filters.query]);
  const byId = (id: string) => restaurants.find((r) => r.id === id);

  const reorder = (order: Order) => {
    const kitchen = byId(order.restaurantId);
    if (!kitchen) return;
    if (!isOpenNow(kitchen, new Date())) {
      notify('Kitchen closed', `${kitchen.name} isn’t taking orders right now. Opens at ${formatTime(kitchen.openTime)}.`);
      return;
    }
    const { lines, missing } = buildReorder(order, kitchen, state.orders, new Date());
    if (!lines.length) {
      notify('Not available today', 'Those dishes are sold out or off the menu right now.');
      return;
    }
    const go = () => {
      haptics.success();
      dispatch({ type: 'replaceCart', restaurantId: kitchen.id, lines });
      if (missing.length) notify('Almost everything', `Couldn’t add all of: ${missing.join(', ')}.`);
      router.navigate('/foodie/cart');
    };
    if (state.cart.lines.length && state.cart.restaurantId !== kitchen.id) {
      confirmAction('Replace your cart?', 'Your cart has food from another kitchen.', 'Replace', go, 'Keep cart');
      return;
    }
    go();
  };

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
            label={unseen ? `Activity, ${unseen} new` : 'Activity'}
            dot={unseen > 0}
            onPress={() => router.push('/activity')}
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
            onFocus={() => setSearchFocused(true)}
            // Delay so a tap on a suggestion lands before the panel hides.
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onSubmitEditing={() => dispatch({ type: 'rememberSearch', query: filters.query })}
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

      {searchFocused && !searching ? (
        <View style={styles.suggest}>
          {state.recentSearches.length ? (
            <View style={{ gap: spacing.sm }}>
              <View style={styles.suggestHeader}>
                <Eyebrow>Recent</Eyebrow>
                <Pressable accessibilityRole="button" onPress={() => dispatch({ type: 'clearSearches' })} hitSlop={8}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>
              <View style={styles.suggestChips}>
                {state.recentSearches.map((q) => (
                  <Chip key={q} label={q} icon="history" onPress={() => update({ query: q })} />
                ))}
              </View>
            </View>
          ) : null}
          <View style={{ gap: spacing.sm }}>
            <Eyebrow>Popular right now</Eyebrow>
            <View style={styles.suggestChips}>
              {popular.map((q) => (
                <Chip key={q} label={q} onPress={() => update({ query: q })} />
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {searching && dishMatches.length ? (
        <FadeIn style={{ gap: spacing.xs }}>
          <SectionHeader eyebrow={`${dishMatches.length} ${dishMatches.length === 1 ? 'dish' : 'dishes'}`} title="Dishes" />
          {dishMatches.map(({ item, restaurant }) => (
            <DishResult key={`${restaurant.id}:${item.id}`} item={item} restaurant={restaurant} onPress={() => open(restaurant)} />
          ))}
        </FadeIn>
      ) : null}

      {!searching && againOrders.length ? (
        <FadeIn style={{ gap: spacing.md }}>
          <SectionHeader eyebrow="Your regulars" title="Order again" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
            style={{ marginHorizontal: -spacing.lg }}>
            {againOrders.map((o) => {
              const kitchen = byId(o.restaurantId);
              return kitchen ? (
                <OrderAgainCard key={o.id} order={o} restaurant={kitchen} onOpen={() => open(kitchen)} onReorder={() => reorder(o)} />
              ) : null;
            })}
          </ScrollView>
        </FadeIn>
      ) : null}

      {!searching && featured.length ? (
        <FadeIn delay={80} style={{ gap: spacing.md }}>
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
        </FadeIn>
      ) : null}

      {!searching ? (
        <FadeIn delay={100} style={{ gap: spacing.md }}>
          <SectionHeader eyebrow="Handpicked" title="Collections" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
            style={{ marginHorizontal: -spacing.lg }}>
            {collections.map(({ collection, count }) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                count={count}
                onPress={() => router.push({ pathname: '/collection/[id]', params: { id: collection.id } })}
              />
            ))}
          </ScrollView>
        </FadeIn>
      ) : null}

      {!searching && favorites.length ? (
        <FadeIn delay={120} style={{ gap: spacing.md }}>
          <SectionHeader eyebrow="Saved" title="Your favorites" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
            style={{ marginHorizontal: -spacing.lg }}>
            {favorites.map((r) => (
              <MiniKitchenCard key={r.id} restaurant={r} onPress={() => open(r)} />
            ))}
          </ScrollView>
        </FadeIn>
      ) : null}

      {!searching ? (
      <FadeIn delay={160} style={{ gap: spacing.md }}>
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
      </FadeIn>
      ) : null}

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
          {hasDietProfile(diet) ? (
            <Chip label="Fits my diet" selected={fitsDiet} onPress={() => setFitsDiet((v) => !v)} />
          ) : null}
          <Chip label="Open now" selected={filters.openNow} onPress={() => update({ openNow: !filters.openNow })} />
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
        renderItem={({ item, index }) => (
          <FadeIn index={index} delay={200}>
            <RestaurantCard
              restaurant={item}
              now={now}
              favorite={state.favoriteRestaurantIds.includes(item.id)}
              onToggleFavorite={() => {
                haptics.tap();
                dispatch({ type: 'toggleFavorite', restaurantId: item.id });
              }}
              onPress={() => open(item)}
            />
          </FadeIn>
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
  suggest: {
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    marginTop: -spacing.md,
  },
  suggestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suggestChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  clearText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  reset: { fontFamily: fonts.semibold, color: colors.gold, fontSize: 14 },
});
