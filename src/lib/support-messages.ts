export type SupportSender = "user" | "system";

export type SupportMessage = {
  id: string;
  userId: string | null;
  storeId: string | null;
  sender: SupportSender;
  body: string;
  createdAt: string;
};

const AUTO_REPLY_AR =
  "شكرًا لمراسلتك، سيتم الرد في أقرب وقت ممكن.";

export function supportAutoReplyBody(): string {
  return AUTO_REPLY_AR;
}

type MemoryDb = {
  messages: SupportMessage[];
};

const globalForSupport = globalThis as unknown as {
  __yourstoreSupport?: MemoryDb;
};

function memoryDb(): MemoryDb {
  if (!globalForSupport.__yourstoreSupport) {
    globalForSupport.__yourstoreSupport = { messages: [] };
  }
  return globalForSupport.__yourstoreSupport;
}

export function saveSupportMessageMemory(
  input: Omit<SupportMessage, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): SupportMessage {
  const row: SupportMessage = {
    id: input.id ?? crypto.randomUUID(),
    userId: input.userId,
    storeId: input.storeId,
    sender: input.sender,
    body: input.body,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  memoryDb().messages.push(row);
  return row;
}

export function listSupportMessagesMemory(userId: string): SupportMessage[] {
  return memoryDb()
    .messages.filter((row) => row.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
