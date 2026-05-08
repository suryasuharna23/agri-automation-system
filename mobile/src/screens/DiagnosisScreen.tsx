import React from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Header from '../components/Header';
import { Theme } from '../theme';
import type { GradingResult, DiagnosisResult } from '../types';
import type { CameraMode } from './CameraScreen';

export default function DiagnosisScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const insets     = useSafeAreaInsets();

  const mode: CameraMode           = route.params.mode;
  const imageUri: string           = route.params.imageUri;
  const result: GradingResult | DiagnosisResult = route.params.result;

  return (
    <View style={styles.flex}>
      <Header title="Hasil Analisis AI" onBack={() => navigation.popToTop()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image */}
        <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="cover" />

        {mode === 'grading'
          ? <GradingCard result={result as GradingResult} />
          : <DiseaseCard result={result as DiagnosisResult} onDetail={() => navigation.navigate('DiagnosisDetail', { result, imageUri })} />
        }

        <View style={styles.actions}>
          <Button
            label="Foto Ulang"
            variant="outline"
            fullWidth
            onPress={() => navigation.navigate('Camera', { mode })}
            style={{ marginBottom: Theme.spacing.sm }}
          />
          <Button
            label="Kembali ke Beranda"
            variant="ghost"
            fullWidth
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function GradingCard({ result }: { result: GradingResult }) {
  const gradeConfig: Record<string, { color: string; bg: string; label: string; desc: string }> = {
    A: { color: Theme.colors.grass[700], bg: Theme.colors.grass[50],  label: 'Grade A — Premium', desc: 'Kualitas terbaik, layak untuk pasar premium B2B.' },
    B: { color: Theme.colors.cream[600], bg: Theme.colors.cream[50] ?? '#fffdf5', label: 'Grade B — Standar',  desc: 'Kualitas standar, cocok untuk pasar reguler.' },
    C: { color: Theme.colors.danger,      bg: '#fff1f2',               label: 'Grade C — Di bawah standar', desc: 'Perlu perbaikan metode budidaya.' },
  };
  const cfg = gradeConfig[result.grade] ?? gradeConfig.C;

  return (
    <View style={styles.resultSection}>
      <Card style={[styles.gradeCard, { backgroundColor: cfg.bg }]}>
        <View style={styles.gradeRow}>
          <Text style={[styles.gradeLetter, { color: cfg.color }]}>{result.grade}</Text>
          <View style={styles.gradeInfo}>
            <Text style={[styles.gradeLabel, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={styles.gradeDesc}>{cfg.desc}</Text>
            <Text style={styles.confidence}>Keyakinan: {(result.confidence * 100).toFixed(1)}%</Text>
          </View>
        </View>
      </Card>

      {/* Probability bars */}
      <Card style={styles.probCard}>
        <Text style={styles.probTitle}>Distribusi Probabilitas</Text>
        {(['A', 'B', 'C'] as const).map((g) => {
          const val = g === 'A' ? result.grade_a_prob : g === 'B' ? result.grade_b_prob : result.grade_c_prob;
          return <ProbBar key={g} grade={g} value={val} active={result.grade === g} />;
        })}
      </Card>
    </View>
  );
}

function DiseaseCard({ result, onDetail }: { result: DiagnosisResult; onDetail: () => void }) {
  return (
    <View style={styles.resultSection}>
      <Card style={[styles.diseaseCard, { backgroundColor: result.is_healthy ? Theme.colors.grass[50] : '#fff1f2' }]}>
        <View style={styles.diseaseHeader}>
          <Text style={styles.diseaseIcon}>{result.is_healthy ? '✅' : '🦠'}</Text>
          <View style={styles.diseaseInfo}>
            <Text style={[styles.diseaseName, { color: result.is_healthy ? Theme.colors.grass[700] : Theme.colors.danger }]}>
              {result.disease_name}
            </Text>
            <Badge label={`${(result.confidence * 100).toFixed(1)}% keyakinan`} variant={result.is_healthy ? 'success' : 'danger'} />
          </View>
        </View>
        <Text style={styles.recommendation} numberOfLines={3}>{result.recommendation}</Text>
      </Card>

      {!result.is_healthy && (
        <TouchableOpacity style={styles.detailBtn} onPress={onDetail} activeOpacity={0.85}>
          <Text style={styles.detailBtnText}>Lihat Detail Diagnosis & Penanggulangan →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ProbBar({ grade, value, active }: { grade: string; value: number; active: boolean }) {
  return (
    <View style={styles.probRow}>
      <Text style={styles.probGrade}>Grade {grade}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${value * 100}%` as any, backgroundColor: active ? Theme.colors.grass[600] : Theme.colors.grass[200] }]} />
      </View>
      <Text style={styles.probPct}>{(value * 100).toFixed(0)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Theme.colors.bgBase },
  previewImg: { width: '100%', height: 220 },

  resultSection: { padding: Theme.spacing.lg, gap: Theme.spacing.md },
  actions: { paddingHorizontal: Theme.spacing.lg },

  gradeCard: { padding: Theme.spacing.md },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.md },
  gradeLetter: { fontSize: 64, fontWeight: Theme.font.weightBold },
  gradeInfo: { flex: 1 },
  gradeLabel: { fontSize: Theme.font.sizeLg, fontWeight: Theme.font.weightBold },
  gradeDesc: { fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted, marginTop: 4, lineHeight: 16 },
  confidence: { fontSize: Theme.font.sizeXs, color: Theme.colors.grass[600], marginTop: 6, fontWeight: Theme.font.weightMedium },

  probCard: {},
  probTitle: { fontSize: Theme.font.sizeSm, fontWeight: Theme.font.weightSemibold, color: Theme.colors.textPrimary, marginBottom: 12 },
  probRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  probGrade: { width: 52, fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted },
  barBg: { flex: 1, height: 8, backgroundColor: Theme.colors.bgMuted, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  probPct: { width: 36, fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted, textAlign: 'right' },

  diseaseCard: { padding: Theme.spacing.md },
  diseaseHeader: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  diseaseIcon: { fontSize: 40 },
  diseaseInfo: { flex: 1, gap: 6 },
  diseaseName: { fontSize: Theme.font.sizeLg, fontWeight: Theme.font.weightBold },
  recommendation: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, lineHeight: 20 },

  detailBtn: {
    backgroundColor: Theme.colors.grass[600],
    borderRadius: Theme.radius.md,
    paddingVertical: 14, paddingHorizontal: Theme.spacing.lg,
    alignItems: 'center',
  },
  detailBtnText: { color: Theme.colors.white, fontSize: Theme.font.sizeMd, fontWeight: Theme.font.weightSemibold },
});
