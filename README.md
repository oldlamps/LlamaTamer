# 🦙 Llama Tamer

**A lightweight, personal chat UI for Ollama with live, real-time web search capabilities.**

LlamaTamer is a simple, self-hosted, and intuitive frontend for interacting with local language models through Ollama. Its standout feature is the ability to "tame" your LLM by providing it with live web search results, giving it access to up-to-the-minute information and reducing hallucinations.

It runs as a simple Node.js server with a clean vanilla JavaScript frontend, making it fast, portable, and easy to modify.

-----
<img width="1222" height="1130" alt="Screenshot_20250916_231957" src="https://github.com/user-attachments/assets/19c3a7d9-3e39-48d4-aeba-3efc38965d23" />

## Features

  * **🌐 Live Web Search:** Augment your model's knowledge with real-time information from the internet for any query.
  * **💾 Persistent Conversations:** All your chats are saved to your browser's local storage.
  * **✏️ Conversation Management:** Easily rename and delete conversations from the sidebar.
  * **⚙️ System Tray Icon:** The server runs in the background with a convenient tray icon to open the UI or exit the application.
  * **🎨 Customizable Experience:**
      * Dark Mode support.
      * Per-conversation custom system prompts.
      * Dynamic model selection from your available Ollama models.
  * **🔧 Centralized Settings:** A simple settings panel to configure your Ollama server URL and required API keys.
  * **✨ Modern UI:**
      * Full Markdown and code syntax highlighting for model responses.
      * Text-to-speech for listening to replies.

<img width="1217" height="1134" alt="Screenshot_20250916_231848" src="https://github.com/user-attachments/assets/5d031fd6-2435-4c26-863f-5309c0e53f5c" />

-----

## Prerequisites

Before you begin, ensure you have the following installed and configured:

1.  **[Ollama](https://ollama.com/):** You must have Ollama installed and running on your system.
2.  **[Node.js](https://nodejs.org/):** Version 18.x or later is recommended.
3.  **[Brave Search API Key](https://brave.com/search/api/):** The web search feature requires a free API key from Brave.

-----

## Installation & Setup

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/oldlamps/LlamaTamer
    cd LlamaTamer
    ```

2.  **Install Dependencies:**
    This will install Express, Systray, and other required packages.

    ```bash
    npm install
    ```

    > **Note:** The `systray` package has native dependencies. If you encounter installation errors, you may need to install your OS's build tools (e.g., `windows-build-tools` on Windows, `Xcode Command Line Tools` on macOS, or `build-essential` on Linux).

-----

## Running the Application

1.  **Start the Server:**
    Run the following command from your project's root directory:

    ```bash
    node server.js
    ```

    You will see a confirmation in your terminal that the server is running, and a new icon will appear in your system tray. The Llama Tamer front end can be accessed directy from your browser at http://localhost:3333

2.  **First-Time Configuration:**

      * Right-click the system tray icon and select **"Open Llamatamer"** to launch the UI in your browser.
      * Click the **"⚙️ Settings"** button in the bottom-left corner.
      * **Ollama Server URL:** Verify this points to where your Ollama instance is running (default is `http://localhost:11434`). Use the "Test" button to confirm it can connect.
      * **Brave Search API Key:** Paste your API key here. **Web search will not work without it.**
      * Click **"Save"**.

3.  **Start Chatting\!**
    You're all set. The application is running, and you can start new conversations, toggle web search, and manage your chats. To stop the server, simply right-click the tray icon and select "Exit".
