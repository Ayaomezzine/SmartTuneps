'use client';

import { useState } from 'react';

interface ChatAssistantProps {
  totalMatches: number;
  urgentCount: number;
  topCategories: string[];
}

const prompts = [
  'Show me all paper consultations.',
  'Find printer tenders.',
  'Any office furniture this week?',
  'What should I bid on first?',
  'Translate this consultation.',
  'Summarize this PDF.'
] as const;

function answerForPrompt(prompt: string, totalMatches: number, urgentCount: number, topCategories: string[]) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('paper')) {
    return `There are ${totalMatches} matching consultations overall and ${topCategories.includes('Paper') ? 'paper-related items are included in the active filters.' : 'paper is currently a low-volume category in this dataset.'}`;
  }

  if (normalized.includes('printer')) {
    return `Printer requests are detected in the feed. You currently have ${urgentCount} urgent opportunities, so a fast reply with stock availability and warranty terms makes sense.`;
  }

  if (normalized.includes('furniture')) {
    return 'Furniture bids should emphasize dimensions, lead time, and installation support. For public tenders, add a compliant delivery schedule and clear warranty coverage.';
  }

  if (normalized.includes('first')) {
    return `Prioritize the urgent consultations first. Your dashboard currently highlights ${urgentCount} urgent items, so start with the highest-score opportunities closest to deadline.`;
  }

  if (normalized.includes('translate')) {
    return 'Use the consultation detail page to switch between the original language and an AI translation for French or Arabic output.';
  }

  return 'I can summarize consultations, extract products, compare categories, and propose a first-bid shortlist based on match score and deadline.';
}

export function ChatAssistant({ totalMatches, urgentCount, topCategories }: ChatAssistantProps) {
  const [answer, setAnswer] = useState(
    'Ask the assistant to summarize your pipeline, highlight urgent tenders, or explain why a consultation matches your business profile.'
  );

  return (
    <aside className="assistant">
      <div>
        <p className="hero-kicker">AI assistant</p>
        <h3 className="section-title">Procurement copilot</h3>
        <p className="section-subtitle">Ask in English, French, or Arabic. The engine is designed for bilingual workflows.</p>
      </div>

      <div className="assistant-questions">
        {prompts.map((prompt) => (
          <button key={prompt} className="button-ghost" type="button" suppressHydrationWarning onClick={() => setAnswer(answerForPrompt(prompt, totalMatches, urgentCount, topCategories))}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="assistant-answer">{answer}</div>

      <div className="profile-grid">
        <div className="metric">
          <span className="muted">Active matches</span>
          <strong className="stat-value">{totalMatches}</strong>
        </div>
        <div className="metric">
          <span className="muted">Urgent alerts</span>
          <strong className="stat-value">{urgentCount}</strong>
        </div>
        <div className="metric">
          <span className="muted">Top categories</span>
          <div className="profile-tags">
            {topCategories.slice(0, 4).map((category) => (
              <span key={category} className="tag">
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
