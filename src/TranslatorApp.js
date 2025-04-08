import axios from "axios";
import {
  SpeechConfig,
  AudioConfig,
  SpeechRecognizer,
  SpeechSynthesizer,
} from "microsoft-cognitiveservices-speech-sdk";


// Azure Keys
const speechKey = "";
const speechRegion = "";
const translatorKey = "";
const translatorEndpoint = "";
const documentIntelligenceKey = "";
const documentIntelligenceEndpoint = "";

export{speechKey, speechRegion}

// ----- Translation Functionality -----
export async function translateText(text, targetLanguage) {
  if (!text) return "";
  try {
    const response = await fetch(
      `${translatorEndpoint}/translate?api-version=3.0&to=${targetLanguage}`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": translatorKey,
          "Ocp-Apim-Subscription-Region": speechRegion,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ Text: text }]),
      }
    );
    const data = await response.json();
    return data[0]?.translations[0]?.text;
  } catch (error) {
    console.error("Translation Error:", error);
    return "";
  }
}

// ----- PDF Text Extraction Using Azure AI Document Intelligence -----
export async function extractTextFromPDF(file) {
  if (!file) return "";

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      `${documentIntelligenceEndpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`,
      file,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": documentIntelligenceKey,
          "Content-Type": "application/pdf",
        },
      }
    );

    const operationLocation = response.headers["operation-location"];

    // Wait for processing (Azure takes some time)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const result = await axios.get(operationLocation, {
      headers: { "Ocp-Apim-Subscription-Key": documentIntelligenceKey },
    });

    return result.data.analyzeResult.content;
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    return "Error extracting text from PDF.";
  }
}

// ----- Text-to-Speech Functionality -----
export function speakText(text, targetLanguage) {
  if (!text) return;
  const speechConfig = SpeechConfig.fromSubscription(speechKey, speechRegion);
  speechConfig.speechSynthesisLanguage = targetLanguage;

  // Voice mapping for various languages
  const voiceMap = {
    hi: "hi-IN-AnanyaNeural", // Hindi
    pa: "pa-IN-VaaniNeural", // Punjabi
    bn: "bn-IN-BashkarNeural", // Bengali
    mr: "mr-IN-AarohiNeural", // Marathi
    gu: "gu-IN-DhwaniNeural", // Gujarati
    te: "te-IN-MohanNeural", // Telugu
    ta: "ta-IN-ValluvarNeural", // Tamil
    ur: "ur-IN-SalmanNeural", // Urdu
    ml: "ml-IN-MidhunNeural", // Malayalam
    kn: "kn-IN-SapnaNeural", // Kannada
    or: "or-IN-SukantNeural", // Odias
    en: "en-IN-AnanyaNeural", // English
  };

  speechConfig.speechSynthesisVoiceName =
    voiceMap[targetLanguage] || "en-US-JennyNeural";

  const audioConfig = AudioConfig.fromDefaultSpeakerOutput();
  const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

  synthesizer.speakTextAsync(
    text,
    (result) => {
      if (result.reason !== 3) {
        console.error("Text-to-Speech Error:", result.errorDetails);
      }
      synthesizer.close();
    },
    (error) => {
      console.error("Speech Synthesizer Error:", error);
      synthesizer.close();
    }
  );
}

// ----- Speech-to-Text Functionality -----
export function recognizeSpeech(speechLanguage, onResult, onError) {
  const speechConfig = SpeechConfig.fromSubscription(speechKey, speechRegion);
  speechConfig.speechRecognitionLanguage = speechLanguage;
  const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
  const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

  recognizer.recognizeOnceAsync(
    (result) => {
      recognizer.close();
      onResult(result.text);
    },
    (error) => {
      console.error("Speech Recognition Error:", error);
      recognizer.close();
      if (onError) onError(error);
    }
  );
}

// ----- Audio File Transcription Using Azure Speech-to-Text -----
export async function transcribeAudio(audioFile, language = "en-IN", options = {}) {
  if (!audioFile) return "No audio file provided.";

  try {
    const response = await axios.post(
      `https://${speechRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}`,
      audioFile,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": speechKey,
          "Content-Type": audioFile.type, // Dynamically set Content-Type based on file
          "Content-Disposition": `attachment; filename="${audioFile.name}"`,
        },
        signal: options?.signal, // ✅ Allow request cancellation
      }
    );

    return response.data.DisplayText || "No text extracted.";
  } catch (error) {
    if (axios.isCancel(error)) {
      console.warn("Transcription request was canceled.");
      return "Transcription canceled, Please Refresh Again.";
    }
    console.error("Transcription Error:", error.response?.data || error.message);
    return "Error transcribing audio.";
  }
}


