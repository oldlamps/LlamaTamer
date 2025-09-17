
document.addEventListener('DOMContentLoaded', () => {

    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const messagesContainer = document.getElementById('messages');
    const modelSelector = document.getElementById('model-selector');
    const scrollAnchor = document.getElementById('scroll-anchor');
    const conversationList = document.getElementById('conversation-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const systemPromptInput = document.getElementById('system-prompt');
    const webSearchCheckbox = document.getElementById('web-search-checkbox');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.querySelector('.modal-close-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const ollamaUrlInput = document.getElementById('ollama-url');
    const braveApiKeyInput = document.getElementById('brave-api-key');
    const defaultModelSelect = document.getElementById('default-model');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const hljsTheme = document.getElementById('hljs-theme');
    const testConnectionBtn = document.getElementById('test-connection-btn');
    const connectionStatus = document.getElementById('connection-status');

    // --- State Management ---
    let conversations = {};
    let settings = {};
    let activeChatId = null;
    let currentModel = '';

    const defaultSettings = {
        ollamaUrl: 'http://localhost:11434',
        defaultModel: '',
            darkMode: false,
            braveApiKey: '',
    };

    // --- Markdown & Highlighter Setup ---
    const md = new markdownit({ linkify: true, html: true });
    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        tokens[idx].attrPush(['target', '_blank']);
        tokens[idx].attrPush(['rel', 'noopener noreferrer']);
        return self.renderToken(tokens, idx, options);
    };

    // --- Settings Functions ---
    function saveSettings() {
        localStorage.setItem('ollamaChatSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('ollamaChatSettings');
        settings = savedSettings ? JSON.parse(savedSettings) : { ...defaultSettings };

        // Ensure all default keys are present
        for (const key in defaultSettings) {
            if (!(key in settings)) {
                settings[key] = defaultSettings[key];
            }
        }

        ollamaUrlInput.value = settings.ollamaUrl;
        braveApiKeyInput.value = settings.braveApiKey;
        darkModeToggle.checked = settings.darkMode;
        applyDarkMode(settings.darkMode);
    }

    function applyDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        const themeUrl = isDark ? document.documentElement.style.getPropertyValue('--hljs-theme-dark') : document.documentElement.style.getPropertyValue('--hljs-theme-light');
        hljsTheme.setAttribute('href', themeUrl);
    }

    // --- Conversation Functions ---
    function saveConversations() {
        localStorage.setItem('ollamaConversations', JSON.stringify(conversations));
    }

    function loadConversations() {
        const savedConversations = localStorage.getItem('ollamaConversations');
        conversations = savedConversations ? JSON.parse(savedConversations) : {};
        const chatIds = Object.keys(conversations);
        if (chatIds.length > 0) {
            activeChatId = chatIds[0];
        } else {
            createNewChat();
        }
    }

    // --- UI & Message Functions ---
    function speakText(text) {
        window.speechSynthesis.cancel(); // Stop any previous speech
        const speech = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(speech);
    }

    function createTypingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.classList.add('typing-indicator');
        indicatorDiv.innerHTML = '<span></span><span></span><span></span>';
        return indicatorDiv;
    }

    function createSourcesHtml(searchData) {
        if (!searchData || (!searchData.scrapedResults && !searchData.remainingResults)) return '';
        let html = '<hr><div class="sources-container"><h4>Sources</h4><ol>';
        const allSources = [...(searchData.scrapedResults || []), ...(searchData.remainingResults || [])];
        allSources.forEach(source => {
            const cleanTitle = source.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            html += `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${cleanTitle}</a></li>`;
        });
        html += '</ol></div>';
        return html;
    }

    function createBotMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot-message');
        const renderedHtml = md.render(content);
        messageDiv.innerHTML = renderedHtml;
        const speakIcon = document.createElement('span');
        speakIcon.classList.add('speak-icon');
        speakIcon.innerText = '🔊';
        speakIcon.addEventListener('click', () => speakText(content));
        messageDiv.appendChild(speakIcon);
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        return messageDiv;
    }

    function addMessage(text, sender) {
        let messageDiv;
        if (sender === 'bot') {
            messageDiv = createBotMessage(text);
        } else {
            messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'user-message');
            messageDiv.innerText = text;
        }
        messagesContainer.insertBefore(messageDiv, scrollAnchor);
        scrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function loadConversation(history, systemPrompt) {
        messagesContainer.innerHTML = ''; // Clear previous messages
        messagesContainer.appendChild(scrollAnchor);
        history.forEach(msg => {
            addMessage(msg.content, msg.role === 'assistant' ? 'bot' : 'user');
        });
        systemPromptInput.value = systemPrompt || '';
        scrollAnchor.scrollIntoView({ block: 'end' });
    }

    function renderConversationList() {
        conversationList.innerHTML = '';
        if (Object.keys(conversations).length === 0) return;

        for (const chatId in conversations) {
            const chatItem = document.createElement('li');
            chatItem.dataset.chatId = chatId;
            if (chatId === activeChatId) {
                chatItem.classList.add('active');
            }

            const titleSpan = document.createElement('span');
            titleSpan.className = 'conversation-title';
            titleSpan.innerText = conversations[chatId].title;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'conversation-actions';

            const renameBtn = document.createElement('button');
            renameBtn.innerText = '✏️';
            renameBtn.title = 'Rename';
            renameBtn.onclick = (e) => { e.stopPropagation(); startRename(chatId, titleSpan); };

            const deleteBtn = document.createElement('button');
            deleteBtn.innerText = '🗑️';
            deleteBtn.title = 'Delete';
            deleteBtn.onclick = (e) => { e.stopPropagation(); deleteConversation(chatId); };

            actionsDiv.appendChild(renameBtn);
            actionsDiv.appendChild(deleteBtn);
            chatItem.appendChild(titleSpan);
            chatItem.appendChild(actionsDiv);
            chatItem.addEventListener('click', () => switchChat(chatId));
            conversationList.appendChild(chatItem);
        }
    }

    function startRename(chatId, titleSpan) {
        titleSpan.style.display = 'none';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = conversations[chatId].title;
        input.className = 'rename-input';
        titleSpan.parentElement.insertBefore(input, titleSpan.nextSibling);
        input.focus();
        input.select();

        const saveRename = () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== conversations[chatId].title) {
                conversations[chatId].title = newTitle;
                saveConversations();
            }
            renderConversationList(); // Rerender to show the span again
        };

        input.onblur = saveRename;
        input.onkeydown = (e) => { if (e.key === 'Enter') saveRename(); };
    }

    function deleteConversation(chatId) {
        if (!confirm(`Are you sure you want to delete "${conversations[chatId].title}"?`)) return;

        delete conversations[chatId];
        saveConversations();

        const remainingChatIds = Object.keys(conversations);
        if (activeChatId === chatId) {
            if (remainingChatIds.length > 0) {
                switchChat(remainingChatIds[0]);
            } else {
                createNewChat();
            }
        }
        renderConversationList();
    }


    function switchChat(chatId) {
        if (!conversations[chatId]) return;
        activeChatId = chatId;
        const chat = conversations[activeChatId];
        loadConversation(chat.history, chat.systemPrompt);
        webSearchCheckbox.checked = chat.isWebSearchEnabled || false;
        renderConversationList();
        const modelToSelect = chat.model || settings.defaultModel;
        if(modelToSelect) modelSelector.value = modelToSelect;
    }

    function createNewChat() {
        const newChatId = Date.now().toString();
        conversations[newChatId] = {
            title: 'New Chat',
            history: [],
            systemPrompt: '',
            isWebSearchEnabled: false,
            model: settings.defaultModel
        };
        activeChatId = newChatId;
        saveConversations();
        switchChat(newChatId);
        userInput.focus();
    }

    // --- API & Core Logic ---
    async function fetchModels() {
        try {
            const response = await fetch(`${settings.ollamaUrl}/api/tags`);
            if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
            const data = await response.json();

            const populateSelect = (selectElement) => {
                selectElement.innerHTML = '';
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.innerText = model.name;
                    selectElement.appendChild(option);
                });
            };

            populateSelect(modelSelector);
            populateSelect(defaultModelSelect);

            if (data.models.length > 0) {
                // Set default model in settings if not already set
                if (!settings.defaultModel && data.models.length > 0) {
                    settings.defaultModel = data.models[0].name;
                    saveSettings();
                }
                defaultModelSelect.value = settings.defaultModel;

                // Set current model based on active chat or default
                const chat = conversations[activeChatId];
                currentModel = chat?.model || settings.defaultModel;
                modelSelector.value = currentModel;
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            addMessage(`Error: Could not connect to Ollama at ${settings.ollamaUrl}. Please check the URL in Settings and ensure Ollama is running.`, 'bot');
        }
    }

    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        const isWebSearchEnabled = webSearchCheckbox.checked;
        addMessage(userMessage, 'user');
        userInput.value = '';

        let finalPromptForOllama = userMessage;
        let statusMessageDiv;
        let searchDataForSources = null;

        if (isWebSearchEnabled) {
            if (!settings.braveApiKey) {
                addMessage('Error: Brave Search API key is not set. Please add it in Settings.', 'bot');
                return;
            }
            statusMessageDiv = document.createElement('div');
            statusMessageDiv.classList.add('message', 'bot-message', 'status-message');
            statusMessageDiv.innerText = '🔍 Performing web search...';
            messagesContainer.insertBefore(statusMessageDiv, scrollAnchor);
            scrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' });

            try {
                const searchResponse = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: userMessage, apiKey: settings.braveApiKey })
                });
                if (!searchResponse.ok) {
                    const err = await searchResponse.json();
                    throw new Error(err.error || `Web search failed with status: ${searchResponse.status}`);
                }
                const searchData = await searchResponse.json();
                searchDataForSources = searchData;

                let webContext = "--- Web Search Context ---\n\n";
                if (searchData.scrapedResults?.length > 0) {
                    webContext += "## Full Content from Top Results:\n\n";
                    searchData.scrapedResults.forEach((result, index) => {
                        webContext += `Source [${index + 1}]: ${result.title}\nContent: ${result.content.substring(0, 1500)}...\n\n`;
                    });
                }
                if (searchData.remainingResults?.length > 0) {
                    webContext += "## Additional Search Results (Metadata & Summaries):\n\n";
                    searchData.remainingResults.forEach((result, index) => {
                        const resultNum = index + (searchData.scrapedResults?.length || 0) + 1;
                        webContext += `Source [${resultNum}]: ${result.title}\nURL: ${result.url}\nSummary: ${result.description}\n\n`;
                    });
                }
                webContext += "--------------------------\n\n";
                finalPromptForOllama = `${webContext}Synthesize the information from the web search context above to provide a detailed, multi-paragraph answer to the following question: ${userMessage}`;
                statusMessageDiv.innerText = '✅ Web search complete. Generating answer...';
            } catch (error) {
                console.error('Web search error:', error);
                statusMessageDiv.innerText = `❌ Web search failed: ${error.message}. Answering without web context.`;
            }
        }

        const activeConv = conversations[activeChatId];
        activeConv.model = currentModel; // Save the model used for this chat
        const messagePayload = [{ role: 'system', content: activeConv.systemPrompt.trim() }, ...activeConv.history, { role: 'user', content: finalPromptForOllama }];

        if (activeConv.title === 'New Chat' && activeConv.history.length === 0) {
            try {
                const titleResponse = await fetch(`${settings.ollamaUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: currentModel,
                        prompt: `Generate a short, concise title (under 5 words) for this conversation based on the user's first message: "${userMessage}"`,
                                         stream: false
                    })
                });
                if (!titleResponse.ok) throw new Error('Title generation failed.');
                const titleData = await titleResponse.json();
                activeConv.title = titleData.response.trim().replace(/"/g, '');
                saveConversations();
                renderConversationList();
            } catch (error) {
                console.error('Error generating title:', error);
            }
        }

        let botMessageDiv = null;
        let fullBotResponse = '';
        let typingIndicatorDiv = createTypingIndicator();
        messagesContainer.insertBefore(typingIndicatorDiv, scrollAnchor);
        scrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' });

        try {
            const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: currentModel, messages: messagePayload, stream: true })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            if (statusMessageDiv) statusMessageDiv.style.display = 'none';

            while (true) {
                const { value, done } = await reader.read();

                if (typingIndicatorDiv) {
                    typingIndicatorDiv.remove();
                    typingIndicatorDiv = null;
                    botMessageDiv = document.createElement('div');
                    botMessageDiv.classList.add('message', 'bot-message');
                    messagesContainer.insertBefore(botMessageDiv, scrollAnchor);
                }

                if (done) {
                    let finalResponseContent = fullBotResponse;
                    if (searchDataForSources) finalResponseContent += createSourcesHtml(searchDataForSources);

                    activeConv.history.push({ role: 'user', content: userMessage });
                    activeConv.history.push({ role: 'assistant', content: finalResponseContent });
                    saveConversations();

                    const finalBotMessageDiv = createBotMessage(finalResponseContent);
                    if(botMessageDiv) botMessageDiv.replaceWith(finalBotMessageDiv);
                    scrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    break;
                }
                const chunk = decoder.decode(value, { stream: true });
                chunk.split('\n').forEach(line => {
                    if (line) {
                        try {
                            const json = JSON.parse(line);
                            if (json.message && json.message.content) {
                                fullBotResponse += json.message.content;
                                if(botMessageDiv) botMessageDiv.innerHTML = md.render(fullBotResponse);
                                scrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            }
                        } catch (e) { /* Incomplete JSON chunk */ }
                    }
                });
            }
        } catch (error) {
            console.error('Fetch error:', error);
            if(typingIndicatorDiv) typingIndicatorDiv.remove();
            addMessage('Error: Failed to get response from Ollama.', 'bot');
            if (statusMessageDiv) statusMessageDiv.style.display = 'none';
        }
    }

    // --- Event Listeners ---
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    modelSelector.addEventListener('change', (e) => {
        currentModel = e.target.value;
        if (conversations[activeChatId]) {
            conversations[activeChatId].model = currentModel;
            saveConversations();
        }
    });
    newChatBtn.addEventListener('click', createNewChat);
    systemPromptInput.addEventListener('input', () => {
        if (conversations[activeChatId]) {
            conversations[activeChatId].systemPrompt = systemPromptInput.value;
            saveConversations();
        }
    });
    webSearchCheckbox.addEventListener('change', () => {
        if (conversations[activeChatId]) {
            conversations[activeChatId].isWebSearchEnabled = webSearchCheckbox.checked;
            saveConversations();
        }
    });

    // --- Settings Modal Listeners ---
    settingsBtn.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
    closeModalBtn.addEventListener('click', () => { settingsModal.style.display = 'none'; });
    saveSettingsBtn.addEventListener('click', () => {
        const oldUrl = settings.ollamaUrl;
        settings.ollamaUrl = ollamaUrlInput.value.trim() || defaultSettings.ollamaUrl;
        settings.defaultModel = defaultModelSelect.value;
        settings.darkMode = darkModeToggle.checked;
        settings.braveApiKey = braveApiKeyInput.value.trim();
        saveSettings();
        settingsModal.style.display = 'none';

        if (oldUrl !== settings.ollamaUrl) {
            window.location.reload();
        }
    });
    darkModeToggle.addEventListener('change', () => applyDarkMode(darkModeToggle.checked));
    testConnectionBtn.addEventListener('click', async () => {
        const url = ollamaUrlInput.value.trim();
        if (!url) {
            connectionStatus.textContent = 'URL is empty.';
            connectionStatus.className = 'error';
            return;
        }

        connectionStatus.textContent = 'Testing...';
        connectionStatus.className = '';

        try {
            const response = await fetch(`${url}/api/tags`);
            if (response.ok) {
                connectionStatus.textContent = '✅ Success!';
                connectionStatus.className = 'success';
            } else {
                throw new Error(`Status: ${response.status}`);
            }
        } catch (error) {
            connectionStatus.textContent = '❌ Failed!';
            connectionStatus.className = 'error';
        } finally {
            setTimeout(() => { connectionStatus.textContent = ''; connectionStatus.className = ''; }, 4000);
        }
    });

    // --- Initial setup ---
    async function initializeApp() {
        loadSettings();
        await fetchModels();
        loadConversations();
        renderConversationList();
        if (activeChatId) {
            switchChat(activeChatId);
        }
    }

    initializeApp();
});
