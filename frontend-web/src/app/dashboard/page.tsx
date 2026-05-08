"use client";
import { useEffect, useState } from "react";
import { sensorApi, marketplaceApi, transactionApi } from "@/lib/api";
import type { SensorNode, SensorReading, Transaction } from "@/types";

export default function DashboardPage() {
  const [nodes, setNodes] = useState<SensorNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [orders, setOrders] = useState<Transaction[]>([]);

  useEffect(() => {
    sensorApi.listNodes().then(setNodes).catch(console.error);
    transactionApi.listOrders().then(setOrders).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedNode) {
      sensorApi.getReadings(selectedNode, 20).then(setReadings).catch(console.error);
    }
  }, [selectedNode]);

  const latestReading = readings[0];

  return (
    <main className="min-h-screen bg-agri-bg p-6">
      <h1 className="text-2xl font-bold text-agri-green mb-6">Dashboard Lahan</h1>

      {/* Sensor Nodes */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Node Sensor</h2>
        <div className="flex gap-3 flex-wrap">
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedNode === node.id
                  ? "bg-agri-green text-white border-agri-green"
                  : "bg-white text-gray-700 border-gray-200 hover:border-agri-green"
              }`}
            >
              {node.name}
              <span className={`ml-2 w-2 h-2 inline-block rounded-full ${node.is_active ? "bg-green-400" : "bg-red-400"}`} />
            </button>
          ))}
          {nodes.length === 0 && <p className="text-gray-500 text-sm">Belum ada node sensor terdaftar.</p>}
        </div>
      </section>

      {/* Latest Reading */}
      {latestReading && (
        <section className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Suhu", value: `${latestReading.temperature ?? "-"}°C`, warn: latestReading.is_anomaly },
            { label: "Kelembapan", value: `${latestReading.humidity ?? "-"}%`, warn: false },
            { label: "Kelembapan Tanah", value: `${latestReading.soil_moisture ?? "-"}%`, warn: false },
            { label: "pH", value: `${latestReading.ph ?? "-"}`, warn: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${item.warn ? "border-red-400" : "border-agri-light"}`}
            >
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-agri-green">{item.value}</p>
            </div>
          ))}
        </section>
      )}

      {/* Recent Orders */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Pesanan Terbaru</h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Jumlah (kg)</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">{order.quantity_kg} kg</td>
                  <td className="px-4 py-3">Rp {order.total_amount.toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.status === "completed" ? "bg-green-100 text-green-700" :
                      order.status === "cancelled" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Belum ada pesanan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
