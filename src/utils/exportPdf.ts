import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry } from '../db/database';

const DISPLAY_NAME_KEY = 'quill_display_name';

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDateLong = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
};

const buildHtml = (entry: Entry, title?: string, username?: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Helvetica, sans-serif;
      max-width: 640px;
      margin: 60px auto;
      padding: 0 48px;
      color: #1a1a1a;
    }
    .date {
      font-size: 11px;
      color: #999;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 32px;
    }
    .title {
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.5px;
      margin-bottom: 24px;
      line-height: 1.3;
    }
    .prompt {
      font-size: 14px;
      color: #666;
      font-style: italic;
      margin-bottom: 16px;
      line-height: 1.7;
    }
    hr {
      border: none;
      border-top: 1px solid #e5e5e5;
      margin-bottom: 24px;
    }
    .body {
      font-size: 16px;
      line-height: 1.9;
      color: #1a1a1a;
      white-space: pre-wrap;
    }
    .brand {
      margin-top: 64px;
      font-size: 11px;
      color: #ccc;
      letter-spacing: 0.3px;
    }
  </style>
</head>
<body>
  <div class="date">${escapeHtml(formatDateLong(entry.date))}</div>
  ${title ? `<div class="title">${escapeHtml(title)}</div>` : ''}
  ${entry.prompt ? `<div class="prompt">${escapeHtml(entry.prompt)}</div><hr>` : ''}
  <div class="body">${escapeHtml(entry.body)}</div>
  ${username ? `<div class="brand">${escapeHtml(username)}</div>` : ''}
</body>
</html>
`;

export const exportEntryAsPdf = async (entry: Entry, title?: string): Promise<void> => {
  try {
    const username = (await AsyncStorage.getItem(DISPLAY_NAME_KEY)) ?? undefined;
    const html = buildHtml(entry, title, username);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export entry as PDF',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Sharing not available', 'PDF export is not supported on this device.');
    }
  } catch {
    Alert.alert('Export failed', 'Could not generate the PDF. Please try again.');
  }
};
