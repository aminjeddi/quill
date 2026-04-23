import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_KEY = 'quill_reminder_time';
const NOTIFICATION_ID_KEY = 'quill_notification_id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export interface ReminderTime {
  hour: number;
  minute: number;
}

export const requestPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const getSavedReminder = async (): Promise<ReminderTime | null> => {
  const raw = await AsyncStorage.getItem(REMINDER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const scheduleReminder = async (hour: number, minute: number): Promise<void> => {
  const existing = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to write ✦',
      body: 'Your daily prompt is waiting.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify({ hour, minute }));
  await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id);
};

export const cancelReminder = async (): Promise<void> => {
  const id = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  await AsyncStorage.removeItem(REMINDER_KEY);
  await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
};

export const formatTime = (hour: number, minute: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
};
