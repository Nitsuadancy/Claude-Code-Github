import { Linking, Text, View } from 'react-native';

import { AdminCard, AdminState, adminStyles } from '@/components/admin-ui';
import { FormScreen } from '@/components/form-screen';
import { usePullToRefresh } from '@/components/pull-to-refresh';
import { Body, GoldButton } from '@/components/ui';
import { confirmAction, notify } from '@/lib/alert';
import { isOverdue, issueLabel, waitingFor } from '@/lib/admin';
import { formatCents } from '@/lib/money';
import { loadHelpRequests, resolveHelpRequest } from '@/lib/remote/admin';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';
import { colors } from '@/theme';

/** "Need help with this order?" requests, oldest first. Answer each within a day. */
export default function HelpRequests() {
  const db = supabase;
  const { data, error, loading, reload } = useLoad(db ? () => loadHelpRequests(db) : null);
  const refresh = usePullToRefresh(reload);
  const now = new Date();

  const resolve = (id: string) =>
    confirmAction('Mark as handled?', 'It leaves this list. The customer’s order isn’t changed.', 'Handled', () => {
      if (!db) return;
      resolveHelpRequest(db, id)
        .then(reload)
        .catch((e: unknown) => notify('That didn’t go through', e instanceof Error ? e.message : 'Try again.'));
    });

  return (
    <FormScreen title="Help requests" refreshControl={refresh}>
      <Body muted>
        Text or call the customer, sort it out with the kitchen if needed, and refund in Stripe when it’s Manna’s call.
        Then mark it handled.
      </Body>
      <AdminState loading={loading} error={error} empty={!!data && data.length === 0} emptyText="No one needs help right now." />
      {(data ?? []).map((h) => {
        const late = isOverdue(h.createdAt, now);
        return (
          <AdminCard key={h.id} urgent={late}>
            <Text style={[adminStyles.label, late && { color: colors.danger }]}>
              {late ? 'Waiting more than a day' : `Asked ${waitingFor(h.createdAt, now)}`}
            </Text>
            <Text style={adminStyles.title}>{issueLabel(h.kind)}</Text>
            {h.note ? <Text style={adminStyles.quote}>“{h.note}”</Text> : null}
            <Text style={adminStyles.meta}>
              {h.customerName} · {h.kitchenName} · {formatCents(h.totalCents)} · order {h.orderStatus.replace('_', ' ')}
            </Text>
            <View style={adminStyles.actions}>
              {h.customerPhone ? (
                <GoldButton
                  title="Text customer"
                  variant="outline"
                  onPress={() => void Linking.openURL(`sms:${h.customerPhone}`)}
                />
              ) : null}
              <GoldButton title="Mark handled" onPress={() => resolve(h.id)} />
            </View>
          </AdminCard>
        );
      })}
    </FormScreen>
  );
}
