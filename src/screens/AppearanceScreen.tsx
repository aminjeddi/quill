import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import ScalePressable from '../components/ScalePressable';

const OPTIONS: { key: ThemeMode; label: string; desc: string }[] = [
  { key: 'light', label: 'Light', desc: 'Always light mode' },
  { key: 'dark', label: 'Dark', desc: 'Always dark mode' },
  { key: 'system', label: 'System', desc: 'Follows your phone setting' },
];

const AppearanceScreen = () => {
  const navigation = useNavigation();
  const { mode, colors, setMode } = useTheme();

  const handleSelect = (key: ThemeMode) => {
    setMode(key);
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScalePressable scaleTo={0.85} style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={28} color={colors.primary} />
      </ScalePressable>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>Appearance</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Choose how Quill looks.
        </Text>

        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {OPTIONS.map((opt, i) => (
            <React.Fragment key={opt.key}>
              {i > 0 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
              <ScalePressable
                scaleTo={0.985}
                onPress={() => handleSelect(opt.key)}
                style={styles.row}
              >
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowLabel, { color: colors.primary }]}>{opt.label}</Text>
                  <Text style={[styles.rowDesc, { color: colors.secondaryText }]}>{opt.desc}</Text>
                </View>
                {mode === opt.key && (
                  <Text style={[styles.check, { color: colors.primary }]}>✓</Text>
                )}
              </ScalePressable>
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  back: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 4, alignSelf: 'flex-start' },
  content: { padding: 24, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 6, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 28 },
  group: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  separator: { height: 1, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  rowDesc: { fontSize: 12 },
  check: { fontSize: 18, fontWeight: '600' },
});

export default AppearanceScreen;
