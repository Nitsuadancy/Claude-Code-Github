import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/motion';
import { RestaurantCard } from '@/components/restaurant-card';
import { BackButton, Body, Eyebrow, GoldRule, Heading, Screen } from '@/components/ui';
import { collectionKitchens, COLLECTIONS } from '@/data/collections';
import * as haptics from '@/lib/haptics';
import { useAllRestaurants, useStore } from '@/state/store';
import { colors, spacing } from '@/theme';
import { CraftIcon } from '@/components/craft-icon';

/** One editorial collection: a short intro and its kitchens. */
export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const restaurants = useAllRestaurants();
  const collection = COLLECTIONS.find((c) => c.id === id);
  const kitchens = useMemo(
    () => (collection ? collectionKitchens(collection, restaurants) : []),
    [collection, restaurants],
  );
  const now = new Date();

  if (!collection) {
    return (
      <Screen style={{ padding: spacing.lg, gap: spacing.lg }}>
        <BackButton />
        <Body>That collection couldn’t be found.</Body>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <FlatList
        data={kitchens}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <BackButton />
            <View style={styles.icon}>
              <CraftIcon name={collection.icon} size={30} color={colors.gold} />
            </View>
            <Eyebrow style={{ textAlign: 'center' }}>Collection</Eyebrow>
            <Heading size={36} style={{ textAlign: 'center' }}>
              {collection.title}
            </Heading>
            <GoldRule style={{ alignSelf: 'center' }} />
            <Body muted style={{ textAlign: 'center', fontSize: 16 }}>
              {collection.tagline}
            </Body>
          </View>
        }
        renderItem={({ item, index }) => (
          <FadeIn index={index}>
            <RestaurantCard
              restaurant={item}
              now={now}
              favorite={state.favoriteRestaurantIds.includes(item.id)}
              onToggleFavorite={() => {
                haptics.tap();
                dispatch({ type: 'toggleFavorite', restaurantId: item.id });
              }}
              onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.id } })}
            />
          </FadeIn>
        )}
        ListEmptyComponent={<Body muted style={{ textAlign: 'center' }}>No kitchens here yet.</Body>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.md, marginBottom: spacing.xl },
  icon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    marginTop: spacing.lg,
  },
});
