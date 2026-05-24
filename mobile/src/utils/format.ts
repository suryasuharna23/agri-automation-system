export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
};

export const formatKg = (value: number) =>
  `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value)} kg`;

export const orderStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Menunggu konfirmasi",
    confirmed: "Dikonfirmasi",
    processing: "Diproses",
    completed: "Selesai",
    cancelled: "Dibatalkan",
  };
  return labels[status] ?? status;
};
