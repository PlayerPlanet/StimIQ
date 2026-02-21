import { useEffect, useState } from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { SectionHeader } from '../../components/common/SectionHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { getPatientOverview } from '../../lib/apiClient';

interface PatientOverview {
  nextCheckUp: string;
  daysUntilCheckUp: number;
  recentSymptomSeverity: number;
  currentDBSStatus: string;
  lastAdjustment: string;
}

/**
 * PatientDashboard - main patient view homepage
 */
export function PatientDashboard() {
  const [overview, setOverview] = useState<PatientOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const overviewData = await getPatientOverview();
        setOverview(overviewData);
      } catch (error) {
        console.error('Failed to load overview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-heading text-text-main">
            Welcome, John D.
          </h1>
          <p className="text-text-muted text-base mt-2">
            Your DBS therapy overview and key metrics
          </p>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : overview ? (
          <div className="space-y-8">
            {/* DBS Status section */}
            <div>
              <SectionHeader title="DBS Therapy Status" />
              <Card className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-text-muted mb-1 font-medium">
                      Current Status
                    </p>
                    <p className="text-2xl font-bold font-heading text-brand-blue capitalize">
                      {overview.currentDBSStatus}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1 font-medium">
                      Last Adjustment
                    </p>
                    <p className="text-lg text-text-main font-medium">
                      {overview.lastAdjustment}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1 font-medium">
                      Next Check-up
                    </p>
                    <p className="text-lg text-text-main font-medium">
                      {overview.nextCheckUp}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1 font-medium">
                      Days Until Check-up
                    </p>
                    <p className="text-lg text-text-main font-medium">
                      {overview.daysUntilCheckUp} days
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <p className="text-center text-text-muted font-medium">
            Unable to load overview.
          </p>
        )}
      </div>
    </PatientLayout>
  );
}
