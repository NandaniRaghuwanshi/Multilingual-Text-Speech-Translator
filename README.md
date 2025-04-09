# Multilingual-Text-Speech-Translator
A multilingual web application designed to deliver text/speech in multiple languages. This project builds a production-ready bundle that can be deployed to a static server or integrated into a larger application.
# Table of Contents
  - **Overview**
  - **Project Structure**
  - **Installation**
  - **Development**
  - **Build and Deployment**
  - **Azure API Integration**
## Overview
This repository contains the source code and build outputs for a multilingual web application.The build process generates a production-ready version under the build/ directory, including HTML, CSS, JavaScript assets, and Azure API.

## Project Structure

```
/Multilingual-Voice-Speech-Translator-
├── .gitignore
├── package-lock.json
├── package.json
├── build
│   ├── asset-manifest.json
│   ├── index.html
│   └── static
│       ├── css
│       │   ├── main.aafe185d.css
│       │   └── main.aafe185d.css.map
│       └── js
│           ├── main.58887686.js
│           ├── main.58887686.js.LICENSE.txt
│           └── main.58887686.js.map
├── public
│   └── index.html
└── src
    ├── App.css
    ├── App.js
    ├── index.css
    ├── index.js
    ├── TranslatorApp.js
    └── components
        ├── LandingPage.css
        ├── LandingPage.js
        ├── SpeechToSpeech.js
        ├── SpeechToText.css
        ├── SpeechToText.js
        ├── TextToSpeech.js
        └── TextToText.js
```
## Installation
1. Clone the Repository:
     ```
       git clone https://github.com/NandaniRaghuwanshi/Multilingual-Voice-Speech-Translator-.git
       cd Multilingual-Voice-Speech-Translator-
   ```
2. Install Dependencies: If your project does not include the node_modules/ directory in the repo (recommended for GitHub), run:
   ```
   npm install
   ```
   **or if you are using Yarn:**
   ```
   yarn install
   ```
## Development
To start a local development server (if applicable):
  1. Ensure that your dependencies are installed.   
  2. Run the development server:
      ```
     npm start
     ```
## Build and Deployment
      ```
      npm run build
      ```
  **or**
     ```
     yarn build
     ```
  This command generates the files in the build/ directory, which you can then deploy to your preferred hosting service (such as GitHub Pages, Netlify, or a traditional web server).

## Deployment Options
  - **Static Server:** You can serve the contents of the build/ directory using a simple static file server.
  - **GitHub Pages:** For GitHub Pages deployment, consider using a package such as gh-pages.
     
## Azure API Integration
  This project leverages Azure Cognitive Services to support multilingual capabilities and enhance user interaction. The Azure services integrated may include:
  - Azure Translator Text API – for real-time language translation.
  - Azure Speech Services – for text-to-speech (TTS) or speech-to-text (STT) capabilities.
  - Azure Document Intelligence - for document parsing.
 ### Configuration
   ```
  const speechKey = "your speech key";
  const speechRegion = "your speech key region";
  const translatorKey = "your translator key";
  const translatorEndpoint = "your translator endpoint";
  const documentIntelligenceKey = "your document intelligence key";
  const documentIntelligenceEndpoint = "your document intelligence endpoint";
  ```
