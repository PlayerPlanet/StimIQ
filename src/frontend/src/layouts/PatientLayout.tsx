import { useState, type ReactNode } from 'react';
import { Sidebar } from '../components/common/Sidebar';
import { Modal } from '../components/common/Modal';
import { sendAgentPrompt } from '../lib/apiClient';

interface PatientLayoutProps {
  children: ReactNode;
}

/**
 * PatientLayout - wraps patient view pages with persistent left sidebar
 * Uses calming, patient-friendly design with deep blue theme
 */
export function PatientLayout({ children }: PatientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [agentResponseText, setAgentResponseText] = useState('');
  const [agentError, setAgentError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');

  const sidebarLinks = [
    { label: 'Overview', path: '/patient' },
    { label: 'Daily report', path: '/patient/daily-report' },
    { label: 'Standard tests', path: '/patient/standard-tests' },
    { label: 'IMU Tracking', path: '/patient/imu-tracking' },
  ];

  const handleSendPrompt = async () => {
    const prompt = promptText.trim();
    if (!prompt) {
      return;
    }

    setLastPrompt(prompt);
    setIsAgentModalOpen(true);
    setIsSendingPrompt(true);
    setAgentError(null);
    setAgentResponseText('');

    try {
      const response = await sendAgentPrompt(prompt);
      setAgentResponseText(response.response_text || 'No response returned.');
      setPromptText('');
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Failed to send prompt.');
    } finally {
      setIsSendingPrompt(false);
    }
  };

  const sidebarFooterActions = (
    <div className="rounded-md border border-white/20 bg-brand-navy/50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-white/70 font-semibold">AI assistant</p>
      <form
        className="mt-2 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSendPrompt();
        }}
      >
        <input
          type="text"
          placeholder="Chat with your assistant..."
          value={promptText}
          onChange={(event) => setPromptText(event.target.value)}
          className="w-full rounded-md border border-white/20 bg-brand-navy px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
        />
        <button
          type="submit"
          disabled={isSendingPrompt || promptText.trim().length === 0}
          className="w-full rounded-md border border-white bg-brand-blue px-3 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-60"
        >
          {isSendingPrompt ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface-alt">
      <Sidebar
        links={sidebarLinks}
        userType="patient"
        footerActions={sidebarFooterActions}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger */}
        <header className="md:hidden flex items-center px-4 py-3 bg-brand-navy shadow-md">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1 rounded-md hover:bg-white/10 transition-colors duration-200"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 text-white font-heading font-bold text-lg">StimIQ</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-surface">
          {children}
        </main>
      </div>

      <Modal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        title="Clinician AI response"
        size="lg"
      >
        <div className="space-y-4 text-left">
          <div className="rounded-sm border border-border-subtle bg-surface-alt p-3">
            <p className="text-xs uppercase tracking-wide text-text-muted font-semibold">Prompt</p>
            <p className="text-sm text-text-main mt-1">{lastPrompt}</p>
          </div>

          {isSendingPrompt && (
            <p className="text-sm text-text-muted">Contacting backend agent...</p>
          )}

          {agentError && (
            <div className="rounded-sm border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">{agentError}</p>
            </div>
          )}

          {!isSendingPrompt && !agentError && (
            <div className="rounded-sm border border-border-subtle bg-surface p-3">
              <p className="text-xs uppercase tracking-wide text-text-muted font-semibold">Response</p>
              <p className="text-sm text-text-main mt-1 whitespace-pre-wrap">
                {agentResponseText || 'No response returned.'}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
