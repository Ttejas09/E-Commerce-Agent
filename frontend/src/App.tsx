// App.tsx — "Warm Editorial, Human-Made" 3-Zone Anticipatory Commerce Interface
// Zone 1: "The Request" | Zone 2: "What I Understood" | Zone 3: "The Pick"

import { useState, useCallback, useEffect } from "react";
import { useAgent } from "./hooks/useAgent";
import { useVoice } from "./hooks/useVoice";
import { TopBar } from "./components/TopBar";
import { NoticeBanner } from "./components/NoticeBanner";
import { ChatPanel } from "./components/ChatPanel";
import { FilterChips } from "./components/FilterChips";
import { ConfidenceMeter } from "./components/ConfidenceMeter";
import { SearchBudget } from "./components/SearchBudget";
import { CommitTimeline } from "./components/CommitTimeline";
import { ThePickStack } from "./components/ThePickStack";
import type { SampleRequest } from "./config/brand";
import "./App.css";

function App() {
  const [isDark, setIsDark] = useState(false);

  // Sync dark class to html document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const {
    state,
    useMock,
    setUseMock,
    ghostFilters,
    isStreaming,
    isPaused,
    playbackDelay,
    setPlaybackDelay,
    startSession,
    sendLiveWord,
    streamText,
    finishSession,
    togglePlayPause,
    replay,
    reset,
    clearError,
  } = useAgent();

  // Web Speech API hook
  const handleWordFromVoice = useCallback(
    (word: string) => {
      sendLiveWord(word);
    },
    [sendLiveWord],
  );

  const handleVoiceDone = useCallback(() => {
    finishSession();
  }, [finishSession]);

  const {
    isListening,
    isSupported: isVoiceSupported,
    interim: interimTranscript,
    toggle: toggleVoice,
  } = useVoice(handleWordFromVoice, handleVoiceDone);

  // Replay sample chips
  const handleSelectSample = async (sample: SampleRequest) => {
    if (isStreaming) return;
    await startSession();
    await streamText(sample.text);
  };

  // Typed query submit
  const handleSubmitText = async (text: string) => {
    if (isStreaming) return;
    await startSession();
    await streamText(text);
  };

  const handleToggleVoice = async () => {
    if (!isListening) {
      await startSession();
    }
    toggleVoice();
  };

  const isFinished = state.phase === "finished";

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full flex flex-col bg-paper text-ink transition-colors font-sans antialiased overflow-x-hidden lg:overflow-hidden selection:bg-terracotta/20 selection:text-ink">
      {/* Top Header */}
      <TopBar
        useMock={useMock}
        onToggleMock={setUseMock}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      {/* Inline Calm Notice */}
      <NoticeBanner
        error={state.error}
        onDismiss={clearError}
        onReset={reset}
        onEnableMock={() => {
          setUseMock(true);
          clearError();
        }}
      />

      {/* Three-Zone Main Workspace: Left ("The Request") | Middle ("What I Understood") | Right ("The Pick") */}
      <main className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row overflow-hidden">
        {/* Zone 1: LEFT (~40% desktop) — "The Request" */}
        <section className="flex-1 min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-hairline min-w-0 lg:h-full overflow-hidden">
          <ChatPanel
            words={state.words}
            filters={state.filters}
            supersededWords={state.superseded_words}
            topCandidates={state.top_candidates}
            isStreaming={isStreaming}
            isPaused={isPaused}
            playbackDelay={playbackDelay}
            interimTranscript={interimTranscript}
            isListening={isListening}
            isVoiceSupported={isVoiceSupported}
            onPlaybackDelayChange={setPlaybackDelay}
            onTogglePlayPause={togglePlayPause}
            onReplay={replay}
            onSubmitText={handleSubmitText}
            onSendLiveWord={sendLiveWord}
            onFinishSession={finishSession}
            onToggleVoice={handleToggleVoice}
            onSelectSample={handleSelectSample}
          />
        </section>

        {/* Zone 2: MIDDLE (~30% desktop) — "What I Understood" */}
        <section className="w-full lg:w-[360px] xl:w-[400px] min-h-0 flex flex-col gap-5 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-hairline overflow-y-auto lg:h-full bg-card/30 shrink-0">
          <FilterChips filters={state.filters} ghostFilters={ghostFilters} />

          <ConfidenceMeter
            confidence={state.confidence}
            isCommitted={Boolean(state.committed_product)}
          />

          <SearchBudget
            searchesUsed={state.searches_used}
            reason={state.reason}
          />

          <CommitTimeline
            totalWords={state.words.length}
            commitWordIndex={state.commit_word_index}
            isFinished={isFinished}
          />
        </section>

        {/* Zone 3: RIGHT (~30% desktop) — "The Pick" */}
        <section className="w-full lg:w-[380px] xl:w-[440px] min-h-0 flex flex-col min-w-0 lg:h-full overflow-hidden bg-card/20 shrink-0">
          <ThePickStack
            committedProduct={state.committed_product}
            finalProduct={state.final_product}
            topCandidates={state.top_candidates}
            isStreaming={isStreaming}
            isFinished={isFinished}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
