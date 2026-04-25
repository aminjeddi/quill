import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScalePressable from './ScalePressable';
import { Entry } from '../db/database';

const THEME_KEY = 'quill_share_theme';
const nativeDriver = Platform.OS !== 'web';

export const CARD_THEMES = [
  { bg: '#1a1a1a', text: '#f0f0ee', sub: '#777',    divider: '#2e2e2e', swatch: '#1a1a1a' },
  { bg: '#FAF6EF', text: '#2a2218', sub: '#a09070',  divider: '#ede6d8', swatch: '#e8dcc8' },
  { bg: '#1C2B3A', text: '#ddeaf5', sub: '#6a88a0',  divider: '#243345', swatch: '#1C2B3A' },
  { bg: '#1E3A2A', text: '#d8f0e6', sub: '#5a9070',  divider: '#264832', swatch: '#1E3A2A' },
  { bg: '#32203E', text: '#f0e0f8', sub: '#9070a8',  divider: '#3e2a4e', swatch: '#32203E' },
];

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
};

const MAX_BODY = 280;

interface Props {
  visible: boolean;
  entry: Entry | null;
  onClose: () => void;
}

const ShareSheet = ({ visible, entry, onClose }: Props) => {
  const slideY = useRef(new Animated.Value(600)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const viewShotRef = useRef<ViewShot>(null);
  const [themeIndex, setThemeIndex] = useState(0);
  const swatchScales = useRef(CARD_THEMES.map((_, i) => new Animated.Value(i === 0 ? 1.25 : 1))).current;

  // Load saved theme preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val !== null) {
        const idx = parseInt(val, 10);
        setThemeIndex(idx);
        swatchScales.forEach((s, i) => s.setValue(i === idx ? 1.25 : 1));
      }
    });
  }, []);

  useEffect(() => {
    if (visible) {
      slideY.setValue(600);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, speed: 16, bounciness: 6, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: nativeDriver }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 600, speed: 28, bounciness: 0, useNativeDriver: nativeDriver }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 160, useNativeDriver: nativeDriver }),
      ]).start();
    }
  }, [visible]);

  const selectTheme = (idx: number) => {
    Haptics.selectionAsync();
    setThemeIndex(idx);
    AsyncStorage.setItem(THEME_KEY, String(idx));
    swatchScales.forEach((s, i) => {
      Animated.spring(s, {
        toValue: i === idx ? 1.25 : 1,
        speed: 24,
        bounciness: 5,
        useNativeDriver: nativeDriver,
      }).start();
    });
  };

  const handleShare = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const uri = await (viewShotRef.current as any).capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Saved', 'Image saved to your photo library.');
        }
      }
    } catch {
      Alert.alert('Could not share', 'Something went wrong. Try again.');
    }
  };

  if (!entry) return null;

  const theme = CARD_THEMES[themeIndex];
  const truncated = entry.body.length > MAX_BODY
    ? entry.body.slice(0, MAX_BODY).trimEnd() + '…'
    : entry.body;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Dim overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>

        {/* Drag handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Card preview */}
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={[styles.card, { backgroundColor: theme.bg }]}>
          <Text style={[styles.cardPrompt, { color: theme.sub }]}>
            {entry.prompt || 'Free write'}
          </Text>
          <View style={[styles.cardDivider, { backgroundColor: theme.divider }]} />
          <Text style={[styles.cardBody, { color: theme.text }]}>{truncated}</Text>
          <View style={styles.cardFooter}>
            <Text style={[styles.cardDate, { color: theme.sub }]}>{formatDate(entry.date)}</Text>
            <Text style={[styles.cardBrand, { color: theme.sub }]}>Quill ✦</Text>
          </View>
        </ViewShot>

        {/* Colour picker */}
        <View style={[styles.swatchRow, { justifyContent: 'center' }]}>
          {CARD_THEMES.map((t, i) => (
            <ScalePressable key={i} scaleTo={0.88} onPress={() => selectTheme(i)}>
              <Animated.View
                style={[
                  styles.swatch,
                  { backgroundColor: t.swatch, transform: [{ scale: swatchScales[i] }] },
                  themeIndex === i && styles.swatchActive,
                ]}
              />
            </ScalePressable>
          ))}
        </View>

        {/* Share button */}
        <ScalePressable style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share this entry</Text>
        </ScalePressable>

      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  cardPrompt: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardDivider: { height: 1, marginBottom: 14 },
  cardBody: { fontSize: 15, lineHeight: 24, marginBottom: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDate: { fontSize: 11 },
  cardBrand: { fontSize: 12, fontWeight: '600' },
  swatchRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
    alignItems: 'center',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  swatchActive: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  shareBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default ShareSheet;
