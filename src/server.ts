import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebClient } from "@slack/web-api";
import { z } from "zod";

export function createServer(slack: WebClient): McpServer {
  const server = new McpServer({
    name: "slack-mcp-server",
    version: "1.0.0",
  });

  server.tool(
    "list_channels",
    "List public channels in the Slack workspace. Returns channel names, IDs, topics, and member counts.",
    {
      limit: z
        .number()
        .min(1)
        .max(200)
        .default(100)
        .describe("Max channels to return (1-200)"),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from previous response"),
    },
    async ({ limit, cursor }) => {
      const result = await slack.conversations.list({
        types: "public_channel",
        limit,
        cursor: cursor || undefined,
        exclude_archived: true,
      });
      const channels = (result.channels || []).map((ch) => ({
        id: ch.id,
        name: ch.name,
        topic: ch.topic?.value || "",
        purpose: ch.purpose?.value || "",
        num_members: ch.num_members,
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                channels,
                next_cursor: result.response_metadata?.next_cursor || null,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "get_channel_history",
    "Get recent messages from a Slack channel.",
    {
      channel_id: z.string().describe("The channel ID (e.g. C01234ABCDE)"),
      limit: z
        .number()
        .min(1)
        .max(200)
        .default(20)
        .describe("Number of messages to return (1-200)"),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor for older messages"),
    },
    async ({ channel_id, limit, cursor }) => {
      const result = await slack.conversations.history({
        channel: channel_id,
        limit,
        cursor: cursor || undefined,
      });
      const messages = (result.messages || []).map((msg) => ({
        user: msg.user,
        text: msg.text,
        ts: msg.ts,
        thread_ts: msg.thread_ts,
        reply_count: msg.reply_count,
        reactions: msg.reactions,
        files: msg.files?.map((f) => ({
          id: f.id,
          name: f.name,
          mimetype: f.mimetype,
        })),
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                messages,
                has_more: result.has_more,
                next_cursor: result.response_metadata?.next_cursor || null,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "get_thread_replies",
    "Get all replies in a message thread.",
    {
      channel_id: z.string().describe("The channel ID containing the thread"),
      thread_ts: z
        .string()
        .describe("The timestamp of the parent message (thread_ts)"),
      limit: z
        .number()
        .min(1)
        .max(200)
        .default(50)
        .describe("Number of replies to return (1-200)"),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor for older replies"),
    },
    async ({ channel_id, thread_ts, limit, cursor }) => {
      const result = await slack.conversations.replies({
        channel: channel_id,
        ts: thread_ts,
        limit,
        cursor: cursor || undefined,
      });
      const messages = (result.messages || []).map((msg) => ({
        user: msg.user,
        text: msg.text,
        ts: msg.ts,
        reactions: msg.reactions,
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                messages,
                has_more: result.has_more,
                next_cursor: result.response_metadata?.next_cursor || null,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "get_channel_info",
    "Get detailed information about a Slack channel.",
    {
      channel_id: z.string().describe("The channel ID"),
    },
    async ({ channel_id }) => {
      const result = await slack.conversations.info({
        channel: channel_id,
      });
      const ch = result.channel;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: ch?.id,
                name: ch?.name,
                topic: ch?.topic?.value,
                purpose: ch?.purpose?.value,
                num_members: ch?.num_members,
                created: ch?.created,
                creator: ch?.creator,
                is_archived: ch?.is_archived,
                is_private: ch?.is_private,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "get_user_info",
    "Get profile information for a Slack user by their user ID.",
    {
      user_id: z.string().describe("The user ID (e.g. U01234ABCDE)"),
    },
    async ({ user_id }) => {
      const result = await slack.users.info({ user: user_id });
      const u = result.user;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: u?.id,
                name: u?.name,
                real_name: u?.real_name,
                display_name: u?.profile?.display_name,
                email: u?.profile?.email,
                title: u?.profile?.title,
                status_text: u?.profile?.status_text,
                status_emoji: u?.profile?.status_emoji,
                is_admin: u?.is_admin,
                is_bot: u?.is_bot,
                tz: u?.tz,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "list_users",
    "List all users in the Slack workspace.",
    {
      limit: z
        .number()
        .min(1)
        .max(200)
        .default(100)
        .describe("Max users to return (1-200)"),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from previous response"),
    },
    async ({ limit, cursor }) => {
      const result = await slack.users.list({
        limit,
        cursor: cursor || undefined,
      });
      const users = (result.members || []).map((u) => ({
        id: u.id,
        name: u.name,
        real_name: u.real_name,
        display_name: u.profile?.display_name,
        is_bot: u.is_bot,
        is_admin: u.is_admin,
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                users,
                next_cursor: result.response_metadata?.next_cursor || null,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "search_messages",
    "Search for messages in Slack. NOTE: This requires a User Token (xoxp-), not a Bot Token. If using a Bot Token, this tool will return an error.",
    {
      query: z.string().describe("Search query string"),
      sort: z
        .enum(["score", "timestamp"])
        .default("score")
        .describe("Sort order"),
      count: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of results (1-100)"),
    },
    async ({ query, sort, count }) => {
      try {
        const result = await slack.search.messages({
          query,
          sort,
          count,
        });
        const matches = (result.messages?.matches || []).map((m) => ({
          text: m.text,
          user: m.user,
          channel: m.channel
            ? { id: m.channel.id, name: m.channel.name }
            : null,
          ts: m.ts,
          permalink: m.permalink,
        }));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { total: result.messages?.total, matches },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `search_messages requires a User Token (xoxp-), not a Bot Token (xoxb-). Error: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_reactions",
    "Get reactions for a specific message.",
    {
      channel_id: z.string().describe("The channel ID containing the message"),
      timestamp: z.string().describe("The message timestamp"),
    },
    async ({ channel_id, timestamp }) => {
      const result = await slack.reactions.get({
        channel: channel_id,
        timestamp,
        full: true,
      });
      const msg = result.message;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                message_text: msg?.text,
                reactions: (msg?.reactions || []).map((r) => ({
                  name: r.name,
                  count: r.count,
                  users: r.users,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "get_file_info",
    "Get information about a file shared in Slack.",
    {
      file_id: z.string().describe("The file ID (e.g. F01234ABCDE)"),
    },
    async ({ file_id }) => {
      const result = await slack.files.info({ file: file_id });
      const f = result.file;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: f?.id,
                name: f?.name,
                title: f?.title,
                mimetype: f?.mimetype,
                filetype: f?.filetype,
                size: f?.size,
                user: f?.user,
                created: f?.created,
                url_private: f?.url_private,
                permalink: f?.permalink,
                channels: f?.channels,
                shares: f?.shares,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  return server;
}
