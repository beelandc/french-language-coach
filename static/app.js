const API_BASE = window.location.origin;
let currentSessionId = null;
let currentScenarioId = null;
let sessionEnded = false;

// DOM Elements
const scenarioSelectView = document.getElementById('scenario-select');
const chatView = document.getElementById('chat');
const feedbackView = document.getElementById('feedback');
const scenariosList = document.getElementById('scenarios-list');
const chatMessages = document.getElementById('chat-messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatScenarioName = document.getElementById('chat-scenario-name');
const feedbackContent = document.getElementById('feedback-content');
const backToScenariosBtn = document.getElementById('back-to-scenarios');
const endSessionBtn = document.getElementById('end-session');
const backToChatBtn = document.getElementById('back-to-chat');
const newSessionBtn = document.getElementById('new-session');

// Scenarios data (fetched or hardcoded fallback)
let scenarios = [];

// Initialize
async function init() {
    await loadScenarios();
    renderScenarios();
    setupEventListeners();
}

async function loadScenarios() {
    // For now, use hardcoded scenarios matching backend
    scenarios = [
        { id: 'cafe_order', name: 'Ordering at a Café', description: 'Practice ordering coffee, pastries, and asking about menu items in a Parisian café.' },
        { id: 'ask_directions', name: 'Asking for Directions', description: 'Practice asking for and understanding directions to landmarks around Paris.' },
        { id: 'job_interview', name: 'Job Interview', description: 'Simulate a job interview in French for a position as a software engineer.' },
        { id: 'hotel_checkin', name: 'Hotel Check-in', description: 'Practice checking into a hotel, asking about amenities, and reporting issues.' },
        { id: 'shopping', name: 'Shopping for Clothes', description: 'Practice shopping for clothes, asking about sizes, prices, and trying items on.' },
        { id: 'doctor_visit', name: 'Doctor\'s Visit', description: 'Practice describing symptoms and understanding medical advice in French.' },
        { id: 'train_travel', name: 'Train Travel', description: 'Practice buying train tickets and asking about schedules at a French train station.' },
        { id: 'restaurant_dining', name: 'Dining at a Restaurant', description: 'Practice ordering a full meal, asking about specials, and interacting with the waiter.' },
        { id: 'apartment_rental', name: 'Apartment Rental', description: 'Practice negotiating and asking about details for renting an apartment in France.' },
        { id: 'museum_visit', name: 'Museum Visit', description: 'Practice asking about exhibits, tickets, and audio guides at a French museum.' }
    ];
}

function renderScenarios() {
    scenariosList.innerHTML = '';
    scenarios.forEach(scenario => {
        const card = document.createElement('div');
        card.className = 'scenario-card';
        card.innerHTML = `
            <h3>${scenario.name}</h3>
            <p>${scenario.description}</p>
        `;
        card.addEventListener('click', () => startSession(scenario.id));
        scenariosList.appendChild(card);
    });
}

function setupEventListeners() {
    backToScenariosBtn.addEventListener('click', showScenarioSelect);
    backToChatBtn.addEventListener('click', showChat);
    newSessionBtn.addEventListener('click', () => {
        currentSessionId = null;
        currentScenarioId = null;
        showScenarioSelect();
    });
    endSessionBtn.addEventListener('click', endCurrentSession);

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendMessage();
    });
}

async function startSession(scenarioId) {
    currentScenarioId = scenarioId;
    sessionEnded = false;
    const scenario = scenarios.find(s => s.id === scenarioId);
    
    try {
        const response = await fetch(`${API_BASE}/sessions/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario_id: scenarioId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create session');
        }
        
        const data = await response.json();
        currentSessionId = data.id;
        chatScenarioName.textContent = scenario.name;
        chatMessages.innerHTML = '';
        messageInput.disabled = false;
        endSessionBtn.disabled = false;
        showChat();
    } catch (error) {
        console.error('Error starting session:', error);
        alert('Failed to start session. Please try again.');
    }
}

async function sendMessage() {
    if (sessionEnded) {
        alert('This session has ended. Please start a new session.');
        return;
    }
    
    const content = messageInput.value.trim();
    if (!content) return;

    // Add user message to UI
    addMessageToUI('user', content);
    messageInput.value = '';

    try {
        const response = await fetch(`${API_BASE}/sessions/${currentSessionId}/messages/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to send message');
        }

        const data = await response.json();
        addMessageToUI('assistant', data.content);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error sending message:', error);
        alert(error.message || 'Failed to get response. Please try again.');
    }
}

async function endCurrentSession() {
    if (!currentSessionId || sessionEnded) return;

    try {
        const response = await fetch(`${API_BASE}/sessions/${currentSessionId}/feedback/`, {
            method: 'POST'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to generate feedback');
        }

        const feedback = await response.json();
        sessionEnded = true;
        messageInput.disabled = true;
        endSessionBtn.disabled = true;
        renderFeedback(feedback);
        showFeedback();
    } catch (error) {
        console.error('Error ending session:', error);
        alert(error.message || 'Failed to end session. Please try again.');
    }
}

function addMessageToUI(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `
        <div class="role">${role === 'user' ? 'You' : 'AI'}</div>
        <div class="content">${escapeHtml(content)}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderFeedback(feedback) {
    feedbackContent.innerHTML = `
        <div class="feedback-section">
            <h3>Scores</h3>
            <div class="scores-grid">
                <div class="score-card">
                    <div class="label">Grammar</div>
                    <div class="value">${feedback.grammar_score}</div>
                </div>
                <div class="score-card">
                    <div class="label">Vocabulary</div>
                    <div class="value">${feedback.vocabulary_score}</div>
                </div>
                <div class="score-card">
                    <div class="label">Fluency</div>
                    <div class="value">${feedback.fluency_score}</div>
                </div>
                <div class="score-card">
                    <div class="label">Overall</div>
                    <div class="value">${feedback.overall_score}</div>
                </div>
            </div>
        </div>

        <div class="feedback-section">
            <h3>Strengths</h3>
            <ul class="strengths-list">
                ${feedback.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
        </div>

        <div class="feedback-section">
            <h3>Focus Area</h3>
            <div class="focus-area">
                <h4>Priority: Improve your ${escapeHtml(feedback.focus_area)}</h4>
            </div>
        </div>

        ${feedback.example_corrections && feedback.example_corrections.length > 0 ? `
        <div class="feedback-section">
            <h3>Example Corrections</h3>
            <div class="corrections-list">
                ${feedback.example_corrections.map(c => `
                    <div class="correction-item">
                        <div class="original">${escapeHtml(c.original)}</div>
                        <div class="corrected">${escapeHtml(c.corrected)}</div>
                        <div class="explanation">${escapeHtml(c.explanation)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;
}

function showScenarioSelect() {
    scenarioSelectView.classList.add('active');
    chatView.classList.remove('active');
    feedbackView.classList.remove('active');
}

function showChat() {
    scenarioSelectView.classList.remove('active');
    chatView.classList.add('active');
    feedbackView.classList.remove('active');
}

function showFeedback() {
    scenarioSelectView.classList.remove('active');
    chatView.classList.remove('active');
    feedbackView.classList.add('active');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start the app
init();
