import { useListOrders } from "@workspace/api-client-react";
import type { OrderListResponse } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  customerContact?: string;
  createdAt: string;
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

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useListOrders();
  const orders: Order[] = ((data as OrderListResponse)?.orders as Order[] | undefined) ?? [];

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function renderItem({ item }: { item: Order }) {
    const statusColor = STATUS_COLORS[item.status] ?? colors.mutedForeground;
    return (
      <Pressable
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => router.push(`/orders/${item.id}`)}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.orderId, { color: colors.foreground }]}>
              {item.id}
            </Text>
            {item.customerContact ? (
              <Text
                style={[styles.customer, { color: colors.mutedForeground }]}
              >
                {item.customerContact}
              </Text>
            ) : null}
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Text style={[styles.amount, { color: colors.foreground }]}>
              ₹{item.totalAmount.toLocaleString("en-IN")}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + "20" },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 100,
            gap: 10,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No orders yet
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                Orders from your WhatsApp storefront will appear here
              </Text>
            </View>
          }
          scrollEnabled={!!orders.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  row: { flexDirection: "row", alignItems: "flex-start" },
  orderId: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  customer: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  amount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
