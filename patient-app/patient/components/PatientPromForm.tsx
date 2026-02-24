import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Card } from '../../components/Card';
import { createPromTest } from '../../lib/apiClient';
import { promQuestions, scaleLabels } from '../promQuestions';

interface PatientPromFormProps {
  patientId: string;
  onCompleted?: () => void;
}

export function PatientPromForm({ patientId, onCompleted }: PatientPromFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setAnswers({});
  }, [patientId]);

  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setValidationError(null);
  };

  const handleSubmit = async () => {
    setValidationError(null);
    setError(null);

    if (!patientId.trim()) {
      setValidationError('Patient ID is required');
      return;
    }
    if (Object.keys(answers).length !== promQuestions.length) {
      setValidationError('All questions must be answered');
      return;
    }

    setLoading(true);
    try {
      await createPromTest({
        patientId,
        testDate: today,
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        q4: answers.q4,
        q5: answers.q5,
        q6: answers.q6,
        q7: answers.q7,
        q8: answers.q8,
        q9: answers.q9,
        q10: answers.q10,
      });
      setAnswers({});
      onCompleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit PROM test');
    } finally {
      setLoading(false);
    }
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <Card>
      <Text style={styles.heading}>Daily PROM Assessment</Text>
      <Text style={styles.subheading}>Please rate your experience today on a scale of 1 to 7.</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
      {validationError && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{validationError}</Text>
        </View>
      )}

      {promQuestions.map((question, index) => (
        <View
          key={question.id}
          style={[styles.questionBlock, index < promQuestions.length - 1 && styles.questionDivider]}
        >
          <Text style={styles.questionLabel}>{question.label}</Text>
          <Text style={styles.questionCategory}>
            {question.category.charAt(0).toUpperCase() + question.category.slice(1)}
          </Text>
          <View style={styles.scaleRow}>
            {([1, 2, 3, 4, 5, 6, 7] as const).map((value) => {
              const selected = answers[question.id] === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => handleAnswerChange(question.id, value)}
                  style={[styles.scaleBtn, selected && styles.scaleBtnSelected]}
                  accessibilityLabel={`${value} – ${scaleLabels[value]}`}
                >
                  <Text style={[styles.scaleBtnText, selected && styles.scaleBtnTextSelected]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>
          Answered: {answeredCount} / {promQuestions.length}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || answeredCount < promQuestions.length}
          style={[
            styles.submitBtn,
            (loading || answeredCount < promQuestions.length) && styles.submitBtnDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Assessment</Text>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '500',
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
  },
  questionBlock: {
    paddingVertical: 12,
  },
  questionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 2,
  },
  questionCategory: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 10,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  scaleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  scaleBtnSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  scaleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  scaleBtnTextSelected: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  submitBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
