import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../../components/Card';
import type { DataCollectionConsent } from '../utils/visitorIdentity';

interface ConsentCardProps {
  consent: DataCollectionConsent | null;
  visitorPatientId: string | null;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * ConsentCard — shown on test start screens so the user can approve or
 * reject data collection before a test begins.
 */
export function ConsentCard({ consent, visitorPatientId, onApprove, onReject }: ConsentCardProps) {
  const statusLabel =
    consent === 'approved' ? 'Approved' : consent === 'rejected' ? 'Rejected' : 'Not decided';

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Data collection</Text>
      <Text style={styles.body}>
        We generate a visitor patient ID and attach it to this test so your results can be saved
        across sessions on this device.
      </Text>
      <Text style={styles.meta}>Status: {statusLabel}</Text>
      <Text style={styles.meta}>Visitor ID: {visitorPatientId ?? 'none'}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  approveBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  rejectBtnText: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '600',
  },
});
