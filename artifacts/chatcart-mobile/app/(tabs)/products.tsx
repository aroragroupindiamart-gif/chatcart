import { useDeleteProduct, useListProducts } from "@workspace/api-client-react";
import type { Product, ProductStatus } from "@workspace/api-client-react";
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

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

type FilterTab = "all" | "active" | "out_of_stock" | "hidden";

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "out_of_stock", label: "OOS" },
  { key: "hidden", label: "Hidden" },
];

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const params = {
    status: activeFilter !== "all" ? (activeFilter as ProductStatus) : undefined,
    search: search.trim() || undefined,
  };

  const { data, isLoading, refetch, isRefetching } = useListProducts(params);
  const deleteProduct = useDeleteProduct();

  const products: Product[] = (data as Product[]) ?? [];

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
              ₹{item.price.toLocaleString("en-IN")}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
              <Text style={[styles.stockText, { color: colors.mutedForeground }]}>
                · {item.stockCount} in stock
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
      <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Search products..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <View style={styles.filterTabs}>
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    { color: active ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

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
                {search || activeFilter !== "all" ? "No matching products" : "No products yet"}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                {search || activeFilter !== "all"
                  ? "Try a different search or filter"
                  : "Tap the + button to add your first product"}
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
  topBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  searchInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filterTabs: {
    flexDirection: "row",
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
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
  stockText: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
