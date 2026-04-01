# Slack Bot Setup Guide

ClippaperAI Slack Bot connects your workspace to Slack, enabling you to create issues, receive notifications, and interact with agents directly from Slack.

## Features

- `/clip agents` — View agent list
- `/clip ask` — Create an issue assigned to a specific agent (via modal)
- **DM** — Send a direct message to the bot to create issues
- **Issue notifications** — New issues, completions, and failures are posted to your Slack channel
- **Thread replies** — Reply in a thread to add comments to the linked issue
- **Reopen** — Reopen completed/cancelled issues directly from Slack
- **Approvals** — Approve or reject agent requests from Slack
- **Join requests** — Approve or reject join requests from Slack

---

## Step 1: Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** > **From scratch**
3. Enter the app name (e.g., `ClippaperAI`) and select your workspace
4. Click **Create App**

---

## Step 2: Enable Socket Mode

1. In the left sidebar, click **Socket Mode**
2. Toggle **Enable Socket Mode** to ON
3. When prompted, create an **App-Level Token**:
   - Token name: `socket-token` (or any name)
   - Scope: `connections:write`
   - Click **Generate**
4. Copy the token (starts with `xapp-`) — you'll need this later

---

## Step 3: Add Bot Token Scopes

1. In the left sidebar, click **OAuth & Permissions**
2. Scroll down to **Bot Token Scopes**
3. Add the following scopes:

| Scope | Purpose |
|-------|---------|
| `chat:write` | Send messages to channels |
| `commands` | Handle slash commands |
| `im:history` | Read DM messages |
| `im:read` | Access DM conversations |
| `im:write` | Send DM messages |
| `channels:history` | Read channel messages (for thread replies) |
| `reactions:write` | Add reactions to messages |

---

## Step 4: Create Slash Command

1. In the left sidebar, click **Slash Commands**
2. Click **Create New Command**
3. Fill in:
   - Command: `/clip`
   - Request URL: (leave empty for Socket Mode)
   - Short Description: `Interact with ClippaperAI agents`
4. Click **Save**

---

## Step 5: Enable Event Subscriptions

1. In the left sidebar, click **Event Subscriptions**
2. Toggle **Enable Events** to ON
3. Under **Subscribe to bot events**, add:

| Event | Purpose |
|-------|---------|
| `message.im` | Receive DM messages |
| `message.channels` | Receive channel messages (for thread replies) |

4. Click **Save Changes**

---

## Step 6: Enable App Home Messages Tab

1. In the left sidebar, click **App Home**
2. Scroll down to **Show Tabs**
3. Toggle **Messages Tab** to ON
4. Check **"Allow users to send Slash commands and messages from the messages tab"**

---

## Step 7: Install App to Workspace

1. In the left sidebar, click **Install App**
2. Click **Install to Workspace** (or **Reinstall to Workspace** if updating)
3. Review the permissions and click **Allow**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

---

## Step 8: Get Channel ID

1. In Slack, right-click the channel where you want the bot to post
2. Click **View channel details**
3. At the bottom of the details panel, find the **Channel ID** (e.g., `C0XXXXXXX`)
4. Copy this ID

---

## Step 9: Invite Bot to Channel

1. In the target Slack channel, type:
   ```
   /invite @ClippaperAI
   ```
2. The bot will join the channel

---

## Step 10: Configure in ClippaperAI

1. Open ClippaperAI web UI
2. Go to **Settings** > **Slack** (in the left sidebar)
3. Fill in:
   - **Slack Enabled**: Toggle ON
   - **Bot Token**: Paste the `xoxb-` token from Step 7
   - **App Token**: Paste the `xapp-` token from Step 2
   - **Channel ID**: Paste the Channel ID from Step 8
4. Click **Save**

The bot will start automatically. You should see a welcome message in your Slack channel.

---

## Usage

### Channel Commands

```
/clip agents    — List all agents
/clip ask       — Open a modal to create an issue for a specific agent
```

### Direct Messages

Send any message directly to the bot in a DM. The bot will show agent selection buttons, and clicking one creates an issue assigned to that agent.

### Thread Replies

When the bot posts an issue notification (creation or completion), you can reply in the thread. Your reply will be added as a comment on the issue. If the issue is completed/cancelled, a **Reopen** button will appear with your comment confirmation.

---

## Troubleshooting

### Bot not starting
- Check that all three tokens (Bot Token, App Token, Channel ID) are filled in
- Verify the Slack Enabled toggle is ON
- Check server logs for error messages

### DM says "messaging is disabled"
- Go to Slack App settings > **App Home** > Enable **Messages Tab**
- Make sure **"Allow users to send Slash commands and messages from the messages tab"** is checked
- Reinstall the app after making changes

### Thread replies not working
- Make sure `message.channels` event is subscribed in **Event Subscriptions**
- Make sure `channels:history` scope is added in **OAuth & Permissions**
- Reinstall the app after adding new scopes/events

### 403 errors
- Ensure you're accessing via the correct domain (e.g., `https://your-domain.com`)
- Check that trusted origins match your deployment URL

### Bot not responding to slash commands
- Verify Socket Mode is enabled
- Check that the `/clip` command is registered in **Slash Commands**
- Ensure the bot is invited to the channel
