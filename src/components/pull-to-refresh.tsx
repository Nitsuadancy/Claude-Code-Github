import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { useServerRefresh } from '@/state/store';
import { colors } from '@/theme';

/** Long enough that the spinner reads as a deliberate refresh, not a flicker. */
const MIN_SPIN_MS = 450;

/**
 * Pull-to-refresh in Manna's gold. Pass the reload for the screen's data.
 *
 * With the backend on, a pull reloads everything from the server and the
 * spinner stays up until it finishes. Without it, a pull re-reads the clock
 * (open/closed, pickup windows, "ready by" times) when the screen redraws.
 */
export function usePullToRefresh(reload?: () => Promise<unknown> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const fromServer = useServerRefresh();
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        (reload ?? fromServer)()?.catch?.(() => undefined),
        new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS)),
      ]);
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.gold}
      colors={[colors.gold]}
      progressBackgroundColor={colors.surface}
    />
  );
}
