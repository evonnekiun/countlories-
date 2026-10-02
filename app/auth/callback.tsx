import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS } from '../../src/theme';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    token_hash?: string | string[];
    type?: string | string[];
    error_description?: string | string[];
  }>();
  const handled = useRef(false);
  const [message, setMessage] = useState('Confirming your email…');

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = Array.isArray(params.code) ? params.code[0] : params.code;
    const tokenHash = Array.isArray(params.token_hash) ? params.token_hash[0] : params.token_hash;
    const type = Array.isArray(params.type) ? params.type[0] : params.type;
    const errorDescription = Array.isArray(params.error_description) ? params.error_description[0] : params.error_description;

    async function completeConfirmation() {
      try {
        if (errorDescription) throw new Error(errorDescription);
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type === 'email') {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
          if (error) throw error;
        } else {
          throw new Error('This confirmation link is incomplete. Request a new email and try again.');
        }
        router.replace('/');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not confirm your email. Request a new link and try again.');
      }
    }

    void completeConfirmation();
  }, [params.code, params.error_description, params.token_hash, params.type]);

  return <View style={styles.root}>
    <Text style={styles.brand}>✳ goodform</Text>
    <ActivityIndicator color={COLORS.green} />
    <Text accessibilityRole="alert" style={styles.message}>{message}</Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: COLORS.bg },
  brand: { color: COLORS.green, fontSize: 22, fontWeight: '800', marginBottom: 24 },
  message: { color: COLORS.ink, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 18 },
});
