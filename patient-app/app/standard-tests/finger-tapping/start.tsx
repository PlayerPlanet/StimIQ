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
import { createFingerTapSession } from '../../../lib/apiClient';

export default function FingerTappingStartScreen() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
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
    setStartError('Data collection is rejected. No test data will be sent.');
    setVisitorPatientId(null);
  };

  const handleBeginTest = async () => {
    if (consent !== 'approved') {
      setStartError('Approve data collection to start this test.');
      return;
    }
    setIsStarting(true);
    setStartError(null);
    try {
      const response = await createFingerTapSession({
        test_type: 'FINGER_TAP',
        protocol_version: 'v1',
        patient_id: visitorPatientId ?? null,
        max_duration_ms: 15000,
        frames: [],
      });
      router.push(
        `/standard-tests/finger-tapping/session?sessionId=${response.session_id}`
      );
    } catch (err) {
      setStartError(
        err instanceof Error ? err.message : 'Failed to start finger tapping test.'
      );
    } finally {
      setIsStarting(false);
    }
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
        <Text style={styles.title}>Finger Tapping Test</Text>
        <Text style={styles.subtitle}>
          Tap your thumb and index finger repeatedly for about 15 seconds while keeping your full
          hand visible to the camera.
        </Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Before you begin</Text>
        <Text style={styles.body}>
          Place your phone in a stable position and keep your hand clearly visible to the camera.
        </Text>
      </Card>

      <ConsentCard
        consent={consent}
        visitorPatientId={visitorPatientId}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <TouchableOpacity
        style={[styles.beginBtn, (isStarting || consent !== 'approved') && styles.beginBtnDisabled]}
        onPress={handleBeginTest}
        disabled={isStarting || consent !== 'approved'}
      >
        {isStarting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.beginBtnText}>Begin Test</Text>
        )}
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
  body: {
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
