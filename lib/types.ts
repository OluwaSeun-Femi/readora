export type ActionResult = {
  ok: boolean;
  message: string;
  /** Which field the message is about, so the form can highlight it. */
  field?: string;
  /** What was typed, so a form keeps it after an error. */
  fields?: Record<string, string>;
  /** Extra data a successful action hands back (for example, a due date). */
  data?: Record<string, string>;
};

export const idle: ActionResult = { ok: false, message: "" };
