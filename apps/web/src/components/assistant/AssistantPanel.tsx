import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '@shiftos/ui';
import { useRpcMutation } from '../../lib/useRpc.js';

interface AskAssistantResult {
  answer: string;
  navigateTo?: string;
}

/**
 * Shared "Ask ShiftOS" chat panel — mounted from TopBar.tsx for every
 * signed-in role, and reused as-is by AdminConsolePage.tsx (Task 8) rather
 * than that page keeping its own separate implementation. Single question
 * per turn (design spec v1: no multi-turn memory) — each ask is independent.
 */
export function AssistantPanel({ onClose }: { onClose: () => void }): React.ReactElement {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const navigate = useNavigate();

  const ask = useRpcMutation<AskAssistantResult, { question: string }>('ask_assistant', {
    onSuccess: (result) => {
      if (result.navigateTo) {
        onClose();
        navigate(result.navigateTo);
        return;
      }
      setAnswer(result.answer);
    },
    onError: (err) => setAnswer(err.message)
  });

  return (
    <div role="dialog" aria-label="Ask ShiftOS" className="w-80 rounded-lg border border-neutral-200 bg-white p-3 shadow-md">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!question.trim()) return;
          setAnswer(null);
          ask.mutate({ question: question.trim() });
        }}
        className="flex flex-col gap-2"
      >
        <label className="text-sm font-medium text-neutral-900" htmlFor="assistant-question">
          Ask ShiftOS
        </label>
        <Input
          id="assistant-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={'Ask a question or say "open attendance"…'}
          disabled={ask.isPending}
        />
        <Button type="submit" size="sm" loading={ask.isPending} disabled={!question.trim()}>
          Ask
        </Button>
      </form>
      {ask.isPending ? <p className="mt-2 text-sm text-neutral-500">Thinking…</p> : null}
      {!ask.isPending && answer ? <p className="mt-2 text-sm text-neutral-800">{answer}</p> : null}
    </div>
  );
}
