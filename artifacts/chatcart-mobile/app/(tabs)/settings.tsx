import { useUpdateSeller } from "@workspace/api-client-react";
import type { Seller } from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { seller, setSeller, signOut } = useAuth();

  const [storeName, setStoreName] = useState(seller?.storeName ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    seller?.whatsappNumber ?? ""
  );
  const [saved, setSaved] = useState(false);

  const updateSeller = useUpdateSeller();

  useEffect(() => {
    if (seller) {
      setStoreName(seller.storeName);
      setWhatsappNumber(seller.whatsappNumber);
    }
  }, [seller]);

  function handleSave() {
    updateSeller.mutate(
      { data: { storeName, whatsappNumber } },
      {
        onSuccess: (res) => {
          setSeller(res as Seller);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
        onError: () => {
          Alert.alert("Error", "Failed to save settings. Please try again.");
        },
      }
    );
  }

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }

  const storeUrl = seller ? `https://${seller.subdomain}.chatcart.in` : "";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: insets.bottom + 100,
        gap: 24,
      }}
    >
      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Store Details
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Store Name
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
          ]}
          value={storeName}
          onChangeText={setStoreName}
          placeholder="My Jewellery Store"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          WhatsApp Number
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
          ]}
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
          placeholder="+91 98765 43210"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
        />

        <Pressable
          style={[
            styles.saveBtn,
            {
              backgroundColor: saved ? colors.success : colors.primary,
              opacity: updateSeller.isPending ? 0.7 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={updateSeller.isPending}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            {saved ? "✓ Saved" : updateSeller.isPending ? "Saving…" : "Save Changes"}
          </Text>
        </Pressable>
      </View>

      {storeUrl ? (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Your Store Link
          </Text>
          <View
            style={[
              styles.urlBox,
              { backgroundColor: colors.accent, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.urlText, { color: colors.primary }]}>
              {storeUrl}
            </Text>
          </View>
          <Text
            style={[styles.urlHint, { color: colors.mutedForeground }]}
          >
            Share this link on WhatsApp so customers can browse your catalogue
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Account
        </Text>
        {seller?.phone ? (
          <Text style={[styles.phoneText, { color: colors.mutedForeground }]}>
            Logged in as {seller.phone}
          </Text>
        ) : null}
        <Pressable
          style={[styles.signOutBtn, { borderColor: colors.destructive }]}
          onPress={handleSignOut}
        >
          <Text style={[styles.signOutText, { color: colors.destructive }]}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
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
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  urlBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  urlText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  urlHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  phoneText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  signOutBtn: {
    borderRadius: 8,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  success: {},
});
