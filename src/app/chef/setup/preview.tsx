import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { RestaurantCard } from '@/components/restaurant-card';
import { Body, GoldButton, SectionTitle, TextLink } from '@/components/ui';
import { resetTo } from '@/lib/navigation';
import { completedSteps, SETUP_STEPS } from '@/lib/setup';
import { useMyRestaurant, useStore } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';

export default function Preview() {
  const { dispatch } = useStore();
  const restaurant = useMyRestaurant();
  const done = completedSteps(restaurant);
  const ready = done.information && done.documents && done.menu;

  if (!restaurant) {
    return (
      <FormScreen title="Preview">
        <Body>Start with your restaurant information first.</Body>
      </FormScreen>
    );
  }

  const publish = () => {
    dispatch({ type: 'publishRestaurant', restaurantId: restaurant.id });
    resetTo('/chef/dashboard');
  };

  return (
    <FormScreen
      title="Preview"
      footer={
        restaurant.status === 'live' ? (
          <GoldButton title="Go to dashboard" onPress={() => resetTo('/chef/dashboard')} />
        ) : (
          <GoldButton title="Publish my restaurant" disabled={!ready} onPress={publish} />
        )
      }>
      <SectionTitle style={{ marginTop: 0 }}>How foodies will see you</SectionTitle>
      <RestaurantCard
        restaurant={{ ...restaurant, status: 'live' }}
        favorite={false}
        now={new Date()}
        onToggleFavorite={() => {}}
        onPress={() =>
          router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id, preview: '1' } })
        }
      />
      <TextLink
        title="Open full restaurant page"
        onPress={() =>
          router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id, preview: '1' } })
        }
      />

      <SectionTitle>Checklist</SectionTitle>
      {SETUP_STEPS.filter((s) => s.key !== 'preview').map((s) => (
        <View key={s.key} style={styles.check}>
          <MaterialCommunityIcons
            name={done[s.key] ? 'check-circle' : 'alert-circle-outline'}
            size={24}
            color={done[s.key] ? colors.success : colors.danger}
          />
          <Text style={styles.checkText}>{s.title}</Text>
        </View>
      ))}
      <Body muted style={{ fontSize: 14 }}>
        Publishing makes your kitchen visible to foodies right away. Document review by the Manna
        team will happen here once the admin tools are live.
      </Body>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkText: { fontFamily: fonts.body, fontSize: 17, color: colors.text },
});
