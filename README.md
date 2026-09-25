# Rethinking AI Pronunciation Feedback

A React and Vite research prototype that explores how AI pronunciation feedback can support learner judgment instead of acting like the final authority.

The learner:

1. Chooses a goal.
2. Records one of two short phrases.
3. Receives feedback from Azure Pronunciation Assessment.
4. Reviews the evidence.
5. Decides whether to practice again, keep their pronunciation, or remain unsure.

The project compares three feedback styles using the same stored assessment result:

- **A: Direct scoring** focuses on the model's score.
- **B: Reflective feedback** focuses on what the model noticed and keeps the score secondary.
- **C: Intelligibility focused** compares what the system recognized with the intended sentence.

Azure scores show how closely speech matches the model's pronunciation reference. They do not prove whether a human listener would understand the speaker.

## Tech

- React
- Vite
- Express
- Microsoft Azure AI Speech Pronunciation Assessment
- MediaRecorder
- Web Audio
- Node.js

## Setup

Use Node 22.13 or later.

```bash
npm install
cp .env.example .env
```

Add your Azure credentials to `.env`:

```env
AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=eastus
```

Start the app:

```bash
npm run dev
```

This starts the Vite client and Express server together.

Open:

```text
http://localhost:5173
```

## Production Check

```bash
npm run build
NODE_ENV=production npm start
```

This starts one Express process that serves the built frontend and the pronunciation API. Set `PORT` through the hosting environment when deploying.

Then open:

```text
http://localhost:3001
```

## Testing

```bash
npm test
npm run lint
npm run build
```

## Project Structure

```text
src/       React frontend
server/    Express backend
shared/    Shared phrase and alignment logic
tests/     Assessment and scenario tests
```

## Notes

- Recordings are converted to mono 16 kHz, 16 bit PCM WAV before being sent to Azure.
- Azure credentials stay on the backend.
- Recordings and learner decisions stay in local session state.
- The prototype uses two fixed English phrases.
- Research controls include live Azure assessment and simulated critique scenarios.
- Microphone access requires localhost or HTTPS.
