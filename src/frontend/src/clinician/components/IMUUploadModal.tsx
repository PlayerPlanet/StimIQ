import { useState } from 'react';
import type { IMUUploadResponse } from '../../lib/types';
import { uploadIMU } from '../../lib/apiClient';

interface IMUUploadModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

export function IMUUploadModal({ patientId, patientName, onClose }: IMUUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<IMUUploadResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await uploadIMU(patientId, file, date);
      setSuccess(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Upload Successful!</h2>
          <div className="space-y-2 mb-4 text-sm">
            <p><strong>File Path:</strong> {success.file_path}</p>
            <p><strong>Bucket:</strong> {success.bucket}</p>
            <p><strong>Uploaded:</strong> {new Date(success.uploaded_at).toLocaleString()}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Upload IMU Data</h2>
        <p className="text-gray-600 mb-6">Patient: <strong>{patientName}</strong></p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">CSV File *</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {file && <p className="text-xs text-gray-600 mt-1">Selected: {file.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Date/Time (Optional)</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">Defaults to current time if not provided</p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!file || isSubmitting}
            >
              {isSubmitting ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
