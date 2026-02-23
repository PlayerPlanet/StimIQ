import { useState } from 'react';

export interface PatientFormData {
  name: string;
  age: string;
  diagnosis: string;
  status: 'stable' | 'monitor' | 'review';
  patientId: string;
}

interface CreatePatientFormProps {
  onSubmit: (data: PatientFormData) => void;
  onClose: () => void;
}

/**
 * CreatePatientForm - form for creating new patient profiles
 * Designed to be used within a Modal component
 */
export function CreatePatientForm({ onSubmit, onClose }: CreatePatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    age: '',
    diagnosis: 'Parkinson\'s Disease',
    status: 'stable',
    patientId: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      onSubmit(formData);
      setIsSubmitting(false);
    }, 500);
  };

  const isFormValid = formData.name && formData.age && formData.patientId;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient ID */}
      <div>
        <label htmlFor="patientId" className="block text-sm font-semibold text-text-main mb-2">
          Patient ID
        </label>
        <input
          type="text"
          id="patientId"
          name="patientId"
          value={formData.patientId}
          onChange={handleChange}
          placeholder="e.g., PT-0004"
          className="w-full px-4 py-2 border border-border-subtle rounded-sm font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          required
        />
        <p className="text-xs text-text-muted mt-1">Format: PT-XXXX</p>
      </div>

      {/* Patient Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-text-main mb-2">
          Patient Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="First and Last Name"
          className="w-full px-4 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          required
        />
      </div>

      {/* Age */}
      <div>
        <label htmlFor="age" className="block text-sm font-semibold text-text-main mb-2">
          Age
        </label>
        <input
          type="number"
          id="age"
          name="age"
          value={formData.age}
          onChange={handleChange}
          placeholder="e.g., 65"
          min="18"
          max="120"
          className="w-full px-4 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          required
        />
      </div>

      {/* Diagnosis */}
      <div>
        <label htmlFor="diagnosis" className="block text-sm font-semibold text-text-main mb-2">
          Primary Diagnosis
        </label>
        <select
          id="diagnosis"
          name="diagnosis"
          value={formData.diagnosis}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
        >
          <option value="Parkinson's Disease">Parkinson's Disease</option>
          <option value="Essential Tremor">Essential Tremor</option>
          <option value="Dystonia">Dystonia</option>
          <option value="Other Movement Disorder">Other Movement Disorder</option>
        </select>
      </div>

      {/* Initial Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-semibold text-text-main mb-2">
          Initial Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
        >
          <option value="stable">Stable</option>
          <option value="monitor">Monitor</option>
          <option value="review">Review</option>
        </select>
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 pt-4 border-t border-border-subtle">
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="flex-1 px-4 py-2 bg-brand-blue text-white font-semibold rounded-sm transition-all duration-75 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? 'Creating...' : 'Create Patient Profile'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-surface-alt text-text-main font-semibold rounded-sm border border-border-subtle transition-all duration-75 hover:bg-surface text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
