import React, { useRef, useEffect, useState, createContext } from 'react';
import {
  ScrollView,
  View,
  Animated,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Category } from '../data/categoryPrompts';
import ProfileScreen from '../screens/ProfileScreen';
import TodayScreen from '../screens/TodayScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import { useTheme } from '../context/ThemeContext';

const useNativeDriver = Platform.OS !== 'web';
const PAGE_COUNT = 3;
const DEFAULT_PAGE = 1; // Today

export const SwipePagesContext = createContext<{ setPagingEnabled: (enabled: boolean) => void }>({
  setPagingEnabled: () => {},
});

interface Props {
  categories: Category[];
}

const SwipePages = ({ categories }: Props) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);

  // Synchronous: directly mutate the native ScrollView so children can lock
  // paging the instant a touch lands, before any scroll has begun.
  const setPagingEnabled = (enabled: boolean) => {
    scrollRef.current?.setNativeProps({ scrollEnabled: enabled });
  };

  // One Animated.Value per dot for spring size transitions
  const dotSizes = useRef(
    Array.from({ length: PAGE_COUNT }, (_, i) =>
      new Animated.Value(i === DEFAULT_PAGE ? 10 : 6)
    )
  ).current;

  // Start on Today (page 1)
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: width * DEFAULT_PAGE, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [width]);

  // Animate dots whenever active page changes
  useEffect(() => {
    dotSizes.forEach((val, i) => {
      Animated.spring(val, {
        toValue: i === currentPage ? 10 : 6,
        speed: 28,
        bounciness: 5,
        useNativeDriver: false, // layout prop — must be false
      }).start();
    });
  }, [currentPage]);

  // Fire haptic + update dots as soon as scroll crosses the midpoint (not after snap)
  const lastHapticPage = useRef(DEFAULT_PAGE);
  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const page = Math.round(x / width);
    if (page !== lastHapticPage.current) {
      lastHapticPage.current = page;
      setCurrentPage(page);
      Haptics.selectionAsync();
    }
  };

  return (
    <SwipePagesContext.Provider value={{ setPagingEnabled }}>
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ height }}
      >
        <View style={{ width, height }}>
          <ProfileScreen />
        </View>
        <View style={{ width, height }}>
          <TodayScreen categories={categories} />
        </View>
        <View style={{ width, height }}>
          <ArchiveScreen />
        </View>
      </ScrollView>

      {/* Page indicator dots */}
      <View style={styles.dotsRow} pointerEvents="none">
        {dotSizes.map((size, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: Animated.divide(size, 2) as any,
                backgroundColor: colors.primary,
                opacity: i === currentPage ? 1 : 0.35,
              },
            ]}
          />
        ))}
      </View>
    </View>
    </SwipePagesContext.Provider>
  );
};

const styles = StyleSheet.create({
  dotsRow: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {},
});

export default SwipePages;
