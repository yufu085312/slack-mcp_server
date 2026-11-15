# Slack MCP Server

Slack ワークスペースの内容を読み取る MCP (Model Context Protocol) サーバーです。Claude Desktop や他の MCP クライアントから Slack のチャンネル、メッセージ、ユーザー情報などにアクセスできます。

## 機能 (Tools)

| Tool | 説明 |
|------|------|
| `list_channels` | ワークスペースのパブリックチャンネル一覧を取得 |
| `get_channel_history` | チャンネルのメッセージ履歴を取得 |
| `get_thread_replies` | スレッドの返信を取得 |
| `get_channel_info` | チャンネルの詳細情報を取得 |
| `get_user_info` | ユーザーのプロフィール情報を取得 |
| `list_users` | ワークスペースのユーザー一覧を取得 |
| `search_messages` | メッセージを検索 (※ User Token が必要) |
| `get_reactions` | メッセージのリアクションを取得 |
| `get_file_info` | 共有ファイルの情報を取得 |

## セットアップ

### 1. Slack App の作成

1. [Slack API](https://api.slack.com/apps) にアクセスし、**Create New App** → **From scratch** を選択
2. App 名とワークスペースを選択して作成

### 2. Bot Token Scopes の設定

**OAuth & Permissions** ページで以下の Bot Token Scopes を追加:

- `channels:history` — チャンネルのメッセージ履歴を読む
- `channels:read` — チャンネル情報を読む
- `files:read` — ファイル情報を読む
- `reactions:read` — リアクションを読む
- `users:read` — ユーザー情報を読む
- `users:read.email` — ユーザーのメールアドレスを読む (任意)
- `search:read` — メッセージ検索 (※ User Token Scope に追加する場合)

### 3. App のインストール

**Install App** ページでワークスペースにインストールし、**Bot User OAuth Token** (`xoxb-` で始まる) をコピーします。

> **Note:** `search_messages` ツールは Slack API の制限により User Token (`xoxp-`) が必要です。Bot Token では動作しません。検索機能を使う場合は、User Token Scope に `search:read` を追加し、User OAuth Token を使用してください。

### 4. ビルド

```bash
npm install
npm run build
```

### 5. Claude Desktop への設定

`~/Library/Application Support/Claude/claude_desktop_config.json` に以下を追加:

```json
{
  "mcpServers": {
    "slack": {
      "command": "node",
      "args": ["/path/to/slack-mcp_server/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token-here"
      }
    }
  }
}
```

`/path/to/slack-mcp_server` は実際のパスに置き換えてください。

### 5b. Docker で使う場合

```bash
docker build -t slack-mcp-server .
```

Claude Desktop の設定:

```json
{
  "mcpServers": {
    "slack": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "-e", "SLACK_BOT_TOKEN", "slack-mcp-server"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token-here"
      }
    }
  }
}
```

> MCP は stdio 通信のため、`-i` (stdin を開く) が必要です。`-t` は付けないでください。

### 開発モード

```bash
SLACK_BOT_TOKEN=xoxb-xxx npm run dev
```

## 使用例

Claude Desktop で以下のように聞くことができます:

- 「#general チャンネルの最新メッセージを見せて」
- 「ワークスペースのチャンネル一覧を教えて」
- 「ユーザー U01234 の情報を取得して」
- 「このスレッドの返信を全部見せて」
