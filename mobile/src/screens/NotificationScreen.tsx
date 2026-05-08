import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Header from '../components/Header';
import { Theme } from '../theme';
import { sensorApi } from '../services/api';
import type { SensorReading } from '../types';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'anomaly' | 'order' | 'system';
  isRead: boolean;
  time: string;
  payload?: SensorReading;
}

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing]       = useState(false);

  const buildNotifs = async () => {
    try {
      const nodes = await sensorApi.listNodes();
      const all: Notification[] = [];
      for (const node of nodes) {
        const readings = await sensorApi.getReadings(node.id, 50);
        readings.filter((r: SensorReading) => r.is_anomaly).forEach((r: SensorReading) => {
          all.push({
            id: r.id,
            title: `⚠️ Anomali di ${node.name}`,
            body: r.anomaly_description ?? 'Kondisi lahan di luar batas normal.',
            type: 'anomaly',
            isRead: false,
            time: r.recorded_at,
            payload: r,
          });
        });
      }
      // Sort by time descending
      all.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(all);
    } catch {}
  };

  useEffect(() => { buildNotifs(); }, []);

  const onRefresh = async () => { setRefreshing(true); await buildNotifs(); setRefreshing(false); };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.flex}>
      <Header
        title="Notifikasi"
        subtitle={unreadCount > 0 ? `${unreadCount} belum dibaca` : undefined}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.grass[600]} />}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Tidak ada notifikasi</Text>
            <Text style={styles.emptyBody}>Semua kondisi lahan normal. Notifikasi anomali akan muncul di sini.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((n) => (
              <TouchableOpacity key={n.id} onPress={() => markRead(n.id)} activeOpacity={0.85}>
                <Card style={[styles.notifCard, !n.isRead && styles.notifCardUnread]}>
                  <View style={styles.notifRow}>
                    <View style={[styles.notifIcon, { backgroundColor: ICON_BG[n.type] }]}>
                      <Text style={styles.notifIconText}>{TYPE_ICON[n.type]}</Text>
                    </View>
                    <View style={styles.notifContent}>
                      <View style={styles.notifTitleRow}>
                        <Text style={[styles.notifTitle, !n.isRead && styles.notifTitleUnread]} numberOfLines={1}>
                          {n.title}
                        </Text>
                        {!n.isRead && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                      <Text style={styles.notifTime}>
                        {new Date(n.time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const TYPE_ICON: Record<string, string> = {
  anomaly: '⚠️',
  order:   '📦',
  system:  'ℹ️',
};
const ICON_BG: Record<string, string> = {
  anomaly: '#fef3c7',
  order:   Theme.colors.grass[100],
  system:  '#dbeafe',
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Theme.colors.bgBase },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: Theme.font.sizeXl, fontWeight: Theme.font.weightBold, color: Theme.colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptyBody:  { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },

  list: { padding: Theme.spacing.lg, gap: Theme.spacing.sm },

  notifCard:       { padding: Theme.spacing.sm },
  notifCardUnread: { backgroundColor: Theme.colors.grass[50], borderWidth: 1, borderColor: Theme.colors.grass[200] },

  notifRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  notifIcon: { width: 44, height: 44, borderRadius: Theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  notifIconText: { fontSize: 22 },

  notifContent: { flex: 1 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  notifTitle:       { fontSize: Theme.font.sizeSm, color: Theme.colors.textPrimary, flex: 1 },
  notifTitleUnread: { fontWeight: Theme.font.weightSemibold },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.grass[600], marginLeft: 6 },
  notifBody: { fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted, lineHeight: 18 },
  notifTime: { fontSize: 10, color: Theme.colors.textMuted, marginTop: 4 },
});
