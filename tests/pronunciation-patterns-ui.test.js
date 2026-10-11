import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getPhrase } from '../shared/phrases.js';
import { createPronunciationObservations } from '../shared/pronunciationPatterns.js';
import { SIMULATED_PRACTICE_HISTORIES } from '../src/simulatedPracticeHistories.js';
import { emptyRecommendationChoices, updateRecommendationChoices } from '../src/practiceRecommendations.js';

// Render the actual component with existing Vite/React tools; no DOM framework.
test('pattern UI shows only recurring observations and preserves inspectable evidence', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { default: Patterns } = await vite.ssrLoadModule('/src/components/PronunciationPatterns.jsx');
    const { default: Recommendations } = await vite.ssrLoadModule('/src/components/PracticeRecommendations.jsx');
    const { default: ResearchControls } = await vite.ssrLoadModule('/src/components/ResearchControls.jsx');
    const recommend = (choices, goal = 'explore', onPracticePhrase) => renderToStaticMarkup(createElement(Recommendations, {
      sessionPhrases: SIMULATED_PRACTICE_HISTORIES.recurring.sessionPhrases,
      choices, goal, onDecision: () => {}, onPracticePhrase,
    }));
    const choices = emptyRecommendationChoices();
    for (const goal of ['understood', 'explore', 'example']) {
      const suggestion = recommend(choices, goal);
      assert.match(suggestion, /not a confirmed sound error/);
      assert.match(suggestion, /Accept — save this focus/);
      assert.match(suggestion, /Reject — don’t suggest this focus/);
      assert.match(suggestion, /Choose a different focus/);
      assert.doesNotMatch(suggestion, /Practice this phrase/);
    }
    const accepted = updateRecommendationChoices(choices, { action: 'accept', featureId: 'r' });
    assert.match(recommend(accepted), /Your saved practice focus/);
    assert.match(recommend(accepted), /Nothing has been assigned automatically/);
    assert.doesNotMatch(recommend(accepted), /Practice this phrase/);
    assert.match(recommend(accepted, 'explore', () => {}), /Practice this phrase/);
    const redirected = updateRecommendationChoices(choices, { action: 'redirect', featureId: 'r', targetId: 'sh' });
    assert.match(recommend(redirected), /Sh sound/);
    assert.doesNotMatch(recommend(redirected), /AI highlighted words/);
    const rejected = updateRecommendationChoices(choices, { action: 'reject', featureId: 'r' });
    assert.match(recommend(rejected), /No more suggestions based on your current choices/);
    const controls = renderToStaticMarkup(createElement(ResearchControls, { scenarios: {} }));
    assert.match(controls, /Simulated practice history/);
    assert.match(controls, /id="research-recommendations" hidden=""/);
    assert.match(controls, /aria-pressed="true" aria-controls="research-feedback"/);
    const saved = recommend(accepted, 'explore', () => {});
    assert.equal((saved.match(/>Practice this phrase<\/button>/g) || []).length, 1);
    assert.match(saved, /Suggested phrases/);
    assert.match(controls, /Recurring R and L observations/);
    const { default: Views } = await vite.ssrLoadModule('/src/components/LearnerViews.jsx');
    const { default: Sidebar } = await vite.ssrLoadModule('/src/components/ContextSidebar.jsx');
    const sidebarProps = { stage: 'feedback', goal: 'explore', choices: accepted, sessionPhrases: SIMULATED_PRACTICE_HISTORIES.more.sessionPhrases, view: 'practice', onViewChange: () => {} };
    const sidebar = (props = {}) => renderToStaticMarkup(createElement(Sidebar, { ...sidebarProps, ...props }));
    for (const stage of [{ stage: 'goal' }, { stage: 'practice', showObservations: true }, { showObservations: false }, { showObservations: true, reflectionPending: true }]) {
      assert.doesNotMatch(sidebar(stage), /AI highlighted|Model match|62|simulated-library|Consider exploring/);
    }
    assert.match(sidebar({ stage: 'goal' }), /Saved practice focus/);
    assert.match(sidebar({ stage: 'goal' }), /Learning history/);
    const recording = sidebar({ stage: 'practice', referenceText: 'A phrase to record.' });
    assert.match(recording, /Exploring my pronunciation/);
    assert.match(recording, /A phrase to record/);
    assert.doesNotMatch(recording, /Supporting observations|Optional next step/);
    const reflection = sidebar({ reflectionPending: true, learnerResponse: 'none', showObservations: true });
    assert.match(reflection, /Nothing stands out to me/);
    assert.match(reflection, /AI feedback stays hidden/);
    assert.match(sidebar(), /No observations yet/);
    const revealed = sidebar({ showObservations: true });
    assert.equal((revealed.match(/AI highlighted/g) || []).length, 2);
    assert.match(revealed, /not confirmed errors/);
    assert.match(revealed, /Patterns and limitations/);
    assert.doesNotMatch(revealed, /Model match/);
    const completion = sidebar({ stage: 'complete', choices: emptyRecommendationChoices(), showObservations: true });
    assert.match(completion, /Consider exploring/);
    assert.match(completion, /not a confirmed sound error/);
    const { default: GoalScreen } = await vite.ssrLoadModule('/src/components/GoalScreen.jsx');
    const goalOptions = renderToStaticMarkup(createElement(GoalScreen, { selectedGoal: 'explore' }));
    assert.equal((goalOptions.match(/role="radio"/g) || []).length, 3);
    assert.equal((goalOptions.match(/aria-checked="true"/g) || []).length, 1);
    for (const label of ['Being easily understood', 'Exploring my pronunciation', 'Practicing toward an example']) assert.ok(goalOptions.includes(label));
    assert.match(goalOptions, /goal-choice-indicator/);
    const wideLayout = renderToStaticMarkup(createElement(Views, {
      view: 'practice', onViewChange: () => {}, practice: 'workflow', sidebar: 'context',
    }));
    assert.match(wideLayout, /class="learner-layout"/);
    assert.match(wideLayout, /class="context-sidebar" aria-label="Practice context"/);
    assert.ok(wideLayout.indexOf('role="tablist"') < wideLayout.indexOf('class="learner-layout"'));

    const { default: Progress } = await vite.ssrLoadModule('/src/components/ProgressView.jsx');
    const { default: SuggestedPhrases } = await vite.ssrLoadModule('/src/components/SuggestedPhrases.jsx');
    const content = { practice: 'practice-content', progress: 'progress-content', focus: 'focus-content' };
    for (const view of ['practice', 'progress', 'focus']) {
      const navigation = renderToStaticMarkup(createElement(Views, { ...content, view, onViewChange: () => {} }));
      assert.equal((navigation.match(/role="tabpanel"/g) || []).length, 3);
      assert.equal((navigation.match(/hidden=""/g) || []).length, 2);
      assert.equal((navigation.match(/aria-selected="true"/g) || []).length, 1);
      for (const text of Object.values(content)) assert.ok(navigation.includes(text));
    }
    const locked = renderToStaticMarkup(createElement(Views, { ...content, view: 'practice', busy: true }));
    assert.equal((locked.match(/disabled=""/g) || []).length, 2);
    const progress = renderToStaticMarkup(createElement(Progress, { sessionPhrases: SIMULATED_PRACTICE_HISTORIES.more.sessionPhrases }));
    assert.match(progress, /Attempt history/);
    assert.match(progress, /Simulated/);
    assert.doesNotMatch(progress, /<audio/);
    const ids = [...progress.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(ids.length, new Set(ids).size);
    const { PHRASES } = await import('../shared/phrases.js');
    const phraseOptions = renderToStaticMarkup(createElement(SuggestedPhrases, { phrases: PHRASES, focusId: 'r' }));
    assert.equal((phraseOptions.split('<details>')[0].match(/type="radio"/g) || []).length, 3);
    assert.match(phraseOptions, /Show 7 more phrases/);
    assert.doesNotMatch(phraseOptions, /<details open/);
    const attempts = ['library', 'comfortable', 'train'].map((phraseId, index) => {
      const phrase = getPhrase(phraseId);
      const attempt = {
        id: `${phraseId}-test-${index}`, phraseId, referenceText: phrase.text,
        assessment: {
          recognizedText: phrase.text,
          flaggedWord: { word: ['library', 'chair', 'train'][index], accuracyScore: 58, errorType: index === 2 ? 'None' : 'Mispronunciation' },
        },
      };
      return { ...attempt, pronunciationObservations: createPronunciationObservations(attempt) };
    });
    const render = (items) => renderToStaticMarkup(createElement(Patterns, {
      sessionPhrases: items.map((attempt) => ({ phraseId: attempt.phraseId, attempts: [attempt] })),
    }));
    for (const count of [0, 1, 2]) {
      const html = render(attempts.slice(0, count));
      assert.match(html, /No recurring patterns to show yet/);
      assert.doesNotMatch(html, /<details/);
    }
    const html = render(attempts);
    assert.equal((html.match(/<details/g) || []).length, 1);
    assert.match(html, /Possible pattern: R sound/);
    assert.match(html, /3 attempts · 3 phrases/);
    assert.match(html, /not confirmed facts/);
    assert.match(html, /You decide/);
    assert.match(html, /without marking a pronunciation issue/);
    assert.match(html, /marked a lower pronunciation match/);
    assert.match(html, /<summary>/);
    assert.doesNotMatch(html, /<details[^>]*open/);
    for (const attempt of attempts) {
      assert.ok(html.includes(attempt.referenceText));
      assert.ok(html.includes(attempt.id));
      assert.ok(html.includes(attempt.assessment.flaggedWord.word));
    }
    assert.match(html, /Model match: 58 \/ 100/);
    assert.equal(render([...attempts, ...attempts]), html);
    assert.match(render([]), /No recurring patterns to show yet/);
  } finally {
    await vite.close();
  }
});
