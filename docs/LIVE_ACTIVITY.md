# Lock-screen order status (Live Activity)

While an order is in progress, iPhone customers see it on the lock screen and in the Dynamic Island: the kitchen, where the order is ("Being prepared"), a progress bar, the next step ("Ready about 3:15 PM", "Pick up by 6:00 PM") and, once the kitchen accepts, the pickup address.

## What's built

- **What it shows and when:** `src/lib/live-activity.ts`, with tests in `src/__tests__/immersive.test.ts`.
  - `liveActivityContent(order)` gives the words, progress and address. The address stays empty until the kitchen accepts, like everywhere else.
  - `liveActivityAction(previous, next)` says whether to start, update or end the activity when an order's status changes.

## What's left, and why it isn't switched on yet

Live Activities need a separate iPhone extension, which Expo builds with `expo-widgets` (part of SDK 58) through an extra Xcode build step. It can only be built and tested in a real iPhone build, on a Mac or with EAS. A misconfigured extension stops the whole iOS build, so it should go in on its own, in a development build, and be checked on a phone before it ships.

## Steps for the first iPhone development build

1. Install with the SDK-matched version: `npx expo install expo-widgets`. This also brings in `@expo/ui`.
2. Add the plugin to `app.json`:
   ```json
   ["expo-widgets", { "groupIdentifier": "group.com.mannaapp.manna" }]
   ```
   The App Group must exist on the Apple Developer account. EAS can register it when it syncs capabilities.
3. Create `src/widgets/order-activity.tsx`:
   - Call `createLiveActivity('OrderStatus', layout)`.
   - The layout function starts with the `'widget'` directive.
   - It returns `{ banner, compactLeading, compactTrailing, minimal, expandedCenter… }` built from `@expo/ui/swift-ui` components, filled from `liveActivityContent`.
4. In the customer app, start, update or end the activity whenever an order's status changes, using `liveActivityAction`. On the iPhone only: guard with `Platform.OS === 'ios'`.
5. Once Supabase is live, keep the activity current while the app is closed. Send the activity's push token (`getPushToken()`) to the server, and have the server push an update when `set_order_status()` runs.
6. Build with `eas build --profile development --platform ios`. Place an order and check the lock screen and Dynamic Island at every step, including decline and cancel.

Read the installed package's types (`node_modules/expo-widgets/build/Widgets.d.ts`) or the SDK 58 docs before writing the layout. The API is new and has changed between SDK releases.
