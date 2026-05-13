import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ScalePressable from '../components/ScalePressable';

const useNativeDriver = Platform.OS !== 'web';
const SCREEN_WIDTH = Dimensions.get('window').width;
const DESIGN_WIDTH = 402; // Figma canvas width
const scale = SCREEN_WIDTH / DESIGN_WIDTH;

// Scale a Figma px value to the device screen
const s = (px: number) => px * scale;

// Local assets (downloaded from Figma)
const IMG_NOTEPAD = require('../../assets/onboarding/img_notepad.png');
const IMG_QUILL   = require('../../assets/onboarding/img_quill.png');
const IMG_PENCIL  = require('../../assets/onboarding/img_pencil.png');
const IMG_NOTES   = require('../../assets/onboarding/img_notes.png');

interface Props {
  onGetStarted: () => void;
}

// Each image's config straight from the Figma
// left/top are the container's position in the 402×874 Figma frame
// size is the image size (not container)
// baseRotation is the initial tilt in degrees
// swing is how many extra degrees to rock each way
// duration is the full period in ms — staggered so they don't sync
const IMAGES = [
  { src: IMG_NOTEPAD, left: 46,  top: 267, size: 100,    baseRotation: -9.15,  swing: 5, duration: 3200, phase: 0    },
  { src: IMG_QUILL,   left: 150, top: 236, size: 200.73, baseRotation:  7.13,  swing: 4, duration: 2800, phase: 800  },
  { src: IMG_PENCIL,  left: 27,  top: 434, size: 141,    baseRotation: -100, swing: 4, duration: 3600, phase: 400  },
  { src: IMG_NOTES,   left: 197, top: 468, size: 144.67, baseRotation:  11.21, swing: 5, duration: 3000, phase: 1200 },
] as const;

// Image tops are relative to the Figma 874-tall frame.
// Our illustration zone sits between the header (~220px) and the button area (~120px).
// We offset the tops so they sit naturally in that band.
const ILLUST_TOP_OFFSET = 220; // px in Figma coords

const PRIVACY_URL = 'https://aminjeddi.github.io/quill/privacy-policy.html';

const openPrivacy = () => Linking.openURL(PRIVACY_URL);

const OnboardingWelcomeScreen = ({ onGetStarted }: Props) => {
  const { colors } = useTheme();

  // Entrance: everything fades/slides in together
  const entranceAnim = useRef(new Animated.Value(0)).current;

  // One linear phase value per image: loops 0 → 1 → 0 → 1 ...
  // Using linear easing + sine interpolation means sin(0) = sin(2π),
  // so position AND velocity are identical at the loop boundary — no seam.
  const phaseAnims = useRef(IMAGES.map(() => new Animated.Value(0))).current;

  // Pre-compute 20-point sine-wave interpolations (stable references)
  const rotations = useRef(
    phaseAnims.map((phase, i) => {
      const img = IMAGES[i];
      const N = 20;
      const inputRange  = Array.from({ length: N + 1 }, (_, k) => k / N);
      const outputRange = inputRange.map(
        t => `${(img.baseRotation + img.swing * Math.sin(2 * Math.PI * t)).toFixed(3)}deg`
      );
      return phase.interpolate({ inputRange, outputRange });
    })
  ).current;

  useEffect(() => {
    // Entrance fade-in
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start();

    // Start each image's oscillation immediately (staggered by phase delay)
    // so they're already gently rocking during the entrance fade-in
    IMAGES.forEach((img, i) => {
      setTimeout(() => {
        Animated.loop(
          Animated.timing(phaseAnims[i], {
            toValue: 1,
            duration: img.duration,
            easing: Easing.linear,
            useNativeDriver,
          })
        ).start();
      }, img.phase);
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#ffffff' }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.header, {
        opacity: entranceAnim,
        transform: [{ translateY: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }]}>
        <Text style={styles.title}>Your Daily Writing Companion</Text>
        <Text style={styles.subtitle}>
          A fresh writing prompt every morning to help you reflect, create, and find your voice.
        </Text>
      </Animated.View>

      {/* ── Illustrations ──────────────────────────────────────────────── */}
      <View style={styles.illustContainer}>
        {IMAGES.map((img, i) => (
          <Animated.View
            key={i}
            style={[styles.imageWrap, {
              left:   s(img.left),
              top:    s(img.top - ILLUST_TOP_OFFSET),
              width:  s(img.size),
              height: s(img.size),
              opacity: entranceAnim,
              transform: [
                { rotate: rotations[i] },
                { scale: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            }]}
          >
            <Image
              source={img.src}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </Animated.View>
        ))}
      </View>

      {/* ── Bottom ─────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.bottom, {
        opacity: entranceAnim,
        transform: [{ translateY: entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }]}>
        <ScalePressable
          scaleTo={0.97}
          style={styles.button}
          onPress={onGetStarted}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </ScalePressable>
        <Text style={styles.legal}>
          {'Continue to accept our '}
          <Text style={styles.legalLink} onPress={openPrivacy}>Privacy Policy</Text>
        </Text>
      </Animated.View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 48,
  },

  // Header — matches Figma: top ~120, centered, SF Pro Medium
  header: {
    paddingTop: s(120),
    paddingHorizontal: s(28),
    alignItems: 'center',
    gap: s(15),
  },
  title: {
    fontSize: s(24),
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: s(16),
    color: '#6b6159',
    textAlign: 'center',
    lineHeight: s(22),
  },

  // Illustration zone — fills the middle space
  illustContainer: {
    flex: 1,
    position: 'relative',
    marginTop: s(10),
  },
  imageWrap: {
    position: 'absolute',
  },

  // Bottom — matches Figma: button top ~751, legal top ~823
  bottom: {
    paddingHorizontal: s(24),
    gap: s(16),
  },
  button: {
    backgroundColor: '#181518',
    borderRadius: 88,
    paddingVertical: s(20),
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: s(18),
    fontWeight: '500',
    letterSpacing: -0.54,
  },
  legal: {
    textAlign: 'center',
    fontSize: s(14),
    color: '#6b6159',
  },
  legalLink: {
    color: '#000000',
    fontWeight: '500',
  },
});

export default OnboardingWelcomeScreen;
