# DocuTrust: Enterprise Advanced RAG Platform

<div align="center">

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini%20API-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)

**Secure, private, and fully-grounded enterprise intelligence platform for documents.**

</div>

---

## 📋 Project Description

**DocuTrust** is a production-grade Enterprise Advanced Retrieval-Augmented Generation (RAG) platform. Designed for business professionals and security-conscious organizations, DocuTrust allows users to securely upload multi-page PDF documents, extract text directly within the browser, split content into overlapping semantic text passages, generate vector embeddings via Google Gemini models, and execute high-precision grounded conversational queries.

DocuTrust strictly enforces context-grounded rules: **it answers user queries strictly and exclusively using information sourced from the uploaded document vaults**, completely neutralizing AI hallucinations. Every answer is coupled with precise page-level and file-specific document citations complete with mathematical similarity scores.

---

## 🚀 Features

- **Grounded Enterprise Authentication**:
  - Secure user onboarding via **Sign Up** and **Login**.
  - Robust **JWT Authentication** utilizing Custom Signed Tokens (HMAC-SHA256 signature algorithm).
  - Secure client state persistence and automatic gateway token validation.
- **Client-Side Isolated Parser**:
  - High-performance page-by-page text extraction from complex PDFs using web worker isolated parsing.
  - Zero server-side file footprints; parsed elements are transmitted securely as sanitized memory arrays.
  - Maximum 15MB file ceiling guards infrastructure throughput.
- **Advanced Semantic Processing**:
  - Custom sliding window overlapping character chunker configured to avoid word boundary truncation.
  - Dynamic vector representation generated using Google's newest embedding model: `gemini-embedding-2-preview` (768-D mapping space).
- **High-Fidelity RAG Consultation**:
  - Real-time RAG consultations inside unique, custom-titled Chat Rooms.
  - In-house **Vector Search Engine** executing Cosine Similarity mathematical calculations to retrieve top matching contexts.
  - Generative synthesis using the high-performance model `gemini-3.5-flash` operating under strict zero-hallucination constraints.
- **Detailed Source Citations**:
  - Fully transparent compliance: Expandable citations showing matched excerpts, page coordinates, document names, and numerical match percentages.
- **Polished Visual Workspace**:
  - Fluid twilight-slate dark visual theme styled with Tailwind CSS.
  - Responsive layout adjusting dynamically to mobile and desktop screens.
  - High-precision indicators for active vector count, total vault capacity, and RAG status.

---

## 🏗️ Architecture Overview

DocuTrust implements a clean, unified, full-stack structure:

```
                  ┌────────────────────────┐
                  │      React App         │
                  │  (Vite + Tailwind CSS) │
                  └───────────┬────────────┘
                              │
                    HTTPS REST / API Requests
                              │
                              ▼
                  ┌────────────────────────┐
                  │    Express Backend     │
                  │ (Server Entry Points)  │
                  └───────────┬────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│ Google Gemini API     │           │ Dynamic JSON DB       │
│ - gemini-embedding-2  │           │ (data/db.json)        │
│ - gemini-3.5-flash    │           │ - Custom Security JWT │
└───────────────────────┘           │ - User Records & RAG  │
                                    └───────────────────────┘
```

The system operates without standard external DBMS dependency. It persists user records, document indexes, semantic text chunks, and consultation logs in an in-memory, file-synced JSON schema (`data/db.json`). This ensures lightweight local deployments, fast container startup speeds, and absolute local control over confidential business indices.

---

## 🛠️ Tech Stack

- **Client Framework**: React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React (Icons)
- **Transitions/Animations**: Motion (Framer Motion v12)
- **Client-Side PDF Engine**: PDF.js (parsed within sandboxed Web Workers)
- **Server Platform**: Node.js, Express, TypeScript (run directly via `tsx`)
- **Build Utilities**: Esbuild (compiles TS to bundled CommonJS for rapid container cold starts)
- **AI Models**:
  - Embedding Engine: `@google/genai` (utilizing `gemini-embedding-2-preview`)
  - Generative Auditing: `gemini-3.5-flash` with strict system instructions and low temperature (0.2)

---

## 📁 Project Folder Structure

