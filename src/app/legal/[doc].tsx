import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackButton, Heading, Screen } from '@/components/ui';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '@/data/legal';
import { colors, fonts, radius, spacing } from '@/theme';

/** Both pages are built ahead of time for the web, so their links open directly. */
export function generateStaticParams(): { doc: string }[] {
  return [{ doc: 'privacy' }, { doc: 'terms' }];
}

/** The privacy policy (/legal/privacy) or the terms of service (/legal/terms). */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const legal = doc === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY;
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        <View style={{ gap: spacing.sm }}>
          <Heading size={30}>{legal.title}</Heading>
          <View style={styles.status}>
            <Text style={styles.statusText}>{legal.status}</Text>
          </View>
        </View>
        {legal.sections.map((section) => (
          <View key={section.heading} style={{ gap: spacing.sm }}>
            <Text accessibilityRole="header" style={styles.heading}>
              {section.heading}
            </Text>
            {section.body.map((line) =>
              line.startsWith('- ') ? (
                <View key={line} style={styles.bullet}>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.text}>{line.slice(2)}</Text>
                </View>
              ) : (
                <Text key={line} style={styles.text}>
                  {line}
                </Text>
              ),
            )}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  status: {
    alignSelf: 'flex-start',
    backgroundColor: colors.goldTint,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  heading: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory, marginTop: spacing.sm },
  text: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.text },
  bullet: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.sm },
  dot: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
});
