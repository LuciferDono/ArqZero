// src/cli/components/index.ts
export { Header } from './Header.js';
export type { HeaderProps } from './Header.js';

export { OperationEntry } from './OperationEntry.js';
export type { OperationEntryData, OperationEntryProps, EntryType } from './OperationEntry.js';

export { OperationLog, groupConsecutiveTools } from './OperationLog.js';
export type { OperationLogProps, GroupedEntry, DisplayEntry } from './OperationLog.js';

export { GroupedOperationEntry } from './GroupedOperationEntry.js';
export type { GroupedOperationEntryProps } from './GroupedOperationEntry.js';

export { CommandInput } from './CommandInput.js';
export type { CommandInputProps } from './CommandInput.js';

export { Spinner, ShimmerSpinner, TIPS, STALLED_THRESHOLD_WIDEN, STALLED_THRESHOLD_FULL } from './Spinner.js';
export type { SpinnerProps } from './Spinner.js';

export { PermissionInline } from './PermissionInline.js';
export type { PermissionInlineProps } from './PermissionInline.js';

export { TranscriptView } from './TranscriptView.js';
export type { TranscriptViewProps } from './TranscriptView.js';

export { formatSettingsDisplay, shortModel, pad } from './settings-display.js';

export { DiffView } from './DiffView.js';
export type { DiffViewProps } from './DiffView.js';
