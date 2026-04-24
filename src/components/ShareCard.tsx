import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import ScalePressable from './ScalePressable';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Entry } from '../db/database';

interface Props {
  entry: Entry;
}

const MAX_BODY_LENGTH = 280;

const ShareCard = ({ entry }: Props) => {
  const viewShotRef = useRef<ViewShot>(null);

  const truncated =
    entry.body.length > MAX_BODY_LENGTH
      ? entry.body.slice(0, MAX_BODY_LENGTH).trimEnd() + '…'
      : entry.body;

  const formattedDate = (() => {
    const [year, month, day] = entry.date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  })();

  const handleShare = async () => {
    try {
      const uri = await (viewShotRef.current as any).capture();

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      } else {
        // Web fallback — save to media library
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Saved', 'Image saved to your photo library.');
        }
      }
    } catch (e) {
      Alert.alert('Could not share', 'Something went wrong. Try again.');
    }
  };

  return (
    <View>
      {/* The card that gets captured */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1 }}
        style={styles.card}
      >
        <View style={styles.cardInner}>
          <Text style={styles.cardPrompt}>{entry.prompt}</Text>
          <View style={styles.divider} />
          <Text style={styles.cardBody}>{truncated}</Text>
          <View style={styles.footer}>
            <Text style={styles.footerDate}>{formattedDate}</Text>
            <Text style={styles.footerBrand}>Quill ✦</Text>
          </View>
        </View>
      </ViewShot>

      {/* Share button below the card */}
      <ScalePressable style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>Share this entry</Text>
      </ScalePressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardInner: {
    backgroundColor: '#1a1a1a',
    padding: 28,
    borderRadius: 20,
  },
  cardPrompt: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 16,
  },
  cardBody: {
    fontSize: 16,
    color: '#f0f0ee',
    lineHeight: 26,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerDate: { fontSize: 12, color: '#555' },
  footerBrand: { fontSize: 13, color: '#555', fontWeight: '600' },
  shareButton: {
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default ShareCard;
