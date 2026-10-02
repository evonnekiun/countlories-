import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useGoodform } from './data';

const COLORS = { bg: '#F5FAFF', ink: '#19334D', green: '#4D91C8', muted: '#69839A', line: '#DCEAF5', white: '#FFFFFF' };

export default function AuthGate() {
  const { signIn, signUp } = useGoodform();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    setMessage('');
    if (!email.trim() || !password) { setMessage('Enter your email and password to continue.'); return; }
    if (mode === 'signUp' && !displayName.trim()) { setMessage('Add a name for your profile.'); return; }
    setBusy(true);
    try {
      if (mode === 'signUp') {
        const needsConfirmation = await signUp(email, password, displayName);
        if (needsConfirmation) setMessage('Check your email to confirm your account, then come back and sign in.');
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.brand}>✳ goodform</Text>
      <Text style={styles.eyebrow}>YOUR PRIVATE SPACE</Text>
      <Text style={styles.title}>{mode === 'signIn' ? 'Welcome back.' : 'Make it yours.'}</Text>
      <Text style={styles.body}>Sign in to keep your profile and personal logs connected to your account.</Text>
      {mode === 'signUp' && <Field label="Name" value={displayName} onChangeText={setDisplayName} placeholder="What should we call you?" />}
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry autoCapitalize="none" />
      {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
      <Pressable disabled={busy} onPress={() => void submit()} style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.disabled]}>
        {busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{mode === 'signIn' ? 'Sign in' : 'Create account'}</Text>}
      </Pressable>
      <Pressable onPress={() => { setMode(current => current === 'signIn' ? 'signUp' : 'signIn'); setMessage(''); }} style={styles.switch}>
        <Text style={styles.switchText}>{mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}</Text>
      </Pressable>
      <Text style={styles.privacy}>Your food and profile records are private to your account. Circle features remain stored on this device for now.</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Field(props: { label: string; value: string; onChangeText: (text: string) => void; placeholder: string; keyboardType?: 'email-address'; secureTextEntry?: boolean; autoCapitalize?: 'none' }) {
  return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder} placeholderTextColor="#98A8B8" keyboardType={props.keyboardType} secureTextEntry={props.secureTextEntry} autoCapitalize={props.autoCapitalize} autoComplete={props.label === 'Email' ? 'email' : props.secureTextEntry ? 'new-password' : 'name'} style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 },
  brand: { fontSize: 22, fontWeight: '800', color: COLORS.green, marginBottom: 22 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, color: COLORS.muted, fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: COLORS.ink, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 14 },
  field: { marginTop: 10 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.ink, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: COLORS.ink },
  button: { backgroundColor: COLORS.green, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  buttonText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.65 },
  switch: { alignItems: 'center', paddingVertical: 15 },
  switchText: { color: COLORS.green, fontWeight: '700', fontSize: 13 },
  message: { color: '#A44B41', fontSize: 12, lineHeight: 18, marginTop: 12 },
  privacy: { color: COLORS.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 20 },
});
