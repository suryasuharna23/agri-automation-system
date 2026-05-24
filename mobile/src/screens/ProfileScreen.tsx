import * as React from "react";
import { useState, useEffect } from "react";
import {
  StyleSheet, View, Text, Image, TextInput,
  TouchableOpacity, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { useAuth } from "../services/AuthContext";
import { authApi } from "../services/api";

type UserData = {
  full_name: string;
  email: string;
  role: string;
  phone?: string | null;
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();

  const [user, setUser]             = useState<UserData | null>(null);
  const [isEditing, setIsEditing]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  // Editable field states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone]       = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    SecureStore.getItemAsync("user").then((raw) => {
      if (!raw) return;
      const parsed: UserData = JSON.parse(raw);
      setUser(parsed);
      setFullName(parsed.full_name ?? "");
      setPhone(parsed.phone ?? "");
    });
  }, []);

  const handleEdit = () => setIsEditing(true);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Perhatian", "Nama lengkap tidak boleh kosong.");
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
      await SecureStore.setItemAsync("user", JSON.stringify(newUser));
      setIsEditing(false);
    } catch {
      Alert.alert("Gagal", "Tidak dapat menyimpan perubahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset ke nilai semula
    setFullName(user?.full_name ?? "");
    setPhone(user?.phone ?? "");
    setIsEditing(false);
  };

  const pickLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Ditolak", "Aktifkan izin lokasi di pengaturan HP.");
        return;
      }
      const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(coords.coords);
      if (place) {
        const parts = [place.street, place.district, place.subregion, place.region].filter(Boolean);
        setLocation(parts.join(", "));
      } else {
        setLocation(`${coords.coords.latitude.toFixed(5)}, ${coords.coords.longitude.toFixed(5)}`);
      }
    } catch {
      Alert.alert("Gagal", "Tidak dapat mengambil lokasi.");
    } finally {
      setLocLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Keluar", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: logout },
    ]);
  };

  const roleLabel = user?.role === "farmer" ? "Petani" : user?.role === "buyer" ? "Pembeli" : "Admin";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profile}>
          {/* Background gradient */}
          <LinearGradient
            style={StyleSheet.absoluteFill}
            locations={[0, 1]}
            colors={["rgba(217, 217, 217, 0)", "#fbf2d4"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
          />

          {/* Decorative assets */}
          <LinearGradient
            style={styles.wrapper}
            locations={[0, 1]}
            colors={["rgba(113, 175, 125, 0)", "#0e4719"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Image style={{ width: "100%", height: "100%" }} resizeMode="cover"
              source={require("../../assets/images/deco-right.png")} />
          </LinearGradient>
          <LinearGradient
            style={styles.container}
            locations={[0, 1]}
            colors={["rgba(113, 175, 125, 0)", "#0e4719"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Image style={{ width: "100%", height: "100%" }} resizeMode="cover"
              source={require("../../assets/images/deco-left.png")} />
          </LinearGradient>
          <Image style={styles.profileChild} resizeMode="cover"
            source={require("../../assets/images/dashboard-plant.png")} />

          {/* Greeting */}
          <Text style={[styles.halo, styles.haloTypo]}>Halo,</Text>
          <Text style={[styles.sobatPetani, styles.haloTypo]}>
            {user?.full_name ?? "Sobat Petani"}
          </Text>

          {/* Balance card */}
          <View style={styles.frameView}>
            <View style={styles.rp20140340Parent}>
              <Text style={styles.rp20140340}>Rp20.140.340</Text>
              <Text style={styles.saldoAnda}>Saldo Anda</Text>
            </View>
            <View style={styles.frameParent2}>
              <View style={styles.frameParent3}>
                <View style={styles.iconbanknoteWrapper}>
                  <Image style={styles.iconSmall} resizeMode="cover"
                    source={require("../../assets/icons/icon-banknote.png")} />
                </View>
                <Text style={styles.keuangan}>Keuangan</Text>
              </View>
              <View style={styles.frameParent4}>
                <View style={styles.iconbanknoteWrapper}>
                  <Image style={styles.iconSmall} resizeMode="cover"
                    source={require("../../assets/icons/icon-banknote.png")} />
                </View>
                <Text style={styles.keuangan}>Tarik tunai</Text>
              </View>
            </View>
          </View>

          {/* Profile fields + actions */}
          <View style={styles.frameParent5}>

            {/* Role badge */}
            <View style={styles.roleBadgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            </View>

            <View style={styles.frameParent6}>

              {/* Email — selalu readonly */}
              <View style={styles.frameWrapper}>
                <View style={[styles.fieldRow, styles.parentBorder]}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <Text style={styles.fieldValueReadonly} numberOfLines={1}>
                    {user?.email ?? "—"}
                  </Text>
                </View>
              </View>

              {/* Nama lengkap */}
              <View style={styles.frameWrapper}>
                <View style={[styles.usernameWrapper, styles.parentBorder]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.fieldInput}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Nama lengkap (sesuai KTP)"
                      placeholderTextColor="#55835e"
                      autoCapitalize="words"
                    />
                  ) : (
                    <Text style={styles.username}>{user?.full_name || "—"}</Text>
                  )}
                </View>
              </View>

              {/* Nomor telepon */}
              <View style={styles.frameWrapper}>
                <View style={[styles.usernameWrapper, styles.parentBorder]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.fieldInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Nomor telepon"
                      placeholderTextColor="#55835e"
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <Text style={styles.username}>{user?.phone || "—"}</Text>
                  )}
                </View>
              </View>

              {/* Lokasi pertanian */}
              {isEditing ? (
                <View style={styles.locationRow}>
                  <View style={[styles.locationManual, styles.parentBorder]}>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1 }]}
                      value={location}
                      onChangeText={setLocation}
                      placeholder="Lokasi pertanian"
                      placeholderTextColor="#55835e"
                      autoCapitalize="words"
                    />
                    {location ? (
                      <TouchableOpacity onPress={() => setLocation("")}>
                        <Text style={styles.clearBtn}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.locationGps, styles.parentBorder]}
                    onPress={pickLocation}
                    disabled={locLoading}
                    activeOpacity={0.8}
                  >
                    {locLoading
                      ? <ActivityIndicator size="small" color="#fbf2d4" />
                      : <Text style={styles.gpsBtnText}>📍 GPS</Text>
                    }
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.frameWrapper}>
                  <View style={[styles.usernameWrapper, styles.parentBorder]}>
                    <Text style={styles.username}>{location || "—"}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.frameWrapper5}>
              {isEditing ? (
                <View style={styles.editActionRow}>
                  <TouchableOpacity
                    style={styles.batalBtn}
                    onPress={handleCancelEdit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.batalText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ubahProfilParent, styles.parentBorder, { flex: 1 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    {saving
                      ? <ActivityIndicator color="#fbf2d4" size="small" />
                      : <Text style={styles.ubahProfil}>Simpan perubahan</Text>
                    }
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.ubahProfilParent, styles.parentBorder]}
                  onPress={handleEdit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ubahProfil}>Ubah profil</Text>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Log out */}
          <TouchableOpacity
            style={styles.logOutWrapper}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logOut}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  profile: {
    minHeight: 852,
    backgroundColor: "#fefbf2",
    overflow: "hidden",
    width: "100%",
  },

  // Deco assets
  profileChild: {
    position: "absolute",
    top: -69,
    left: 246,
    width: 203,
    height: 247,
  },
  wrapper: {
    position: "absolute",
    left: 225,
    top: -92,
    width: 180,
    height: 220,
  },
  container: {
    position: "absolute",
    left: 152,
    top: -150,
    width: 160,
    height: 200,
  },

  // Greeting
  haloTypo: {
    color: "#0e4719",
    fontFamily: "FacultyGlyphic_400Regular",
    textAlign: "left",
    left: 23,
    position: "absolute",
  },
  halo: {
    top: 73,
    fontSize: 32,
  },
  sobatPetani: {
    top: 115,
    fontSize: 40,
  },

  // Balance card
  frameView: {
    position: "absolute",
    top: 198,
    left: 0,
    right: 0,
    borderRadius: 14,
    backgroundColor: "#44694b",
    borderColor: "#669e71",
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 36,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  rp20140340Parent: {
    gap: 4,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  rp20140340: {
    fontSize: 24,
    fontFamily: "FacultyGlyphic_400Regular",
    fontWeight: "600",
    alignSelf: "flex-start",
    textAlign: "left",
    color: "#fbf2d4",
  },
  saldoAnda: {
    fontSize: 16,
    fontWeight: "600",
    fontStyle: "italic",
    fontFamily: "FacultyGlyphic_400Regular",
    alignSelf: "flex-start",
    color: "#fbf2d4",
    textAlign: "left",
  },
  frameParent2: {
    gap: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  frameParent3: {
    width: 57,
    gap: 4,
    alignItems: "center",
  },
  frameParent4: {
    width: 57,
    gap: 4,
    alignItems: "center",
  },
  iconbanknoteWrapper: {
    height: 49,
    backgroundColor: "#fbf2d4",
    borderWidth: 1,
    borderColor: "transparent",
    borderStyle: "solid",
    paddingHorizontal: 11,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  iconSmall: {
    height: 24,
    width: 24,
  },
  keuangan: {
    alignSelf: "stretch",
    fontFamily: "FacultyGlyphic_400Regular",
    fontWeight: "600",
    textAlign: "center",
    color: "#fbf2d4",
    fontSize: 12,
  },

  // Profile form section
  frameParent5: {
    position: "absolute",
    top: 334,
    left: 23,
    right: 23,
    gap: 24,
    alignItems: "center",
  },
  roleBadgeRow: {
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  roleBadge: {
    backgroundColor: "#44694b",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#fbf2d4",
    fontWeight: "600",
  },
  frameParent6: {
    alignSelf: "stretch",
    gap: 16,
    alignItems: "flex-start",
  },
  frameWrapper: {
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  parentBorder: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#0e4719",
    borderRadius: 8,
    borderStyle: "solid",
    flexDirection: "row",
    alignItems: "center",
  },
  fieldRow: {
    alignSelf: "stretch",
    justifyContent: "space-between",
    height: 41,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#55835e",
    fontWeight: "600",
  },
  fieldValueReadonly: {
    fontSize: 14,
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#55835e",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  usernameWrapper: {
    height: 41,
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
  username: {
    color: "#55835e",
    fontWeight: "600",
    fontFamily: "FacultyGlyphic_400Regular",
    fontSize: 14,
    textAlign: "left",
  },
  fieldInput: {
    color: "#55835e",
    fontWeight: "600",
    fontFamily: "FacultyGlyphic_400Regular",
    fontSize: 14,
    textAlign: "left",
    flex: 1,
  },

  // Location row (edit mode)
  locationRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 8,
  },
  locationManual: {
    flex: 1,
    height: 41,
    justifyContent: "space-between",
  },
  locationGps: {
    height: 41,
    backgroundColor: "#0e4719",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  clearBtn: {
    fontSize: 14,
    color: "#55835e",
    paddingHorizontal: 4,
  },
  gpsBtnText: {
    fontSize: 12,
    fontFamily: "FacultyGlyphic_400Regular",
    fontWeight: "600",
    color: "#fbf2d4",
  },

  // Action buttons
  frameWrapper5: {
    alignSelf: "stretch",
  },
  editActionRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "stretch",
  },
  batalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0e4719",
    justifyContent: "center",
    alignItems: "center",
  },
  batalText: {
    fontSize: 14,
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#0e4719",
    fontWeight: "600",
  },
  ubahProfilParent: {
    gap: 8,
    alignSelf: "stretch",
    justifyContent: "center",
    backgroundColor: "#0e4719",
  },
  ubahProfil: {
    fontWeight: "700",
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#fbf2d4",
    fontSize: 14,
    textAlign: "left",
  },
  editIcon: {
    fontSize: 16,
  },

  // Log out
  logOutWrapper: {
    position: "absolute",
    top: 673,
    left: 23,
    right: 23,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#ffe0e0",
    paddingVertical: 12,
  },
  logOut: {
    fontSize: 16,
    fontWeight: "600",
    color: "#923333",
    fontFamily: "FacultyGlyphic_400Regular",
    textAlign: "center",
  },
});
