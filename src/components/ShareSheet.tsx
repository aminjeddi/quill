import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  Dimensions,
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
const SHEET_PADDING = 24;
const CANVAS_SIZE = Dimensions.get('window').width - SHEET_PADDING * 2;

export const CARD_THEMES = [
  // Dark
  { canvas: '#111111', card: '#1e1e1e', text: '#f0f0ee', sub: '#666',    divider: '#2a2a2a', swatch: '#111111' },
  // Yellow
  { canvas: '#F7C948', card: '#111111', text: '#f5f0d8', sub: '#8a7010', divider: '#2e2600', swatch: '#F7C948' },
  // Red
  { canvas: '#E8354A', card: '#ffffff', text: '#1a0408', sub: '#a0202e', divider: '#f0c0c4', swatch: '#E8354A' },
  // Blue
  { canvas: '#0057FF', card: '#e8f0ff', text: '#001240', sub: '#4060c0', divider: '#b0c8f8', swatch: '#0057FF' },
  // Green
  { canvas: '#1B5E3B', card: '#d8f3dc', text: '#0a1e12', sub: '#4a9060', divider: '#a0d8b0', swatch: '#1B5E3B' },
  // Orange
  { canvas: '#FF6030', card: '#fff5f0', text: '#2a0a00', sub: '#cc4820', divider: '#ffd0c0', swatch: '#FF6030' },
  // Purple
  { canvas: '#6B35B0', card: '#f5f0ff', text: '#1a0830', sub: '#8050c0', divider: '#d8c8f8', swatch: '#6B35B0' },
  // Cream
  { canvas: '#EDE0C8', card: '#faf6ef', text: '#2a2218', sub: '#a09070', divider: '#ddd0b8', swatch: '#EDE0C8' },
];

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
};

const MAX_BODY = 260;

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

        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Square canvas — what gets captured and shared */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
        >
          <View style={[styles.canvas, { backgroundColor: theme.canvas }]}>
            {/* Inner card */}
            <View style={[styles.innerCard, { backgroundColor: theme.card }]}>
              {entry.prompt ? (
                <Text style={[styles.cardPrompt, { color: theme.sub }]}>
                  {entry.prompt}
                </Text>
              ) : null}
              <View style={[styles.cardDivider, { backgroundColor: theme.divider }]} />
              <Text style={[styles.cardBody, { color: theme.text }]}>{truncated}</Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.cardDate, { color: theme.sub }]}>{formatDate(entry.date)}</Text>
                <Text style={[styles.cardBrand, { color: theme.sub }]}>Quill ✦</Text>
              </View>
            </View>
          </View>
        </ViewShot>

        {/* Colour swatches */}
        <View style={styles.swatchRow}>
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
    padding: SHEET_PADDING,
    paddingBottom: 48,
  },
  handleWrap: { alignItems: 'center', marginBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd' },

  // Square canvas (what gets shared)
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 12,
    padding: 24,
    justifyContent: 'center',
    marginBottom: 20,
  },
  innerCard: {
    borderRadius: 14,
    padding: 22,
  },
  cardPrompt: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
    marginBottom: 12,
  },
  cardDivider: { height: 1, marginBottom: 12 },
  cardBody: { fontSize: 15, lineHeight: 24, marginBottom: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDate: { fontSize: 11 },
  cardBrand: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  // Swatches
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  swatchActive: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
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
