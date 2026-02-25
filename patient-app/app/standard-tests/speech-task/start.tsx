import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { Card } from '../../../components/Card';
import { ConsentCard } from '../../../patient/components/ConsentCard';
import {
  getDataCollectionConsent,
  getOrCreateVisitorPatientId,
  setDataCollectionConsent,
  type DataCollectionConsent,
} from '../../../patient/utils/visitorIdentity';

export default function SpeechTaskStartScreen() {
  const router = useRouter();
  const [startError, setStartError] = useState<string | null>(null);
  const [consent, setConsent] = useState<DataCollectionConsent | null>(null);
  const [visitorPatientId, setVisitorPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const storedConsent = await getDataCollectionConsent();
      setConsent(storedConsent);
      if (storedConsent === 'approved') {
        setVisitorPatientId(await getOrCreateVisitorPatientId());
      }
      setIsLoading(false);
    };
    void load();
  }, []);

  const handleApprove = async () => {
    await setDataCollectionConsent('approved');
    setConsent('approved');
    setStartError(null);
    setVisitorPatientId(await getOrCreateVisitorPatientId());
  };

  const handleReject = async () => {
    await setDataCollectionConsent('rejected');
    setConsent('rejected');
    setStartError('Data collection is rejected. No voice recording data will be sent.');
    setVisitorPatientId(null);
  };

  const handleBeginTest = () => {
    if (consent !== 'approved') {
      setStartError('Approve data collection to start this test.');
      return;
    }
    router.push('/standard-tests/speech-task/session');
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 40 }} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Standardized Speech Task</Text>
        <Text style={styles.subtitle}>
          Complete a short 3-step voice task. The whole recording takes about 30 to 60 seconds.
        </Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Before you begin</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Use a quiet room and hold the phone close to your mouth.</Text>
          <Text style={styles.bulletItem}>• Speak at a comfortable volume and steady pace.</Text>
          <Text style={styles.bulletItem}>• Follow all three steps in order for comparable results.</Text>
        </View>
      </Card>

      <ConsentCard
        consent={consent}
        visitorPatientId={visitorPatientId}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <TouchableOpacity
        style={[styles.beginBtn, consent !== 'approved' && styles.beginBtnDisabled]}
        onPress={handleBeginTest}
        disabled={consent !== 'approved'}
      >
        <Text style={styles.beginBtnText}>Begin Test</Text>
      </TouchableOpacity>

      {startError && <Text style={styles.errorText}>{startError}</Text>}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  bulletList: {
    gap: 4,
  },
  bulletItem: {
    fontSize: 14,
    color: '#64748b',
  },
  beginBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  beginBtnDisabled: {
    opacity: 0.5,
  },
  beginBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  errorText: {
    color: '#92400e',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});
