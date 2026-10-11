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

## Optional recommendations and silent testing

Recommendations reuse the existing word observations and three-distinct-attempt
recurrence threshold. Sound labels come from phrase metadata: whole-word AI
scores cannot establish which sound caused a difference. Recommendations offer
possible focuses, not diagnoses or assignments.

In live feedback, learners can accept (save), reject, or redirect a focus. A
saved focus offers existing practice phrases. From the session summary, learners
can explicitly start one and return to the summary afterward. Rejected and
redirected focuses are suppressed as new evidence arrives. Choices survive new
practice sessions but reset on page reload; no new persistent storage is used.

To test without a microphone or Azure credentials:

1. Run `npm run dev` and open Vite's Local URL (normally `http://localhost:5173`).
2. Open **Research controls → Recommendation demo → Simulated practice history**.
3. Select **Limited evidence**: expect no recommendation. Select **Recurring R
   observations**: inspect the recommendation, then switch to **My Progress** in the demo to expand the observations and attempt history.
4. Reject R, then select **More R and L evidence**. R stays suppressed; L is
   offered. Reject L to exhaust the suggestions.
5. Open **Demo settings and reset**, click **Reset demo choices**, accept a suggestion, then switch to **Practice** in the demo to inspect the saved
   phrases. Only three appear initially; expand **Show more phrases** for the rest. **Practice this phrase** displays a simulated selection confirmation;
   it does not request microphone access or call Azure.
6. Reset again, choose **Choose a different focus**, select a sound, and click
   **Use my chosen focus**. The phrase choices follow your selected focus even
   without AI evidence for that sound.
7. Switch the demo learner goal to check the explanation. Select **Unreliable
   alignment** after resetting choices: expect no recommendation.

Demo histories and choices stay separate from live practice. Switching histories
retains demo choices so suppression can be tested against new evidence. The
existing development research log also records decisions:

```js
console.table(window.__pronunciationResearchLog.filter(
  event => event.event === 'recommendation-decision'
));
```

Demo events have `simulated: true`; live events have `simulated: false`.
Automated tests cover recommendation decisions, evidence, rendering, and optional
practice handlers. They do not replace browser microphone or live Azure testing.

## Learner views

The main workspace has **Practice**, **My Progress**, and **My Focus** tabs.
Practice keeps recording and feedback together; My Progress contains recurring
observations and expandable attempt history; My Focus contains recommendation
choices. View switches preserve local state. Use Left/Right arrows or Home/End
on the tab bar, then Tab to reach the active panel. Switching is disabled during
recording/processing. Learner-first reflection still precedes AI evidence,
including in the progress and focus views.

Research controls are collapsed below the main workspace. The recommendation
history demo uses the same three-view layout with separate simulated data and
choices. Accept a focus in its My Focus tab, choose a phrase in Practice, and
inspect evidence in My Progress. Switching away and back should retain the focus,
phrase selection, and expanded evidence. Demo practice never requests audio.
For feedback/challenge testing, use the existing Studio scenario selector in
Feedback setup; the app returns to its main Practice view.

## Desktop and mobile layout checks

The workspace is capped at 1320px. At viewport widths of 1024px and above, the
active workflow and contextual sidebar use approximately 65/35 columns below the
navigation. The sidebar sticks only on desktop viewports at least 800px tall;
smaller screens stack it below the workflow.

- At 1440px wide, check all three main tabs and the simulated-history demo.
  Expand evidence and verify that the sidebar stays readable while scrolling.
- At 390px and 768px wide, check the single column, phrase expansion, recording
  controls, and tab navigation. There should be no page-level horizontal scroll.
- Before assessment, expect only the learner goal, saved focus, and an explanatory
  placeholder in the sidebar. During learner-first reflection, no recent AI
  observations or scores should appear there. After reflection, eligible recent
  observations can appear with uncertainty language.
- Use the simulated-history demo to check populated columns without audio. It is
  explicitly simulated and remains separate from the live learner-first flow.
