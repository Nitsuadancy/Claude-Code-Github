import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { MannaTabBar } from '@/components/tab-bar';
import { useStore } from '@/state/store';
import { colors } from '@/theme';

export default function FoodieTabs() {
  const { state } = useStore();
  if (!state.user) return <Redirect href="/" />;

  const cartCount = state.cart.lines.reduce((n, l) => n + l.quantity, 0);
  const activeOrders = state.orders.filter(
    (o) => o.customerId === state.user?.id && !['completed', 'declined'].includes(o.status),
  ).length;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.white } }}
      tabBar={(props) => (
        <MannaTabBar {...props} badges={{ cart: cartCount, orders: activeOrders }} />
      )}>
      <Tabs.Screen name="index" options={{ title: 'Delivery' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
