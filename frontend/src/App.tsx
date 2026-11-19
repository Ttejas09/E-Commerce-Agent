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
    sendWord,
    streamText,
    finishSession,
    togglePlayPause,
    replay,
    reset,
    clearError,
  } = useAgent({ initialMock: true });

  // Web Speech API hook
  const handleWordFromVoice = useCallback(
    (word: string) => {
      if (state.phase === "listening" || state.phase === "committed") {
        sendWord(word);
      }
    },
    [state.phase, sendWord],
  );

  const handleVoiceDone = useCallback(() => {
    if (state.phase === "listening" || state.phase === "committed") {
      finishSession();
    }
  }, [state.phase, finishSession]);

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
    if (
      state.phase === "idle" ||
      state.phase === "finished" ||
      state.phase === "error"
    ) {
      await startSession();
    }
    await streamText(text);
  };

  const handleToggleVoice = async () => {
    if (
      state.phase === "idle" ||
      state.phase === "finished" ||
      state.phase === "error"
    ) {
      await startSession();
    }
    toggleVoice();
  };

  const isFinished = state.phase === "finished";

  return (
    <div className="min-h-screen w-full flex flex-col bg-paper text-ink transition-colors font-sans antialiased selection:bg-terracotta/20 selection:text-ink">
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
      <main className="flex-1 w-full max-w-[1540px] mx-auto flex flex-col lg:flex-row overflow-hidden">
        {/* Zone 1: LEFT (~40% desktop) — "The Request" */}
        <section className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-hairline min-w-0">
          <ChatPanel
            words={state.words}
            filters={state.filters}
            supersededWords={state.superseded_words}
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
            onToggleVoice={handleToggleVoice}
            onSelectSample={handleSelectSample}
          />
        </section>

        {/* Zone 2: MIDDLE (~30% desktop) — "What I Understood" */}
        <section className="w-full lg:w-[380px] xl:w-[420px] flex flex-col gap-5 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-hairline overflow-y-auto bg-card/30">
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
        <section className="w-full lg:w-[380px] xl:w-[440px] flex flex-col min-w-0 bg-card/20">
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
