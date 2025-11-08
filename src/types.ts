export type StreamEvent =
  | { type: 'reasoning'; content: string }
  | { type: 'tool_call'; tool: string; input: string; output?: string }
  | { type: 'response'; content: string };