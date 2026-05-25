import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../services/AuthContext';
import { authApi } from '../services/api';

type UserData = {
  full_name: string;
  email: string;
  role: string;
  phone?: string | null;
};

function roleLabel(role?: string) {
  if (role === 'farmer') return 'Petani';
  if (role === 'buyer')  return 'Pembeli';
  return 'Admin';
}

function Field({
  label, value, onChangeText, editable, keyboardType, placeholder,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor="#8aad8f"
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={keyboardType === 'phone-pad' || keyboardType === 'email-address' ? 'none' : 'words'}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || '—'}</Text>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { logout } = useAuth();

  const [user,      setUser]      = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  const [fullName,       setFullName]       = useState('');
  const [phone,          setPhone]          = useState('');
  const [location,       setLocation]       = useState('');
  const [logoutVisible,  setLogoutVisible]  = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const fresh = await authApi.me();
        setUser(fresh);
        setFullName(fresh.full_name ?? '');
        setPhone(fresh.phone ?? '');
      } catch {
        const raw = await SecureStore.getItemAsync('user');
        if (!raw) return;
        const parsed: UserData = JSON.parse(raw);
        setUser(parsed);
        setFullName(parsed.full_name ?? '');
        setPhone(parsed.phone ?? '');
      }
    };
    loadUser();
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Perhatian', 'Nama lengkap tidak boleh kosong.');
      return;
    }
    setSaving(true);
    try {
      const updated = await authApi.updateMe({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      const newUser = { ...user, ...updated };
      setUser(newUser);
      await SecureStore.setItemAsync('user', JSON.stringify(newUser));
      setIsEditing(false);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan perubahan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(user?.full_name ?? '');
    setPhone(user?.phone ?? '');
    setIsEditing(false);
  };

  const pickLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aktifkan izin lokasi di pengaturan HP.');
        return;
      }
      const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(coords.coords);
      if (place) {
        const parts = [place.street, place.district, place.subregion, place.region].filter(Boolean);
        setLocation(parts.join(', '));
      } else {
        setLocation(`${coords.coords.latitude.toFixed(5)}, ${coords.coords.longitude.toFixed(5)}`);
      }
    } catch {
      Alert.alert('Gagal', 'Tidak dapat mengambil lokasi.');
    } finally {
      setLocLoading(false);
    }
  };

  const handleLogout = () => setLogoutVisible(true);

  const initials = (user?.full_name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#0e4719" />
            </TouchableOpacity>
            <Text style={styles.title}>Profil</Text>
            {!isEditing ? (
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.8}>
                <Ionicons name="create-outline" size={18} color="#0e4719" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            ) : <View style={styles.editBtnPlaceholder} />}
          </View>

          {/* ── Avatar + name card ── */}
          <View style={styles.avatarCard}>
            <LinearGradient
              style={StyleSheet.absoluteFillObject}
              colors={['#1a5e2a', '#0e4719']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.avatarName}>{user?.full_name ?? '—'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{roleLabel(user?.role)}</Text>
              </View>
            </View>
          </View>

          {/* ── Info fields card ── */}
          <Text style={styles.fieldsSectionTitle}>Informasi Akun</Text>
          <View style={styles.fieldsCard}>
            <LinearGradient
              style={StyleSheet.absoluteFillObject}
              colors={['#e7ede8', '#f5faf5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <Field label="Email" value={user?.email ?? ''} editable={false} />
            <View style={styles.divider} />
            <Field
              label="Nama Lengkap"
              value={fullName}
              onChangeText={setFullName}
              editable={isEditing}
              placeholder="Nama lengkap sesuai KTP"
            />
            <View style={styles.divider} />
            <Field
              label="Nomor Telepon"
              value={phone}
              onChangeText={setPhone}
              editable={isEditing}
              keyboardType="phone-pad"
              placeholder="Contoh: 08123456789"
            />
            <View style={styles.divider} />

            {/* Location field */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Lokasi Pertanian</Text>
              {isEditing ? (
                <View style={styles.locationRow}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1 }]}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Lokasi pertanian"
                    placeholderTextColor="#8aad8f"
                    autoCapitalize="words"
                  />
                  {location ? (
                    <TouchableOpacity onPress={() => setLocation('')} style={styles.clearBtn}>
                      <Ionicons name="close-circle" size={18} color="#55835e" />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.gpsBtn}
                    onPress={pickLocation}
                    disabled={locLoading}
                    activeOpacity={0.8}
                  >
                    {locLoading
                      ? <ActivityIndicator size="small" color="#fbf2d4" />
                      : <Ionicons name="location-outline" size={16} color="#fbf2d4" />
                    }
                    <Text style={styles.gpsBtnText}>GPS</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.fieldValue}>{location || '—'}</Text>
              )}
            </View>
          </View>

          {/* ── Action buttons ── */}
          {isEditing ? (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving
                  ? <ActivityIndicator color="#fbf2d4" size="small" />
                  : <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                }
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Balance card ── */}
          <View style={styles.balanceCard}>
            <LinearGradient
              style={StyleSheet.absoluteFillObject}
              colors={['#44694b', '#2d5236']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View>
              <Text style={styles.balanceLabel}>Saldo Anda</Text>
              <Text style={styles.balanceAmount}>Rp20.140.340</Text>
            </View>
            <TouchableOpacity style={styles.keuanganBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Finance')}>
              <Ionicons name="card-outline" size={18} color="#44694b" />
              <Text style={styles.keuanganText}>Keuangan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.menuGrid}>
            <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('CropList')} activeOpacity={0.8}>
              <Ionicons name="basket-outline" size={18} color="#0e4719" />
              <Text style={styles.menuText}>Produk Saya</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Orders')} activeOpacity={0.8}>
              <Ionicons name="receipt-outline" size={18} color="#0e4719" />
              <Text style={styles.menuText}>Pesanan</Text>
            </TouchableOpacity>
          </View>

          {/* ── Log out ── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color="#923333" />
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      {/* ── Logout modal ── */}
      <Modal visible={logoutVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <LinearGradient
              style={StyleSheet.absoluteFillObject}
              colors={['#e7ede8', '#f5faf5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.modalIconWrap}>
              <LinearGradient
                style={StyleSheet.absoluteFillObject}
                colors={['#f5c5c5', '#fff0f0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Ionicons name="log-out-outline" size={28} color="#923333" />
            </View>
            <Text style={styles.modalTitle}>Keluar Akun</Text>
            <Text style={styles.modalDesc}>Apakah kamu yakin ingin keluar dari akun ini?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLogoutVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={() => { setLogoutVisible(false); logout(); }}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={16} color="#fbf2d4" />
                <Text style={styles.modalLogoutText}>Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffefb' },
  scroll: { paddingHorizontal: 14, gap: 14 },

  /* Header */
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  backBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#dbe3dd',
    borderWidth: 1, borderColor: '#0e4719', alignItems: 'center', justifyContent: 'center',
  },
  editBtnPlaceholder: { width: 40 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#dbe3dd', borderRadius: 8, borderWidth: 1, borderColor: '#0e4719',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, fontFamily: 'Lato_400Regular', color: '#0e4719' },

  /* Avatar card */
  avatarCard: {
    borderRadius: 16, overflow: 'hidden', padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  avatarCircle: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(251,242,212,0.25)', borderWidth: 2, borderColor: '#fbf2d4',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 22, fontFamily: 'Lato_400Regular', color: '#fbf2d4', fontWeight: '700' },
  avatarInfo: { gap: 8 },
  avatarName: { fontSize: 18, fontFamily: 'Lato_400Regular', color: '#fbf2d4', fontWeight: '600' },
  roleBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(251,242,212,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(251,242,212,0.4)',
  },
  roleText: { fontSize: 11, fontFamily: 'Lato_400Regular', color: '#fbf2d4' },

  /* Fields card */
  fieldsCard: {
    borderRadius: 16, overflow: 'hidden', padding: 16, gap: 0,
    borderWidth: 1, borderColor: '#ccd9ce',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  fieldsSectionTitle: {
    fontSize: 15,
    fontFamily: 'Lato_400Regular',
    color: '#0e4719',
    fontWeight: '700',
    marginBottom: -6,
  },
  divider: { height: 1, backgroundColor: '#dde8de', marginVertical: 12 },

  /* Field row */
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: 'Lato_400Regular', color: '#7a9a7e' },
  fieldValue: { fontSize: 15, fontFamily: 'Lato_400Regular', color: '#1a3d1f' },
  fieldInput: {
    fontSize: 15, fontFamily: 'Lato_400Regular', color: '#1a3d1f',
    borderBottomWidth: 1, borderBottomColor: '#0e4719', paddingBottom: 4,
  },

  /* Location row */
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: { padding: 2 },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0e4719', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  gpsBtnText: { fontSize: 12, fontFamily: 'Lato_400Regular', color: '#fbf2d4' },

  /* Action buttons */
  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    paddingVertical: 13, paddingHorizontal: 20, borderRadius: 10,
    borderWidth: 1, borderColor: '#0e4719', alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontFamily: 'Lato_400Regular', color: '#0e4719' },
  saveBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#0e4719', alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: 14, fontFamily: 'Lato_400Regular', color: '#fbf2d4', fontWeight: '600' },

  /* Balance card */
  balanceCard: {
    borderRadius: 16, overflow: 'hidden', padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  balanceLabel: { fontSize: 12, fontFamily: 'Lato_400Regular', color: 'rgba(251,242,212,0.8)', fontStyle: 'italic' },
  balanceAmount: { fontSize: 22, fontFamily: 'Lato_400Regular', color: '#fbf2d4', fontWeight: '600', marginTop: 4 },
  keuanganBtn: {
    alignItems: 'center', gap: 6,
    backgroundColor: '#fbf2d4', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  keuanganText: { fontSize: 11, fontFamily: 'Lato_400Regular', color: '#44694b', fontWeight: '600' },
  menuGrid: { flexDirection: 'row', gap: 10 },
  menuBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: '#dbe3dd',
    borderWidth: 1,
    borderColor: '#0e4719',
    paddingVertical: 12,
  },
  menuText: { fontSize: 12, fontFamily: 'Lato_400Regular', color: '#0e4719' },

  /* Logout modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  modalBox: {
    width: '100%', borderRadius: 20, overflow: 'hidden',
    padding: 24, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#ccd9ce',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10,
  },
  modalIconWrap: {
    width: 60, height: 60, borderRadius: 30, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(146,51,51,0.2)',
  },
  modalTitle: {
    fontSize: 20, fontFamily: 'Lato_400Regular',
    color: '#1a3d1f', fontWeight: '700',
  },
  modalDesc: {
    fontSize: 14, fontFamily: 'Lato_400Regular',
    color: '#55835e', textAlign: 'justify', lineHeight: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1, borderColor: '#0e4719', alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { fontSize: 14, fontFamily: 'Lato_400Regular', color: '#0e4719' },
  modalLogoutBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#923333', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  modalLogoutText: { fontSize: 14, fontFamily: 'Lato_400Regular', color: '#fbf2d4', fontWeight: '600' },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 10, backgroundColor: '#fff0f0',
    borderWidth: 1, borderColor: '#f5c5c5',
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, fontFamily: 'Lato_400Regular', color: '#923333', fontWeight: '600' },
});
