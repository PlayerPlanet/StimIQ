import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Card } from '../../components/Card';

interface TestRowProps {
  title: string;
  description: string;
  onPress: () => void;
}

function TestRow({ title, description, onPress }: TestRowProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.testCard}>
        <View style={styles.testCardInner}>
          <View style={styles.testCardText}>
            <Text style={styles.testCardTitle}>{title}</Text>
            <Text style={styles.testCardDesc}>{description}</Text>
          </View>
          <Text style={styles.testCardArrow}>›</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function StandardTestsScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Standard Tests</Text>
        <Text style={styles.subtitle}>
          Standardized assessments help your care team personalize your therapy over time.
        </Text>
      </View>

      <TestRow
        title="Finger Tapping (MDS-UPDRS)"
        description="15-second guided tapping task analysed for cadence and amplitude."
        onPress={() => router.push('/standard-tests/finger-tapping/start')}
      />

      <TestRow
        title="Hand Movement Tracking"
        description="Move your wrist along a guided path captured by the camera."
        onPress={() => router.push('/standard-tests/hand-movement/start')}
      />

      <TestRow
        title="Standardized Speech Task"
        description="Three short voice recordings — vowel, sentence, and rapid syllables."
        onPress={() => router.push('/standard-tests/speech-task/start')}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  testCard: {
    marginBottom: 10,
  },
  testCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testCardText: {
    flex: 1,
  },
  testCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  testCardDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  testCardArrow: {
    fontSize: 24,
    color: '#94a3b8',
    marginLeft: 8,
  },
});
