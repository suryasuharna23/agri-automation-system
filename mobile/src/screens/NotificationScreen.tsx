import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { sensorApi } from '../services/api';
import type { SensorReading } from '../types';

type Priority = 'urgent' | 'check' | 'good';
type FilterKey = 'semua' | 'monitor' | 'keuangan';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'anomaly' | 'order' | 'system';
  priority: Priority;
  isRead: boolean;
  time: string;
  payload?: SensorReading;
}

const BADGE_LABEL: Record<Priority, string> = {
  urgent: 'URGENT',
  check:  'CHECK',
  good:   'GOOD',
};

const MOCK_NOTIFS: AppNotification[] = [
  {
    id: '1', title: 'Tanaman Kangkung', type: 'anomaly', priority: 'urgent', isRead: false,
    time: new Date(Date.now() - 3_600_000).toISOString(),
    body: 'Terdeteksi anomali kelembapan di luar batas normal. Segera periksa sistem irigasi dan pastikan pasokan air mencukupi.',
  },
  {
    id: '2', title: 'Tanaman Kangkung', type: 'anomaly', priority: 'check', isRead: false,
    time: new Date(Date.now() - 7_200_000).toISOString(),
    body: 'Suhu udara mendekati batas atas toleransi (33°C). Pantau kondisi lahan secara berkala untuk mencegah stres tanaman.',
  },
  {
    id: '3', title: 'Tanaman Kangkung', type: 'system', priority: 'good', isRead: true,
    time: new Date(Date.now() - 86_400_000).toISOString(),
    body: 'Kondisi pH tanah dalam rentang optimal (6.2). Pertumbuhan tanaman berjalan baik dan tidak ada tindakan yang diperlukan.',
  },
  {
    id: '4', title: 'Tanaman Bayam', type: 'system', priority: 'good', isRead: true,
    time: new Date(Date.now() - 172_800_000).toISOString(),
    body: 'Semua parameter sensor dalam batas normal. Kelembapan tanah 65%, suhu 26°C, pH 6.1.',
  },
  {
    id: '5', title: 'Tanaman Kangkung', type: 'system', priority: 'good', isRead: true,
    time: new Date(Date.now() - 259_200_000).toISOString(),
    body: 'Pembacaan rutin berhasil. Tidak ditemukan anomali pada lahan selama 24 jam terakhir.',
  },
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'semua',    label: 'Semua'    },
  { key: 'monitor',  label: 'Monitor'  },
  { key: 'keuangan', label: 'Keuangan' },
];

function filterItems(items: AppNotification[], key: FilterKey): AppNotification[] {
  if (key === 'monitor')  return items.filter((n) => n.type === 'anomaly');
  if (key === 'keuangan') return items.filter((n) => n.type === 'order');
  return items;
}

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFS);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('semua');
  const [refreshing, setRefreshing] = useState(false);

  const buildNotifs = async () => {
    try {
      const nodes = await sensorApi.listNodes();
      const all: AppNotification[] = [];
      for (const node of nodes) {
        const readings = await sensorApi.getReadings(node.id, 50);
        readings.filter((r: SensorReading) => r.is_anomaly).forEach((r: SensorReading, i: number) => {
          all.push({
            id: r.id,
            title: node.name,
            body: r.anomaly_description ?? 'Kondisi lahan di luar batas normal.',
            type: 'anomaly',
            priority: i === 0 ? 'urgent' : 'check',
            isRead: false,
            time: r.recorded_at,
            payload: r,
          });
        });
      }
      all.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      if (all.length > 0) setNotifications(all);
    } catch (err) {
      if (__DEV__) console.error("🔧 [NotificationScreen] Failed to build notifications:", err);
    }
  };

  useEffect(() => { buildNotifs(); }, []);

  const onRefresh = async () => { setRefreshing(true); await buildNotifs(); setRefreshing(false); };

  const markRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));

  const filtered = filterItems(notifications, activeFilter);

  return (
    <View style={styles.container}>
      {/* ── Tab filter row ── */}
      <View style={[styles.tabSection, { paddingTop: insets.top + 8 }]}>
        <View style={styles.tabRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.tabPill, f.key === activeFilter && styles.tabPillActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, f.key === activeFilter && styles.tabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tabBar} />
      </View>

      {/* ── Notification list ── */}
      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e4719" />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Tidak ada notifikasi</Text>
            <Text style={styles.emptyBody}>
              {activeFilter === 'monitor'
                ? 'Tidak ada anomali sensor yang terdeteksi.'
                : activeFilter === 'keuangan'
                ? 'Tidak ada notifikasi keuangan.'
                : 'Semua kondisi lahan normal.'}
            </Text>
          </View>
        ) : (
          filtered.map((notif) =>
            notif.priority === 'urgent' ? (
              <UrgentCard
                key={notif.id}
                notif={notif}
                onPress={() => { markRead(notif.id); navigation.navigate('Diagnosis'); }}
              />
            ) : (
              <RegularCard
                key={notif.id}
                notif={notif}
                onPress={() => markRead(notif.id)}
              />
            )
          )
        )}
      </ScrollView>
    </View>
  );
}

