import * as React from "react";
import { StyleSheet, View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function DashboardScreen() {
  return (
    <View style={styles.dashboard}>
      <LinearGradient
        style={styles.dashboardChild}
        locations={[0, 1]}
        colors={["rgba(217, 217, 217, 0)", "#fbf2d4"]}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
      />

      {/* Decorative top elements */}
      <LinearGradient
        style={styles.container}
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
        style={styles.frame}
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
        style={styles.dashboardItem}
        resizeMode="cover"
        source={require("../../assets/images/dashboard-plant.png")}
      />

      {/* Greeting */}
      <Text style={[styles.siang, styles.siangPosition]}>Siang!</Text>
      <Text style={[styles.sobatPetani, styles.siangPosition]}>Sobat Petani</Text>

      {/* Balance card */}
      <View style={styles.frameParent7}>
        <View style={styles.rp20140340Parent}>
          <Text style={styles.rp20140340}>Rp20.140.340</Text>
          <Text style={[styles.saldoAnda, styles.kgTypo]}>Saldo Anda</Text>
        </View>
        <View style={styles.frameParent8}>
          <View style={[styles.frameParent9, styles.frameParentLayout]}>
            <View style={[styles.iconbanknoteWrapper, styles.wrapperFlexBox]}>
              <Image
                style={styles.iconbanknote}
                resizeMode="cover"
                source={require("../../assets/icons/icon-banknote.png")}
              />
            </View>
            <Text style={[styles.keuangan, styles.phTypo]}>Keuangan</Text>
          </View>
          <View style={[styles.frameParent10, styles.frameParentLayout]}>
            <View style={[styles.iconbanknoteWrapper, styles.wrapperFlexBox]}>
              <Ionicons name="arrow-down-circle-outline" size={24} color="#44694b" />
            </View>
            <Text style={[styles.tarikTunai, styles.tarikTunaiTypo]}>Tarik Tunai</Text>
          </View>
        </View>
      </View>

      {/* Monitor tanaman label */}
      <View style={[styles.monitorTanamanParent, styles.parentFlexBox1]}>
        <Text style={[styles.hargaTerkini, styles.text3Typo]}>Monitor Tanaman</Text>
        <Text style={[styles.kangkung, styles.text3Typo]}>Kangkung</Text>
      </View>

      {/* Sensor row 1 */}
      <View style={styles.frameParent}>
        <LinearGradient
          style={[styles.frameWrapper, styles.wrapperLayout]}
          locations={[0, 1]}
          colors={["#d3e6d7", "#9fc0a6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={[styles.frameGroup, styles.frameLayout1]}>
            <View style={styles.icontempParent}>
              <Image
                style={styles.icontemp}
                resizeMode="cover"
                source={require("../../assets/icons/icon-temp.png")}
              />
              <Text style={[styles.text, styles.textTypo]}>21°</Text>
            </View>
            <Text style={[styles.suhu, styles.phTypo]}>Suhu</Text>
          </View>
        </LinearGradient>
        <LinearGradient
          style={[styles.frameWrapper, styles.wrapperLayout]}
          locations={[0, 1]}
          colors={["#d3e6d7", "#9fc0a6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={[styles.frameGroup, styles.frameLayout1]}>
            <View style={styles.icontempParent}>
              <Image
                style={styles.iconph}
                resizeMode="cover"
                source={require("../../assets/icons/icon-ph.png")}
              />
              <Text style={[styles.text, styles.textTypo]}>7</Text>
            </View>
            <Text style={[styles.ph, styles.phTypo]}>pH</Text>
          </View>
        </LinearGradient>
        <LinearGradient
          style={[styles.frameWrapper, styles.wrapperLayout]}
          locations={[0, 1]}
          colors={["#d3e6d7", "#9fc0a6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={[styles.frameGroup, styles.frameLayout1]}>
            <View style={styles.iconhumidParent}>
              <Image
                style={styles.iconhumid}
                resizeMode="cover"
                source={require("../../assets/icons/icon-humid.png")}
              />
              <Text style={[styles.text3, styles.text3Typo]}>50%</Text>
            </View>
            <Text style={[styles.ph, styles.phTypo]}>Humidity</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Komoditas filter */}
      <View style={[styles.komoditasParent, styles.parentFlexBox]}>
        <Text style={[styles.kg, styles.kgTypo]}>Komoditas</Text>
        <Ionicons name="chevron-down" size={20} color="#0e4719" />
      </View>

      {/* Harga terkini header */}
      <View style={[styles.hargaTerkiniParent, styles.parentLayout]}>
        <Text style={[styles.hargaTerkini, styles.text3Typo]}>Harga Terkini</Text>
        <Text style={[styles.terakhirDiperbarui4, styles.saldoAndaTypo]}>
          Terakhir diperbarui 4 menit lalu
        </Text>
      </View>

      {/* Price card */}
      <View style={[styles.groupView, styles.parentLayout]}>
        <LinearGradient
          style={[styles.wrapper, styles.iconLayout]}
          locations={[0, 1]}
          colors={["#e7ede8", "#d3dcd3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.frameParent14}>
          <View style={styles.rp3540Parent}>
            <Text style={[styles.rp3540, styles.textTypo1]}>Rp3.540</Text>
            <Text style={[styles.kg, styles.kgTypo]}>/kg</Text>
          </View>
          <View style={styles.parent}>
            <Text style={[styles.text7, styles.kgTypo]}>10%</Text>
            <Image
              style={styles.iconincrease}
              resizeMode="cover"
              source={require("../../assets/icons/icon-increase.png")}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  siangPosition: {
    left: 23,
    textAlign: "left",
    color: "#0e4719",
    fontFamily: "Faculty Glyphic",
    position: "absolute",
  },
  wrapperLayout: {
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  frameLayout1: {
    maxWidth: "100%",
    alignItems: "center",
    width: "100%",
  },
  textTypo: {
    fontFamily: "Lato-Light",
    fontWeight: "500",
    color: "#0e4719",
  },
  phTypo: {
    textAlign: "center",
    fontSize: 12,
  },
  text3Typo: {
    fontSize: 20,
    textAlign: "left",
  },
  parentLayout: {
    width: 345,
    left: 24,
  },
  saldoAndaTypo: {
    fontFamily: "Lato-BoldItalic",
    fontStyle: "italic",
  },
  parentFlexBox1: {
    gap: 6,
    alignItems: "center",
  },
  parentFlexBox: {
    borderStyle: "solid",
    alignItems: "center",
    flexDirection: "row",
    position: "absolute",
  },
  kgTypo: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "left",
  },
  frameParentLayout: {
    width: 57,
    gap: 4,
  },
  wrapperFlexBox: {
    borderColor: "transparent",
    borderStyle: "solid",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  tarikTunaiTypo: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "left",
  },
  iconLayout: {
    height: "100%",
    backgroundColor: "transparent",
    width: "100%",
  },
  textTypo1: {
    fontSize: 24,
    textAlign: "left",
  },
  dashboard: {
    height: 852,
    backgroundColor: "#fefdf9",
    overflow: "hidden",
    width: "100%",
  },
  dashboardChild: {
    height: 216,
    backgroundColor: "transparent",
    width: 393,
    left: 0,
    top: 0,
    position: "absolute",
  },
  siang: {
    top: 73,
    fontSize: 32,
  },
  sobatPetani: {
    top: 115,
    fontSize: 40,
  },
  frameParent: {
    marginLeft: -173,
    top: 356,
    width: 346,
    gap: 19,
    alignItems: "center",
    flexDirection: "row",
    left: "50%",
    position: "absolute",
  },
  frameParentRow2: {
    top: 450,
  },
  frameWrapper: {
    height: 90,
    flex: 1,
    paddingLeft: 21,
    paddingTop: 14,
    paddingRight: 22,
    paddingBottom: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  frameGroup: {
    gap: 10,
  },
  icontempParent: {
    gap: 12,
    alignSelf: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  icontemp: {
    width: 9,
    height: 22,
  },
  text: {
    fontSize: 24,
    textAlign: "left",
  },
  suhu: {
    fontFamily: "Lato-Regular",
    textAlign: "center",
    alignSelf: "center",
    color: "#0e4719",
  },
  iconph: {
    height: 23,
    width: 23,
  },
  ph: {
    alignSelf: "stretch",
    fontFamily: "Lato-Regular",
    textAlign: "center",
    color: "#0e4719",
  },
  iconhumidParent: {
    gap: 8,
    alignSelf: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  iconhumid: {
    width: 22,
    height: 22,
  },
  text3: {
    fontFamily: "Lato-Light",
    fontWeight: "500",
    color: "#0e4719",
  },
  hargaTerkiniParent: {
    top: 456,
    gap: 20,
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexDirection: "row",
    position: "absolute",
  },
  hargaTerkini: {
    color: "#0e4719",
    fontFamily: "Faculty Glyphic",
  },
  terakhirDiperbarui4: {
    fontWeight: "600",
    fontSize: 12,
    textAlign: "left",
    color: "#0e4719",
  },
  monitorTanamanParent: {
    top: 320,
    left: 24,
    gap: 6,
    flexDirection: "row",
    position: "absolute",
  },
  kangkung: {
    fontSize: 20,
    textAlign: "left",
    fontFamily: "Faculty Glyphic",
    color: "#0e4719",
  },
  frameParent7: {
    top: 198,
    left: 0,
    right: 0,
    borderRadius: 14,
    backgroundColor: "#44694b",
    borderColor: "#669e71",
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 24,
    justifyContent: "space-between",
    overflow: "hidden",
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
  rp20140340Parent: {
    gap: 4,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  rp20140340: {
    fontSize: 24,
    fontFamily: "Lato-Bold",
    fontWeight: "600",
    textAlign: "left",
    color: "#fbf2d4",
    alignSelf: "flex-start",
  },
  saldoAnda: {
    color: "#fbf2d4",
    alignSelf: "flex-start",
    fontFamily: "Lato-BoldItalic",
    fontStyle: "italic",
  },
  frameParent8: {
    gap: 16,
    alignItems: "center",
    flexDirection: "row",
  },
  frameParent9: {
    alignItems: "center",
  },
  frameParent10: {
    alignItems: "flex-start",
  },
  iconbanknoteWrapper: {
    height: 40,
    backgroundColor: "#fbf2d4",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    width: "100%",
  },
  iconbanknote: {
    height: 24,
    width: 24,
  },
  keuangan: {
    color: "#fbf2d4",
    fontFamily: "Lato-Bold",
    fontWeight: "600",
    alignSelf: "stretch",
  },
  tarikTunai: {
    color: "#fbf2d4",
    fontFamily: "Lato-Bold",
    fontWeight: "600",
    alignSelf: "stretch",
  },
  groupView: {
    top: 538,
    height: 195,
    position: "absolute",
  },
  wrapper: {
    left: 0,
    top: 0,
    height: "100%",
    position: "absolute",
  },
  frameParent14: {
    top: 9,
    left: 220,
    width: 117,
    gap: 4,
    alignItems: "flex-end",
    position: "absolute",
  },
  rp3540Parent: {
    gap: 2,
    alignItems: "flex-end",
    alignSelf: "stretch",
    justifyContent: "center",
    flexDirection: "row",
  },
  rp3540: {
    fontFamily: "Lato-Bold",
    fontWeight: "600",
    color: "#0e4719",
  },
  kg: {
    fontFamily: "Lato-Bold",
    color: "#0e4719",
  },
  parent: {
    alignSelf: "flex-end",
    gap: 4,
    alignItems: "center",
    flexDirection: "row",
  },
  text7: {
    color: "#d94e4e",
    fontFamily: "Lato-Bold",
  },
  iconincrease: {
    height: 20,
    width: 20,
  },
  komoditasParent: {
    top: 490,
    backgroundColor: "#dbe3dd",
    borderColor: "#0e4719",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 20,
    justifyContent: "space-between",
    width: 345,
    left: 24,
  },
  dashboardItem: {
    top: -69,
    left: 246,
    width: 203,
    height: 247,
    position: "absolute",
  },
  container: {
    left: 225,
    top: -92,
    width: 180,
    height: 220,
    position: "absolute",
  },
  frame: {
    left: 152,
    top: -150,
    width: 160,
    height: 200,
    position: "absolute",
  },
  frameParentRow2: {
    top: 450,
  },
});
