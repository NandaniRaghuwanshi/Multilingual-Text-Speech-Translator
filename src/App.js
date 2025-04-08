import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLanguage,
  faVolumeUp,
  faMicrophone,
  faCommentAlt,
  faBars,
} from "@fortawesome/free-solid-svg-icons";
import TextToText from "./components/TextToText";
import TextToSpeech from "./components/TextToSpeech";
import SpeechToText from "./components/SpeechToText";
import SpeechToSpeech from "./components/SpeechToSpeech";
import LandingPage from "./components/LandingPage";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

const App = () => {
  const [showLandingPage, setShowLandingPage] = useState(
    sessionStorage.getItem("stayOnTextToSpeech") ||
      sessionStorage.getItem("stayOnSpeechToSpeech")
      ? false
      : true
  );

  const [selectedView, setSelectedView] = useState(
    sessionStorage.getItem("stayOnTextToSpeech")
      ? "textToSpeech"
      : sessionStorage.getItem("stayOnSpeechToSpeech")
        ? "speechToSpeech"
        : "textToText"
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!showLandingPage) {
      sessionStorage.removeItem("stayOnTextToSpeech");
      sessionStorage.removeItem("stayOnSpeechToSpeech");
    }
  }, [showLandingPage]);

  const renderContent = () => {
    switch (selectedView) {
      case "textToText":
        return <TextToText />;
      case "textToSpeech":
        return <TextToSpeech />;
      case "speechToText":
        return <SpeechToText />;
      case "speechToSpeech":
        return <SpeechToSpeech />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {showLandingPage ? (
        <LandingPage onExplore={() => setShowLandingPage(false)} />
      ) : (
        <>
          <button
            className="toggle-btn d-lg-none"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ color: "blue" }}
          >
            <FontAwesomeIcon icon={faBars} size="2x" />
          </button>
          <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
            

            <h4 className="text-center sidebar-title">
              Demo Translator
            </h4>
            <div className="sidebar-buttons">
              {[
                { label: "Text to Text", view: "textToText", icon: faCommentAlt },
                { label: "Text to Speech", view: "textToSpeech", icon: faVolumeUp },
                { label: "Speech to Text", view: "speechToText", icon: faLanguage },
                { label: "Speech to Speech", view: "speechToSpeech", icon: faMicrophone },
              ].map((btn) => (
                <button
                  key={btn.view}
                  className={`sidebar-btn ${selectedView === btn.view ? "active" : ""}`}
                  onClick={() => {
                    setSelectedView(btn.view);
                    setSidebarOpen(false);
                  }}
                >
                  <FontAwesomeIcon icon={btn.icon} size="2x" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
          <div className={`content-area ${sidebarOpen ? 'collapsed' : ''}`}>{renderContent()}</div>
        </>
      )}
    </div>
  );
};

export default App;
