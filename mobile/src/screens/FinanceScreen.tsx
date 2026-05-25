import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import StateView from "../components/StateView";
import { marketplaceApi, transactionApi } from "../services/api";
import type { Crop, Transaction } from "../types";
import { formatCurrency, formatDate, orderStatusLabel } from "../utils/format";

const countedStatuses = new Set(["confirmed", "processing", "completed"]);

export default function FinanceScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<Transaction[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [orderData, cropData] = await Promise.all([transactionApi.listOrders(), marketplaceApi.listCrops(false)]);
      setOrders(orderData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setCrops(cropData);
    } catch {
      setError("Data keuangan belum bisa dimuat.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  if (loading) return <StateView title="Memuat keuangan..." loading />;
  if (error) return <StateView title="Keuangan gagal dimuat" message={error} actionLabel="Coba lagi" onAction={load} />;

  const cropMap = new Map(crops.map((crop) => [crop.id, crop]));
  const revenue = orders.filter((order) => countedStatuses.has(order.status)).reduce((sum, order) => sum + order.total_amount, 0);
  const estimateCost = revenue * 0.15;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0e4719" />
        </TouchableOpacity>
        <Text style={styles.title}>Keuangan</Text>
        <View style={styles.iconSpace} />
      </View>
      <View style={styles.summaryRow}>
        <Summary title="Pemasukan" value={formatCurrency(revenue)} />
        <Summary title="Estimasi biaya" value={formatCurrency(estimateCost)} />
      </View>
      {orders.length === 0 ? (
        <StateView title="Belum ada transaksi" message="Riwayat pesanan akan tampil setelah ada order." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => {
            const crop = cropMap.get(item.crop_id);
            const counted = countedStatuses.has(item.status);
            return (
              <View style={styles.card}>
                <View style={[styles.iconCircle, counted ? styles.incomeCircle : styles.mutedCircle]}>
                  <Ionicons name={counted ? "arrow-up" : "remove"} size={18} color={counted ? "#0e4719" : "#75826e"} />
                </View>
                <View style={styles.body}>
                  <Text style={styles.name}>Penjualan {crop?.name ?? "Produk"}</Text>
                  <Text style={styles.meta}>{formatDate(item.created_at)} · {orderStatusLabel(item.status)}</Text>
                </View>
                <Text style={[styles.amount, !counted && styles.mutedAmount]}>{counted ? "+" : ""}{formatCurrency(item.total_amount)}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffefb" },
  header: { paddingTop: 48, paddingHorizontal: 14, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#dbe3dd", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#0e4719" },
  iconSpace: { width: 40 },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 10 },
  summaryCard: { flex: 1, borderRadius: 16, backgroundColor: "#f3f8f1", borderWidth: 1, borderColor: "#ccd9ce", padding: 14, gap: 8 },
  summaryTitle: { fontSize: 12, fontFamily: "Lato_400Regular", color: "#55835e" },
  summaryValue: { fontSize: 16, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  list: { padding: 14, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: "#f3f8f1", borderWidth: 1, borderColor: "#ccd9ce", padding: 12 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  incomeCircle: { backgroundColor: "#d1f2d7" },
  mutedCircle: { backgroundColor: "#e7ede8" },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  meta: { fontSize: 11, fontFamily: "Lato_400Regular", color: "#55835e" },
  amount: { fontSize: 14, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  mutedAmount: { color: "#75826e" },
});
