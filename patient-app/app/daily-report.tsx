import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Card } from '../components/Card';
import { PatientPromForm } from '../patient/components/PatientPromForm';
import {
  getDataCollectionConsent,
  getOrCreateVisitorPatientId,
  setDataCollectionConsent,
  type DataCollectionConsent,
} from '../patient/utils/visitorIdentity';

export default function DailyReportScreen() {
  const [consent, setConsent] = useState<DataCollectionConsent | null>(null);
  const [visitorPatientId, setVisitorPatientId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const storedConsent = await getDataCollectionConsent();
      setConsent(storedConsent);
      if (storedConsent === 'approved') {
        const id = await getOrCreateVisitorPatientId();
        setVisitorPatientId(id);
      }
      setIsLoading(false);
    };
    void load();
  }, []);

  const handleApprove = async () => {
    await setDataCollectionConsent('approved');
    setConsent('approved');
    const id = await getOrCreateVisitorPatientId();
    setVisitorPatientId(id);
  };

  const handleReject = async () => {
    await setDataCollectionConsent('rejected');
    setConsent('rejected');
    setVisitorPatientId(null);
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
        <Text style={styles.title}>Daily Report</Text>
        <Text style={styles.subtitle}>
          Share how you are feeling today in a short 10-question check-in.
        </Text>
      </View>

      {isCompleted ? (
        <Card>
          <Text style={styles.completedTitle}>Daily report completed</Text>
          <Text style={styles.completedBody}>
            Thank you for checking in. Close this screen and return tomorrow to submit another
            report.
          </Text>
        </Card>
      ) : (
        <>
          <Card style={styles.consentCard}>
            <Text style={styles.consentTitle}>Data collection note</Text>
            <Text style={styles.consentBody}>
              We use a generated visitor patient ID to link your daily reports across sessions on
              this device.
            </Text>
            <Text style={styles.consentMeta}>
              Status:{' '}
              {consent === 'approved'
                ? 'Approved'
                : consent === 'rejected'
                  ? 'Rejected'
                  : 'Not decided'}
            </Text>
            <Text style={styles.consentMeta}>Visitor ID: {visitorPatientId ?? 'none'}</Text>
            <View style={styles.consentRow}>
              <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}>
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {consent === 'approved' && visitorPatientId ? (
            <PatientPromForm
              patientId={visitorPatientId}
              onCompleted={() => setIsCompleted(true)}
            />
          ) : (
            <Card>
              <Text style={styles.disabledTitle}>Data collection disabled</Text>
              <Text style={styles.disabledBody}>
                Approve data collection above to submit daily reports.
              </Text>
            </Card>
          )}
        </>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: 16,
    alignItems: 'center',
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
  consentCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  consentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  consentBody: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  consentMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  consentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  approveBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  approveBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  rejectBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  rejectBtnText: { color: '#1e293b', fontSize: 12, fontWeight: '600' },
  completedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  completedBody: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  disabledTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  disabledBody: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
});
