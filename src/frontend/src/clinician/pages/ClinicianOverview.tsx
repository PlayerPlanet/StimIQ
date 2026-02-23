import { Card } from '../../components/common/Card';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';

const CLINICIAN_ASSET_BASE = '/assets/clinician';

export function ClinicianOverview() {
  return (
    <ClinicianLayout>
      <div className="px-4 py-4 md:px-8 md:py-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="border-b border-border-subtle pb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-text-main">Clinician Overview</h1>
            <p className="text-sm text-text-muted mt-2">
              Introduction to the StimIQ platform and intended clinical workflow.
            </p>
          </div>

          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-text-main">Who We Are</h2>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              StimIQ is a research-driven team from Aalto University building data-informed tools for deep brain
              stimulation (DBS) programming. Our background combines applied mathematics, machine learning, and systems
              modeling.
            </p>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              We are developing a framework that connects stimulation parameters, neural dynamics, and wearable sensor
              data into a single interpretable system.
            </p>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              The technical foundation of the system is described in our preprint,{' '}
              <span className="italic">BGCTS-Stimulation Based Motor Cortex Engine for Synthetic Tremor</span>.
            </p>
          </Card>

          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-text-main">What We Are Building</h2>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              StimIQ is a decision-support system for DBS programming in Parkinson&apos;s disease.
            </p>
            <p className="text-sm text-text-main mt-3 font-semibold">The system integrates:</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-text-muted space-y-1">
              <li>Stimulation parameters (amplitude, frequency, pulse width, contact configuration)</li>
              <li>Wearable IMU data capturing tremor and bradykinesia</li>
              <li>Standardized motor tasks and PROMs</li>
              <li>A mechanistic neural model inspired by basal ganglia-thalamocortical dynamics</li>
              <li>Machine learning models that estimate a continuous motor severity proxy</li>
            </ul>
            <p className="text-sm text-text-main mt-4 font-semibold">In practical terms, StimIQ:</p>
            <ol className="mt-2 list-decimal pl-5 text-sm text-text-muted space-y-1">
              <li>Observes patient motor performance through structured tests and passive wearable data.</li>
              <li>Estimates a continuous severity signal rather than relying solely on categorical scales.</li>
              <li>Learns the response surface over DBS parameters.</li>
              <li>Uses Bayesian optimization to suggest parameter regions likely to reduce motor severity.</li>
            </ol>
            <p className="text-sm text-text-main mt-4 font-semibold">Current weighted objective (active):</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-text-muted space-y-1">
              <li>Motor from wearable IMU movement features.</li>
              <li>Non-motor from PROM diary + standardized tests (configurable diary-to-tests split).</li>
              <li>Disease duration from time since diagnosis; speech weighting is not yet active.</li>
            </ul>
            <p className="text-sm text-text-muted mt-4 leading-relaxed">
              The architecture separates a latent neural generator (capturing oscillatory dynamics), a biomechanical
              mapping to observable movement, a data-driven severity model, and an optimization loop operating over
              stimulation parameters.
            </p>
            <div className="mt-4 rounded-sm border border-border-subtle bg-surface-alt p-2">
              <img
                src={`${CLINICIAN_ASSET_BASE}/02_response_surface.png`}
                alt="Estimated severity surface over DBS parameters"
                className="w-full rounded-sm"
                loading="lazy"
              />
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-text-main">Why This Helps Clinicians</h2>
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-main">1. Reducing the High-Dimensional Search Burden</h3>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  DBS programming involves navigating a large parameter space under time constraints. Exploration is
                  often manual and sequential.
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm text-text-muted space-y-1">
                  <li>A learned estimate of the severity landscape.</li>
                  <li>Structured exploration rather than ad hoc search.</li>
                  <li>Quantified uncertainty during optimization.</li>
                </ul>
                <p className="text-sm text-text-muted mt-2 leading-relaxed">
                  This does not replace clinical judgment. It narrows the region of interest.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-main">2. Objective, Continuous Motor Signal</h3>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  Traditional scales (e.g., UPDRS-III) are episodic and subjective. Wearable IMUs provide:
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm text-text-muted space-y-1">
                  <li>Frequency-domain tremor features (3-7 Hz bands).</li>
                  <li>Motion amplitude and asymmetry patterns.</li>
                  <li>Task-specific dynamics.</li>
                </ul>
                <p className="text-sm text-text-muted mt-2 leading-relaxed">
                  We aggregate these into a continuous severity proxy. The result is a signal that can be tracked
                  longitudinally and compared across parameter configurations.
                </p>
                <div className="mt-3 rounded-sm border border-border-subtle bg-surface-alt p-2">
                  <img
                    src={`${CLINICIAN_ASSET_BASE}/03_longitudinal_trend.png`}
                    alt="Longitudinal motor severity tracking over sessions"
                    className="w-full rounded-sm"
                    loading="lazy"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-main">3. Transparent Modeling</h3>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  The framework is not a black box. It combines mechanistic neural mass modeling principles, explicit
                  biomechanical assumptions (second-order system), and supervised learning validated on wearable
                  datasets.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-main">4. Toward Closed-Loop Optimization</h3>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  The long-term objective is constrained parameter search guided by measurable motor outcomes.
                  Optimization experiments illustrate convergence behavior under noisy landscapes, trade-offs between
                  exploration and exploitation, and practical limits of Bayesian strategies in stochastic motor data.
                </p>
                <div className="mt-3 rounded-sm border border-border-subtle bg-surface-alt p-2">
                  <img
                    src={`${CLINICIAN_ASSET_BASE}/04_recommendation_uncertainty.png`}
                    alt="Parameter recommendation sets with uncertainty bounds"
                    className="w-full rounded-sm"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-text-main">What This Is and Is Not</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-text-main">StimIQ is:</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-text-muted space-y-1">
                  <li>A clinician-facing decision-support tool.</li>
                  <li>A way to structure and visualize response surfaces.</li>
                  <li>A system for integrating wearable biomarkers into DBS workflows.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-main">StimIQ is not:</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-text-muted space-y-1">
                  <li>An autonomous replacement for programming expertise.</li>
                  <li>A claim of validated clinical superiority.</li>
                  <li>A fully closed-loop implant.</li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-text-muted mt-3 leading-relaxed">
              It is an assistive layer designed to reduce iteration time and improve parameter interpretability.
            </p>
          </Card>

          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-text-main">Intended Clinical Workflow</h2>
            <ol className="mt-3 list-decimal pl-5 text-sm text-text-muted space-y-1">
              <li>Patient performs standardized motor tasks (in clinic or remotely).</li>
              <li>IMU and optional video-derived features are processed.</li>
              <li>A severity estimate is computed.</li>
              <li>The weighted objective is composed (motor + non-motor + duration) using patient-specific settings.</li>
              <li>The system updates its parameter-response model.</li>
              <li>Suggested parameter adjustments are displayed with uncertainty bounds and current weighting intent.</li>
              <li>The clinician retains full control over final decisions.</li>
            </ol>
            <div className="mt-4 rounded-sm border border-border-subtle bg-surface-alt p-2">
              <img
                src={`${CLINICIAN_ASSET_BASE}/05_workflow_timeline.png`}
                alt="Intended clinical workflow timeline"
                className="w-full rounded-sm"
                loading="lazy"
              />
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-text-main">Broader Vision</h2>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              While initially focused on Parkinson&apos;s disease, the framework generalizes to other neuromodulation
              contexts where parameter spaces are large, biomarkers are noisy, and iterative tuning is required.
            </p>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              The goal is not automation for its own sake, but structured decision support grounded in measurable motor
              dynamics.
            </p>
            <div className="mt-4 rounded-sm border border-border-subtle bg-surface-alt p-2">
              <img
                src={`${CLINICIAN_ASSET_BASE}/06_future.png`}
                alt="Future direction of structured neuromodulation decision support"
                className="w-full rounded-sm"
                loading="lazy"
              />
            </div>
          </Card>

        </div>
      </div>
    </ClinicianLayout>
  );
}
