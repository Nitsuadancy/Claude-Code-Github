import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  BackButton,
  Body,
  GoldButton,
  Heading,
  Screen,
  TextField,
} from "@/components/ui";
import { resetTo } from "@/lib/navigation";
import { digitsOnly, formatE164UsPhone, isValidEmail } from "@/lib/validation";
import { lookupZip, placeLabel } from "@/lib/zips";
import { useFieldErrors } from "@/lib/use-field-errors";
import { useStore } from "@/state/store";
import { spacing } from "@/theme";

export default function AboutYou() {
  const { state, dispatch } = useStore();
  const user = state.user;
  const cook = (user?.role ?? state.pendingRole) === "chef";
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [zip, setZip] = useState(user?.zip ?? "");
  const { errors, setErrors, clear } = useFieldErrors<
    "name" | "email" | "zip"
  >();
  const zipPlace = lookupZip(zip);

  const save = () => {
    const next: { name?: string; email?: string; zip?: string } = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!isValidEmail(email)) next.email = "Please enter a valid email.";
    // Customers give a ZIP so the home screen shows kitchens near them. Cooks set theirs with the kitchen.
    if (!cook && !zipPlace)
      next.zip =
        zip.length === 5
          ? "We couldn’t find that ZIP code."
          : "Enter your 5-digit ZIP code.";
    setErrors(next);
    if (Object.keys(next).length) return;
    dispatch({
      type: "updateProfile",
      changes: {
        name: name.trim(),
        email: email.trim(),
        ...(!cook && zipPlace && zipPlace.zip !== user?.zip
          ? { zip: zipPlace.zip, neighborhood: "" }
          : {}),
      },
    });
    resetTo("/");
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton
            onPress={() => {
              dispatch({ type: "signOut" });
              resetTo("/login");
            }}
          />
          <View style={styles.header}>
            <Heading>Please tell us{"\n"}about yourself</Heading>
            <Body muted>
              {cook
                ? "Customers see your first name on your kitchen. We use your email for payouts and account updates."
                : "Kitchens see your first name and last initial on your orders."}
            </Body>
          </View>
          <View style={{ gap: spacing.lg }}>
            <TextField
              label="Full name"
              placeholder="Your name"
              icon="account-outline"
              textContentType="name"
              autoComplete="name"
              autoCapitalize="words"
              returnKeyType="next"
              value={name}
              onChangeText={(t) => {
                setName(t);
                clear("name");
              }}
              error={errors.name}
            />
            <TextField
              label="Email"
              placeholder="you@example.com"
              icon="email-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType={cook ? "done" : "next"}
              onSubmitEditing={cook ? save : undefined}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clear("email");
              }}
              error={errors.email}
            />
            {cook ? null : (
              <TextField
                label="ZIP code"
                placeholder="32804"
                icon="map-marker-outline"
                keyboardType="number-pad"
                textContentType="postalCode"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                onChangeText={(t) => {
                  setZip(digitsOnly(t).slice(0, 5));
                  clear("zip");
                }}
                onSubmitEditing={save}
                error={errors.zip}
              />
            )}
            {!cook && zipPlace && !errors.zip ? (
              <Body muted style={{ fontSize: 13, marginTop: -spacing.sm }}>
                We’ll show home kitchens near {placeLabel(zipPlace)}.
              </Body>
            ) : null}
            <TextField
              label="Phone number"
              icon="lock-outline"
              value={formatE164UsPhone(user?.phone ?? "")}
              editable={false}
            />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <GoldButton title="Save & continue" chevron onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  header: { gap: spacing.sm, marginTop: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
});
