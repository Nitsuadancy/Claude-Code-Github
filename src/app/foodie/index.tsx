import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { DishResult, ForYouCard, MiniKitchenCard, OrderAgainCard } from '@/components/home-rows';
import { FadeIn } from '@/components/motion';
import { OptionSheet } from '@/components/option-sheet';
import { HeroCarousel } from '@/components/hero-carousel';
import { isOpenNow, RestaurantCard } from '@/components/restaurant-card';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import {
  Chip,
  Eyebrow,
  Heading,
  Screen,
  SectionHeader,
  webNoOutline,
  Wordmark,
} from '@/components/ui';
import { CraftIcon } from '@/components/craft-icon';
import { CATEGORIES } from '@/data/categories';
import { DEFAULT_NEIGHBORHOOD, LAUNCH_CITY, NEIGHBORHOODS } from '@/data/neighborhoods';
import { marketFor } from '@/data/regions';
import { collectionKitchens, COLLECTIONS } from '@/data/collections';
import { buildActivity, unseenCount } from '@/lib/activity';
import { pickForYou } from '@/lib/for-you';
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
import { orderingLine } from '@/lib/ordering';
import { buildReorder, recentKitchenOrders, searchDishes } from '@/lib/insights';
import { useAllRestaurants, useDietProfile, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Order, Restaurant } from '@/types';
import { Icon } from '@/components/icon';
import { EmptyState } from '@/components/empty-state';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name (A–Z)' },
];

