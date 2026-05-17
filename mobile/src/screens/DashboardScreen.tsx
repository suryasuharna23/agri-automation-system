import * as React from "react";
import { useState, useEffect } from "react";
import {
  StyleSheet, View, Text, Image,
  TouchableOpacity, Pressable, Modal, FlatList,
  ActivityIndicator, Dimensions, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import {
  getCommodityList,
  getCommodityPriceHistory,
  type CommodityPriceHistory,
} from "../services/commodityService";

const CHART_WIDTH = Dimensions.get("window").width - 48;

export default function DashboardScreen() {
  const [commodities, setCommodities] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [history, setHistory] = useState<CommodityPriceHistory | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCommodityList().then((list) => {
      setCommodities(list);
      if (list.length > 0) setSelected(list[0]);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getCommodityPriceHistory(selected)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <ScrollView
      style={styles.scrollRoot}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
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

      {/* Komoditas dropdown */}
      <Pressable
        style={[styles.komoditasParent, styles.parentFlexBox]}
        onPress={() => setDropdownOpen(true)}
      >
        <Text style={[styles.kg, styles.kgTypo]}>{selected || "Komoditas"}</Text>
        <Ionicons name="chevron-down" size={20} color="#0e4719" />
      </Pressable>

      {/* Dropdown modal */}
      <Modal visible={dropdownOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        >
          <View style={styles.dropdownList} onStartShouldSetResponder={() => true}>
            <FlatList
              data={commodities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    item === selected && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelected(item);
                    setDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      item === selected && styles.dropdownItemTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Harga terkini header */}
      <View style={[styles.hargaTerkiniParent, styles.parentLayout]}>
        <Text style={[styles.hargaTerkini, styles.text3Typo]}>Harga Terkini</Text>
        <Text style={[styles.terakhirDiperbarui4, styles.saldoAndaTypo]}>
          Terakhir diperbarui 4 menit lalu
        </Text>
      </View>

      {/* Price chart card */}
      <View style={[styles.groupView, styles.parentLayout]}>
        <LinearGradient
          style={[styles.wrapper, styles.iconLayout]}
          locations={[0, 1]}
          colors={["#e7ede8", "#d3dcd3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {loading ? (
          <ActivityIndicator
            style={styles.chartLoader}
            size="large"
            color="#0e4719"
          />
        ) : history ? (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <View style={styles.priceRow}>
                <Text style={[styles.rp3540, styles.textTypo1]}>
                  Rp{history.currentPrice.toLocaleString("id-ID")}
                </Text>
                <Text style={[styles.kg, styles.kgTypo]}>/kg</Text>
              </View>
              <View style={styles.changeRow}>
                <Text
                  style={[
                    styles.changeText,
                    { color: history.changePercent >= 0 ? "#d94e4e" : "#22c55e" },
                  ]}
                >
                  {history.changePercent >= 0 ? "+" : ""}
                  {history.changePercent}%
                </Text>
                <Ionicons
                  name={history.changePercent >= 0 ? "trending-up" : "trending-down"}
                  size={16}
                  color={history.changePercent >= 0 ? "#d94e4e" : "#22c55e"}
                />
              </View>
            </View>
            <LineChart
              data={{
                labels: history.data.map((d) => d.date),
                datasets: [{ data: history.data.map((d) => d.price) }],
              }}
              width={CHART_WIDTH}
              height={130}
              chartConfig={{
                backgroundColor: "transparent",
                backgroundGradientFrom: "#e7ede8",
                backgroundGradientTo: "#d3dcd3",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(14, 71, 25, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(14, 71, 25, ${opacity})`,
                propsForDots: { r: "3", strokeWidth: "1", stroke: "#0e4719" },
              }}
              bezier
              withInnerLines={false}
              style={{ borderRadius: 8, marginTop: 4 }}
            />
          </View>
        ) : (
          <Text style={styles.chartPlaceholder}>Pilih komoditas</Text>
        )}
      </View>
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  siangPosition: {
    left: 23,
    textAlign: "left",
    color: "#0e4719",
    fontFamily: "FacultyGlyphic_400Regular",
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
    fontFamily: "FacultyGlyphic_400Regular",
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
    fontFamily: "FacultyGlyphic_400Regular",
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
  scrollRoot: {
    flex: 1,
    backgroundColor: "#fefdf9",
  },
  scrollContent: {
    flexGrow: 1,
  },
  dashboard: {
    height: 852,
    backgroundColor: "#fefdf9",
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
    fontFamily: "FacultyGlyphic_400Regular",
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
    fontFamily: "FacultyGlyphic_400Regular",
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
    fontFamily: "FacultyGlyphic_400Regular",
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
    fontFamily: "FacultyGlyphic_400Regular",
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
    fontFamily: "FacultyGlyphic_400Regular",
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
    fontFamily: "FacultyGlyphic_400Regular",
    fontWeight: "600",
    textAlign: "left",
    color: "#fbf2d4",
    alignSelf: "flex-start",
  },
  saldoAnda: {
    color: "#fbf2d4",
    alignSelf: "flex-start",
    fontFamily: "FacultyGlyphic_400Regular",
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
    fontFamily: "FacultyGlyphic_400Regular",
    fontWeight: "600",
    alignSelf: "stretch",
  },
  tarikTunai: {
    color: "#fbf2d4",
    fontFamily: "FacultyGlyphic_400Regular",
    fontWeight: "600",
    alignSelf: "stretch",
  },
  groupView: {
    top: 538,
    height: 220,
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
    fontFamily: "FacultyGlyphic_400Regular",
    fontWeight: "600",
    color: "#0e4719",
  },
  kg: {
    fontFamily: "FacultyGlyphic_400Regular",
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
    fontFamily: "FacultyGlyphic_400Regular",
  },
  iconincrease: {
    height: 20,
    width: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: 280,
    maxHeight: 240,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f3f0",
  },
  dropdownItemActive: {
    backgroundColor: "#f0f3f0",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#1e3c22",
    fontWeight: "500",
  },
  dropdownItemTextActive: {
    color: "#0e4719",
    fontWeight: "700",
  },
  chartContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  chartLoader: {
    flex: 1,
    justifyContent: "center",
  },
  chartPlaceholder: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#8a9e8d",
    fontSize: 14,
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
});
