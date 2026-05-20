import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Input from '../components/Input';
import Button from '../components/Button';
import { Theme } from '../theme';
import { authApi } from '../services/api';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen({ onLogin }: { onLogin?: () => void }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Email dan password wajib diisi.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await authApi.login(email.trim(), password);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      console.log("🔧 [LoginScreen] Login successful — calling onLogin");
      onLogin?.();
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch {
      setError('Email atau password salah. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / brand */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🌱</Text>
          </View>
          <Text style={styles.appName}>Agri</Text>
          <Text style={styles.tagline}>Platform Pertanian Cerdas</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Masuk ke Akun</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="contoh@email.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            placeholder="Masukkan password"
            rightIcon={
              <Text style={styles.showPw}>{showPw ? 'Sembunyikan' : 'Tampilkan'}</Text>
            }
            onRightIconPress={() => setShowPw((v) => !v)}
          />

          {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

          <Button label="Masuk" onPress={handleLogin} loading={loading} fullWidth size="lg" style={{ marginTop: 8 }} />

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Lupa Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Register CTA */}
        <View style={styles.registerRow}>
          <Text style={styles.registerLabel}>Belum punya akun? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Daftar Sekarang</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Theme.colors.bgBase },
  container: { flexGrow: 1, paddingHorizontal: Theme.spacing.lg, justifyContent: 'center' },

  brand: { alignItems: 'center', marginBottom: Theme.spacing.xl },
  logoCircle: {
    width: 72, height: 72,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.grass[600],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    ...Theme.shadow.md,
  },
  logoText: { fontSize: 32 },
  appName:  { fontSize: Theme.font.size3xl, fontWeight: Theme.font.weightBold, color: Theme.colors.grass[700] },
  tagline:  { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, marginTop: 4 },

  form: {
    backgroundColor: Theme.colors.bgCard,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    ...Theme.shadow.sm,
    marginBottom: Theme.spacing.lg,
  },
  formTitle: {
    fontSize: Theme.font.sizeXl,
    fontWeight: Theme.font.weightBold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.lg,
  },
  showPw: { fontSize: Theme.font.sizeXs, color: Theme.colors.grass[600], fontWeight: Theme.font.weightMedium },
  errorMsg: { fontSize: Theme.font.sizeSm, color: Theme.colors.danger, marginBottom: Theme.spacing.sm },
  forgotBtn: { alignItems: 'center', marginTop: Theme.spacing.md },
  forgotText: { fontSize: Theme.font.sizeSm, color: Theme.colors.grass[600] },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerLabel: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted },
  registerLink: { fontSize: Theme.font.sizeSm, color: Theme.colors.grass[600], fontWeight: Theme.font.weightSemibold },
});
