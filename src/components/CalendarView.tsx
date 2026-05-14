import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { SwipePagesContext } from '../navigation/SwipePages';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ScrollView,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Entry, getTodayDateString } from '../db/database';
import { Colors } from '../context/ThemeContext';
import ScalePressable from './ScalePressable';

const useNativeDriver = Platform.OS !== 'web';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ACCENT = '#A2D2FF';

const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

const parseDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d, date: new Date(y, m - 1, d) };
};

interface Props {
  entries: Entry[];
  entryNames: Record<string, string>;
  colors: Colors;
  onSelectEntry: (entry: Entry) => void;
  active?: boolean;
}

const CalendarView = ({ entries, entryNames, colors, onSelectEntry, active = true }: Props) => {
  const { setPagingEnabled } = useContext(SwipePagesContext);
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // The month currently displayed in the grid (independent of selected date)
  const initial = parseDate(today);
  const [viewYear,  setViewYear]  = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);

  // Fast lookup: which dates have entries
  const datesWithEntries = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => set.add(e.date));
    return set;
  }, [entries]);

  // Build the grid cells for the displayed month
  const grid = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth - 1, 1);
    const lastOfMonth  = new Date(viewYear, viewMonth, 0);
    const daysInMonth  = lastOfMonth.getDate();
    // Make Monday = 0
    const leadEmpty = (firstOfMonth.getDay() + 6) % 7;

    const cells: ({ day: number; dateStr: string } | null)[] = [];
    for (let i = 0; i < leadEmpty; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d) });
    }
    // Pad to full weeks
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  // Big header info from selectedDate
  const selectedInfo = useMemo(() => {
    const { y, m, d, date } = parseDate(selectedDate);
    return {
      day: d,
      monthName: date.toLocaleDateString('en-US', { month: 'long' }).toUpperCase(),
      year: y,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  }, [selectedDate]);

  const monthLabel = useMemo(() => {
    const date = new Date(viewYear, viewMonth - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  }, [viewYear, viewMonth]);

  // Big number transition — animate when selectedDate changes
  const numberAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    numberAnim.setValue(0.6);
    Animated.spring(numberAnim, {
      toValue: 1, speed: 18, bounciness: 10, useNativeDriver,
    }).start();
  }, [selectedDate]);

  const onTapDay = (dateStr: string) => {
    if (dateStr === selectedDate) return;
    Haptics.selectionAsync();
    setSelectedDate(dateStr);
  };

  // Animated grid transition (Emil Kowalski style: fast exit, springy entry)
  const gridOpacity    = useRef(new Animated.Value(1)).current;
  const gridTranslateX = useRef(new Animated.Value(0)).current;
  const animatingRef   = useRef(false);

  const viewMonthRef = useRef({ y: viewYear, m: viewMonth });
  useEffect(() => { viewMonthRef.current = { y: viewYear, m: viewMonth }; }, [viewYear, viewMonth]);

  const animateMonthChange = (direction: 1 | -1) => {
    Haptics.selectionAsync();

    // Cancel any in-flight animation so rapid taps don't queue up
    gridOpacity.stopAnimation();
    gridTranslateX.stopAnimation();

    // Update month immediately — no waiting for exit to finish
    const { y, m } = viewMonthRef.current;
    if (direction === 1) {
      if (m === 12) { setViewYear(y + 1); setViewMonth(1); }
      else { setViewMonth(m + 1); }
    } else {
      if (m === 1) { setViewYear(y - 1); setViewMonth(12); }
      else { setViewMonth(m - 1); }
    }

    // Quick slide-in from the swipe direction, no exit phase
    gridOpacity.setValue(0.35);
    gridTranslateX.setValue(direction * 16);
    Animated.parallel([
      Animated.spring(gridOpacity,    { toValue: 1, speed: 36, bounciness: 2, useNativeDriver }),
      Animated.spring(gridTranslateX, { toValue: 0, speed: 32, bounciness: 4, useNativeDriver }),
    ]).start();
  };

  const goPrevMonth = () => animateMonthChange(-1);
  const goNextMonth = () => animateMonthChange(1);

  // PanResponder: only claim horizontal swipes that start on the calendar grid.
  // While the touch is alive on the grid, parent paging is disabled so swipes
  // in either direction reach us cleanly. On release, paging is restored so
  // the user can still swipe between Profile / Today / Archive elsewhere.
  const SWIPE_THRESHOLD = 30;
  const firedRef = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderGrant: () => { firedRef.current = false; },
      onPanResponderMove: (_, g) => {
        if (firedRef.current) return;
        if (g.dx <= -SWIPE_THRESHOLD)      { firedRef.current = true; animateMonthChange(1); }
        else if (g.dx >= SWIPE_THRESHOLD)  { firedRef.current = true; animateMonthChange(-1); }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const onGridTouchStart = () => setPagingEnabled(false);
  const onGridTouchEnd   = () => setPagingEnabled(true);

  const selectedDayEntries = useMemo(
    () => entries.filter(e => e.date === selectedDate),
    [entries, selectedDate]
  );

  return (
    <ScrollView
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Big date display */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Animated.Text
            style={[
              s.bigDay,
              { color: colors.primary, transform: [{ scale: numberAnim }] },
            ]}
          >
            {selectedInfo.day}
          </Animated.Text>
          <Text style={[s.monthName, { color: colors.primary }]}>{selectedInfo.monthName}</Text>
          <Text style={[s.year, { color: colors.primary }]}>{selectedInfo.year}</Text>
        </View>
        <Text style={[s.weekday, { color: colors.primary }]}>{selectedInfo.weekday}</Text>
      </View>

      {/* Month navigator */}
      <View style={s.monthNav}>
        <ScalePressable scaleTo={0.85} onPress={goPrevMonth} style={s.navBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.secondaryText} />
        </ScalePressable>
        <Animated.Text
          style={[
            s.monthLabel,
            { color: colors.secondaryText, opacity: gridOpacity, transform: [{ translateX: gridTranslateX }] },
          ]}
        >
          {monthLabel}
        </Animated.Text>
        <ScalePressable scaleTo={0.85} onPress={goNextMonth} style={s.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
        </ScalePressable>
      </View>

      {/* Weekday header */}
      <View style={s.weekdayRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={[s.weekdayLabel, { color: colors.tertiaryText }]}>{d}</Text>
        ))}
      </View>

      {/* Grid of day circles (swipe horizontally to change month) */}
      <Animated.View
        {...panResponder.panHandlers}
        onTouchStart={onGridTouchStart}
        onTouchEnd={onGridTouchEnd}
        onTouchCancel={onGridTouchEnd}
        style={[s.grid, { opacity: gridOpacity, transform: [{ translateX: gridTranslateX }] }]}
      >
        {grid.map((cell, i) => {
          if (!cell) return <View key={i} style={s.cell} />;
          const hasEntry = datesWithEntries.has(cell.dateStr);
          const isSelected = cell.dateStr === selectedDate;
          const isToday    = cell.dateStr === today;
          return (
            <Pressable
              key={i}
              style={s.cell}
              onPress={() => onTapDay(cell.dateStr)}
              hitSlop={4}
            >
              <View
                style={[
                  s.dot,
                  hasEntry  && { backgroundColor: colors.primary, borderColor: colors.primary },
                  isToday   && !isSelected && { borderColor: colors.primary, borderWidth: 2 },
                  isSelected && { backgroundColor: ACCENT, borderColor: ACCENT },
                  !hasEntry && !isSelected && !isToday && { borderColor: colors.border },
                ]}
              />
            </Pressable>
          );
        })}
      </Animated.View>

      {/* Entries for selected day */}
      <View style={s.entriesSection}>
        {selectedDayEntries.length === 0 ? (
          <Text style={[s.emptyText, { color: colors.secondaryText }]}>
            {selectedDate === today ? "Nothing written today — yet." : 'No entries on this day.'}
          </Text>
        ) : (
          selectedDayEntries.map((e) => {
            const label = e.prompt || entryNames[e.id] || 'Untitled';
            return (
              <ScalePressable
                key={e.id}
                scaleTo={0.98}
                onPress={() => onSelectEntry(e)}
                style={[s.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[s.entryLabel, { color: colors.primary }]} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={[s.entryPreview, { color: colors.bodyText }]} numberOfLines={2}>
                  {e.body}
                </Text>
              </ScalePressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const CELL_GAP = 8;

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 80 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 20,
  },
  bigDay:    { fontSize: 96, fontWeight: '700', letterSpacing: -4, lineHeight: 96, marginBottom: 4 },
  monthName: { fontSize: 24, fontWeight: '700', letterSpacing: 0.6, marginTop: 4 },
  year:      { fontSize: 24, fontWeight: '700', letterSpacing: 0.6 },
  weekday:   { fontSize: 22, fontWeight: '700', alignSelf: 'flex-end', marginBottom: 4 },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2 },

  weekdayRow: { flexDirection: 'row', marginBottom: 10 },
  weekdayLabel: {
    flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', letterSpacing: 0.4,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: CELL_GAP,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },

  entriesSection: { marginTop: 28 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  entryCard: {
    borderRadius: 14, borderWidth: 1,
    padding: 16, marginBottom: 10,
  },
  entryLabel:   { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  entryPreview: { fontSize: 14, lineHeight: 20 },
});

export default CalendarView;
