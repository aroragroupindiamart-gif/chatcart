import { useGetOrder } from "@workspace/api-client-react";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface OrderItem {
  id: number;
  productNameSnapshot: string;
  priceSnapshot: string;
  variantSnapshot?: string;
  quantity: number;
}

interface Order {
  id: string;
  status: "pending" | "confirmed" | "fulfilled";
  totalAmount: string;
  customerContact?: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#D97706",
  confirmed: "#2563EB",
  fulfilled: "#16A34A",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
};

const NEXT_STATUS: Record<string, "confirmed" | "fulfilled"> = {
  pending: "confirmed",
  confirmed: "fulfilled",
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  pending: "Mark Confirmed",
  confirmed: "Mark Fulfilled",
};

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, refetch } = useGetOrder(id ?? "");
  const order: Order | undefined = (data as { order?: Order })?.order;

  async function updateStatus(newStatus: "confirmed" | "fulfilled") {
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const token = await AsyncStorage.getItem("chatcart_token");
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (res.ok) refetch();
      else Alert.alert("Error", "Failed to update order status.");
    } catch {
      Alert.alert("Error", "Failed to update order status.");
    }
  }

  function handleUpdateStatus(newStatus: "confirmed" | "fulfilled") {
    Alert.alert(
      "Update Status",
      `Mark this order as ${STATUS_LABELS[newStatus]}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => updateStatus(newStatus) },
      ]
    );
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>Order not found</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[order.status] ?? colors.mutedForeground;
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 40,
        gap: 16,
      }}
    >
      {/* Header */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.orderId, { color: colors.foreground }]}>{order.id}</Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[order.status]}
            </Text>
          </View>
        </View>

        {order.customerContact ? (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Customer</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{order.customerContact}</Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Total</Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>
            ₹{parseFloat(order.totalAmount).toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      {/* Items */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Items ({order.items.length})
        </Text>
        {order.items.map((item) => (
          <View key={item.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: colors.foreground }]}>{item.productNameSnapshot}</Text>
              {item.variantSnapshot ? (
                <Text style={[styles.itemVariant, { color: colors.mutedForeground }]}>{item.variantSnapshot}</Text>
              ) : null}
              <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>Qty: {item.quantity}</Text>
            </View>
            <Text style={[styles.itemPrice, { color: colors.foreground }]}>
              ₹{(parseFloat(item.priceSnapshot) * item.quantity).toLocaleString("en-IN")}
            </Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      {nextStatus ? (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: STATUS_COLORS[nextStatus] }]}
          onPress={() => handleUpdateStatus(nextStatus)}
        >
          <Text style={styles.actionBtnText}>{NEXT_STATUS_LABEL[order.status]}</Text>
        </Pressable>
      ) : (
        <View style={[styles.fulfilledBanner, { backgroundColor: "#16A34A20", borderColor: "#16A34A" }]}>
          <Text style={{ color: "#16A34A", fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
            ✓ Order Fulfilled
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderId: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  totalAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 10,
    borderTopWidth: 1,
  },
  itemName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  itemVariant: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  itemQty: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  fulfilledBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
});
