import { useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import "./App.css";

function App() {
  const envMock = import.meta.env.VITE_USE_MOCK === "true";
  const [useMock, setUseMock] = useState(envMock);

  return (
    <div className="app">
      <div className="app__container">
        <ChatPanel useMock={useMock} />
      </div>
      <div className="app__footer">
        <label className="mock-toggle" title="Toggle between mock and live backend">
          <input
            type="checkbox"
            checked={useMock}
            onChange={(e) => setUseMock(e.target.checked)}
          />
          <span>Mock API</span>
        </label>
        <span className="app__version">v2.1 • Anticipatory Commerce Agent</span>
      </div>
    </div>
  );
}

export default App;
