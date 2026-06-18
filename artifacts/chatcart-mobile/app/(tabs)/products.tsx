import { useDeleteProduct, useListProducts } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Product {
  id: number;
  name: string;
  price: string;
  status: string;
  stockCount: number;
  showWhenOutOfStock: boolean;
  images: Array<{ id: number; url: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  out_of_stock: "Out of Stock",
  hidden: "Hidden",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#16A34A",
  out_of_stock: "#D97706",
  hidden: "#6B7280",
};

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useListProducts();
  const deleteProduct = useDeleteProduct();

  const products: Product[] = (data as { products?: Product[] })?.products ?? [];

  function confirmDelete(id: number, name: string) {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteProduct.mutate(
              { productId: id },
              { onSuccess: () => refetch() }
            ),
        },
      ]
    );
  }

  function renderItem({ item }: { item: Product }) {
    const statusColor = STATUS_COLORS[item.status] ?? colors.mutedForeground;
    return (
      <Pressable
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => router.push(`/products/${item.id}`)}
      >
        <View style={styles.cardContent}>
          <View style={styles.thumb}>
            {item.images?.[0] ? (
              <Text style={{ fontSize: 28 }}>🖼️</Text>
            ) : (
              <Text style={{ fontSize: 28 }}>💎</Text>
            )}
          </View>
          <View style={styles.cardInfo}>
            <Text
              style={[styles.productName, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              ₹{parseFloat(item.price).toLocaleString("en-IN")}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <Pressable
              style={[styles.deleteBtn, { borderColor: colors.destructive }]}
              onPress={() => confirmDelete(item.id, item.name)}
            >
              <Text style={{ color: colors.destructive, fontSize: 12 }}>✕</Text>
            </Pressable>
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
          data={products}
          keyExtractor={(item) => String(item.id)}
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
              <Text style={{ fontSize: 48, marginBottom: 12 }}>💎</Text>
              <Text
                style={[styles.emptyTitle, { color: colors.foreground }]}
              >
                No products yet
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                Tap the + button to add your first product
              </Text>
            </View>
          }
          scrollEnabled={products.length > 0}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/products/new")}
      >
        <Text style={{ color: "#fff", fontSize: 28, lineHeight: 32 }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F0E8",
  },
  cardInfo: { flex: 1, gap: 3 },
  productName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  price: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardActions: { gap: 8 },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
  },
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
});
