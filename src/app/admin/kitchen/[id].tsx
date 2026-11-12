import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AdminCard, AdminState, adminStyles } from '@/components/admin-ui';
import { FormScreen } from '@/components/form-screen';
import { Icon } from '@/components/icon';
import { Chip, GoldButton, SectionTitle, TextField } from '@/components/ui';
import { confirmAction, notify } from '@/lib/alert';
import { canApprove, licensedNote, reviewChecklist, sendBackSuggestions } from '@/lib/admin';
import { approveKitchen, loadKitchenToReview, reviewDocument, sendBackKitchen } from '@/lib/remote/admin';
import { DOCUMENT_TYPES } from '@/lib/setup';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';
import { colors, spacing } from '@/theme';

const STATUS_LABEL = { pending: 'Not checked yet', approved: 'Approved', rejected: 'Rejected' } as const;

/** One kitchen waiting to open: check its documents, then approve it or send it back with a note. */
export default function ReviewKitchen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = supabase;
  const { data: kitchen, error, loading, reload } = useLoad(db ? () => loadKitchenToReview(db, id) : null, id);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    try {
      await work();
      await reload();
      after?.();
    } catch (e) {
      notify('That didn’t go through', e instanceof Error ? e.message : 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!db || !kitchen) {
    return (
      <FormScreen title="Review kitchen">
        <AdminState loading={loading} error={error} empty={!loading && !error} emptyText="This kitchen isn’t waiting for review." />
      </FormScreen>
    );
  }

  const checks = reviewChecklist(kitchen);
  const ready = canApprove(kitchen);
  const approve = () =>
    confirmAction(
      `Open ${kitchen.name}?`,
      'It goes live for customers nearby, and the cook gets a notification.',
      'Open the kitchen',
      () => void run(() => approveKitchen(db, kitchen.id), () => router.back()),
      'Not yet',
    );
  const sendBack = () =>
    void run(() => sendBackKitchen(db, kitchen.id, note), () => {
      notify('Sent back', 'The cook sees your note and can send the kitchen again.');
      router.back();
    });

  return (
    <FormScreen title="Review kitchen">
      <View style={{ gap: 4 }}>
        <Text style={[adminStyles.title, { fontSize: 24 }]}>{kitchen.name || 'Unnamed kitchen'}</Text>
        <Text style={adminStyles.meta}>
          {kitchen.chefName} · {kitchen.cuisine} · {kitchen.city}, {kitchen.state} {kitchen.zip}
        </Text>
        {kitchen.referredBy ? <Text style={adminStyles.meta}>Invited with code {kitchen.referredBy}</Text> : null}
      </View>

      <AdminCard>
        {checks.map((c) => (
          <View key={c.label} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Icon name={c.ok ? 'check-circle' : 'close-circle-outline'} size={18} color={c.ok ? colors.success : colors.danger} />
            <Text style={[adminStyles.meta, { color: colors.text, flex: 1 }]}>{c.label}</Text>
          </View>
        ))}
        <Text style={adminStyles.meta}>{licensedNote(kitchen)}</Text>
      </AdminCard>

      <SectionTitle>Documents</SectionTitle>
      {kitchen.documents.length === 0 ? <Text style={adminStyles.meta}>No documents uploaded.</Text> : null}
      {kitchen.documents.map((d) => (
        <AdminCard key={d.id} urgent={d.status === 'rejected'}>
          <Text style={adminStyles.label}>{STATUS_LABEL[d.status]}</Text>
          <Text style={adminStyles.title}>{DOCUMENT_TYPES.find((t) => t.kind === d.kind)?.title ?? d.kind}</Text>
          <Text style={adminStyles.meta}>
            {d.fileName}. Check the name matches {kitchen.chefName}, it isn’t expired, and it’s readable.
          </Text>
          <View style={adminStyles.actions}>
            {d.url ? (
              <GoldButton title="Open" variant="outline" onPress={() => void WebBrowser.openBrowserAsync(d.url!)} />
            ) : null}
            {d.status !== 'approved' ? (
              <GoldButton title="Approve" disabled={busy} onPress={() => void run(() => reviewDocument(db, d.id, true))} />
            ) : null}
            {d.status !== 'rejected' ? (
              <GoldButton title="Reject" variant="ghost" disabled={busy} onPress={() => void run(() => reviewDocument(db, d.id, false))} />
            ) : null}
          </View>
        </AdminCard>
      ))}

      <SectionTitle>Decide</SectionTitle>
      <GoldButton title="Open this kitchen" disabled={!ready || busy} loading={busy} onPress={approve} />
      {!ready ? <Text style={adminStyles.meta}>Everything above needs a check before the kitchen can open.</Text> : null}

      <View style={{ gap: spacing.sm }}>
        <TextField
          label="Or send it back with a note"
          placeholder="What should the cook fix?"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
        />
        <View style={adminStyles.actions}>
          {sendBackSuggestions(kitchen).map((s) => (
            <Chip key={s} label={s.length > 40 ? `${s.slice(0, 38)}…` : s} onPress={() => setNote(s)} />
          ))}
        </View>
        <GoldButton title="Send back to the cook" variant="outline" disabled={note.trim().length < 5 || busy} onPress={sendBack} />
      </View>
    </FormScreen>
  );
}
