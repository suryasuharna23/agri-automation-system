import * as React from "react";
import { useState } from "react";
import {
  StyleSheet, View, Text, Image, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { authApi } from "../services/api";

export default function RegisterScreen({ onLogin }: { onLogin?: () => void }) {
  const navigation = useNavigation<any>();

  const [email, setEmail]       = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone]       = useState("");
  const [location, setLocation] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [emailError, setEmailError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const pickLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeneralError("Izin lokasi ditolak. Aktifkan di pengaturan HP.");
        return;
      }
      const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(coords.coords);
      if (place) {
        const parts = [place.street, place.district, place.subregion, place.region]
          .filter(Boolean);
        setLocation(parts.join(", "));
      } else {
        setLocation(`${coords.coords.latitude.toFixed(5)}, ${coords.coords.longitude.toFixed(5)}`);
      }
    } catch {
      setGeneralError("Gagal mengambil lokasi. Coba lagi.");
    } finally {
      setLocLoading(false);
    }
  };

  const validate = () => {
    setEmailError("");
    setGeneralError("");
    if (!email.trim()) { setEmailError("Email wajib diisi."); return false; }
    if (!fullName.trim()) { setGeneralError("Nama lengkap wajib diisi."); return false; }
    if (!password) { setGeneralError("Password wajib diisi."); return false; }
    if (password.length < 8) { setGeneralError("Password minimal 8 karakter."); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await authApi.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role: "farmer",
      });
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));
      onLogin?.();
    } catch {
      setEmailError("Email sudah terdaftar atau terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

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
        <View style={styles.register}>
          {/* Background gradient */}
          <LinearGradient
            style={StyleSheet.absoluteFill}
            locations={[0, 1]}
            colors={["rgba(217, 217, 217, 0)", "#fbf2d4"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
          />

          {/* Decorative top-right assets — sama seperti Dashboard */}
          <LinearGradient
            style={styles.decoRight}
            locations={[0, 1]}
            colors={["rgba(113, 175, 125, 0)", "#0e4719"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Image
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              source={require("../../assets/images/deco-right.png")}
            />
          </LinearGradient>
          <LinearGradient
            style={styles.decoLeft}
            locations={[0, 1]}
            colors={["rgba(113, 175, 125, 0)", "#0e4719"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Image
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              source={require("../../assets/images/deco-left.png")}
            />
          </LinearGradient>
          <Image
            style={styles.plantImage}
            resizeMode="cover"
            source={require("../../assets/images/dashboard-plant.png")}
          />

          {/* Title */}
          <View style={styles.mulaiBertaniLebihPintarParent}>
            <Text style={[styles.mulaiBertaniLebih, styles.sobatPetaniTypo]}>
              Mulai bertani lebih pintar,
            </Text>
            <Text style={[styles.sobatPetani, styles.sobatPetaniTypo]}>
              Sobat Petani!
            </Text>
          </View>

          {/* Form section */}
          <View style={styles.gabungBersamaAgriUntukAkseParent}>
            <Text style={[styles.gabungBersamaAgri, styles.gabungBersamaAgriFlexBox]}>
              Gabung bersama Agri untuk akses grading AI dan langsung terhubung dengan pembeli besar.
            </Text>

            <View style={styles.frameParent}>
              <View style={[styles.frameGroup, styles.frameFlexBox1]}>

                {/* Email */}
                <View style={[styles.frameContainer, styles.frameFlexBox1]}>
                  <View style={[styles.fieldWrapper, styles.wrapperBorder]}>
                    <TextInput
                      style={[styles.fieldText, { flex: 1 }]}
                      placeholder="Email"
                      placeholderTextColor="#55835e"
                      value={email}
                      onChangeText={(v) => { setEmail(v); setEmailError(""); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!loading}
                    />
                  </View>
                  {emailError ? (
                    <Text style={styles.fieldError}>{emailError}</Text>
                  ) : null}
                </View>

                {/* Nama lengkap */}
                <View style={[styles.frameFlexBox1]}>
                  <View style={[styles.fieldWrapper, styles.wrapperBorder]}>
                    <TextInput
                      style={[styles.fieldText, { flex: 1 }]}
                      placeholder="Nama lengkap (sesuai KTP)"
                      placeholderTextColor="#55835e"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Nomor telepon */}
                <View style={[styles.frameFlexBox1]}>
                  <View style={[styles.fieldWrapper, styles.wrapperBorder]}>
                    <TextInput
                      style={[styles.fieldText, { flex: 1 }]}
                      placeholder="Nomor telepon"
                      placeholderTextColor="#55835e"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Lokasi pertanian — manual (kiri) + GPS (kanan) */}
                <View style={styles.locationRow}>
                  <View style={[styles.locationManual, styles.wrapperBorder]}>
                    <TextInput
                      style={[styles.fieldText, { flex: 1 }]}
                      placeholder="Lokasi pertanian"
                      placeholderTextColor="#55835e"
                      value={location}
                      onChangeText={setLocation}
                      autoCapitalize="words"
                      editable={!loading && !locLoading}
                    />
                    {location ? (
                      <TouchableOpacity onPress={() => setLocation("")}>
                        <Ionicons name="close-circle" size={18} color="#55835e" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.locationGps, styles.wrapperBorder]}
                    onPress={pickLocation}
                    disabled={locLoading || loading}
                    activeOpacity={0.8}
                  >
                    {locLoading
                      ? <ActivityIndicator size="small" color="#fbf2d4" />
                      : <>
                          <Ionicons name="location-outline" size={14} color="#fbf2d4" />
                          <Text style={styles.gpsBtnText}>GPS</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>

                {/* Password */}
                <View style={[styles.frameFlexBox1]}>
                  <View style={[styles.passwordParent, styles.wrapperBorder]}>
                    <TextInput
                      style={[styles.fieldText, { flex: 1 }]}
                      placeholder="Password"
                      placeholderTextColor="#55835e"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPw}
                      editable={!loading}
                    />
                    <TouchableOpacity onPress={() => setShowPw((v) => !v)}>
                      <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color="#55835e" />
                    </TouchableOpacity>
                  </View>
                </View>

              </View>

              {/* Register button + login link */}
              <View style={[styles.frameParent3, styles.frameFlexBox1]}>
                {generalError ? (
                  <Text style={styles.fieldError}>{generalError}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.registrasiWrapper, styles.wrapperBorder]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color="#fbf2d4" size="small" />
                    : <Text style={styles.registrasi}>REGISTRASI</Text>
                  }
                </TouchableOpacity>

                <Text style={[styles.sudahMemilikiAkunContainer, styles.lupaKataSandiTypo]}>
                  {"Sudah memiliki akun? "}
                  <Text
                    style={styles.loginLink}
                    onPress={() => navigation.navigate("Login")}
                  >
                    Login
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  register: {
    backgroundColor: "#fefdf9",
    overflow: "hidden",
    height: 852,
    width: "100%",
  },

  // Deco assets
  decoRight: {
    position: "absolute",
    left: 225,
    top: -92,
    width: 180,
    height: 220,
  },
  decoLeft: {
    position: "absolute",
    left: 152,
    top: -150,
    width: 160,
    height: 200,
  },
  plantImage: {
    position: "absolute",
    top: -69,
    left: 246,
    width: 203,
    height: 247,
  },

  // Title
  mulaiBertaniLebihPintarParent: {
    position: "absolute",
    top: 80,
    left: 23,
    width: 243,
    justifyContent: "flex-end",
    gap: 12,
    alignItems: "center",
  },
  sobatPetaniTypo: {
    fontFamily: "FacultyGlyphic_400Regular",
    textAlign: "left",
    color: "#0e4719",
    alignSelf: "stretch",
  },
  mulaiBertaniLebih: {
    fontSize: 32,
  },
  sobatPetani: {
    fontSize: 40,
  },

  // Form section
  gabungBersamaAgriUntukAkseParent: {
    position: "absolute",
    top: 310,
    left: 23,
    right: 23,
    alignItems: "flex-end",
    gap: 36,
  },
  gabungBersamaAgriFlexBox: {
    textAlign: "center",
    alignSelf: "stretch",
  },
  gabungBersamaAgri: {
    fontSize: 16,
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#0e4719",
    textAlign: "center",
  },
  frameParent: {
    gap: 24,
    alignItems: "center",
    alignSelf: "stretch",
  },
  frameGroup: {
    gap: 16,
  },
  frameFlexBox1: {
    alignItems: "flex-start",
    alignSelf: "stretch",
  },
  frameContainer: {
    gap: 4,
  },
  wrapperBorder: {
    padding: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#0e4719",
    borderStyle: "solid",
    borderRadius: 8,
    alignItems: "center",
  },
  fieldWrapper: {
    height: 41,
    justifyContent: "space-between",
    backgroundColor: "#dbe3dd",
    alignSelf: "stretch",
  },
  fieldText: {
    color: "#55835e",
    fontWeight: "600",
    fontFamily: "FacultyGlyphic_400Regular",
    fontSize: 14,
    textAlign: "left",
  },
  fieldError: {
    fontSize: 10,
    color: "#923333",
    fontWeight: "600",
    fontFamily: "FacultyGlyphic_400Regular",
    alignSelf: "stretch",
  },
  locationRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 8,
  },
  locationManual: {
    flex: 1,
    height: 41,
    backgroundColor: "#dbe3dd",
    justifyContent: "space-between",
  },
  locationGps: {
    height: 41,
    backgroundColor: "#0e4719",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  gpsBtnText: {
    fontSize: 12,
    fontFamily: "FacultyGlyphic_400Regular",
    fontWeight: "600",
    color: "#fbf2d4",
  },
  passwordParent: {
    height: 44,
    justifyContent: "space-between",
    backgroundColor: "#dbe3dd",
    alignSelf: "stretch",
  },
  lupaKataSandiTypo: {
    fontSize: 12,
    fontFamily: "FacultyGlyphic_400Regular",
    fontWeight: "600",
    color: "#0e4719",
  },
  frameParent3: {
    gap: 8,
  },
  registrasiWrapper: {
    backgroundColor: "#0e4719",
    justifyContent: "center",
    borderColor: "#0e4719",
    borderRadius: 8,
    alignSelf: "stretch",
  },
  registrasi: {
    fontWeight: "700",
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#fbf2d4",
    fontSize: 14,
    textAlign: "left",
  },
  sudahMemilikiAkunContainer: {
    textAlign: "center",
    alignSelf: "stretch",
  },
  loginLink: {
    textDecorationLine: "underline",
  },
});
