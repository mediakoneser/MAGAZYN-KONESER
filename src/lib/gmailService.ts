export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  unread: boolean;
  labelIds: string[];
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyText?: string;
  bodyHtml?: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

// Convert string to base64url format for Gmail API
function toBase64Url(str: string): string {
  // Handle UTF-8 strings properly
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Decode base64url format
function fromBase64Url(base64UrlStr: string): string {
  try {
    const base64 = base64UrlStr.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return "";
  }
}

export async function listGmailMessages(
  accessToken: string,
  options: {
    maxResults?: number;
    query?: string;
    labelIds?: string[];
  } = {}
): Promise<{ messages: GmailMessageSummary[]; nextPageToken?: string }> {
  const params = new URLSearchParams();
  params.set("maxResults", String(options.maxResults || 20));
  if (options.query) params.set("q", options.query);
  if (options.labelIds && options.labelIds.length > 0) {
    options.labelIds.forEach((l) => params.append("labelIds", l));
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gmail API error (${res.status})`);
  }

  const data = await res.json();
  const rawList: Array<{ id: string; threadId: string }> = data.messages || [];

  // Fetch headers for messages in parallel (up to 15)
  const summaries: GmailMessageSummary[] = await Promise.all(
    rawList.slice(0, 15).map(async (item) => {
      try {
        return await getGmailMessageSummary(accessToken, item.id);
      } catch (e) {
        return {
          id: item.id,
          threadId: item.threadId,
          snippet: "Wiadomość z Gmail",
          from: "Nadawca",
          to: "Odbiorca",
          subject: "(Brak tematu)",
          date: new Date().toISOString(),
          unread: false,
          labelIds: [],
        };
      }
    })
  );

  return {
    messages: summaries,
    nextPageToken: data.nextPageToken,
  };
}

export async function getGmailMessageSummary(accessToken: string, id: string): Promise<GmailMessageSummary> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch message summary (${res.status})`);
  }

  const data = await res.json();
  const headers = data.payload?.headers || [];

  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || "",
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject") || "(Brak tematu)",
    date: getHeader("Date") || new Date().toISOString(),
    unread: (data.labelIds || []).includes("UNREAD"),
    labelIds: data.labelIds || [],
  };
}

export async function getGmailMessageDetail(accessToken: string, id: string): Promise<GmailMessageDetail> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch message detail (${res.status})`);
  }

  const data = await res.json();
  const headers = data.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  let bodyText = "";
  let bodyHtml = "";

  const extractBody = (part: any) => {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) {
      bodyText += fromBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      bodyHtml += fromBase64Url(part.body.data);
    }

    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractBody);
    }
  };

  extractBody(data.payload);

  if (!bodyText && !bodyHtml && data.snippet) {
    bodyText = data.snippet;
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || "",
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject") || "(Brak tematu)",
    date: getHeader("Date") || new Date().toISOString(),
    unread: (data.labelIds || []).includes("UNREAD"),
    labelIds: data.labelIds || [],
    bodyText,
    bodyHtml,
  };
}

export async function sendGmailMessage(
  accessToken: string,
  payload: SendEmailPayload
): Promise<{ id: string; threadId: string }> {
  // Construct RFC 2822 email message
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`;
  const emailLines = [
    `To: ${payload.to}`,
    `Subject: ${utf8Subject}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `MIME-Version: 1.0`,
    "",
    payload.body,
  ];
  const rawEmail = emailLines.join("\r\n");
  const encodedEmail = toBase64Url(rawEmail);

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedEmail,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to send email (${res.status})`);
  }

  return await res.json();
}

export async function trashGmailMessage(accessToken: string, id: string): Promise<boolean> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to trash email (${res.status})`);
  }

  return true;
}
