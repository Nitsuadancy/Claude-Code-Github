import { type StyleProp, Text, type TextStyle } from 'react-native';

import { isUrgent, timeLeft } from '@/lib/countdown';
import { useNow } from '@/lib/use-now';
import { colors, fonts } from '@/theme';

/**
 * A live "Orders close in 1d 6h" that ticks down every minute and turns gold
 * in the last hours. Renders nothing once orders have closed.
 */
export function Countdown({
  to,
  prefix = 'Orders close in ',
  color = colors.textMuted,
  style,
}: {
  to: string;
  prefix?: string;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const now = useNow();
  const left = timeLeft(to, now);
  if (!left) return null;
  const urgent = isUrgent(to, now);
  return (
    <Text
      style={[
        { fontFamily: urgent ? fonts.semibold : fonts.medium, fontSize: 13, color: urgent ? colors.gold : color, fontVariant: ['tabular-nums'] },
        style,
      ]}
      accessibilityLabel={`${prefix}${left}`.replace(/(\d+)d/, '$1 days').replace(/(\d+)h/, '$1 hours').replace(/(\d+)m\b/, '$1 minutes')}>
      {prefix}
      {left}
    </Text>
  );
}
