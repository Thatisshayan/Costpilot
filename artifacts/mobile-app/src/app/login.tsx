import { useState } from "react";
import { Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useClerk } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

type Challenge = "email_code" | "totp" | "phone_code" | "backup_code" | null;
export default function LoginScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [useEmailCode, setUseEmailCode] = useState(false);
  const [challenge, setChallenge] = useState<Challenge>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputStyle = { padding: 14, borderWidth: 1, borderColor: "#9499C3", borderRadius: 8, color: "#ffffff", backgroundColor: "#202437" };
  async function submit() {
    if (!isLoaded || busy) return;
    setBusy(true); setError("");
    try {
      const attempt = challenge === "email_code"
        ? await signIn.attemptFirstFactor({ strategy: "email_code", code })
        : challenge ? await signIn.attemptSecondFactor({ strategy: challenge, code })
        : await signIn.create({ identifier: email.trim(), ...(useEmailCode ? {} : { password }) });
      if (attempt.status === "needs_first_factor" && useEmailCode) {
        const factor = attempt.supportedFirstFactors?.find(f => f.strategy === "email_code");
        if (!factor || factor.strategy !== "email_code") throw new Error("Email-code sign-in is not enabled for this account.");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        setChallenge("email_code"); setCode(""); return;
      }
      if (attempt.status === "needs_second_factor") {
        if (attempt.supportedSecondFactors?.some(f => f.strategy === "totp")) { setChallenge("totp"); setCode(""); return; }
        const phone = attempt.supportedSecondFactors?.find(f => f.strategy === "phone_code");
        if (phone && phone.strategy === "phone_code") {
          await signIn.prepareSecondFactor({ strategy: "phone_code", phoneNumberId: phone.phoneNumberId });
          setChallenge("phone_code"); setCode(""); return;
        }
        throw new Error("This account requires a verification method not currently supported on this screen.");
      }
      if (attempt.status !== "complete" || !attempt.createdSessionId) throw new Error("Sign-in requires another verification step.");
      await setActive({ session: attempt.createdSessionId });
      setPassword(""); setCode(""); router.replace("/");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Sign-in failed. Please try again."); }
    finally { setBusy(false); }
  }
  if (isSignedIn) return <ThemedView style={{ flex: 1, padding: 32, paddingTop: 80 }}><ThemedText>Signed in</ThemedText><Pressable accessibilityRole="button" onPress={() => signOut()}><ThemedText>Sign out</ThemedText></Pressable></ThemedView>;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 100, gap: 18 }}>
    <ThemedText style={{ fontSize: 28 }}>Sign in to CostPilot</ThemedText>
    {error ? <ThemedText accessibilityRole="alert">{error}</ThemedText> : null}
    {challenge ? <>
      <ThemedText>{challenge === "totp" ? "Enter your authenticator code" : challenge === "backup_code" ? "Enter a backup code" : "Enter the sign-in code sent to your account"}</ThemedText>
      <TextInput accessibilityLabel="Verification code" value={code} onChangeText={setCode} autoCapitalize="none" style={inputStyle} />
      {challenge !== "email_code" && <Pressable accessibilityRole="button" onPress={() => { setChallenge("backup_code"); setCode(""); }}><ThemedText>Use a backup code</ThemedText></Pressable>}
    </> : <>
      <TextInput accessibilityLabel="Email address" placeholder="Email address" placeholderTextColor="#9499C3" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={inputStyle} />
      {!useEmailCode && <TextInput accessibilityLabel="Password" placeholder="Password" placeholderTextColor="#9499C3" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" style={inputStyle} />}
      <Pressable accessibilityRole="button" onPress={() => setUseEmailCode(value => !value)}><ThemedText>{useEmailCode ? "Use a password" : "Use an email code"}</ThemedText></Pressable>
    </>}
    <Pressable accessibilityRole="button" disabled={busy || !isLoaded} onPress={submit} style={{ backgroundColor: "#3139a8", borderRadius: 8, padding: 16 }}><ThemedText>{challenge ? "Verify code" : useEmailCode ? "Send sign-in code" : "Sign in"}</ThemedText></Pressable>
    {busy && <ActivityIndicator accessibilityLabel="Signing in" />}
    {challenge && <Pressable accessibilityRole="button" onPress={() => { setChallenge(null); setCode(""); setError(""); }}><ThemedText>Start over</ThemedText></Pressable>}
  </ScrollView>;
}
