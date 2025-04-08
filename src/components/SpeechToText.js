import React, { useState, useRef } from "react";
import { recognizeSpeech, translateText, speakText, transcribeAudio } from "../TranslatorApp";
import "bootstrap/dist/css/bootstrap.min.css";
import "./SpeechToText.css";

const SpeechToText = () => {
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [sttTargetLanguage, setSttTargetLanguage] = useState("");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const isListeningRef = useRef(false);
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState("Upload Audio/Video");
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef(null);


  // Function to start recognition continuously
  const recognitionRef = useRef(null);
  const startRecognition = () => {
    if (!sttTargetLanguage) {
      alert("Please select a target language");
      return;
    }

    setIsSpeaking(true);
    isListeningRef.current = true;
    setInputText(""); // Clear previous text
    setTranslatedText("");

    const recognizeLoop = () => {
      if (!isListeningRef.current) return;

      const recognition = recognizeSpeech(
        speechLanguage,
        (newText) => {
          if (newText && isListeningRef.current) {
            setInputText((prev) => {
              const updatedText = prev + (prev ? " " : "") + newText;
              return updatedText.length > 1000 ? updatedText.substring(0, 1000) : updatedText;
            });
          }
          recognizeLoop(); // Restart recognition to handle browser auto-stop
        },
        (error) => {
          console.error("Speech Recognition Error:", error);
          setIsSpeaking(false);
          isListeningRef.current = false;
        }
      );

      recognitionRef.current = recognition; // Store recognition instance
    };

    recognizeLoop();
  };

  // Stop Recognition
  const stopRecognition = () => {
    setIsSpeaking(false);
    isListeningRef.current = false;

    // Stop recognition immediately
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };


  // Toggle Speech Recognition
  const handleToggleSpeech = () => {
    if (isSpeaking) {
      stopRecognition();
    } else {
      startRecognition();
    }
  };

  const handleFileChange = async (event) => {
    if (isProcessing) {
      console.warn("Processing is already in progress. Please wait.");
      return;
    }

    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setAudioFile(selectedFile);
    setUploadStatus("Uploading...");
    setIsProcessing(true);

    try {
      let fileToProcess = selectedFile;

      if (selectedFile.type === "audio/mpeg") {
        fileToProcess = await convertMp3ToWav(selectedFile);
      } else if (selectedFile.type === "video/mp4") {
        fileToProcess = await convertMp4ToWav(selectedFile);
      }

      if (!fileToProcess) {
        throw new Error("Error processing the audio file.");
      }

      console.log("Processed audio file:", fileToProcess);

      // Cancel previous transcription if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();

      const extractedText = await transcribeAudio(fileToProcess, speechLanguage, {
        signal: abortControllerRef.current.signal, // ✅ Pass the abort signal
      });

      const truncatedText = extractedText.slice(0, 1000);
      setInputText(truncatedText);

      setUploadStatus("Uploaded");
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn("Transcription was canceled.");
      } else {
        console.error("Error extracting text from audio:", error);
        setUploadStatus("Upload Audio/Video");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /// Extract Text from Audio File
  const handleExtractText = async () => {
    if (!audioFile) {
      alert("Please upload an audio file first.");
      return;
    }

    let fileToProcess = audioFile; // Default to uploaded file

    try {
      if (audioFile.type === "audio/mpeg") {
        // Convert MP3 to WAV
        fileToProcess = await convertMp3ToWav(audioFile);
      } else if (audioFile.type === "video/mp4") {
        // Convert MP4 to WAV
        fileToProcess = await convertMp4ToWav(audioFile);
      }

      if (!fileToProcess) {
        alert("Error processing the audio file.");
        return;
      }

      console.log("Processed audio file:", fileToProcess);
      const extractedText = await transcribeAudio(fileToProcess, speechLanguage);
      setInputText(extractedText);
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Error extracting text from audio.");
    }
  };

  const convertMp4ToWav = async (mp4File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(mp4File);

      reader.onload = async (event) => {
        try {
          const audioContext = new AudioContext();
          const videoData = await audioContext.decodeAudioData(event.target.result);

          // Convert extracted audio to WAV format
          const wavBuffer = encodeWAV(videoData);
          const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
          const wavFile = new File([wavBlob], "converted_audio.wav", { type: "audio/wav" });

          resolve(wavFile);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
    });
  };

  const convertMp3ToWav = async (mp3File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(mp3File);
      reader.onload = async (event) => {
        try {
          const audioContext = new AudioContext();
          const audioData = await audioContext.decodeAudioData(event.target.result);

          // Create WAV file
          const wavBuffer = encodeWAV(audioData);
          const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
          const wavFile = new File([wavBlob], "converted_audio.wav", { type: "audio/wav" });

          resolve(wavFile);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Encode WAV function
  const encodeWAV = (audioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];

    let sampleRate = audioBuffer.sampleRate;
    let offset = 0;

    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    writeString(view, offset, "RIFF"); offset += 4;
    view.setUint32(offset, 36 + audioBuffer.length * numOfChan * 2, true); offset += 4;
    writeString(view, offset, "WAVE"); offset += 4;
    writeString(view, offset, "fmt "); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numOfChan, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4;
    view.setUint16(offset, numOfChan * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString(view, offset, "data"); offset += 4;
    view.setUint32(offset, audioBuffer.length * numOfChan * 2, true); offset += 4;

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    let interleaved = new Float32Array(audioBuffer.length * numOfChan);
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let j = 0; j < numOfChan; j++) {
        interleaved[i * numOfChan + j] = channels[j][i];
      }
    }

    let index = 44;
    let volume = 32767;
    for (let i = 0; i < interleaved.length; i++) {
      view.setInt16(index, interleaved[i] * volume, true);
      index += 2;
    }

    return buffer;
  };

  // Translate Text (Button Click)
  const handleTranslateText = async () => {
    if (!inputText) {
      alert("No text available to translate.");
      return;
    }
    if (!sttTargetLanguage) {
      alert("Please select a target language.");
      return;
    }
    try {
      const translated = await translateText(inputText, sttTargetLanguage);
      setTranslatedText(translated);
    } catch (error) {
      console.error("Translation Error:", error);
      alert("Error translating text.");
    }
  };

  const handleReset = () => {
    setSpeechLanguage("en-IN");
    setSttTargetLanguage("");
    setInputText("");
    setTranslatedText("");
    setAudioFile(null);
    setUploadStatus("Upload Audio/Video"); // ✅ Ensures button resets to "Upload Audio"

    if (isSpeaking) stopRecognition();

    // ✅ Cancel ongoing transcription
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // ✅ Reset file input field
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setIsProcessing(false);
  };

  return (
    <div className="container speech-to-text-container">
      <h3 className="text-center" style={{ marginBottom: "35px" }}>Speech to Text</h3>

      {/* Speech Recognition & Translation Target Language - Same Row */}
      <div className="row mb-3">
        {/* Speech Recognition Language (Left) */}
        <div className="col-md-6">
          <label className="form-label">Speech Recognition Language:</label>
          <select
            value={speechLanguage}
            onChange={(e) => setSpeechLanguage(e.target.value)}
            className="form-select"
            style={{ width: "250px" }}
          >
            <option value="en-IN">English (Default)</option>
            <option value="hi-IN">Hindi</option>
            <option value="mr-IN">Marathi</option>
            <option value="pa-IN">Punjabi</option>
            <option value="bn-IN">Bengali</option>
            <option value="gu-IN">Gujarati</option>
            <option value="te-IN">Telugu</option>
            <option value="ta-IN">Tamil</option>
            <option value="ml-IN">Malayalam</option>
            <option value="kn-IN">Kannada</option>
            <option value="or-IN">Odia</option>
          </select>
        </div>

        {/* Translation Target Language (Right) */}
        <div className="col-md-6">
          <label className="form-label">Translation Target Language:</label>
          <select
            value={sttTargetLanguage}
            onChange={(e) => setSttTargetLanguage(e.target.value)}
            className="form-select"
            style={{ width: "250px" }}
          >
            <option value="" disabled>Select Language</option>
            <option value="hi">Hindi</option>
            <option value="pa">Punjabi</option>
            <option value="bn">Bengali</option>
            <option value="mr">Marathi</option>
            <option value="gu">Gujarati</option>
            <option value="te">Telugu</option>
            <option value="ta">Tamil</option>
            <option value="ur">Urdu</option>
            <option value="ml">Malayalam</option>
            <option value="kn">Kannada</option>
            <option value="or">Odia</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {/* Display Recognized Text */}
      <div className="mt-3">
        <h5>Recognized Text:</h5>
        <div className="border p-3 bg-light" style={{ minHeight: "50px" }}>
          {inputText || "No speech recognized yet"}
        </div>
        <div className="text-end text-muted" style={{ fontSize: "0.9em" }}>
          {inputText.length}/1000
        </div>
      </div>

      {/* Buttons - File Upload, Start/Stop Speaking, Refresh */}
      <div className="row justify-content-center align-items-center g-2 text-center">

        {/* Upload Audio File */}
        <div className="col-12 col-md-auto d-flex flex-column flex-sm-row align-items-center gap-2">
          <button
            className={`btn ${uploadStatus === "Uploaded" ? "btn-secondary" : "btn-primary"}`}
            onClick={() => fileInputRef.current.click()}
          >
            {uploadStatus}
          </button>
          <input
            type="file"
            accept="audio/*,video/mp4"
            className="d-none"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          {audioFile && <span className="text-muted text-truncate" style={{ maxWidth: "150px", overflow: "hidden", whiteSpace: "nowrap" }}>{audioFile.name}</span>}
        </div>

        {/* Start/Stop Speaking Toggle */}
        <div className="col-12 col-md-auto d-flex justify-content-center">
          <label
            className="tgl-btn d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: isSpeaking ? "#b22222" : "#018749",
              width: "146px",
              height: "40px",
              color: "#fff",
              fontWeight: "bold",
              borderRadius: "1.5em",
              cursor: "pointer"
            }}
            onClick={handleToggleSpeech}
          >
            {isSpeaking ? "Stop Speaking" : "Start Speaking"}
          </label>
        </div>

        {/* Refresh Button */}
        <div className="col-12 col-md-auto d-flex justify-content-center">
          <button className="btn btn-secondary d-flex align-items-center justify-content-center" onClick={handleReset} style={{ height: "40px", width: "105px", fontSize: "14px" }}>
            <span>Refresh</span>
            <span>
              <svg className="svg-icon" viewBox="0 0 48 48" width="16" height="16">
                <path d="M35.3 12.7c-2.89-2.9-6.88-4.7-11.3-4.7-8.84 0-15.98 7.16-15.98 16s7.14 16 15.98 16c7.45 0 13.69-5.1 15.46-12h-4.16c-1.65 4.66-6.07 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.31 0 6.28 1.38 8.45 3.55l-6.45 6.45h14v-14l-4.7 4.7z"></path>
              </svg>
            </span>
          </button>
        </div>
      </div>


      {/* Translate Button */}
      <button
        type="button"
        className="btn btn-success mt-3"
        onClick={handleTranslateText}
        style={{ height: "37px", width: "105px", fontSize: "14px", background: "#007FFF" }}
      >
        Translate
      </button>

      {/* Display Translated Text */}
      <div className="mt-3">
        <h5>Translated Text:</h5>
        <div className="border p-3 bg-light" style={{ minHeight: "50px" }}>
          {translatedText || "No translation yet"}
        </div>
      </div>
    </div>
  );
};

export default SpeechToText;
