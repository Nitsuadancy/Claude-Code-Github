/**
 * "Add to calendar" for a pickup.
 *
 * On iPhone this opens the system New Event form, pre-filled, after asking
 * for write-only calendar access (Manna can add events but never read your
 * calendar). On Android and the web it opens Google Calendar's new-event page
 * instead, which needs no permission at all.
 */
import { getDefaultCalendarSync, requestCalendarPermissions } from 'expo-calendar';
import { Linking, Platform } from 'react-native';

import { notify } from './alert';
import { googleCalendarUrl, type PickupEvent } from './order-extras';

export async function addPickupToCalendar(event: PickupEvent): Promise<void> {
  if (Platform.OS !== 'ios') {
    await Linking.openURL(googleCalendarUrl(event));
    return;
  }
  try {
    const { granted } = await requestCalendarPermissions(true);
    if (!granted) {
      notify('Calendar access is off', 'To add pickups to your calendar, allow Manna in Settings > Privacy > Calendars.');
      return;
    }
    await getDefaultCalendarSync().addEventWithForm({
      title: event.title,
      startDate: event.start,
      endDate: event.end,
      location: event.location || undefined,
      notes: event.notes,
    });
  } catch {
    // No calendar module (Expo Go) or no default calendar: fall back to the link.
    await Linking.openURL(googleCalendarUrl(event));
  }
}
