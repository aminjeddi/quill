import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ScalePressable from '../components/ScalePressable';

const useNativeDriver = Platform.OS !== 'web';

interface Props {
  onGetStarted: () => void;
}

const OnboardingWelcomeScreen = ({ onGetStarted }: Props) => {
  const { colors } = useTheme();

  // ── Entrance animations ──────────────────────────────────────────────────
  const headerAnim      = useRef(new Animated.Value(0)).current;
  const illustAnim      = useRef(new Animated.Value(0)).current;
  const buttonAnim      = useRef(new Animated.Value(0)).current;

  // Line draw-in: width is NOT native-driver-safe
  const lineAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  // Float loop (native driver safe — translateY only)
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Ink-dot particles (3 dots that drift upward on a loop)
  const particles = useRef(
    [0, 1, 2].map(() => ({
      y:       new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // 1. Header slides up
    // 2. Journal scales in
    // 3. Lines draw in (staggered)
    // 4. Button rises
    // 5. Float + particles loop
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1, duration: 480,
        easing: Easing.out(Easing.cubic), useNativeDriver,
      }),
      Animated.spring(illustAnim, {
        toValue: 1, speed: 9, bounciness: 7, useNativeDriver,
      }),
      Animated.stagger(
        100,
        lineAnims.map(a =>
          Animated.timing(a, {
            toValue: 1, duration: 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false, // width animation
          })
        )
      ),
      Animated.timing(buttonAnim, {
        toValue: 1, duration: 400,
        easing: Easing.out(Easing.cubic), useNativeDriver,
      }),
    ]).start(() => {
      // Float loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10, duration: 2400,
            easing: Easing.inOut(Easing.sin), useNativeDriver,
          }),
          Animated.timing(floatAnim, {
            toValue: 0, duration: 2400,
            easing: Easing.inOut(Easing.sin), useNativeDriver,
          }),
        ])
      ).start();

      // Particle loops — each one starts offset so they don't clump
      particles.forEach((p, i) => {
        const loop = () => {
          p.opacity.setValue(0);
          p.y.setValue(0);
          Animated.sequence([
            Animated.delay(i * 700),
            Animated.parallel([
              Animated.timing(p.opacity, { toValue: 0.6, duration: 300, useNativeDriver }),
              Animated.timing(p.y, {
                toValue: -56, duration: 1600,
                easing: Easing.out(Easing.quad), useNativeDriver,
              }),
            ]),
            Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver }),
          ]).start(loop);
        };
        loop();
      });
    });
  }, []);

  // Line target widths (% of page area)
  const LINE_WIDTHS = ['88%', '72%', '92%', '60%'];

  // Particle horizontal positions relative to illustration container
  const PARTICLE_X = [28, 72, 116];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }]}>
        <Text style={[styles.title, { color: colors.primary }]}>
          Your Daily Writing{'\n'}Companion
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          A fresh prompt every morning to help you{'\n'}reflect, create, and find your voice.
        </Text>
      </Animated.View>

      {/* ── Illustration ──────────────────────────────────────────────────── */}
      <View style={styles.illustWrap}>
        <Animated.View style={{
          opacity: illustAnim,
          transform: [
            { scale: illustAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) },
            { translateY: floatAnim },
          ],
        }}>
          {/* Journal */}
          <View style={[styles.journal, { borderColor: colors.primary }]}>
            {/* Spine strip */}
            <View style={[styles.spine, { backgroundColor: colors.primary }]} />

            {/* Page */}
            <View style={styles.page}>
              {LINE_WIDTHS.map((w, i) => (
                <Animated.View
                  key={i}
                  style={[styles.line, {
                    backgroundColor: colors.primary,
                    opacity: i === 3 ? 0.45 : 0.85,
                    width: lineAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', w],
                    }),
                  }]}
                />
              ))}

              {/* Quill mark — bottom-right of page */}
              <Animated.Text
                style={[styles.quillMark, {
                  color: colors.primary,
                  opacity: lineAnims[3].interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
                }]}
              >
                ✦
              </Animated.Text>
            </View>
          </View>

          {/* Drifting ink dots */}
          {particles.map((p, i) => (
            <Animated.View
              key={i}
              style={[styles.particle, {
                backgroundColor: colors.primary,
                left: PARTICLE_X[i],
                opacity: p.opacity,
                transform: [{ translateY: p.y }],
              }]}
            />
          ))}
        </Animated.View>
      </View>

      {/* ── Bottom ────────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.bottom, {
        opacity: buttonAnim,
        transform: [{ translateY: buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }]}>
        <ScalePressable
          scaleTo={0.97}
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onGetStarted}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>Get Started</Text>
        </ScalePressable>
        <Text style={[styles.legal, { color: colors.tertiaryText }]}>
          Continue to accept{' '}
          <Text style={{ color: colors.secondaryText }}>Terms</Text>
          {' '}and{' '}
          <Text style={{ color: colors.secondaryText }}>Privacy</Text>
        </Text>
      </Animated.View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },

  // Header
  header:   { alignItems: 'center', gap: 14 },
  title:    { fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 34, letterSpacing: -0.4 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Illustration
  illustWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  journal: {
    width: 168,
    height: 210,
    borderRadius: 10,
    borderWidth: 2,
    flexDirection: 'row',
    overflow: 'hidden',
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  spine: {
    width: 18,
    height: '100%',
    opacity: 0.9,
  },
  page: {
    flex: 1,
    padding: 16,
    gap: 10,
    justifyContent: 'center',
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
  quillMark: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    fontSize: 14,
  },

  // Particles
  particle: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Bottom
  bottom:     { gap: 16 },
  button:     { borderRadius: 88, paddingVertical: 18, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  legal:      { textAlign: 'center', fontSize: 13, lineHeight: 18 },
});

export default OnboardingWelcomeScreen;
