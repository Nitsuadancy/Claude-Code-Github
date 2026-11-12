import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AdminCard, AdminRow, AdminState, adminStyles } from '@/components/admin-ui';
import { FormScreen } from '@/components/form-screen';
import { usePullToRefresh } from '@/components/pull-to-refresh';
import { Body, SectionTitle } from '@/components/ui';
import { stateName } from '@/data/regions';
import { isOverdue, waitingFor } from '@/lib/admin';
import { loadDemand, loadHelpRequests, loadKitchensToReview, loadReports } from '@/lib/remote/admin';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';
import { lookupZip, placeLabel } from '@/lib/zips';
import { useStore } from '@/state/store';
import { spacing } from '@/theme';

/** The Manna team's home: what's waiting, and where people want Manna next. */
export default function TeamTools() {
  const { state } = useStore();
  const db = supabase;
  const allowed = !!db && !!state.user?.isAdmin;
  const { data, error, loading, reload } = useLoad(
    allowed
      ? async () => {
          const [kitchens, help, reports, demand] = await Promise.all([
            loadKitchensToReview(db),
            loadHelpRequests(db),
            loadReports(db),
            loadDemand(db),
          ]);
          return { kitchens, help, reports, demand };
        }
      : null,
  );
  const refresh = usePullToRefresh(reload);

  if (!allowed) {
    return (
      <FormScreen title="Manna team">
        <Body muted>Team tools work with the backend switched on, for Manna team accounts (docs/GO_LIVE.md).</Body>
      </FormScreen>
    );
  }

  const now = new Date();
  const overdueHelp = data?.help.filter((h) => isOverdue(h.createdAt, now)).length ?? 0;
  return (
    <FormScreen title="Manna team" refreshControl={refresh}>
      <AdminState loading={loading} error={error} empty={false} emptyText="" />
      {data ? (
        <>
          <View style={{ gap: spacing.sm }}>
            <AdminRow
              icon="lifebuoy"
              title="Help requests"
              detail={overdueHelp ? `${overdueHelp} waiting more than a day` : 'Answer within a day'}
              count={data.help.length}
              onPress={() => router.push('/admin/help')}
            />
            <AdminRow
              icon="flag-outline"
              title="Reported messages and reviews"
              detail="Check within a day (App Store rule)"
              count={data.reports.length}
              onPress={() => router.push('/admin/reports')}
            />
          </View>

          <SectionTitle>Kitchens to review</SectionTitle>
          {data.kitchens.length === 0 ? <Body muted>No kitchens waiting.</Body> : null}
          {data.kitchens.map((k) => (
            <AdminRow
              key={k.id}
              icon="chef-hat"
              title={k.name || 'Unnamed kitchen'}
              detail={`${k.chefName} · ${k.city}, ${k.state} · sent ${waitingFor(k.createdAt, now)}`}
              onPress={() => router.push({ pathname: '/admin/kitchen/[id]', params: { id: k.id } })}
            />
          ))}

          <SectionTitle>Where people are waiting</SectionTitle>
          <AdminCard>
            {data.demand.areas.length === 0 ? <Text style={adminStyles.meta}>Nobody on a waitlist yet.</Text> : null}
            {data.demand.areas.slice(0, 12).map((a) => {
              const place = lookupZip(a.zip);
              return (
                <View key={a.zip} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={adminStyles.title}>{place ? `${placeLabel(place)} ${a.zip}` : a.zip}</Text>
                  <Text style={adminStyles.meta}>
                    {a.people} {a.people === 1 ? 'person' : 'people'}
                  </Text>
                </View>
              );
            })}
          </AdminCard>

          {data.demand.waitingKitchens.length ? (
            <>
              <SectionTitle>Cooks waiting for their state to launch</SectionTitle>
              <AdminCard>
                {data.demand.waitingKitchens.map((w) => (
                  <View key={w.state} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={adminStyles.title}>{stateName(w.state)}</Text>
                    <Text style={adminStyles.meta}>
                      {w.kitchens} {w.kitchens === 1 ? 'kitchen' : 'kitchens'}
                    </Text>
                  </View>
                ))}
                <Text style={adminStyles.meta}>Launching a state: see docs/STATES.md.</Text>
              </AdminCard>
            </>
          ) : null}
        </>
      ) : null}
    </FormScreen>
  );
}
