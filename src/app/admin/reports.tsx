import { Text, View } from 'react-native';

import { AdminCard, AdminState, adminStyles } from '@/components/admin-ui';
import { FormScreen } from '@/components/form-screen';
import { usePullToRefresh } from '@/components/pull-to-refresh';
import { Body, GoldButton } from '@/components/ui';
import { confirmAction, notify } from '@/lib/alert';
import { isOverdue, waitingFor } from '@/lib/admin';
import { dismissReports, loadReports, removeReported, type ReportedItem } from '@/lib/remote/admin';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';
import { colors } from '@/theme';

/** Reported chat messages and reviews. Apple expects each to be looked at within a day (guideline 1.2). */
export default function Reports() {
  const db = supabase;
  const { data, error, loading, reload } = useLoad(db ? () => loadReports(db) : null);
  const refresh = usePullToRefresh(reload);
  const now = new Date();

  const act = (item: ReportedItem, remove: boolean) => {
    if (!db) return;
    const go = () =>
      (remove ? removeReported(db, item) : dismissReports(db, item))
        .then(reload)
        .catch((e: unknown) => notify('That didn’t go through', e instanceof Error ? e.message : 'Try again.'));
    if (!remove) return void go();
    confirmAction(
      item.type === 'review' ? 'Remove this review?' : 'Remove this message?',
      item.type === 'review'
        ? 'It comes off the kitchen’s page and out of its rating. This can’t be undone.'
        : 'It disappears from the chat for both sides. This can’t be undone.',
      'Remove',
      () => void go(),
    );
  };

  return (
    <FormScreen title="Reports" refreshControl={refresh}>
      <Body muted>
        Remove what breaks the rules (abuse, threats, spam, a review of an order that didn’t happen). If it’s fine, clear
        the report.
      </Body>
      <AdminState loading={loading} error={error} empty={!!data && data.length === 0} emptyText="Nothing reported." />
      {(data ?? []).map((item) => {
        const late = isOverdue(item.firstAt, now);
        return (
          <AdminCard key={`${item.type}-${item.targetId}`} urgent={late}>
            <Text style={[adminStyles.label, late && { color: colors.danger }]}>
              {item.detail} · reported {item.count === 1 ? 'once' : `${item.count} times`} · {waitingFor(item.firstAt, now)}
            </Text>
            <Text style={adminStyles.quote}>“{item.text}”</Text>
            <Text style={adminStyles.meta}>By {item.author}</Text>
            {item.reasons.length ? <Text style={adminStyles.meta}>Reasons: {item.reasons.join('; ')}</Text> : null}
            <View style={adminStyles.actions}>
              <GoldButton title="Remove" onPress={() => act(item, true)} />
              <GoldButton title="It’s fine" variant="ghost" onPress={() => act(item, false)} />
            </View>
          </AdminCard>
        );
      })}
    </FormScreen>
  );
}
