/**
 * Mailpit e2e helpers — thin wrappers around the Mailpit REST API v1.
 *
 * Mailpit captures dev email at http://localhost:8025.
 * API shape verified live against GET /api/v1/messages (empty inbox returns
 * {"total":0,"unread":0,"count":0,"messages_count":0,"messages_unread":0,
 *  "start":0,"tags":[],"messages":[]}).
 *
 * Callers that need strict timing must pass `timeoutMs` — the default is kept
 * intentionally short (10 s) so accidental misses surface quickly in CI.
 */

const MAILPIT_BASE = "http://localhost:8025";

// ---------------------------------------------------------------------------
// API response types (Mailpit v1)
// ---------------------------------------------------------------------------

/** Address object returned in message list and detail responses. */
export interface MailpitAddress {
  Address: string;
  Name: string;
}

/** Summary record returned by GET /api/v1/messages. */
export interface MailpitMessageSummary {
  /** Unique message ID used to fetch full detail. */
  ID: string;
  To: MailpitAddress[];
  From: MailpitAddress;
  Subject: string;
  /** ISO-8601 timestamp. */
  Created: string;
}

/** Full message returned by GET /api/v1/message/{ID}. */
export interface MailpitMessageDetail {
  ID: string;
  To: MailpitAddress[];
  From: MailpitAddress;
  Subject: string;
  Created: string;
  /** Rendered HTML body (may be empty string if text-only). */
  HTML: string;
  /** Plain-text body. */
  Text: string;
}

/** Response envelope from GET /api/v1/messages. */
interface MailpitMessagesResponse {
  total: number;
  unread: number;
  count: number;
  messages_count: number;
  messages_unread: number;
  start: number;
  tags: string[];
  messages: MailpitMessageSummary[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clears the entire Mailpit inbox.
 * Equivalent to clicking "Delete all" in the UI.
 */
export async function clearInbox(): Promise<void> {
  const res = await fetch(`${MAILPIT_BASE}/api/v1/messages`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(
      `clearInbox: DELETE /api/v1/messages failed with ${res.status}`
    );
  }
}

/**
 * Fetches the full detail for a single message by ID.
 */
async function fetchMessageDetail(id: string): Promise<MailpitMessageDetail> {
  const res = await fetch(`${MAILPIT_BASE}/api/v1/message/${id}`);
  if (!res.ok) {
    throw new Error(
      `fetchMessageDetail: GET /api/v1/message/${id} failed with ${res.status}`
    );
  }
  return res.json() as Promise<MailpitMessageDetail>;
}

/**
 * Lists all current messages from Mailpit (newest first).
 */
async function listMessages(): Promise<MailpitMessageSummary[]> {
  const res = await fetch(`${MAILPIT_BASE}/api/v1/messages`);
  if (!res.ok) {
    throw new Error(
      `listMessages: GET /api/v1/messages failed with ${res.status}`
    );
  }
  const data = (await res.json()) as MailpitMessagesResponse;
  return data.messages ?? [];
}

/**
 * Polls Mailpit until a message addressed to `email` appears (case-insensitive).
 * Returns full message detail (HTML + Text + Subject + To).
 *
 * NOTE: callers rely on this timing out quickly — keep the default at 10 s.
 * Override via `opts.timeoutMs` for flows with server-side queuing delays.
 *
 * @param email           Recipient address to match (case-insensitive).
 * @param opts.subjectIncludes  Optional substring that Subject must contain.
 * @param opts.timeoutMs  Max wait in ms (default: 10 000).
 */
export async function waitForMessageTo(
  email: string,
  opts: { subjectIncludes?: string; timeoutMs?: number } = {}
): Promise<MailpitMessageDetail> {
  const timeoutMs =
    opts.timeoutMs ??
    (process.env.MAILPIT_TIMEOUT_MS
      ? Number(process.env.MAILPIT_TIMEOUT_MS)
      : 10_000);
  const pollInterval = 250;
  const normalizedEmail = email.toLowerCase();

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const messages = await listMessages();
    for (const msg of messages) {
      const addressed = msg.To.some(
        (a) => a.Address.toLowerCase() === normalizedEmail
      );
      if (!addressed) continue;
      if (opts.subjectIncludes && !msg.Subject.includes(opts.subjectIncludes)) {
        continue;
      }
      return fetchMessageDetail(msg.ID);
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error(
    `waitForMessageTo: no message to <${email}>${opts.subjectIncludes ? ` with subject containing "${opts.subjectIncludes}"` : ""} within ${timeoutMs} ms`
  );
}

/**
 * Returns full detail for all current messages addressed to `email`
 * (case-insensitive).  Does NOT wait — returns whatever is in the inbox now.
 */
export async function getMessagesFor(
  email: string
): Promise<MailpitMessageDetail[]> {
  const normalizedEmail = email.toLowerCase();
  const messages = await listMessages();
  const matched = messages.filter((msg) =>
    msg.To.some((a) => a.Address.toLowerCase() === normalizedEmail)
  );
  return Promise.all(matched.map((msg) => fetchMessageDetail(msg.ID)));
}

/**
 * Extracts the first URL/href in a message body that contains `urlSubstring`.
 *
 * Searches the HTML body first (looks for href="…"), then falls back to
 * scanning the plain-text body for a bare URL containing `urlSubstring`.
 *
 * Throws a descriptive error if no matching link is found.
 *
 * @example
 *   const link = extractLink(msg, "/police/reset-password");
 *   // → "http://localhost:3000/police/reset-password?token=abc123"
 */
export function extractLink(
  message: MailpitMessageDetail,
  urlSubstring: string
): string {
  // Search HTML href attributes first
  const hrefRegex = /href="([^"]*?)"/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(message.HTML)) !== null) {
    if (match[1].includes(urlSubstring)) {
      return match[1];
    }
  }

  // Fallback: scan plain-text body for bare URLs
  const urlRegex = /https?:\/\/\S+/g;
  const textMatches = message.Text.match(urlRegex) ?? [];
  for (const url of textMatches) {
    if (url.includes(urlSubstring)) {
      // Strip trailing punctuation sometimes appended in plain-text emails
      return url.replace(/[.,;>)\]]+$/, "");
    }
  }

  throw new Error(
    `extractLink: no link containing "${urlSubstring}" found in message to <${message.To.map((a) => a.Address).join(", ")}> (subject: "${message.Subject}")`
  );
}