/* ── Urgent card (green outer shell + action button) ── */
function UrgentCard({ notif, onPress }: { notif: AppNotification; onPress: () => void }) {
  return (
    <View style={styles.urgentCard}>
      <View style={styles.urgentInner}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{notif.title}</Text>
          <View style={styles.badgeUrgent}>
            <Text style={styles.badgeTextUrgent}>{BADGE_LABEL.urgent}</Text>
          </View>
        </View>
        <Text style={styles.cardBody}>{notif.body}</Text>
      </View>
      <TouchableOpacity style={styles.detailBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.detailBtnText}>Lihat Detail Diagnosis</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ── Regular card (bordered, no action button) ── */
function RegularCard({ notif, onPress }: { notif: AppNotification; onPress: () => void }) {
  const badge = notif.priority === 'check' ? (
    <View style={styles.badgeCheck}>
      <Text style={styles.badgeTextCheck}>{BADGE_LABEL.check}</Text>
    </View>
  ) : (
    <View style={styles.badgeGood}>
      <Text style={styles.badgeTextGood}>{BADGE_LABEL.good}</Text>
    </View>
  );

  return (
    <TouchableOpacity style={styles.regularCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{notif.title}</Text>
        {badge}
      </View>
      <Text style={styles.cardBody}>{notif.body}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffefb',
  },

  /* ── Tabs ── */
  tabSection: {
    paddingHorizontal: 11,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'flex-end',
  },
  tabPill: {
    width: 112,
    height: 43,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#dbe3dd',
  },
  tabPillActive: {
    backgroundColor: '#b4c6b8',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  tabTextActive: {
    color: '#0e4719',
  },
  tabBar: {
    height: 6,
    backgroundColor: '#0e4719',
    borderRadius: 1,
  },

  /* ── List ── */
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 12,
  },

  /* ── Empty state ── */
  empty: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#44694b',
    textAlign: 'center',
    lineHeight: 20,
  },

  /* ── Urgent card ── */
  urgentCard: {
    borderRadius: 14,
    backgroundColor: '#55835e',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 7,
    gap: 9,
  },
  urgentInner: {
    borderRadius: 12,
    backgroundColor: '#fefbf2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 18,
  },

  /* ── Regular card ── */
  regularCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0e4719',
    backgroundColor: '#fefbf2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 18,
  },

  /* ── Card internals ── */
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  cardBody: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    lineHeight: 18,
  },

  /* ── Badges ── */
  badgeUrgent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8e1c1e',
    backgroundColor: '#f9caca',
  },
  badgeTextUrgent: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#8e1c1e',
  },
  badgeCheck: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5b4016',
    backgroundColor: '#faeacc',
  },
  badgeTextCheck: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#5b4016',
  },
  badgeGood: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0d4c19',
    backgroundColor: 'rgba(238,243,238,0.8)',
  },
  badgeTextGood: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0d4c19',
  },

  /* ── Detail button (urgent only) ── */
  detailBtn: {
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0e4719',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBtnText: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#fbf2d4',
  },
});
