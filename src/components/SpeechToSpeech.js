import React, { useState, useRef } from "react";
import { recognizeSpeech, translateText, speakText, transcribeAudio } from "../TranslatorApp";
import "bootstrap/dist/css/bootstrap.min.css";

const SpeechToSpeech = () => {
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [sttTargetLanguage, setSttTargetLanguage] = useState("");
  const [inputText, setInputText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("Upload Audio/Video");

  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef(null);

  // Start Speech Recognition
  const recognitionRef = useRef(null); // Store the recognition instance

  const startRecognition = () => {
    if (!sttTargetLanguage) {
      alert("Please select a target language");
      return;
    }

    setIsSpeaking(true);
    isListeningRef.current = true;
    setInputText("");

    const recognizeLoop = () => {
      if (!isListeningRef.current) return; // Stop if "Stop Speaking" is clicked

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

    recognizeLoop(); // Start the loop
  };

  // Stop Speech Recognition
  const stopRecognition = async () => {
    setIsSpeaking(false);
    isListeningRef.current = false;

    // Stop recognition immediately
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (inputText) {
      try {
        const translated = await translateText(inputText, sttTargetLanguage);
        speakText(translated, sttTargetLanguage);
      } catch (error) {
        console.error("Translation Error:", error);
      }
    }
  };

  // Toggle Speech
  const handleToggleSpeech = () => {
    isSpeaking ? stopRecognition() : startRecognition();
  };

  // Reset
  const handleReset = () => {
    sessionStorage.setItem("stayOnSpeechToSpeech", "true"); // Set flag to stay on SpeechToSpeech
    window.location.reload(); // Reload the page
  };


  // Handle File Upload
  const handleFileChange = async (event) => {
    if (!sttTargetLanguage) {
      alert("Please select a target language before uploading a file.");
      return;
    }

    if (isProcessingRef.current) {
      console.warn("Processing already in progress. Please wait.");
      return;
    }

    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setAudioFile(selectedFile);
    setUploadStatus("Uploading...");
    isProcessingRef.current = true;

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

      let extractedText = await transcribeAudio(fileToProcess, speechLanguage);

      // **Limit extracted text to 1000 characters**
      extractedText = extractedText.substring(0, 1000);
      setInputText(extractedText);
      setUploadStatus("Uploaded");

      // Speak the translated text automatically
      if (sttTargetLanguage) {
        const translatedText = await translateText(extractedText, sttTargetLanguage);
        speakText(translatedText, sttTargetLanguage);
      }
    } catch (error) {
      console.error("Error extracting text:", error);
      setUploadStatus("Upload Audio/Video");
    } finally {
      isProcessingRef.current = false;
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

  return (
    <div className="container speech-to-speech-container" >
      <h3 className="text-center" style={{ marginBottom: "35px" }}>Speech to Speech</h3>

      {/* Speech Recognition Language */}
      {/* Speech Recognition & Translation Target Language - Same Row */}
      <div className="row mb-3">
        {/* Speech Recognition Language (Left) */}
        <div className="col-md-6">
          <label className="form-label">Speech Recognition Language:</label>
          <select
            value={speechLanguage}
            onChange={(e) => setSpeechLanguage(e.target.value)}
            className="form-select"
            style={{ width: "250px", marginBottom: "30px" }}
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
            style={{ width: "250px", marginBottom: "30px" }}
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

      {/* Buttons - File Upload, Start/Stop Speaking, Refresh */}
      <div className="speech-buttons d-flex flex-wrap justify-content-center align-items-center gap-2">

        {/* Upload Audio File */}
        <div className="d-flex align-items-center gap-2">
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
          {audioFile && <span className="text-muted text-truncate" style={{ maxWidth: "150px", overflow: "hidden" }}>{audioFile.name}</span>}
        </div>

        {/* Start/Stop Speaking Toggle */}
        <div className="checkbox-wrapper-8">
          <input type="checkbox" id="cb3-8" className="tgl" checked={isSpeaking} onChange={handleToggleSpeech} />
          <label
            htmlFor="cb3-8"
            data-tg-on="Stop speaking"
            data-tg-off="Start speaking"
            className="tgl-btn d-flex justify-content-center align-items-center"
            style={{ backgroundColor: isSpeaking ? "#b22222" : "#018749", width: "146px", height: "40px" }}
          ></label>
        </div>

        {/* Refresh Button */}
        <button className="btn btn-secondary d-flex align-items-center justify-content-center" onClick={handleReset} style={{ height: "40px", width: "105px", fontSize: "14px" }}>
          <span>Refresh</span>
          <span>
            <svg className="svg-icon" viewBox="0 0 48 48" width="16" height="16">
              <path d="M35.3 12.7c-2.89-2.9-6.88-4.7-11.3-4.7-8.84 0-15.98 7.16-15.98 16s7.14 16 15.98 16c7.45 0 13.69-5.1 15.46-12h-4.16c-1.65 4.66-6.07 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.31 0 6.28 1.38 8.45 3.55l-6.45 6.45h14v-14l-4.7 4.7z"></path>
            </svg>
          </span>
        </button>
      </div>




      {/* Recognized Text Display */}
      <div className="mt-3" >
        <h5 style={{ marginTop: "50px" }}>Recognized Text:</h5>
        <div className="border p-3 bg-light" style={{ minHeight: "50px" }}>
          {inputText || "No speech recognized yet"}
        </div>
        <div className="text-end text-muted" style={{ fontSize: "0.9em" }}>
          {inputText.length}/1000
        </div>
      </div>
    </div >
  );
};

export default SpeechToSpeech;