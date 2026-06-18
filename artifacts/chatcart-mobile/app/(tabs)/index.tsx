import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGetMe } from "@workspace/api-client-react";
import type { Seller } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: string;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: accent ? colors.primary : colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.statValue,
          { color: accent ? colors.primaryForeground : colors.foreground },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.statLabel,
          {
            color: accent ? colors.primaryForeground : colors.mutedForeground,
            opacity: accent ? 0.85 : 1,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { seller, setSeller } = useAuth();

  const { data, refetch, isRefetching } = useGetMe();

  useEffect(() => {
    if (data) {
      setSeller(data as Seller);
    }
  }, [data]);

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  async function fetchStats() {
    try {
      setStatsLoading(true);
      const token = await AsyncStorage.getItem("chatcart_token");
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/dashboard/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.stats) setStats(json.stats);
    } catch {
      // silent — stats are optional
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  const storeName = seller?.storeName ?? (data as Seller)?.storeName ?? "My Store";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 100,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
            fetchStats();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.greeting}>
        <Text style={[styles.greetText, { color: colors.mutedForeground }]}>
          Welcome back
        </Text>
        <Text style={[styles.storeName, { color: colors.foreground }]}>
          {storeName}
        </Text>
        {seller?.subdomain ? (
          <Text style={[styles.domain, { color: colors.primary }]}>
            {seller.subdomain}.chatcart.in
          </Text>
        ) : null}
      </View>

      {statsLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <View style={styles.grid}>
          <StatCard label="Total Products" value={stats?.totalProducts ?? 0} />
          <StatCard
            label="Pending Orders"
            value={stats?.pendingOrders ?? 0}
            accent
          />
          <StatCard label="Total Orders" value={stats?.totalOrders ?? 0} />
          <StatCard
            label="Revenue"
            value={
              stats
                ? `₹${parseFloat(stats.totalRevenue).toLocaleString("en-IN")}`
                : "₹0"
            }
          />
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Quick Actions
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={[
            styles.actionBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push("/products/new")}
        >
          <Text style={styles.actionIcon}>💎</Text>
          <Text style={[styles.actionText, { color: colors.foreground }]}>
            Add Product
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push("/(tabs)/orders")}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={[styles.actionText, { color: colors.foreground }]}>
            View Orders
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push("/(tabs)/settings")}
        >
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={[styles.actionText, { color: colors.foreground }]}>
            Store Settings
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push("/(tabs)/products")}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={[styles.actionText, { color: colors.foreground }]}>
            My Catalogue
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  greeting: {
    marginBottom: 24,
  },
  greetText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  storeName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  domain: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  statValue: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionBtn: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
