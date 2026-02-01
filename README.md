# AI SQL Architect

A web application that converts natural language questions into SQL queries using AI.

## Project Structure

```
talk-to-db-react/
├── client/          # React frontend (Vite)
└── server/          # Express backend
    ├── config/      # Configuration (Ollama AI client)
    ├── controllers/ # Request handlers
    ├── middleware/  # Express middleware
    ├── routes/      # API routes
    └── services/    # Business logic
```

## Prerequisites

- Node.js 18+
- Ollama with llama3.2 model installed

## Setup

### 1. Start Ollama

Make sure Ollama is running with the llama3.2 model:

```bash
ollama run llama3.2
```

### 2. Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### 3. Run the Application

**Terminal 1 - Start the backend:**
```bash
cd server
npm start
```

**Terminal 2 - Start the frontend:**
```bash
cd client
npm run dev
```

### 4. Open the App

Navigate to http://localhost:5173 in your browser.

## Usage

Type natural language questions like:
- "Show me all sales in India"
- "Get the total amount by country"
- "List products sold last month"

The AI will convert your question into a SQL query.

## API Endpoints

| Method | Endpoint    | Description          |
|--------|-------------|----------------------|
| POST   | /api/chat   | Send chat messages   |
| GET    | /health     | Health check         |
