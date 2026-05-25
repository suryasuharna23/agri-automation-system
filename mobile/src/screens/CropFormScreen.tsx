import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import StateView from "../components/StateView";
import { getUploadUrl, marketplaceApi } from "../services/api";
import type { Crop } from "../types";

const emptyForm = {
  name: "",
  variety: "",
  quantity_kg: "0",
  price_per_kg: "0",
  description: "",
  harvest_date: "",
  is_available: true,
};

export default function CropFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cropId: string | undefined = route.params?.cropId;
  const [form, setForm] = useState(emptyForm);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!cropId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!cropId) return;
    marketplaceApi.getCrop(cropId)
      .then((data) => {
        setCrop(data);
        setForm({
          name: data.name,
          variety: data.variety ?? "",
          quantity_kg: String(data.quantity_kg),
          price_per_kg: String(data.price_per_kg),
          description: data.description ?? "",
          harvest_date: data.harvest_date ? data.harvest_date.slice(0, 10) : "",
          is_available: data.is_available,
        });
      })
      .catch(() => setError("Produk belum bisa dimuat."))
      .finally(() => setLoading(false));
  }, [cropId]);

  const setField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!form.name.trim() || Number(form.quantity_kg) <= 0 || Number(form.price_per_kg) <= 0) {
      Alert.alert("Perhatian", "Nama produk, stok, dan harga harus valid.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        variety: form.variety.trim() || null,
        quantity_kg: Number(form.quantity_kg),
        price_per_kg: Number(form.price_per_kg),
        description: form.description.trim() || null,
        harvest_date: form.harvest_date ? new Date(form.harvest_date).toISOString() : null,
      };
      const saved = cropId
        ? await marketplaceApi.updateCrop(cropId, { ...payload, is_available: form.is_available })
        : await marketplaceApi.createCrop(payload);
      if (imageUri) await marketplaceApi.uploadCropImage(saved.id, imageUri);
      Alert.alert("Berhasil", "Produk berhasil disimpan.");
      navigation.navigate("CropDetail", { cropId: saved.id });
    } catch {
      Alert.alert("Gagal", "Produk belum bisa disimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <StateView title="Memuat produk..." loading />;
  if (error) return <StateView title="Produk gagal dimuat" message={error} actionLabel="Kembali" onAction={() => navigation.goBack()} />;

  const preview = imageUri ?? getUploadUrl(crop?.image_url);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0e4719" />
        </TouchableOpacity>
        <Text style={styles.title}>{cropId ? "Edit Produk" : "Tambah Produk"}</Text>
        <View style={styles.iconSpace} />
      </View>

      <TouchableOpacity style={styles.imageBox} onPress={pickImage} activeOpacity={0.85}>
        {preview ? <Image source={{ uri: preview }} style={styles.image} /> : <Ionicons name="image-outline" size={42} color="#71af7d" />}
        <Text style={styles.imageText}>{preview ? "Ganti gambar" : "Pilih gambar produk"}</Text>
      </TouchableOpacity>

      <Field label="Nama Produk" value={form.name} onChangeText={(value) => setField("name", value)} />
      <Field label="Varietas" value={form.variety} onChangeText={(value) => setField("variety", value)} />
      <Field label="Stok kg" value={form.quantity_kg} keyboardType="numeric" onChangeText={(value) => setField("quantity_kg", value)} />
      <Field label="Harga per kg" value={form.price_per_kg} keyboardType="numeric" onChangeText={(value) => setField("price_per_kg", value)} />
      <Field label="Tanggal panen (YYYY-MM-DD)" value={form.harvest_date} onChangeText={(value) => setField("harvest_date", value)} />
      <Field label="Deskripsi" value={form.description} multiline onChangeText={(value) => setField("description", value)} />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Tampilkan di marketplace</Text>
        <Switch value={form.is_available} onValueChange={(value) => setField("is_available", value)} />
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} disabled={saving} onPress={save}>
        <Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan Produk"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType ?? "default"}
        multiline={props.multiline}
        style={[styles.input, props.multiline && styles.textarea]}
        placeholderTextColor="#8aad8f"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffefb" },
  content: { padding: 14, paddingTop: 48, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#dbe3dd", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#0e4719" },
  iconSpace: { width: 40 },
  imageBox: { minHeight: 180, borderRadius: 18, backgroundColor: "#e7ede8", alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 8 },
  image: { width: "100%", height: 180 },
  imageText: { fontSize: 13, fontFamily: "Lato_400Regular", color: "#0e4719" },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Lato_400Regular", color: "#55835e" },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#ccd9ce", backgroundColor: "#f3f8f1", paddingHorizontal: 14, color: "#0e4719", fontFamily: "Lato_400Regular" },
  textarea: { minHeight: 96, paddingTop: 12, textAlignVertical: "top", textAlign: "justify" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, backgroundColor: "#f3f8f1", borderWidth: 1, borderColor: "#ccd9ce", padding: 14 },
  switchText: { fontSize: 14, fontFamily: "Lato_400Regular", color: "#0e4719" },
  saveBtn: { height: 50, borderRadius: 14, backgroundColor: "#0e4719", alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 15, fontFamily: "Lato_400Regular", color: "#fbf2d4" },
  disabled: { opacity: 0.6 },
});
