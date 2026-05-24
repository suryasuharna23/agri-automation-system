import React, { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import StateView from "../components/StateView";
import { marketplaceApi, transactionApi } from "../services/api";
import type { Crop, OrderStatus, Transaction } from "../types";
import { formatCurrency, formatDate, orderStatusLabel } from "../utils/format";

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "completed",
};

export default function OrdersScreen() {
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
      setError("Pesanan belum bisa dimuat.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const mutateStatus = async (order: Transaction, status: OrderStatus) => {
    try {
      await transactionApi.updateOrderStatus(order.id, status);
      await load();
    } catch {
      Alert.alert("Gagal", "Status pesanan belum bisa diubah.");
    }
  };

  const cancel = (order: Transaction) => {
    Alert.alert("Batalkan pesanan", "Pesanan pending/dikonfirmasi akan diubah menjadi dibatalkan.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Batalkan Pesanan",
        style: "destructive",
        onPress: async () => {
          try {
            await transactionApi.cancelOrder(order.id);
            await load();
          } catch {
            Alert.alert("Gagal", "Pesanan tidak dapat dibatalkan.");
          }
        },
      },
    ]);
  };

  if (loading) return <StateView title="Memuat pesanan..." loading />;
  if (error) return <StateView title="Pesanan gagal dimuat" message={error} actionLabel="Coba lagi" onAction={load} />;

  const cropMap = new Map(crops.map((crop) => [crop.id, crop]));
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0e4719" />
        </TouchableOpacity>
        <Text style={styles.title}>Pesanan Masuk</Text>
        <View style={styles.iconSpace} />
      </View>
      {orders.length === 0 ? (
        <StateView title="Belum ada pesanan" message="Pesanan dari pembeli akan tampil di sini." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => {
            const crop = cropMap.get(item.crop_id);
            const target = nextStatus[item.status];
            const canCancel = item.status === "pending" || item.status === "confirmed";
            return (
              <View style={styles.card}>
                <Text style={styles.code}>AGR-{item.id.slice(0, 8)}</Text>
                <Text style={styles.name}>{crop?.name ?? "Produk"}</Text>
                <Text style={styles.meta}>{formatDate(item.created_at)} · {item.quantity_kg} kg</Text>
                <View style={styles.row}>
                  <Text style={styles.status}>{orderStatusLabel(item.status)}</Text>
                  <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
                </View>
                <View style={styles.actions}>
                  {target ? (
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => mutateStatus(item, target)}>
                      <Text style={styles.primaryText}>Ubah ke {orderStatusLabel(target)}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {canCancel ? (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(item)}>
                      <Text style={styles.cancelText}>Batalkan</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffefb" },
  header: { paddingTop: 48, paddingHorizontal: 14, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#dbe3dd", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#0e4719" },
  iconSpace: { width: 40 },
  list: { padding: 14, gap: 12 },
  card: { borderRadius: 16, backgroundColor: "#f3f8f1", borderWidth: 1, borderColor: "#ccd9ce", padding: 14, gap: 7 },
  code: { fontSize: 12, fontFamily: "FacultyGlyphic_400Regular", color: "#71af7d" },
  name: { fontSize: 19, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  meta: { fontSize: 12, fontFamily: "FacultyGlyphic_400Regular", color: "#55835e" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  status: { fontSize: 13, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  amount: { fontSize: 16, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  primaryBtn: { borderRadius: 12, backgroundColor: "#0e4719", paddingHorizontal: 12, paddingVertical: 9 },
  primaryText: { fontSize: 12, fontFamily: "FacultyGlyphic_400Regular", color: "#fbf2d4" },
  cancelBtn: { borderRadius: 12, backgroundColor: "#fff0f0", borderWidth: 1, borderColor: "#f5c5c5", paddingHorizontal: 12, paddingVertical: 9 },
  cancelText: { fontSize: 12, fontFamily: "FacultyGlyphic_400Regular", color: "#923333" },
});
