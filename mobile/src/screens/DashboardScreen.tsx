import * as React from "react";
import { StyleSheet, View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function DashboardScreen() {
  return (
    <View style={styles.dashboard}>
      <LinearGradient
        style={styles.dashboardChild}
        locations={[0, 1]}
        colors={["rgba(217, 217, 217, 0)", "#fbf2d4"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <Text style={[styles.siang, styles.siangPosition]}>Siang!</Text>
      <Text style={[styles.sobatPetani, styles.siangPosition]}>Sobat Petani</Text>

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
              <Image style={styles.icontemp} resizeMode="cover" />
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
              <Image style={styles.iconph} resizeMode="cover" />
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
              <Image style={styles.iconhumid} resizeMode="cover" />
              <Text style={[styles.text3, styles.text3Typo]}>50%</Text>
            </View>
            <Text style={[styles.ph, styles.phTypo]}>Humidity</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Sensor row 2 */}
      <View style={[styles.frameParent, styles.frameParentRow2]}>
        <LinearGradient
          style={[styles.frameWrapper, styles.wrapperLayout]}
          locations={[0, 1]}
          colors={["#d3e6d7", "#9fc0a6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={[styles.frameGroup, styles.frameLayout1]}>
            <View style={styles.icontempParent}>
              <Image style={styles.icontemp} resizeMode="cover" />
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
              <Image style={styles.iconph} resizeMode="cover" />
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
              <Image style={styles.iconhumid} resizeMode="cover" />
              <Text style={[styles.text3, styles.text3Typo]}>50%</Text>
            </View>
            <Text style={[styles.ph, styles.phTypo]}>Humidity</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={[styles.hargaTerkiniParent, styles.parentLayout]}>
        <Text style={[styles.hargaTerkini, styles.text3Typo]}>Harga Terkini</Text>
        <Text style={[styles.terakhirDiperbarui4, styles.saldoAndaTypo]}>
          Terakhir diperbarui 4 menit lalu
        </Text>
      </View>

      <View style={[styles.monitorTanamanParent, styles.parentFlexBox1]}>
        <Text style={[styles.hargaTerkini, styles.text3Typo]}>Monitor Tanaman</Text>
        <Text style={[styles.kangkung, styles.text3Typo]}>Kangkung</Text>
      </View>

      {/* Balance card */}
      <View style={styles.frameParent7}>
        <View style={styles.rp20140340Parent}>
          <Text style={styles.rp20140340}>Rp20.140.340</Text>
          <Text style={[styles.saldoAnda, styles.kgTypo]}>Saldo Anda</Text>
        </View>
        <View style={styles.frameParent8}>
          <View style={[styles.frameParent9, styles.frameParentLayout]}>
            <View style={[styles.iconbanknoteWrapper, styles.wrapperFlexBox]}>
              <Image style={styles.iconbanknote} resizeMode="cover" />
            </View>
            <Text style={[styles.keuangan, styles.phTypo]}>Keuangan</Text>
          </View>
          <View style={styles.frameParentLayout}>
            <View style={[styles.iconbanknoteWrapper, styles.wrapperFlexBox]}>
              <Image style={styles.iconbanknote} resizeMode="cover" />
            </View>
            <Text style={[styles.tarikTunai, styles.tarikTunaiTypo]}>Tarik Tunai</Text>
          </View>
        </View>
      </View>

      {/* Navbar */}
      <View style={styles.navbar}>
        <View style={styles.navbarInner}>
          <View style={[styles.frameParent11, styles.frameLayout1]}>
            <View style={styles.frameParent12}>
              <View style={[styles.icondashboardParent, styles.parentFlexBox1]}>
                <Image style={styles.iconbanknote} resizeMode="cover" />
                <Text style={[styles.dashboard2, styles.phTypo]}>Dashboard</Text>
              </View>
              <View style={styles.parentFlexBox1}>
                <Image style={styles.iconbanknote} resizeMode="cover" />
                <Text style={[styles.dashboard2, styles.phTypo]}>Notification</Text>
              </View>
            </View>
            <View style={styles.frameParent12}>
              <View style={[styles.icondashboardParent, styles.parentFlexBox1]}>
                <Image style={styles.iconbanknote} resizeMode="cover" />
                <Text style={[styles.dashboard2, styles.phTypo]}>Diagnosis</Text>
              </View>
              <View style={styles.parentFlexBox1}>
                <Image style={styles.iconbanknote} resizeMode="cover" />
                <Text style={[styles.dashboard2, styles.phTypo]}>Notification</Text>
              </View>
            </View>
          </View>
        </View>
        <LinearGradient
          style={[styles.navbarChild, styles.wrapperLayout]}
          locations={[0, 1]}
          colors={["#0e4719", "#062f0e"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <LinearGradient
            style={[styles.iconcameraWrapper, styles.wrapperFlexBox]}
            locations={[0, 0.42]}
            colors={["#a69e84", "#fbf2d4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Image style={styles.iconcamera} resizeMode="cover" />
          </LinearGradient>
        </LinearGradient>
      </View>

      {/* Price card */}
      <View style={[styles.groupView, styles.parentLayout]}>
        <LinearGradient
          style={[styles.wrapper, styles.iconLayout]}
          locations={[0, 1]}
          colors={["rgba(231, 237, 232, 0)", "#e7ede8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <Image style={styles.iconLayout} resizeMode="cover" />
        </LinearGradient>
        <View style={styles.frameParent14}>
          <View style={styles.rp3540Parent}>
            <Text style={[styles.rp3540, styles.textTypo1]}>Rp3.540</Text>
            <Text style={[styles.kg, styles.kgTypo]}>/kg</Text>
          </View>
          <View style={styles.parent}>
            <Text style={[styles.text7, styles.kgTypo]}>10%</Text>
            <Image style={styles.iconincrease} resizeMode="cover" />
          </View>
        </View>
      </View>

      <View style={[styles.komoditasParent, styles.parentFlexBox]}>
        <Text style={[styles.kg, styles.kgTypo]}>Komoditas</Text>
        <Image style={styles.iconbanknote} resizeMode="cover" />
      </View>

      <Image style={styles.dashboardItem} resizeMode="cover" />

      <LinearGradient
        style={[styles.container, styles.iconLayout]}
        locations={[0, 1]}
        colors={["rgba(113, 175, 125, 0)", "#0e4719"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Image style={styles.iconLayout} resizeMode="cover" />
      </LinearGradient>

      <LinearGradient
        style={[styles.frame, styles.frameLayout]}
        locations={[0, 1]}
        colors={["rgba(113, 175, 125, 0)", "#0e4719"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Image style={styles.frameLayout} resizeMode="cover" />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  siangPosition: {
    left: 23,
    textAlign: "left",
    color: "#0e4719",
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
  frameLayout: {
    height: "100%",
    backgroundColor: "transparent",
    width: "100%",
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
    textAlign: "left",
    color: "#0e4719",
  },
  sobatPetani: {
    top: 115,
    fontSize: 40,
    textAlign: "left",
    color: "#0e4719",
  },
  frameParent: {
    marginLeft: -173,
    top: 347,
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
    textAlign: "center",
    color: "#0e4719",
  },
  iconph: {
    height: 23,
    width: 23,
  },
  ph: {
    alignSelf: "stretch",
    textAlign: "center",
    color: "#0e4719",
  },
  iconhumidParent: {
    gap: 8,
    alignItems: "center",
    flexDirection: "row",
  },
  iconhumid: {
    width: 22,
    height: 22,
  },
  text3: {
    fontWeight: "500",
    color: "#0e4719",
  },
  hargaTerkiniParent: {
    top: 447,
    gap: 20,
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexDirection: "row",
    position: "absolute",
  },
  hargaTerkini: {
    color: "#0e4719",
  },
  terakhirDiperbarui4: {
    fontWeight: "600",
    fontSize: 12,
    textAlign: "left",
    color: "#0e4719",
  },
  monitorTanamanParent: {
    top: 312,
    left: 24,
    gap: 6,
    flexDirection: "row",
    position: "absolute",
  },
  kangkung: {},
  frameParent7: {
    marginLeft: -202,
    top: 198,
    borderRadius: 14,
    backgroundColor: "#44694b",
    borderColor: "#669e71",
    borderWidth: 2,
    width: 405,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 36,
    justifyContent: "center",
    left: "50%",
    overflow: "hidden",
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
  rp20140340Parent: {
    gap: 4,
    justifyContent: "center",
  },
  rp20140340: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "left",
    color: "#fbf2d4",
  },
  saldoAnda: {
    color: "#fbf2d4",
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
  iconbanknoteWrapper: {
    height: 49,
    backgroundColor: "#fbf2d4",
    borderWidth: 1,
    paddingLeft: 11,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 11,
    borderRadius: 8,
    alignSelf: "stretch",
  },
  iconbanknote: {
    height: 24,
    width: 24,
  },
  keuangan: {
    color: "#fbf2d4",
    fontWeight: "600",
    alignSelf: "stretch",
  },
  tarikTunai: {
    color: "#fbf2d4",
    fontWeight: "600",
    alignSelf: "stretch",
  },
  navbar: {
    top: 734,
    height: 118,
    width: 393,
    left: 0,
    position: "absolute",
  },
  navbarInner: {
    height: "67.8%",
    top: "32.2%",
    right: "0%",
    bottom: "0%",
    left: "0%",
    backgroundColor: "#0e4719",
    paddingHorizontal: 13,
    paddingTop: 16,
    paddingBottom: 20,
    justifyContent: "space-between",
    alignItems: "center",
    position: "absolute",
    width: "100%",
  },
  frameParent11: {
    gap: 20,
    justifyContent: "space-between",
    flexDirection: "row",
  },
  frameParent12: {
    gap: 20,
    alignItems: "center",
    flexDirection: "row",
  },
  icondashboardParent: {
    width: 63,
  },
  dashboard2: {
    color: "#fbf2d4",
    textAlign: "center",
  },
  navbarChild: {
    height: "55.51%",
    width: "21.5%",
    top: "0%",
    right: "40.33%",
    bottom: "44.49%",
    left: "38.17%",
    paddingLeft: 9,
    paddingTop: 6,
    paddingRight: 10,
    paddingBottom: 7,
    position: "absolute",
  },
  iconcameraWrapper: {
    width: 66,
    height: 53,
    borderWidth: 3,
    paddingHorizontal: 9,
    paddingBottom: 5,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  iconcamera: {
    height: 40,
    width: 40,
  },
  groupView: {
    top: 534,
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
    fontWeight: "600",
    color: "#0e4719",
  },
  kg: {
    fontWeight: "600",
    color: "#0e4719",
  },
  parent: {
    gap: 4,
    alignItems: "center",
    flexDirection: "row",
  },
  text7: {
    color: "#d94e4e",
    fontWeight: "600",
  },
  iconincrease: {
    height: 20,
    width: 20,
  },
  komoditasParent: {
    top: 482,
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
    position: "absolute",
  },
  frame: {
    left: 152,
    top: -150,
    position: "absolute",
  },
});
