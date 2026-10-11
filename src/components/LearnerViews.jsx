import { useEffect, useId, useRef } from 'react';

const views = [['practice', 'Practice'], ['progress', 'My Progress'], ['focus', 'My Focus']];

export default function LearnerViews({ view, onViewChange, busy = false, practice, progress, focus, sidebar }) {
  const id = useId();
  const buttons = useRef([]);
  const previousView = useRef(view);
  useEffect(() => {
    if (previousView.current !== view) buttons.current[views.findIndex(([key]) => key === view)]?.focus();
    previousView.current = view;
  }, [view]);
  const content = { practice, progress, focus };
  function navigate(event, index) {
    const next = event.key === 'ArrowRight' ? (index + 1) % views.length
      : event.key === 'ArrowLeft' ? (index + views.length - 1) % views.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : null;
    if (next === null || busy) return;
    event.preventDefault();
    onViewChange(views[next][0]);
    buttons.current[next]?.focus();
  }
  return <>
    <div className="learner-navigation" role="tablist" aria-label="Learner views">
      {views.map(([key, label], index) => <button key={key} type="button" role="tab"
        id={`${id}-${key}-tab`} aria-controls={`${id}-${key}-panel`} aria-selected={view === key}
        tabIndex={view === key ? 0 : -1} disabled={busy && view !== key}
        ref={(node) => { buttons.current[index] = node; }}
        onClick={() => onViewChange(key)} onKeyDown={(event) => navigate(event, index)}>{label}</button>)}
    </div>
    {busy && <p className="hint">Finish recording or processing before switching views.</p>}
    <div className={sidebar ? 'learner-layout' : undefined}>
    <div className="learner-workflow">
    {views.map(([key]) => <div key={key} role="tabpanel" id={`${id}-${key}-panel`}
      aria-labelledby={`${id}-${key}-tab`} hidden={view !== key} tabIndex={0}>
      {content[key]}
    </div>)}
    </div>
    {sidebar && <aside className="context-sidebar" aria-label="Practice context">{sidebar}</aside>}
    </div>
  </>;
}
