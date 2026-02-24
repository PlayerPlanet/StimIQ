import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Card } from '../components/Card';

interface NavCardProps {
  title: string;
  description: string;
  onPress: () => void;
}

function NavCard({ title, description, onPress }: NavCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.navCard}>
        <View style={styles.navCardInner}>
          <View style={styles.navCardText}>
            <Text style={styles.navCardTitle}>{title}</Text>
            <Text style={styles.navCardDesc}>{description}</Text>
          </View>
          <Text style={styles.navCardArrow}>›</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>Welcome back</Text>
        <Text style={styles.welcomeSubtitle}>
          Your daily report helps your care team keep your therapy on track.
        </Text>
      </View>

      <NavCard
        title="Daily Report"
        description="Answer 10 short questions about today."
        onPress={() => router.push('/daily-report')}
      />

      <NavCard
        title="Standard Tests"
        description="Run standardized assessments for motor and speech function."
        onPress={() => router.push('/standard-tests')}
      />

      <NavCard
        title="IMU Tracking"
        description="Monitor movement with your device's accelerometer."
        onPress={() => router.push('/imu-tracking')}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
  },
  navCard: {
    marginBottom: 12,
  },
  navCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navCardText: {
    flex: 1,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  navCardDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  navCardArrow: {
    fontSize: 24,
    color: '#94a3b8',
    marginLeft: 8,
  },
});
