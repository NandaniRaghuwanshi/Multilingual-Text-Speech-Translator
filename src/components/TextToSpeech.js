import React, { useState, useRef } from "react";
import { translateText, extractTextFromPDF, speechRegion, speechKey } from "../TranslatorApp";
import "bootstrap/dist/css/bootstrap.min.css";

const TextToSpeech = () => {
  const [inputText, setInputText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("Upload PDF");

  const MAX_CHARACTERS = 1000;

  const limitTextToCharacters = (text, maxChars) => {
    return text.length > maxChars ? text.slice(0, maxChars) : text;
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    event.target.value = null;
    setFile(selectedFile);
    setUploadStatus("Uploading...");

    try {
      const extractedText = await extractTextFromPDF(selectedFile);
      setInputText(limitTextToCharacters(extractedText, MAX_CHARACTERS));
      setUploadStatus("Uploaded");
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      setUploadStatus("Upload PDF");
    }
  };

  const handleTranslateAndSpeak = async () => {
    if (!targetLanguage) {
      alert("Please select a language");
      return;
    }
    setIsProcessing(true);
    try {
      const translated = await translateText(inputText, targetLanguage);
      await generateAndSaveSpeech(translated, targetLanguage);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAndSaveSpeech = async (text, language) => {
    const voiceMap = {
      hi: "hi-IN-AnanyaNeural",
      pa: "pa-IN-VaaniNeural",
      bn: "bn-IN-BashkarNeural",
      mr: "mr-IN-AarohiNeural",
      gu: "gu-IN-DhwaniNeural",
      te: "te-IN-MohanNeural",
      ta: "ta-IN-ValluvarNeural",
      ur: "ur-IN-SalmanNeural",
      ml: "ml-IN-MidhunNeural",
      kn: "kn-IN-SapnaNeural",
      or: "or-IN-SukantNeural",
      en: "en-US-JennyNeural",
    };

    const voice = voiceMap[language] || "en-US-JennyNeural";
    const xmlLang = voice.split('-').slice(0, 2).join('-');

    const endpoint = `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const ssml = `<speak version='1.0' xml:lang='${xmlLang}'><voice name='${voice}'>${text}</voice></speak>`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": speechKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
        },
        body: ssml,
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        console.error("TTS Error:", errorMsg);
        return;
      }

      const audioBlob = await response.blob();

      // Determine filename based on PDF name or create a unique one
      let fileName;
      if (file) {
        fileName = file.name.replace(/\.[^/.]+$/, ".mp3"); // Replace PDF extension with .mp3
      } else {
        fileName = `speech_${Date.now()}.mp3`; // Generate unique name if no PDF
      }

      setAudioUrl(URL.createObjectURL(audioBlob));

      // Upload audio to Azure storage
      uploadAudioToAzure(audioBlob, fileName);
    } catch (error) {
      console.error("Error in TTS generation:", error);
    }
  };

  const uploadAudioToAzure = async (blob, fileName) => {
    const storageAccount = "lanvoicestorage"; // Change this
    const containerName = "$web"; // Static site container
    const sasToken = "sp=rcw&st=2025-03-04T06:39:18Z&se=2025-03-11T14:39:18Z&sv=2022-11-02&sr=c&sig=sdeQa1iAeMBQPmrso9WqSrm2LD3c42SdiC3kJlKQnTY%3D"; // Use your SAS token

    const folderName = "Audio"; // Store in "Audio" folder
    const fullFilePath = `${folderName}/${fileName}`;

    const url = `https://${storageAccount}.blob.core.windows.net/${containerName}/${fullFilePath}?${sasToken}`;

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": "audio/mpeg",
        },
        body: blob,
      });

      if (response.ok) {
        console.log(`Audio file uploaded successfully to Azure: ${url}`);
      } else {
        console.error("Failed to upload audio to Azure", response);
      }
    } catch (error) {
      console.error("Audio Upload Error:", error);
    }
  };

  const handleReset = () => {
    setInputText("");
    setTargetLanguage("");
    setAudioUrl(null);
    setFile(null);
    setUploadStatus("Upload PDF");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container text-to-speech-container">
      <h3 className="text-center" style={{ marginBottom: "35px" }}>Text to Speech</h3>

      {/* Extracted / User Input Text */}
      <div className="mb-3">
        <label htmlFor="inputText" className="form-label">
          Enter / Extracted Text:
        </label>
        <textarea
          id="inputText"
          className="form-control"
          rows="4"
          placeholder="Type or upload a PDF to extract text..."
          value={inputText}
          onChange={(e) =>
            setInputText(limitTextToCharacters(e.target.value, MAX_CHARACTERS))
          }
        ></textarea>
        <div className="d-flex justify-content-end">
          <p className="text-muted mb-0">
            {inputText.length}/{MAX_CHARACTERS}
          </p>
        </div>
      </div>

      {/* File Upload Button */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "fit-content", margin: "auto", marginTop: "-32px" }}>
        <div className="mb-3 mt-3 d-flex align-items-center gap-2">
          <button
            className={`btn ${uploadStatus === "Uploaded" ? "btn-secondary" : "btn-primary"}`}
            onClick={() => fileInputRef.current.click()}
            style={{ height: "37px", width: "105px", fontSize: "14px" }}
          >
            {uploadStatus}
          </button>
          <input
            type="file"
            accept="application/pdf"
            className="d-none"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          {/* Show File Name if Selected */}
          {file && <span className="text-muted">{file.name}</span>}
        </div>
      </div>

      {/* Language Selection */}
      <div className="mb-3">
        <label className="form-label">Target Language (Voice):</label>
        <select
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="form-select"
          style={{ width: "200px" }}
        >
          <option value="" disabled>
            Select Language
          </option>
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

      {/* Buttons */}
      <div className="d-flex gap-3 mt-3">
        <button
          className="btn btn-primary custom-btn"
          onClick={handleTranslateAndSpeak}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Translate"}
        </button>
        <button style={{ height: "37px", width: "105px", fontSize: "14px" }}
          type="button"
          className="btn btn-secondary custom-btn"
          onClick={handleReset}
        >
          <span>Refresh</span>
          <span>
            <svg className="svg-icon" viewBox="0 0 48 48">
              <path d="M35.3 12.7c-2.89-2.9-6.88-4.7-11.3-4.7-8.84 0-15.98 7.16-15.98 16s7.14 16 15.98 16c7.45 0 13.69-5.1 15.46-12h-4.16c-1.65 4.66-6.07 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.31 0 6.28 1.38 8.45 3.55l-6.45 6.45h14v-14l-4.7 4.7z"></path>
            </svg>
          </span>
        </button>
      </div>

      {/* Audio Controls */}
      {audioUrl && (
        <div className="mt-4 text-center">
          <p><strong>Play the audio</strong></p>
          <audio controls src={audioUrl}></audio>
        </div>
      )}
    </div>
  );
};

export default TextToSpeech;
