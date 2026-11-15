import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { WebClient } from "@slack/web-api";
import { createServer } from "../server.js";

function createMockSlack() {
  return {
    conversations: {
      list: vi.fn(),
      history: vi.fn(),
      replies: vi.fn(),
      info: vi.fn(),
    },
    users: {
      info: vi.fn(),
      list: vi.fn(),
    },
    search: {
      messages: vi.fn(),
    },
    reactions: {
      get: vi.fn(),
    },
    files: {
      info: vi.fn(),
    },
  } as unknown as WebClient;
}

async function setupTestEnv() {
  const mockSlack = createMockSlack();
  const server = createServer(mockSlack);
  const client = new Client({ name: "test-client", version: "1.0.0" });

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return { client, server, mockSlack };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseResult(result: any) {
  const text = result.content[0];
  if (text.type === "text" && text.text) {
    return JSON.parse(text.text);
  }
  throw new Error("Unexpected content type");
}

describe("Slack MCP Server", () => {
  let client: Client;
  let server: Awaited<ReturnType<typeof createServer>>;
  let mockSlack: WebClient;

  beforeEach(async () => {
    const env = await setupTestEnv();
    client = env.client;
    server = env.server;
    mockSlack = env.mockSlack;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("lists available tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "get_channel_history",
      "get_channel_info",
      "get_file_info",
      "get_reactions",
      "get_thread_replies",
      "get_user_info",
      "list_channels",
      "list_users",
      "search_messages",
    ]);
  });

  describe("list_channels", () => {
    it("returns channels", async () => {
      vi.mocked(mockSlack.conversations.list).mockResolvedValue({
        ok: true,
        channels: [
          {
            id: "C001",
            name: "general",
            topic: { value: "General discussion" },
            purpose: { value: "Company-wide" },
            num_members: 50,
          },
        ],
        response_metadata: { next_cursor: "" },
      } as never);

      const result = await client.callTool({
        name: "list_channels",
        arguments: { limit: 10 },
      });
      const data = parseResult(result);
      expect(data.channels).toHaveLength(1);
      expect(data.channels[0].id).toBe("C001");
      expect(data.channels[0].name).toBe("general");
    });
  });

  describe("get_channel_history", () => {
    it("returns messages", async () => {
      vi.mocked(mockSlack.conversations.history).mockResolvedValue({
        ok: true,
        messages: [{ user: "U001", text: "Hello", ts: "1234567890.000001" }],
        has_more: false,
        response_metadata: { next_cursor: "" },
      } as never);

      const result = await client.callTool({
        name: "get_channel_history",
        arguments: { channel_id: "C001", limit: 10 },
      });
      const data = parseResult(result);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].text).toBe("Hello");
    });
  });

  describe("get_thread_replies", () => {
    it("returns thread messages", async () => {
      vi.mocked(mockSlack.conversations.replies).mockResolvedValue({
        ok: true,
        messages: [
          { user: "U001", text: "Parent", ts: "1234567890.000001" },
          { user: "U002", text: "Reply", ts: "1234567890.000002" },
        ],
        has_more: false,
        response_metadata: { next_cursor: "" },
      } as never);

      const result = await client.callTool({
        name: "get_thread_replies",
        arguments: {
          channel_id: "C001",
          thread_ts: "1234567890.000001",
        },
      });
      const data = parseResult(result);
      expect(data.messages).toHaveLength(2);
    });
  });

  describe("get_channel_info", () => {
    it("returns channel details", async () => {
      vi.mocked(mockSlack.conversations.info).mockResolvedValue({
        ok: true,
        channel: {
          id: "C001",
          name: "general",
          topic: { value: "General" },
          purpose: { value: "All" },
          num_members: 10,
          created: 1600000000,
          creator: "U001",
          is_archived: false,
          is_private: false,
        },
      } as never);

      const result = await client.callTool({
        name: "get_channel_info",
        arguments: { channel_id: "C001" },
      });
      const data = parseResult(result);
      expect(data.name).toBe("general");
      expect(data.is_private).toBe(false);
    });
  });

  describe("get_user_info", () => {
    it("returns user profile", async () => {
      vi.mocked(mockSlack.users.info).mockResolvedValue({
        ok: true,
        user: {
          id: "U001",
          name: "johndoe",
          real_name: "John Doe",
          profile: {
            display_name: "John",
            email: "john@example.com",
            title: "Engineer",
            status_text: "Working",
            status_emoji: ":computer:",
          },
          is_admin: false,
          is_bot: false,
          tz: "Asia/Tokyo",
        },
      } as never);

      const result = await client.callTool({
        name: "get_user_info",
        arguments: { user_id: "U001" },
      });
      const data = parseResult(result);
      expect(data.name).toBe("johndoe");
      expect(data.email).toBe("john@example.com");
    });
  });

  describe("list_users", () => {
    it("returns user list", async () => {
      vi.mocked(mockSlack.users.list).mockResolvedValue({
        ok: true,
        members: [
          {
            id: "U001",
            name: "johndoe",
            real_name: "John Doe",
            profile: { display_name: "John" },
            is_bot: false,
            is_admin: true,
          },
        ],
        response_metadata: { next_cursor: "" },
      } as never);

      const result = await client.callTool({
        name: "list_users",
        arguments: { limit: 10 },
      });
      const data = parseResult(result);
      expect(data.users).toHaveLength(1);
      expect(data.users[0].is_admin).toBe(true);
    });
  });

  describe("search_messages", () => {
    it("returns search results", async () => {
      vi.mocked(mockSlack.search.messages).mockResolvedValue({
        ok: true,
        messages: {
          total: 1,
          matches: [
            {
              text: "found message",
              user: "U001",
              channel: { id: "C001", name: "general" },
              ts: "1234567890.000001",
              permalink: "https://slack.com/archives/C001/p1234567890000001",
            },
          ],
        },
      } as never);

      const result = await client.callTool({
        name: "search_messages",
        arguments: { query: "test" },
      });
      const data = parseResult(result);
      expect(data.total).toBe(1);
      expect(data.matches[0].text).toBe("found message");
    });

    it("returns error for bot token", async () => {
      vi.mocked(mockSlack.search.messages).mockRejectedValue(
        new Error("missing_scope"),
      );

      const result = await client.callTool({
        name: "search_messages",
        arguments: { query: "test" },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = ((result as any).content[0] as { text: string }).text;
      expect(text).toContain("User Token");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).isError).toBe(true);
    });
  });

  describe("get_reactions", () => {
    it("returns reactions", async () => {
      vi.mocked(mockSlack.reactions.get).mockResolvedValue({
        ok: true,
        message: {
          text: "Great idea!",
          reactions: [
            { name: "thumbsup", count: 3, users: ["U001", "U002", "U003"] },
          ],
        },
      } as never);

      const result = await client.callTool({
        name: "get_reactions",
        arguments: {
          channel_id: "C001",
          timestamp: "1234567890.000001",
        },
      });
      const data = parseResult(result);
      expect(data.reactions).toHaveLength(1);
      expect(data.reactions[0].name).toBe("thumbsup");
      expect(data.reactions[0].count).toBe(3);
    });
  });

  describe("get_file_info", () => {
    it("returns file details", async () => {
      vi.mocked(mockSlack.files.info).mockResolvedValue({
        ok: true,
        file: {
          id: "F001",
          name: "report.pdf",
          title: "Q4 Report",
          mimetype: "application/pdf",
          filetype: "pdf",
          size: 102400,
          user: "U001",
          created: 1700000000,
          url_private: "https://files.slack.com/...",
          permalink: "https://slack.com/files/...",
          channels: ["C001"],
        },
      } as never);

      const result = await client.callTool({
        name: "get_file_info",
        arguments: { file_id: "F001" },
      });
      const data = parseResult(result);
      expect(data.name).toBe("report.pdf");
      expect(data.size).toBe(102400);
    });
  });
});
