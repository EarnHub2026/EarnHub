import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./src/lib/supabase";

type Job = {
  id: string; title: string; description: string; category: string;
  location: string; pay_amount: number; pay_type: string; status: string;
  created_at: string; poster_id: string;
};

const categories = ["Cleaning", "Moving", "Yard work", "Repairs", "Delivery", "Childcare", "Other"];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"jobs" | "post" | "account">("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [location, setLocation] = useState("Fountain Hill, PA");
  const [pay, setPay] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadJobs();
  }, [session]);

  async function loadJobs() {
    setRefreshing(true);
    const { data, error } = await supabase.from("jobs").select("*")
      .eq("status", "open").order("created_at", { ascending: false });
    if (error) Alert.alert("Couldn't load jobs", error.message);
    else setJobs((data || []) as Job[]);
    setRefreshing(false);
  }

  async function authenticate() {
    if (authBusy) return;
    setAuthMessage("");
    if (!email.trim() || password.length < 6) {
      setAuthMessage("Enter a valid email and a password with at least 6 characters.");
      return;
    }
    setAuthBusy(true);
    try {
      const result = authMode === "signup"
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) {
        setAuthMessage(result.error.message);
      } else if (authMode === "signup" && !result.data.session) {
        setAuthMessage("Account created. Check your email for a confirmation link, then return here and sign in.");
      } else if (!result.data.session) {
        setAuthMessage("No active session was returned. Check your Supabase email confirmation settings and try again.");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function postJob() {
    const amount = Number(pay);
    if (!title.trim() || !description.trim() || !location.trim() || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Complete the listing", "Add a title, description, location, and a payment amount greater than zero.");
      return;
    }
    const { error } = await supabase.from("jobs").insert({
      poster_id: session!.user.id, title: title.trim(), description: description.trim(),
      category, location: location.trim(), pay_amount: amount, pay_type: "fixed"
    });
    if (error) Alert.alert("Couldn't post job", error.message);
    else {
      setTitle(""); setDescription(""); setPay("");
      setTab("jobs"); loadJobs();
      Alert.alert("Your listing is live", "People can now find and apply for this job.");
    }
  }

  async function applyToJob(job: Job) {
    const { error } = await supabase.from("applications").insert({
      job_id: job.id, worker_id: session!.user.id, message: "I'm interested in this job."
    });
    if (error) {
      Alert.alert("Application not sent", error.code === "23505" ? "You've already applied." : error.message);
    } else Alert.alert("Application sent", "The job poster can now review your application.");
  }

  async function signOut() { await supabase.auth.signOut(); }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#176B52" /></View>;

  if (!isSupabaseConfigured) return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.logo}>EarnHub</Text>
      <Text style={styles.heading}>Your local work marketplace starts here.</Text>
      <Text style={styles.body}>The app code is installed. Connect a Supabase project and add its URL and anon key as Expo environment variables to enable accounts and live job listings.</Text>
    </SafeAreaView>
  );

  if (!session) return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.authWrap}>
        <Text style={styles.logo}>EarnHub</Text>
        <Text style={styles.tagline}>Find work. Offer help. Get paid.</Text>
        <Text style={styles.heading}>{authMode === "signup" ? "Create your account" : "Welcome back"}</Text>
        <TextInput style={styles.input} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password (6+ characters)" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.primary} onPress={authenticate} disabled={authBusy}><Text style={styles.primaryText}>{authBusy ? "Please wait..." : authMode === "signup" ? "Create account" : "Sign in"}</Text></TouchableOpacity>
        {!!authMessage && <Text accessibilityRole="alert" style={styles.authMessage}>{authMessage}</Text>}
        <TouchableOpacity onPress={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}><Text style={styles.link}>{authMode === "signup" ? "Already have an account? Sign in" : "New to EarnHub? Create an account"}</Text></TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View><Text style={styles.logo}>EarnHub</Text><Text style={styles.tagline}>Local opportunities. Real earnings.</Text></View>
        <View style={styles.locationPill}><Text style={styles.locationText}>📍 Fountain Hill, PA</Text></View>
      </View>
      <View style={styles.tabs}>
        {(["jobs", "post", "account"] as const).map((item) => (
          <TouchableOpacity key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}>
            <Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item === "jobs" ? "Find work" : item === "post" ? "Post a job" : "Account"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "jobs" && <View style={styles.content}>
        <Text style={styles.heading}>Find your next opportunity</Text>
        <Text style={styles.body}>Browse local jobs and services posted by people and businesses.</Text>
        <FlatList data={jobs} keyExtractor={(item) => item.id} refreshing={refreshing} onRefresh={loadJobs}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No jobs posted yet</Text><Text style={styles.body}>Be the first to post an opportunity in your community.</Text></View>}
          renderItem={({ item }) => <View style={styles.jobCard}>
            <View style={styles.jobTop}><Text style={styles.category}>{item.category}</Text><Text style={styles.pay}>${item.pay_amount.toFixed(2)} </Text></View>
            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.description}</Text>
            <Text style={styles.meta}>📍 {item.location}</Text>
            <Text style={styles.meta}>Posted {new Date(item.created_at).toLocaleDateString()}</Text>
            {item.poster_id !== session.user.id && <TouchableOpacity style={styles.primary} onPress={() => applyToJob(item)}><Text style={styles.primaryText}>I'm interested</Text></TouchableOpacity>}
            {item.poster_id === session.user.id && <Text style={styles.ownLabel}>Your listing</Text>}
          </View>}
        />
      </View>}

      {tab === "post" && <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.heading}>Post a job or service</Text>
        <Text style={styles.body}>Tell the community what needs to get done and what you're offering to pay.</Text>
        <Text style={styles.label}>Job title</Text><TextInput style={styles.input} placeholder="e.g. Help move a couch" value={title} onChangeText={setTitle} />
        <Text style={styles.label}>Description</Text><TextInput style={[styles.input, styles.multiline]} placeholder="Describe the work, timing, and any requirements..." multiline value={description} onChangeText={setDescription} />
        <Text style={styles.label}>Category</Text><View style={styles.chips}>{categories.map(c => <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipSelected]}><Text style={[styles.chipText, category === c && styles.chipTextSelected]}>{c}</Text></TouchableOpacity>)}</View>
        <Text style={styles.label}>Location</Text><TextInput style={styles.input} value={location} onChangeText={setLocation} />
        <Text style={styles.label}>Total payment offered ($)</Text><TextInput style={styles.input} placeholder="e.g. 75" keyboardType="decimal-pad" value={pay} onChangeText={setPay} />
        <TouchableOpacity style={styles.primary} onPress={postJob}><Text style={styles.primaryText}>Publish job</Text></TouchableOpacity>
        <Text style={styles.small}>Payments are arranged directly for this MVP. In-app payment and payout processing will be added after Stripe Connect setup.</Text>
      </ScrollView>}

      {tab === "account" && <View style={styles.content}>
        <Text style={styles.heading}>Your EarnHub account</Text>
        <Text style={styles.body}>{session.user.email}</Text>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>EarnHub marketplace</Text><Text style={styles.body}>Connect with neighbors, local businesses, and employers. Apply for work or post a service you need completed.</Text></View>
        <TouchableOpacity style={styles.secondary} onPress={signOut}><Text style={styles.secondaryText}>Sign out</Text></TouchableOpacity>
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, backgroundColor: "#F7F8FA" },
  authWrap: { flex: 1, justifyContent: "center", padding: 26 },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { fontSize: 30, fontWeight: "900", color: "#176B52", letterSpacing: -1 },
  tagline: { color: "#68747D", fontSize: 12, marginTop: 2 },
  locationPill: { backgroundColor: "#E7F2ED", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18 },
  locationText: { color: "#176B52", fontSize: 11, fontWeight: "700" },
  tabs: { flexDirection: "row", marginHorizontal: 16, padding: 4, backgroundColor: "#E9ECEF", borderRadius: 12, marginBottom: 14 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 9 },
  activeTab: { backgroundColor: "#FFFFFF" },
  tabText: { color: "#66717A", fontWeight: "600", fontSize: 12 },
  activeTabText: { color: "#176B52" },
  content: { flex: 1, paddingHorizontal: 18 },
  heading: { fontSize: 23, fontWeight: "800", color: "#17232B", marginBottom: 7 },
  body: { color: "#65727B", fontSize: 14, lineHeight: 21, marginBottom: 14 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE2E6", borderRadius: 11, padding: 14, fontSize: 15, marginBottom: 13, color: "#17232B" },
  multiline: { minHeight: 110, textAlignVertical: "top" },
  primary: { backgroundColor: "#176B52", borderRadius: 11, padding: 15, alignItems: "center", marginTop: 8, marginBottom: 12 },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  link: { color: "#176B52", textAlign: "center", padding: 12, fontWeight: "700" },
  authMessage: { color: "#A12B2B", backgroundColor: "#FCECEC", borderRadius: 10, padding: 12, marginTop: 8, lineHeight: 20 },
  jobCard: { backgroundColor: "#FFFFFF", borderRadius: 15, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: "#E8ECEF" },
  jobTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  category: { color: "#176B52", backgroundColor: "#E7F2ED", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: "800" },
  pay: { color: "#176B52", fontSize: 19, fontWeight: "900" },
  jobTitle: { color: "#17232B", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  meta: { color: "#78838B", fontSize: 12, marginBottom: 5 },
  ownLabel: { color: "#176B52", fontWeight: "700", marginTop: 10 },
  empty: { alignItems: "center", padding: 32, marginTop: 20 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#17232B", marginBottom: 8 },
  form: { padding: 20, paddingBottom: 40 },
  label: { color: "#26343D", fontSize: 13, fontWeight: "800", marginBottom: 7 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: "#DCE2E6", backgroundColor: "#FFFFFF", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 20, marginRight: 7, marginBottom: 7 },
  chipSelected: { backgroundColor: "#176B52", borderColor: "#176B52" },
  chipText: { color: "#52616B", fontSize: 12, fontWeight: "600" },
  chipTextSelected: { color: "#FFFFFF" },
  small: { color: "#7B858C", fontSize: 11, lineHeight: 17, marginTop: 8 },
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 17, marginVertical: 18 },
  infoTitle: { color: "#17232B", fontWeight: "800", fontSize: 16, marginBottom: 8 },
  secondary: { borderWidth: 1, borderColor: "#CBD4D9", borderRadius: 11, padding: 14, alignItems: "center" },
  secondaryText: { color: "#26343D", fontWeight: "800" }
});