const COACH_STEPS = [
  {
    title: 'Explore by craving',
    body: 'Tap a craft like Vegan or Late Night to see kitchens that specialize in it.',
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

/** The front-page headline changes with the time of day. */
function headline(now: Date, neighborhood: string): string {
  const h = now.getHours();
  if (h < 11) return `What’s baking in ${neighborhood}`;
  if (h < 17) return `Fresh this afternoon in ${neighborhood}`;
  return `Tonight in ${neighborhood}`;
}

/** "Thursday, November 6" */
function dateline(now: Date): string {
  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function FoodieHome() {
  const { state, dispatch } = useStore();
  const restaurants = useAllRestaurants();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState<'sort' | 'cuisines' | 'neighborhood' | null>(null);
  const now = new Date();

  const diet = useDietProfile();
  const [fitsDiet, setFitsDiet] = useState(false);
  const results = useMemo(() => {
    const list = browseRestaurants(restaurants, filters, new Date());
    return fitsDiet && hasDietProfile(diet) ? list.filter((r) => kitchenFits(r, diet)) : list;
  }, [restaurants, filters, fitsDiet, diet]);
  const heroKitchens = useMemo(() => {
    const ranked = browseRestaurants(restaurants, DEFAULT_FILTERS, new Date());
    const open = ranked.filter((r) => isOpenNow(r, new Date()));
    return (open.length >= 2 ? open : ranked).slice(0, 5);
  }, [restaurants]);
  const cuisineOptions = useMemo(
    () => allCuisineTags(restaurants).map((c) => ({ value: c, label: c })),
    [restaurants],
  );
  const update = (changes: Partial<BrowseFilters>) => setFilters((f) => ({ ...f, ...changes }));
  const neighborhood = state.user?.neighborhood || DEFAULT_NEIGHBORHOOD;
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
  const forYou = useMemo(
    () =>
      pickForYou(restaurants, {
        customerId: userId,
        orders: state.orders,
        favoriteIds: state.favoriteRestaurantIds,
        diet,
        neighborhood,
        now: new Date(),
      }),
    [restaurants, userId, state.orders, state.favoriteRestaurantIds, diet, neighborhood],
  );
  const founders = useMemo(
    () => restaurants.filter((r) => r.status === 'live' && r.founding),
    [restaurants],
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
      notify('Not taking orders', `${kitchen.name} isn’t taking orders right now. ${orderingLine(kitchen, new Date(), { long: true })}.`);
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

  const masthead = (
    <View style={[styles.topRow, { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg }]}>
      <Wordmark width={92} />
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Neighborhood: ${neighborhood}, ${marketFor(neighborhood)?.city ?? LAUNCH_CITY}. Change`}
          onPress={() => setSheet('neighborhood')}
          style={styles.place}>
          <Text style={styles.placeText} numberOfLines={1}>
            {neighborhood}
          </Text>
          <Icon name="chevron-down" size={14} color={colors.ivory} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unseen ? `Activity, ${unseen} new` : 'Activity'}
          hitSlop={10}
          onPress={() => router.push('/activity')}
          style={styles.bell}>
          <Icon name="bell-outline" size={20} color={colors.ivory} />
          {unseen > 0 ? <View style={styles.bellDot} /> : null}
        </Pressable>
      </View>
    </View>
  );

  const header = (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.lg }}>
        {heroKitchens.length ? (
          <View style={{ marginHorizontal: -spacing.lg }}>
            <HeroCarousel
              restaurants={heroKitchens}
              width={width}
              height={Math.round(Math.min(width * 1.32, 620))}
              label={(r) => orderingLine(r, now, { long: true })}
              onOpen={open}
              overlay={masthead}
            />
          </View>
        ) : (
          <View style={{ marginHorizontal: -spacing.lg }}>{masthead}</View>
        )}

        <View style={{ gap: 6 }}>
          <Heading size={30}>{headline(now, neighborhood)}</Heading>
          <Text style={styles.dateline}>{dateline(now)}</Text>
        </View>

        <View style={styles.search}>
          <Icon name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            value={filters.query}
            onChangeText={(query) => update({ query })}
            onFocus={() => setSearchFocused(true)}
            // Delay so a tap on a suggestion lands before the panel hides.
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onSubmitEditing={() => dispatch({ type: 'rememberSearch', query: filters.query })}
            placeholder="Search dishes, kitchens or chefs"
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.gold}
            keyboardAppearance="dark"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search dishes, kitchens or chefs"
          />
          {filters.query ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => update({ query: '' })} hitSlop={8}>
              <Icon name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Icon name="tune-variant" size={20} color={colors.textMuted} />
          )}
        </View>
      </View>

      {!searching && !searchFocused && !hasDietProfile(diet) && !state.dietNudgeDismissed ? (
        <FadeIn style={styles.nudge}>
          <Text style={styles.nudgeBody}>
            Avoiding gluten or nuts?{' '}
            <Text
              accessibilityRole="link"
              style={styles.nudgeLink}
              onPress={() => router.navigate('/foodie/profile')}>
              Set your diet and allergies
            </Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            hitSlop={10}
            onPress={() => dispatch({ type: 'dismissDietNudge' })}>
            <Icon name="close" size={16} color={colors.textFaint} />
          </Pressable>
        </FadeIn>
      ) : null}

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

      {!searching ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.lg, paddingHorizontal: spacing.lg }}
          style={{ marginHorizontal: -spacing.lg, marginTop: -spacing.sm }}>
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
                <CraftIcon name={c.icon} size={30} color={selected ? colors.gold : colors.text} />
                <Text style={[styles.categoryLabel, selected && { color: colors.gold }]} numberOfLines={1}>
                  {c.label}
                </Text>
                <View style={[styles.categoryRule, selected && { backgroundColor: colors.gold }]} />
              </Pressable>
            );
          })}
        </ScrollView>
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
          <SectionHeader title="Order again" />
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


      {!searching && forYou.length ? (
        <FadeIn delay={90} style={{ gap: spacing.md }}>
          <SectionHeader title="For you" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
            style={{ marginHorizontal: -spacing.lg }}>
            {forYou.map(({ restaurant, reason }) => (
              <ForYouCard key={restaurant.id} restaurant={restaurant} reason={reason} onPress={() => open(restaurant)} />
            ))}
          </ScrollView>
        </FadeIn>
      ) : null}

      {!searching ? (
        <FadeIn delay={100} style={{ gap: spacing.md }}>
          <SectionHeader title="Collections" />
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

      {!searching && founders.length ? (
        <FadeIn delay={110} style={{ gap: spacing.md }}>
          <SectionHeader title="Founding creators" eyebrow="The first kitchens on Manna" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
            style={{ marginHorizontal: -spacing.lg }}>
            {founders.map((r) => (
              <MiniKitchenCard key={r.id} restaurant={r} onPress={() => open(r)} />
            ))}
          </ScrollView>
        </FadeIn>
      ) : null}

      {!searching && favorites.length ? (
        <FadeIn delay={120} style={{ gap: spacing.md }}>
          <SectionHeader title="Your favorites" />
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
    <Screen edges={[]}>
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
            <EmptyState art="plate" compact title="Nothing matches yet" body="No kitchens match those filters yet." />
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
        visible={sheet === 'neighborhood'}
        title="Your neighborhood"
        options={NEIGHBORHOODS.map((n) => ({ value: n, label: n }))}
        selected={[neighborhood]}
        onSelect={([n]) => n && dispatch({ type: 'updateProfile', changes: { neighborhood: n } })}
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
  content: { padding: spacing.lg, paddingTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(11,11,11,0.45)',
    marginRight: spacing.sm,
  },
  placeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ivory },
  bell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,11,11,0.45)',
  },
  bellDot: { position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  dateline: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 50,
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
  category: { alignItems: 'center', gap: spacing.sm, minWidth: 52, paddingTop: spacing.xs },
  categoryLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  categoryRule: { height: 1.5, alignSelf: 'stretch', backgroundColor: 'transparent' },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: -spacing.md },
  nudgeBody: { flex: 1, fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 22, color: colors.textMuted },
  nudgeLink: { fontFamily: fonts.displayItalic, color: colors.gold, textDecorationLine: 'underline' },
  suggest: {
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: -spacing.md,
  },
  suggestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suggestChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  clearText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  reset: { fontFamily: fonts.semibold, color: colors.gold, fontSize: 14 },
});
