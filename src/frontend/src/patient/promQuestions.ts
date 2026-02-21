export type QuestionCategory = 'mental' | 'tremor' | 'symptoms' | 'qol' | 'treatment';

export interface PromQuestion {
  id: 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9' | 'q10';
  label: string;
  category: QuestionCategory;
}

export const promQuestions: PromQuestion[] = [
  {
    id: 'q1',
    label: 'How would you rate your overall mood today?',
    category: 'mental',
  },
  {
    id: 'q2',
    label: 'How much anxiety have you experienced today?',
    category: 'mental',
  },
  {
    id: 'q3',
    label: 'Have you experienced tremor today?',
    category: 'tremor',
  },
  {
    id: 'q4',
    label: 'How rigid or stiff do you feel today?',
    category: 'tremor',
  },
  {
    id: 'q5',
    label: 'Have you noticed any new or unusual symptoms?',
    category: 'symptoms',
  },
  {
    id: 'q6',
    label: 'How satisfied are you with your daily functioning?',
    category: 'qol',
  },
  {
    id: 'q7',
    label: 'How would you rate your quality of life today?',
    category: 'qol',
  },
  {
    id: 'q8',
    label: 'How effective has your DBS treatment been today?',
    category: 'treatment',
  },
  {
    id: 'q9',
    label: 'Have you experienced any side effects from DBS?',
    category: 'treatment',
  },
  {
    id: 'q10',
    label: 'Overall, how would you rate your physical well-being?',
    category: 'qol',
  },
];

export const scaleLabels = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Fair',
  4: 'Neutral',
  5: 'Good',
  6: 'Very Good',
  7: 'Excellent',
} as const;
