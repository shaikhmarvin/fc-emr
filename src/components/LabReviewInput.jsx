import { useEffect, useRef, useState } from 'react';

// Keep keystrokes inside this field; share the completed edit only on blur.
export default function LabReviewInput({ value, onCommit, ...props }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value ?? ''));
  }, [value]);
  return <input {...props} data-lab-review-input value={draft}
    onFocus={() => { focused.current = true; }}
    onChange={event => setDraft(event.target.value)}
    onBlur={event => {
      focused.current = false;
      if (event.target.value !== String(value ?? '')) onCommit(event.target.value);
    }} />;
}
