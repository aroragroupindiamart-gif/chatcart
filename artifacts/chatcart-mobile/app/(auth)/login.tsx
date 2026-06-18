import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();

  const otpRef = useRef<TextInput>(null);

  function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
    return raw.startsWith("+") ? raw : `+${digits}`;
  }

  async function handleSendOtp() {
    const normalized = normalizePhone(phone.trim());
    if (normalized.replace(/\D/g, "").length < 10) {
      Alert.alert("Invalid Number", "Please enter a valid 10-digit mobile number.");
      return;
    }
    sendOtpMutation.mutate(
      { data: { phone: normalized } },
      {
        onSuccess: () => {
          setStep("otp");
          setTimeout(() => otpRef.current?.focus(), 300);
        },
        onError: () => {
          Alert.alert("Error", "Failed to send OTP. Please try again.");
        },
      }
    );
  }

  async function handleVerifyOtp() {
    const normalized = normalizePhone(phone.trim());
    verifyOtpMutation.mutate(
      { data: { phone: normalized, code: otp.trim() } },
      {
        onSuccess: (data) => {
          const d = data as { token: string; seller: { id: number; phone: string; storeName: string; subdomain: string; whatsappNumber: string } };
          signIn(d.token, d.seller);
          router.replace("/(tabs)");
        },
        onError: () => {
          Alert.alert("Invalid OTP", "The code you entered is incorrect or has expired.");
        },
      }
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets.top + 40,
      paddingBottom: insets.bottom + 20,
      paddingHorizontal: 28,
    },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 16,
      marginBottom: 32,
      alignSelf: "center",
    },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginBottom: 40,
      lineHeight: 22,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 17,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.card,
      marginBottom: 24,
      letterSpacing: step === "otp" ? 6 : 0,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      alignItems: "center",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    backLink: {
      marginTop: 20,
      alignItems: "center",
    },
    backLinkText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.primary,
    },
    hint: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 12,
    },
  });

  const isLoading = sendOtpMutation.isPending || verifyOtpMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>
          {step === "phone" ? "Welcome to Chatcart" : "Verify OTP"}
        </Text>
        <Text style={styles.subtitle}>
          {step === "phone"
            ? "Manage your jewellery store catalogue from your phone"
            : `We sent a 6-digit code to ${phone}`}
        </Text>

        {step === "phone" ? (
          <>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter 6-digit OTP</Text>
            <TextInput
              ref={otpRef}
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={colors.mutedForeground}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerifyOtp}
            />
            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={isLoading || otp.length < 6}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Sign In</Text>
              )}
            </Pressable>
            <Pressable style={styles.backLink} onPress={() => { setStep("phone"); setOtp(""); }}>
              <Text style={styles.backLinkText}>← Change number</Text>
            </Pressable>
            <Text style={styles.hint}>Check console/logs for OTP in dev mode</Text>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
