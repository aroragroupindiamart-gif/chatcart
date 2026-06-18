import { useCreateProduct, useListCategories } from "@workspace/api-client-react";
import type { Category } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function NewProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<"active" | "out_of_stock" | "hidden">("active");
  const [showWhenOutOfStock, setShowWhenOutOfStock] = useState(false);
  const [stockCount, setStockCount] = useState("1");

  const { data: catData } = useListCategories();
  const categories: Category[] = (catData as Category[]) ?? [];

  const createProduct = useCreateProduct();

  function handleCreate() {
    if (!name.trim()) {
      Alert.alert("Validation", "Product name is required.");
      return;
    }
    const priceNum = parseFloat(price);
    if (!price.trim() || isNaN(priceNum) || priceNum < 0) {
      Alert.alert("Validation", "Please enter a valid price.");
      return;
    }
    createProduct.mutate(
      {
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          categoryId: categoryId ?? undefined,
          stockCount: parseInt(stockCount) || 1,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: () =>
          Alert.alert("Error", "Failed to create product. Please try again."),
      }
    );
  }

  const statusOptions: Array<{ value: "active" | "out_of_stock" | "hidden"; label: string }> = [
    { value: "active", label: "Active" },
    { value: "out_of_stock", label: "Out of Stock" },
    { value: "hidden", label: "Hidden" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: insets.bottom + 40,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Basic Info</Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Product Name *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Gold Necklace 22K"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the product..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Price (₹) *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
        />
      </View>

      {categories.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category</Text>
          <View style={styles.pills}>
            <Pressable
              style={[styles.pill, { borderColor: categoryId === null ? colors.primary : colors.border, backgroundColor: categoryId === null ? colors.primary + "20" : colors.background }]}
              onPress={() => setCategoryId(null)}
            >
              <Text style={[styles.pillText, { color: categoryId === null ? colors.primary : colors.mutedForeground }]}>None</Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={[styles.pill, { borderColor: categoryId === cat.id ? colors.primary : colors.border, backgroundColor: categoryId === cat.id ? colors.primary + "20" : colors.background }]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={[styles.pillText, { color: categoryId === cat.id ? colors.primary : colors.mutedForeground }]}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Availability</Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Status</Text>
        <View style={styles.pills}>
          {statusOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.pill, { borderColor: status === opt.value ? colors.primary : colors.border, backgroundColor: status === opt.value ? colors.primary + "20" : colors.background }]}
              onPress={() => setStatus(opt.value)}
            >
              <Text style={[styles.pillText, { color: status === opt.value ? colors.primary : colors.mutedForeground }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Stock Count</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={stockCount}
          onChangeText={setStockCount}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={colors.mutedForeground}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>Show when out of stock</Text>
            <Text style={[styles.switchHint, { color: colors.mutedForeground }]}>Customers can still see the product but can't order</Text>
          </View>
          <Switch
            value={showWhenOutOfStock}
            onValueChange={setShowWhenOutOfStock}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      <Pressable
        style={[styles.createBtn, { backgroundColor: colors.primary, opacity: createProduct.isPending ? 0.7 : 1 }]}
        onPress={handleCreate}
        disabled={createProduct.isPending}
      >
        {createProduct.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>Add Product</Text>
        )}
      </Pressable>
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
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: -4,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  multiline: {
    height: 80,
    textAlignVertical: "top",
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  switchHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  createBtn: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  createBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
