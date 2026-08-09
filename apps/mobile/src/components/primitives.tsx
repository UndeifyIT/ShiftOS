import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, radius, space } from '../theme.js';

export function Screen({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView>
    </SafeAreaView>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }): React.ReactElement {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }): React.ReactElement {
  return <View style={[styles.card, style]}>{children}</View>;
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error';
const BADGE_COLORS: Record<BadgeTone, { bg: string; text: string }> = {
  neutral: { bg: color.neutral100, text: color.neutral600 },
  success: { bg: color.successBg, text: color.successText },
  warning: { bg: color.warningBg, text: color.warningText },
  error: { bg: color.errorBg, text: color.errorText }
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: string }): React.ReactElement {
  const tones = BADGE_COLORS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: tones.bg }]}>
      <Text style={[styles.badgeText, { color: tones.text }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
}): React.ReactElement {
  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? { backgroundColor: color.brand500 } : isDestructive ? { backgroundColor: color.error500 } : styles.buttonSecondary,
        pressed ? { opacity: 0.85 } : null,
        disabled || loading ? { opacity: 0.6 } : null
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isDestructive ? '#fff' : color.neutral900} />
      ) : (
        <Text style={isPrimary || isDestructive ? styles.buttonText : styles.buttonTextSecondary}>{label}</Text>
      )}
    </Pressable>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }): React.ReactElement {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }): React.ReactElement {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral50 },
  scrollContent: { padding: space.lg, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', color: color.neutral900 },
  subtitle: { fontSize: 14, color: color.neutral500, marginTop: 2 },
  card: {
    backgroundColor: color.neutral0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.neutral200,
    padding: space.lg,
    marginBottom: space.md
  },
  badge: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  button: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg
  },
  buttonSecondary: { backgroundColor: color.neutral0, borderWidth: 1, borderColor: color.neutral300 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  buttonTextSecondary: { color: color.neutral900, fontSize: 15, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.neutral300,
    backgroundColor: color.neutral50
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: color.neutral900, textAlign: 'center' },
  emptyDescription: { fontSize: 13, color: color.neutral500, marginTop: 4, textAlign: 'center' },
  errorBanner: { backgroundColor: color.errorBg, borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  errorText: { color: color.errorText, fontSize: 13, fontWeight: '500' }
});
