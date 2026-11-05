import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '@/theme';

import { GoldButton, Heading } from './ui';

export interface Option<T extends string> {
  value: T;
  label: string;
}

/**
 * Bottom sheet listing options. Single-select closes on tap; multi-select
 * shows checkmarks and a Done button.
 */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  multiple = false,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option<T>[];
  selected: T[];
  multiple?: boolean;
  onSelect: (values: T[]) => void;
  onClose: () => void;
}) {
  const toggle = (value: T) => {
    if (!multiple) {
      onSelect([value]);
      onClose();
      return;
    }
    onSelect(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Heading size={22}>{title}</Heading>
          {multiple && selected.length > 0 ? (
            <Pressable onPress={() => onSelect([])} hitSlop={8}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <FlatList
          data={options}
          keyExtractor={(o) => o.value}
          style={{ maxHeight: 420 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.value);
            return (
              <Pressable
                accessibilityRole={multiple ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggle(item.value)}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.goldTint }]}>
                <Text style={[styles.optionText, isSelected && { color: colors.gold }]}>{item.label}</Text>
                {isSelected ? <MaterialCommunityIcons name="check" size={20} color={colors.gold} /> : null}
              </Pressable>
            );
          }}
        />
        {multiple ? <GoldButton title="Done" onPress={onClose} style={{ marginTop: spacing.md }} /> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.hairline,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clear: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 14 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  optionText: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
});
