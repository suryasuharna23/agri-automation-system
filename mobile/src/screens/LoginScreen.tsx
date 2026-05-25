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
import { authApi } from "../services/api";

export default function LoginScreen({ onLogin }: { onLogin?: () => void }) {
  const navigation = useNavigation<any>();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await authApi.login(email.trim(), password);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));
      onLogin?.();
    } catch {
      setError("Email atau password salah.");
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
        <View style={styles.login}>
          <LinearGradient
            style={styles.loginChild}
            locations={[0, 1]}
            colors={["rgba(217, 217, 217, 0)", "#fbf2d4"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
          />

          <View style={styles.selamatDatangKembaliParent}>
            <Text style={[styles.selamatDatangKembali, styles.sobatPetaniTypo]}>
              Selamat {"\n"}datang kembali,
            </Text>
            <Text style={[styles.sobatPetani, styles.sobatPetaniTypo]}>
              Sobat Petani!
            </Text>
          </View>

          <View style={styles.masukUntukMemantauLahanMeParent}>
            <Text style={[styles.masukUntukMemantau, styles.masukUntukMemantauFlexBox]}>
              Masuk untuk memantau lahan, mengelola hasil panen, dan melanjutkan aktivitas pertanianmu.
            </Text>

            <View style={styles.frameParent}>
              <View style={[styles.frameGroup, styles.frameFlexBox1]}>

                {/* Email */}
                <View style={[styles.frameContainer, styles.frameFlexBox]}>
                  <View style={[styles.usernameWrapper, styles.wrapperBorder]}>
                    <TextInput
                      style={[styles.username, styles.usernameTypo, { flex: 1 }]}
                      placeholder="Email"
                      placeholderTextColor="#55835e"
                      value={email}
                      onChangeText={(v) => { setEmail(v); setError(""); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!loading}
                    />
                  </View>
                  {error ? (
                    <Text style={[styles.usernameTidakDitemukan, styles.usernameTypo]}>
                      {error}
                    </Text>
                  ) : null}
                </View>

                {/* Password */}
                <View style={[styles.frameView, styles.frameFlexBox]}>
                  <View style={[styles.passwordParent, styles.wrapperBorder]}>
                    <TextInput
                      style={[styles.username, styles.usernameTypo, { flex: 1 }]}
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
                  <TouchableOpacity>
                    <Text style={[styles.lupaKataSandi, styles.lupaKataSandiTypo]}>
                      Lupa kata sandi?
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>

              {/* Login button + register link */}
              <View style={[styles.frameParent2, styles.frameFlexBox1]}>
                <TouchableOpacity
                  style={[styles.loginWrapper, styles.wrapperBorder]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color="#fbf2d4" size="small" />
                    : <Text style={styles.login2}>LOGIN</Text>
                  }
                </TouchableOpacity>

                <Text style={[styles.belumPunyaAkunContainer, styles.lupaKataSandiTypo]}>
                  {"Belum punya akun Agri? "}
                  <Text
                    style={styles.daftarDiSini}
                    onPress={() => navigation.navigate("Register")}
                  >
                    Daftar di sini
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Decorative assets — sama seperti Dashboard */}
          <Image
            style={styles.loginItem}
            resizeMode="contain"
            source={require("../../assets/images/plant upside down.png")}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sobatPetaniTypo: {
    fontFamily: "FacultyGlyphic_400Regular",
    textAlign: "left",
    color: "#0e4719",
    alignSelf: "stretch",
  },
  masukUntukMemantauFlexBox: {
    textAlign: "justify",
    alignSelf: "stretch",
  },
  frameFlexBox1: {
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  frameFlexBox: {
    alignSelf: "stretch",
    alignItems: "flex-start",
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
  usernameTypo: {
    fontFamily: "FacultyGlyphic_400Regular",
    textAlign: "left",
  },
  lupaKataSandiTypo: {
    fontSize: 12,
    fontFamily: "Lato_400Regular",
    fontWeight: "600",
    color: "#0e4719",
  },
  login: {
    backgroundColor: "#fefdf9",
    overflow: "hidden",
    height: 852,
    width: "100%",
  },
  loginChild: {
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    position: "absolute",
    height: 852,
  },
  selamatDatangKembaliParent: {
    top: 80,
    width: 243,
    gap: 12,
    alignItems: "flex-start",
    left: 23,
    position: "absolute",
    zIndex: 1,
  },
  selamatDatangKembali: {
    fontSize: 32,
    textAlign: "left",
    color: "#0e4719",
  },
  sobatPetani: {
    fontSize: 40,
    textAlign: "left",
    color: "#0e4719",
  },
  masukUntukMemantauLahanMeParent: {
    top: 481,
    left: 23,
    right: 23,
    alignItems: "flex-end",
    gap: 36,
    position: "absolute",
    zIndex: 1,
  },
  masukUntukMemantau: {
    fontSize: 16,
    fontFamily: "Lato_400Regular",
    color: "#0e4719",
  },
  frameParent: {
    gap: 24,
    alignItems: "center",
    alignSelf: "stretch",
  },
  frameGroup: {
    gap: 16,
  },
  frameContainer: {
    gap: 4,
  },
  usernameWrapper: {
    height: 41,
    justifyContent: "space-between",
    backgroundColor: "#dbe3dd",
    alignSelf: "stretch",
  },
  username: {
    color: "#55835e",
    fontWeight: "600",
    fontSize: 14,
  },
  usernameTidakDitemukan: {
    fontSize: 10,
    color: "#923333",
    fontWeight: "600",
    fontFamily: "FacultyGlyphic_400Regular",
    alignSelf: "stretch",
  },
  frameView: {
    gap: 6,
  },
  passwordParent: {
    height: 44,
    justifyContent: "space-between",
    backgroundColor: "#dbe3dd",
    alignSelf: "stretch",
  },
  lupaKataSandi: {
    alignSelf: "stretch",
    textAlign: "left",
  },
  frameParent2: {
    gap: 8,
  },
  loginWrapper: {
    backgroundColor: "#0e4719",
    justifyContent: "center",
    borderColor: "#0e4719",
    borderRadius: 8,
    alignSelf: "stretch",
  },
  login2: {
    fontWeight: "700",
    color: "#fbf2d4",
    fontSize: 14,
    fontFamily: "Lato_400Regular",
  },
  belumPunyaAkunContainer: {
    textAlign: "center",
    alignSelf: "stretch",
  },
  daftarDiSini: {
    textDecorationLine: "underline",
  },

  // Deco assets — posisi & ukuran sama dengan Dashboard
  loginItem: {
    position: "absolute",
    top: 0,
    right: -18,
    width: 203,
    height: 247,
    zIndex: 0,
    pointerEvents: "none",
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
});
