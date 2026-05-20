import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Input from '../components/Input';
import Button from '../components/Button';
import Header from '../components/Header';
import { Theme } from '../theme';
import { authApi } from '../services/api';
import * as SecureStore from 'expo-secure-store';

type Role = 'farmer' | 'buyer';

export default function RegisterScreen({ onLogin }: { onLogin?: () => void }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [role, setRole]         = useState<Role>('farmer');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim())  e.fullName = 'Nama lengkap wajib diisi.';
    if (!email.trim())     e.email    = 'Email wajib diisi.';
    if (!password)         e.password = 'Password wajib diisi.';
    if (password.length < 8) e.password = 'Password minimal 8 karakter.';
    if (password !== confirm) e.confirm = 'Konfirmasi password tidak cocok.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await authApi.register({ email: email.trim(), password, full_name: fullName.trim(), role });
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      console.log("🔧 [RegisterScreen] Registration successful — calling onLogin");
      onLogin?.();
      // Navigation reset not needed — AppNavigator re-renders with auth stack
    } catch {
      setErrors({ email: 'Email sudah terdaftar atau terjadi kesalahan.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Buat Akun Baru" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Role selector */}
        <Text style={styles.sectionLabel}>Saya adalah</Text>
        <View style={styles.roleRow}>
          <RoleCard
            icon="🌾" label="Petani"
            selected={role === 'farmer'}
            onPress={() => setRole('farmer')}
          />
          <RoleCard
            icon="🏢" label="Pembeli B2B"
            selected={role === 'buyer'}
            onPress={() => setRole('buyer')}
          />
        </View>

        {/* Fields */}
        <Input
          label="Nama Lengkap"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Nama Anda"
          error={errors.fullName}
          autoCapitalize="words"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="contoh@email.com"
          error={errors.email}
        />
        <Input
          label="Nomor Telepon (opsional)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="08xxxxxxxxxx"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPw}
          placeholder="Minimal 8 karakter"
          error={errors.password}
          hint="Gunakan kombinasi huruf, angka, dan simbol."
          rightIcon={<Text style={styles.showPw}>{showPw ? 'Sembunyikan' : 'Tampilkan'}</Text>}
          onRightIconPress={() => setShowPw((v) => !v)}
        />
        <Input
          label="Konfirmasi Password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPw}
          placeholder="Ulangi password"
          error={errors.confirm}
        />

        <Button label="Daftar Sekarang" onPress={handleRegister} loading={loading} fullWidth size="lg" style={{ marginTop: 8 }} />

        <View style={styles.loginRow}>
          <Text style={styles.loginLabel}>Sudah punya akun? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Masuk</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RoleCard({ icon, label, selected, onPress }: { icon: string; label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.roleCard, selected && styles.roleCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.roleIcon}>{icon}</Text>
      <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Theme.colors.bgBase },
  container: { flexGrow: 1, paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.lg },

  sectionLabel: {
    fontSize: Theme.font.sizeSm,
    fontWeight: Theme.font.weightMedium,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  roleRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginBottom: Theme.spacing.lg },
  roleCard: {
    flex: 1,
    paddingVertical: 16, paddingHorizontal: 12,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.bgCard,
    alignItems: 'center',
    gap: 6,
  },
  roleCardSelected: { borderColor: Theme.colors.grass[600], backgroundColor: Theme.colors.grass[50] },
  roleIcon: { fontSize: 28 },
  roleLabel: { fontSize: Theme.font.sizeSm, fontWeight: Theme.font.weightMedium, color: Theme.colors.textMuted },
  roleLabelSelected: { color: Theme.colors.grass[700] },

  showPw: { fontSize: Theme.font.sizeXs, color: Theme.colors.grass[600], fontWeight: Theme.font.weightMedium },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Theme.spacing.lg, paddingBottom: Theme.spacing.md },
  loginLabel: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted },
  loginLink:  { fontSize: Theme.font.sizeSm, color: Theme.colors.grass[600], fontWeight: Theme.font.weightSemibold },
});
