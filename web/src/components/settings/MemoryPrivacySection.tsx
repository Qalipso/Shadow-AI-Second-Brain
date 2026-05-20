"use client";

import { useState } from "react";
import { DangerButton, FieldRow, SectionGroup, Toggle } from "./Rows";

export function MemoryPrivacySection() {
  const [enableMemory, setEnableMemory] = useState(true);
  const [excludePrivate, setExcludePrivate] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);

  return (
    <SectionGroup
      title="Memory & privacy"
      description="You control what Shadow remembers and how deeply it analyzes your data."
    >
      <FieldRow
        label="Enable memory"
        hint="Lets Shadow recall past entries when answering you."
        comingSoon
      >
        <Toggle checked={enableMemory} onChange={setEnableMemory} />
      </FieldRow>
      <FieldRow
        label="Exclude private entries from memory"
        hint="Entries marked private will never enter recall."
        comingSoon
      >
        <Toggle checked={excludePrivate} onChange={setExcludePrivate} />
      </FieldRow>
      <FieldRow
        label="Private mode"
        hint="Captures land in inbox but skip classification and memory."
        comingSoon
      >
        <Toggle checked={privateMode} onChange={setPrivateMode} />
      </FieldRow>
      <FieldRow
        label="Export data"
        hint="Download all your entries, answers, and tasks as JSON."
        comingSoon
      >
        <DangerButton>Export</DangerButton>
      </FieldRow>
      <FieldRow
        label="Delete all memories"
        hint="Clears stored embeddings only. Entries remain."
        comingSoon
      >
        <DangerButton>Clear memory</DangerButton>
      </FieldRow>
      <FieldRow
        label="Delete account"
        hint="Permanent. Cannot be undone."
        comingSoon
      >
        <DangerButton>Delete</DangerButton>
      </FieldRow>
    </SectionGroup>
  );
}