```
.
├── .env.example                # Example template for setting secrets
├── .gitignore                  # Git folder exclusions
├── index.html                  # Client web index (loads PDF.js globally)
├── metadata.json               # Platform configuration metadata
├── package.json                # Project script commands and dependencies
├── server.ts                   # Backend entry point (REST APIs & RAG handlers)
├── tsconfig.json               # TypeScript compiler options
├── vite.config.ts              # Vite configuration with HMR restrictions
├── data/
│   └── db.json                 # Auto-created, file-synced JSON database
├── server/
│   ├── db.ts                   # JWT helpers, hashing, & database file operations
│   └── rag.ts                  # Chunker, Cosine similarity, & Vector Search
└── src/
    ├── App.tsx                 # Core UI conductor & authentication state manager
    ├── index.css               # Global Tailwind directives & custom CSS fonts
    ├── main.tsx                # React virtual DOM entry point
    ├── types.ts                # App schema TypeScript declarations
    └── components/
        ├── AuthPage.tsx        # Login & Signup screen with twilight animations
        ├── ChatInterface.tsx   # Consultation room, citation panels, & prompt inputs
        ├── DashboardStats.tsx  # Dynamic numeric statistics cards
        ├── DocumentManager.tsx # PDF Drag-Drop container & client parser
        └── Sidebar.tsx         # Tab selectors, room creators, & user sessions
```

---

## 🔑 Environment Variables

To operate the application safely, environment variables are managed securely. 

### `.env.example` Specification

The project distributes an `.env.example` file that contains the following:

```env
# GEMINI_API_KEY: Required for Gemini AI API calls.
# AI Studio automatically injects this at runtime from user secrets.
# Users configure this via the Secrets panel in the AI Studio UI.
GEMINI_API_KEY="MY_GEMINI_API_KEY"

# APP_URL: The URL where this applet is hosted.
# AI Studio automatically injects this at runtime with the Cloud Run service URL.
# Used for self-referential links, OAuth callbacks, and API endpoints.
APP_URL="MY_APP_URL"

# JWT_SECRET: Optional security key to sign user authorization tokens.
JWT_SECRET="YOUR_CUSTOM_JWT_SECRET_KEY"
```

### Setup Instructions

1. Copy `.env.example` to create a new `.env` file at the root:
   ```bash
   cp .env.example .env
   ```
2. Replace `MY_GEMINI_API_KEY` and `YOUR_CUSTOM_JWT_SECRET_KEY` with your actual development secrets.
3. ⚠️ **CRITICAL SECURITY NOTE**: Never commit your actual `.env` file to any public GitHub or GitLab repository. The `.gitignore` file contains rules to exclude `.env` automatically.

### How to Obtain a Gemini API Key

1. Navigate to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key**.
3. Create a new API key in an existing or new Google Cloud Project.
4. Copy the generated API Key and assign it to `GEMINI_API_KEY` in your `.env` file.

---

## 🚀 Running the Project

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18 or higher) and npm installed.

### 1. Install Dependencies
Initialize npm dependencies listed inside `package.json`:
```bash
npm install
```

### 2. Run in Development Mode
Starts the high-speed backend Express server and mounts Vite as active middleware on port 3000:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 3. Build for Production
Compiles the static client React app into the `dist` directory and bundles the backend TypeScript server into a self-contained CommonJS file (`dist/server.cjs`) using esbuild:
```bash
npm run build
```

### 4. Start Production Server
Launch the compiled, highly-optimized production server:
```bash
npm start
```

---

## ⚡ API Endpoints

The backend exposes the following secure HTTP JSON endpoints under `/api`:

### Authentication Gateway
* **`POST /api/auth/signup`**: Registrates a new user account. Required payloads: `email`, `password`, `name`.
* **`POST /api/auth/login`**: Authenticates user credentials. Returns custom HMAC-SHA256 Signed JSON Web Token.
* **`GET /api/auth/me`**: Verifies currently passed Authorization headers (`Bearer <token>`) and returns user payload.

### Document Inventory
* **`GET /api/documents`**: Retrieves all indexed PDF metadata associated with the authenticated user ID.
* **`POST /api/documents/upload`**: Validates, chunks, embeds, and indexes a parsed PDF. Payload: `name`, `size`, `pages` (array of `{ pageNumber, text }`).
* **`DELETE /api/documents/:id`**: Erasures the specified document from metadata lists and purges all of its semantic vectors from index memory.

