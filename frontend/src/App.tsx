// App.tsx — Modern Split-Screen "Live Brain + Storefront" workspace
import { useState, useCallback } from "react";
import { useAgent } from "./hooks/useAgent";
import { useVoice } from "./hooks/useVoice";
import { TopBar } from "./components/TopBar";
import { AgentHUD } from "./components/AgentHUD";
import { StorefrontGrid } from "./components/StorefrontGrid";
import { ToastAlert } from "./components/ToastAlert";
import type { SampleQuery } from "./data/sampleQueries";
import "./App.css";

function App() {
  const envMock = import.meta.env.VITE_USE_MOCK === "true";
  const [useMock, setUseMock] = useState(envMock);
  const [playbackDelay, setPlaybackDelay] = useState(150);
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    state,
    startSession,
    sendWord,
    streamText,
    finishSession,
    reset,
    setTransport,
    setExpectedTarget,
    clearError,
  } = useAgent(useMock);

  // Voice speech-to-text recognition
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

  // Preset execution
  const handleSelectPreset = async (preset: SampleQuery) => {
    if (isPlaying) return;
    setIsPlaying(true);
    setExpectedTarget(preset.expectedTarget);
    await startSession();
    await streamText(preset.text, playbackDelay);
    setIsPlaying(false);
  };

  // Typed query execution
  const handleSubmitText = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    if (
      state.phase === "idle" ||
      state.phase === "finished" ||
      state.phase === "error"
    ) {
      await startSession();
    }
    await streamText(text, playbackDelay);
    setIsPlaying(false);
  };

  // Voice toggle
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

  // Quick action: enable mock mode and dismiss error
  const handleEnableMock = () => {
    setUseMock(true);
    clearError();
  };

  return (
    <div className="workspace-root">
      {/* 1. Slim Top Utility Header */}
      <TopBar
        transport={state.transport}
        onTransportChange={setTransport}
        phase={state.phase}
        playbackDelay={playbackDelay}
        onPlaybackDelayChange={setPlaybackDelay}
        useMock={useMock}
        onToggleMock={setUseMock}
        disabledControls={isPlaying || state.phase === "listening"}
      />

      {/* 2. Dismissible Toast Alert on Network/Backend Error */}
      <ToastAlert
        error={state.error}
        onDismiss={clearError}
        onEnableMock={handleEnableMock}
      />

      {/* 3. Responsive Two-Column Main Workspace */}
      <main className="split-workspace">
        {/* Left Column (~40%): The Agent HUD */}
        <div className="workspace-pane workspace-pane--left">
          <AgentHUD
            state={state}
            isPlaying={isPlaying}
            isListening={isListening}
            isVoiceSupported={isVoiceSupported}
            interimTranscript={interimTranscript}
            onSelectPreset={handleSelectPreset}
            onSubmitText={handleSubmitText}
            onToggleVoice={handleToggleVoice}
            onNewRequest={reset}
          />
        </div>

        {/* Right Column (~60%): Live Speculative Storefront */}
        <div className="workspace-pane workspace-pane--right">
          <StorefrontGrid
            candidates={state.top_candidates}
            committedProduct={state.committed_product}
            finalProduct={state.final_product}
            filters={state.filters}
            phase={state.phase}
            isSearching={state.is_searching}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
