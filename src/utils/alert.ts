import { Alert, AlertButton, Platform } from 'react-native';

/**
 * Alert.alert is a no-op on react-native-web, so dialogs (win message,
 * generation errors) never showed up in the web build. On web this falls
 * back to the browser's alert/confirm: OK runs the first action, Cancel
 * the second one (if any).
 */
export const showAlert = (title: string, message: string, buttons?: AlertButton[]) => {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const actions = (buttons ?? []).filter(b => b.onPress);
  const text = `${title}\n\n${message}`;
  if (actions.length === 0) {
    globalThis.alert?.(text);
    return;
  }

  const labels = `OK: ${actions[0].text}${actions[1] ? `\nCancel: ${actions[1].text}` : ''}`;
  if (globalThis.confirm?.(`${text}\n\n${labels}`)) actions[0].onPress?.();
  else actions[1]?.onPress?.();
};