### Consultation Chat Rooms
* **`GET /api/chat/sessions`**: Returns all previous conversation sessions sorted by creation date.
* **`POST /api/chat/sessions`**: Creates a new conversation context room.
* **`GET /api/chat/sessions/:id`**: Resolves chat details including full historical messages and associated source citations.
* **`DELETE /api/chat/sessions/:id`**: Permanently purges a chat conversation log.
* **`POST /api/chat/sessions/:id/query`**: The RAG Core engine. Processes query, retrieves top overlapping vectors, and returns a fully grounded generated answer.

---

## 🔒 Security Features

1. **Local Cryptographic Hashing**: User passwords are saved with unique salting routines using `crypto.pbkdf2Sync` with SHA-512 hashing. No plaintext passwords ever touch the persistence layers.
2. **Custom Signature Token Checks**: Security Tokens are generated using custom base64url header/payload bundling with server-side HMAC-SHA256 signature checks. This prevents token tampering.
3. **Sandbox Ingestion Boundaries**: Raw files (PDFs) are parsed directly inside client browser sandbox layers (via PDF.js). No raw file binary writes ever occur on backend hard disks.
4. **Isolated RAG Query Multi-tenancy**: All RAG retrievals automatically append query-level context boundaries enforcing `userId === authenticatedUserId` rules. Users can never query or fetch documents from other accounts.

---

## 🧬 RAG Pipeline Workflows

### 1. Document Processing & Ingestion
```
[User Uploads PDF]
       │
       ▼ (Parsed Client-Side page-by-page using PDF.js worker threads)
[Raw Page Sentences]
       │
       ▼ (Overlapping Character Segment Chunker splits text without truncating words)
[Sanitized Text Chunks]
       │
       ▼ (Google gemini-embedding-2-preview API call)
[768-Dimension Dense Vectors]
       │
       ▼
[Indexed inside data/db.json with Document Meta]
```

### 2. Retrieval & Generation Pipeline
```
[User Question Submitted]
       │
       ▼ (Embed query with gemini-embedding-2-preview)
[768-D Query Vector]
       │
       ▼ (Vector Similarity Engine executes Cosine Similarity math calculation)
[Top K Semantic Chunks Sorted & Score Filtered]
       │
       ▼ (Context Injector structures Grounded instructions)
[Formulated System prompt instruction block containing matching texts]
       │
       ▼ (Submit to gemini-3.5-flash model)
[Synthesized answer with rigorous inline citations and match scores]
```

---

## 🖼️ Screenshots Placeholder

Below are visual layouts representing the application user interface.

* **Client Security Portal & Sign-In Dashboard**:
  ```
  +-------------------------------------------------+
  |                   DocuTrust                     |
  |         Enterprise Advanced RAG Platform        |
  |                                                 |
  |   [Email Input]                                 |
  |   [Password Input]                              |
  |                                                 |
  |             [Sign In to Workspace]              |
  +-------------------------------------------------+
  ```

* **Interactive Vault & Document Consultation Console**:
  ```
  +-------------------------------------------------+
  | Sidebar    | Header: Workspace Dashboard        |
  | ---------- | ---------------------------------- |
  | [Vault]    | [Upload Box] Drag or click to index|
  | [Chat]     |                                    |
  |            | [Vault inventory]                  |
  |            |  - Financial_Report.pdf  (500 Vecs)|
  |            |  - Legal_Charter.pdf     (120 Vecs)|
  +-------------------------------------------------+
  ```

---

## 🔮 Future Improvements

- Add server-side optical character recognition (OCR) for scanned PDF images.
- Transition vector representation searches to hierarchical navigable small world (HNSW) index tables for sub-millisecond scaling.
- Enable direct dynamic document visualization (rendering actual high-resolution source pages side-by-side with RAG replies).

---

## 🛠️ Troubleshooting Guide

- **Linter or Type Errors**:
  If building the application fails, verify you have run `npm install` completely and that TypeScript is running on target ES2022 to enable ESM imports.
- **Vite Connection / HMR Warnings**:
  Benign websocket connection failures in the console are standard since HMR file watching is intentionally disabled by the developer platform config to prevent flickering during dynamic server writes. These can be safely ignored.
- **Empty Embedding Values returned / API Key Errors**:
  Ensure you have defined `GEMINI_API_KEY` inside `.env` correctly. If your keys are invalid, the backend embedding endpoint will respond with a clear stack trace message.

---

## 📄 License

This enterprise platform codebase is distributed under the **Apache-2.0 License**.

---

## 👤 Author

- **AI Coding Agent** (Developed by Google DeepMind)
- Custom workspace built dynamically for **shailasreegajjela2005@gmail.com** (AI Studio Project).
