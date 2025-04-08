import React, { useState, useRef } from "react";
import { translateText, extractTextFromPDF } from "../TranslatorApp";
import "bootstrap/dist/css/bootstrap.min.css";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";



const TextToText = () => {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("Upload PDF"); // "Upload PDF" -> "Uploading..." -> "Uploaded"
  const fileInputRef = useRef(null);

  const MAX_CHARACTERS = 1000;

  const limitTextToCharacters = (text, maxChars) => {
    return text.length > maxChars ? text.slice(0, maxChars) : text;
  };

  // Handle file selection and auto-start extraction
  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadStatus("Uploading...");

    try {
      const extractedText = await extractTextFromPDF(selectedFile);
      setInputText(limitTextToCharacters(extractedText, MAX_CHARACTERS));
      setUploadStatus("Uploaded");
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      setUploadStatus("Upload PDF"); // Reset if extraction fails
    }
  };

  const handleTranslate = async () => {
    if (!targetLanguage) {
      alert("Please select a language");
      return;
    }
    setIsProcessing(true);
    try {
      const translated = await translateText(inputText, targetLanguage);
      setTranslatedText(translated);
    } catch (error) {
      console.error("Translation Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextChange = (e) => {
    setInputText(limitTextToCharacters(e.target.value, MAX_CHARACTERS));
  };

  const handleReset = () => {
    setInputText("");
    setTargetLanguage("");
    setTranslatedText("");
    setFile(null);
    setUploadStatus("Upload PDF");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const handleDownloadWord = async () => {
    if (!translatedText) {
      alert("No translated text available to download!");
      return;
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun("Translated Text:"),
                new TextRun("\n\n" + translatedText),
              ],
            }),
          ],
        },
      ],
    });

    // Generate Word document blob
    const blob = await Packer.toBlob(doc);

    // Generate a file name (use uploaded file name if available)
    const fileName = file ? file.name.replace(".pdf", "_translated.docx") : `translated_${Date.now()}.docx`;

    // ✅ Save Locally
    saveAs(blob, fileName);

    // ✅ Upload to Azure in the background (does not block download)
    uploadToAzure(blob, fileName);
  };

  const uploadToAzure = async (blob, fileName) => {
    const storageAccount = "lanvoicestorage"; // Change this
    const containerName = "$web"; // Since we are using a static site container
    const sasToken = "sp=rcw&st=2025-03-04T06:39:18Z&se=2025-03-11T14:39:18Z&sv=2022-11-02&sr=c&sig=sdeQa1iAeMBQPmrso9WqSrm2LD3c42SdiC3kJlKQnTY%3D"; // Use your generated SAS token

    // ✅ Save in "Document" folder
    const folderName = "Document";
    const fullFilePath = `${folderName}/${fileName}`; // This creates the "Document" folder if not present

    const url = `https://${storageAccount}.blob.core.windows.net/${containerName}/${fullFilePath}?${sasToken}`;

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        body: blob,
      });

      if (response.ok) {
        console.log(`File uploaded successfully to Azure: ${url}`);
      } else {
        console.error("Failed to upload file to Azure", response);
      }
    } catch (error) {
      console.error("Upload Error:", error);
    }
  };


  return (
    <div className="container text-to-text-container">
      <style>
        {`
          .custom-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 150px;
            height: 40px;
            font-weight: 600;
            border-radius: 8px;
            transition: all 0.3s ease-in-out;
          }

          .custom-btn:hover {
            transform: translateY(-2px);
          }

          .svg-icon {
            fill: currentColor;
            width: 18px;
            height: 18px;
          }
        `}
      </style>

      <h3 className="text-center" style={{ marginBottom: "20px" }}>Text to Text</h3>

      {/* Extracted / User Input Text */}
      <label htmlFor="inputText" className="mt-3">Enter / Extracted Text:</label>
      <textarea
        id="inputText"
        className="form-control"
        rows="4"
        placeholder="Type or upload a PDF to extract text..."
        value={inputText}
        onChange={handleTextChange}
      ></textarea>

      <div className="d-flex justify-content-end">
        <p className="text-muted mb-0">{inputText.length}/{MAX_CHARACTERS}</p>
      </div>

      {/* File Upload */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "fit-content", margin: "auto", marginTop: "-20px", }}>
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
      <label htmlFor="languageSelect" className="">Select Language:</label>
      <select
        id="languageSelect"
        value={targetLanguage}
        onChange={(e) => setTargetLanguage(e.target.value)}
        className="form-select mb-3"
        style={{ width: "200px" }}
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

      {/* Buttons */}
      <div className="d-flex gap-3 mt-3">
        <button className="btn btn-primary custom-btn" onClick={handleTranslate} disabled={isProcessing} style={{ height: "37px", width: "105px", fontSize: "14px" }}  >
          {isProcessing ? "Processing..." : "Translate"}
        </button>
        <button
          type="button"
          className="btn btn-secondary custom-btn"
          style={{ height: "37px", width: "105px", fontSize: "14px" }}
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

      {/* Translated Output */}
      <h5 className="mt-3">Output:</h5>
      <div className="border p-3 bg-light output-text" style={{ minHeight: "50px" }}>
        {translatedText || "No translation yet"}
      </div>
      {/* Download Word File Button */}
      <button
        className="btn btn-success custom-btn mt-3"
        onClick={handleDownloadWord}
        style={{ height: "37px", width: "150px", fontSize: "12px" }}
      >
        Download document
      </button>

    </div>
  );
};

export default TextToText;
