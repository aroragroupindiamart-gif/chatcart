import {
  useGetProduct,
  useUpdateProduct,
  useListCategories,
  useAddProductImage,
  useDeleteProductImage,
} from "@workspace/api-client-react";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface ProductImage { id: number; url: string; displayOrder: number }
interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  status: "active" | "out_of_stock" | "hidden";
  stockCount: number;
  showWhenOutOfStock: boolean;
  categoryId: number | null;
  images: ProductImage[];
}

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = parseInt(id ?? "0");

  const { data, isLoading, refetch } = useGetProduct(productId);
  const product: Product | undefined = (data as { product?: Product })?.product;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"active" | "out_of_stock" | "hidden">("active");
  const [stockCount, setStockCount] = useState("1");
  const [showWhenOutOfStock, setShowWhenOutOfStock] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: catData } = useListCategories();
  const categories: Array<{ id: number; name: string }> =
    (catData as { categories?: Array<{ id: number; name: string }> })?.categories ?? [];

  const updateProduct = useUpdateProduct();
  const addImage = useAddProductImage();
  const deleteImageMutation = useDeleteProductImage();

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setPrice(product.price);
      setStatus(product.status);
      setStockCount(String(product.stockCount));
      setShowWhenOutOfStock(product.showWhenOutOfStock);
      setCategoryId(product.categoryId);
    }
  }, [product]);

  function handleSave() {
    if (!name.trim() || !price.trim()) {
      Alert.alert("Validation", "Name and price are required.");
      return;
    }
    updateProduct.mutate(
      {
        productId,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          price,
          status,
          stockCount: parseInt(stockCount) || 1,
          showWhenOutOfStock,
          categoryId: categoryId ?? undefined,
        },
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          refetch();
        },
        onError: () => Alert.alert("Error", "Failed to save changes."),
      }
    );
  }

  async function handleAddImage() {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    addImage.mutate(
      { productId, data: { url: uri, displayOrder: (product?.images?.length ?? 0) } },
      { onSuccess: () => refetch(), onError: () => Alert.alert("Error", "Failed to add image.") }
    );
  }

  function confirmDeleteImage(imageId: number) {
    Alert.alert("Remove Image", "Remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          deleteImageMutation.mutate(
            { productId, imageId },
            { onSuccess: () => refetch() }
          ),
      },
    ]);
  }

  const statusOptions: Array<{ value: "active" | "out_of_stock" | "hidden"; label: string }> = [
    { value: "active", label: "Active" },
    { value: "out_of_stock", label: "Out of Stock" },
    { value: "hidden", label: "Hidden" },
  ];

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>Product not found</Text>
      </View>
    );
  }

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
      {/* Images */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Images</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {(product.images ?? []).map((img) => (
              <View key={img.id} style={styles.thumbWrap}>
                <Image source={{ uri: img.url }} style={styles.thumb} />
                <Pressable style={[styles.removeImg, { backgroundColor: colors.destructive }]} onPress={() => confirmDeleteImage(img.id)}>
                  <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" }}>✕</Text>
                </Pressable>
              </View>
            ))}
            <Pressable style={[styles.addImgBtn, { borderColor: colors.border, backgroundColor: colors.muted }]} onPress={handleAddImage}>
              <Text style={{ fontSize: 24, color: colors.mutedForeground }}>+</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* Basic Info */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Basic Info</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Product Name</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor={colors.mutedForeground}
          placeholder="Describe the product..."
        />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Price (₹)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      {/* Category */}
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

      {/* Availability */}
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
          placeholderTextColor={colors.mutedForeground}
        />
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>Show when out of stock</Text>
            <Text style={[styles.switchHint, { color: colors.mutedForeground }]}>Visible to customers even when stock is 0</Text>
          </View>
          <Switch
            value={showWhenOutOfStock}
            onValueChange={setShowWhenOutOfStock}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      {/* WhatsApp share */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Share</Text>
        <Text style={[styles.shareLink, { color: colors.primary }]}>
          https://store.chatcart.in/p/{product.id}
        </Text>
        <Text style={[styles.shareHint, { color: colors.mutedForeground }]}>Share this link via WhatsApp to show this product to customers</Text>
      </View>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: saved ? "#16A34A" : colors.primary, opacity: updateProduct.isPending ? 0.7 : 1 }]}
        onPress={handleSave}
        disabled={updateProduct.isPending}
      >
        {updateProduct.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.saveBtnText, { color: "#fff" }]}>{saved ? "✓ Saved" : "Save Changes"}</Text>
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
  },
  thumbWrap: {
    position: "relative",
    width: 80,
    height: 80,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImg: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addImgBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
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
  shareLink: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  shareHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  muted: {},
});
