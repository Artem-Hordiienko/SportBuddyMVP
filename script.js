﻿﻿
// SportBuddy MVP Enhanced JavaScript

const STORAGE_KEYS = {
    USERS: 'sportbuddy_users',
    CURRENT_USER: 'sportbuddy_user',
    TOKEN: 'sportbuddy_token',
    SWIPES: 'sportbuddy_swipes',
    MATCHES: 'sportbuddy_matches',
    CHAT_THREADS: 'sportbuddy_chat_threads',
    FILTERS: 'sportbuddy_filters'
};

const landingSelectors = ['.hero', '.features', '.about', '.how-it-works', '.testimonial', '.cta', '.footer', '.navbar'];

const state = {
    user: null,
    currentPage: 'find',
    swipeCards: [],
    cardIndex: 0,
    matches: [],
    filters: loadSavedFilters(),
    activeMatchId: null,
    pendingAvatar: null
};

const dom = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    initializeMockData();
    attachEventListeners();
    restoreSession();
    populateFiltersForm();
    setupSwipeEvents();
});

function cacheDom() {
    dom.authModal = document.getElementById('auth-modal');
    dom.appContainer = document.getElementById('app');
    dom.navMenu = document.getElementById('nav-menu');
    dom.navToggle = document.getElementById('nav-toggle');

    dom.filtersModal = document.getElementById('filters-modal');
    dom.profileModal = document.getElementById('profile-modal');
    dom.chatModal = document.getElementById('chat-modal');

    dom.authForm = document.getElementById('auth-form');
    dom.filtersForm = document.getElementById('filters-form');
    dom.profileForm = document.getElementById('profile-form');
    dom.chatForm = document.getElementById('chat-form');

    dom.profileAvatarInput = document.getElementById('profile-avatar-input');
    dom.profilePreviewAvatar = document.getElementById('profile-preview-avatar');
    dom.profileAvatar = document.getElementById('profile-avatar');

    dom.swipeCard = document.getElementById('swipe-card');
    dom.matchesList = document.getElementById('matches-list');
    dom.chatList = document.getElementById('chat-list');

    dom.profileName = document.getElementById('profile-name');
    dom.profileDetails = document.getElementById('profile-details');
    dom.profileBio = document.getElementById('profile-bio');
    dom.matchesCount = document.getElementById('matches-count');
    dom.swipesCount = document.getElementById('swipes-count');
    dom.streakCount = document.getElementById('streak-count');

    dom.chatPartnerName = document.getElementById('chat-partner-name');
    dom.chatPartnerMeta = document.getElementById('chat-partner-meta');
    dom.chatPartnerAvatar = document.getElementById('chat-partner-avatar');
    dom.chatThread = document.getElementById('chat-thread');
    dom.chatMessageInput = document.getElementById('chat-message-input');
}

function attachEventListeners() {
    if (dom.navToggle) {
        dom.navToggle.addEventListener('click', toggleMobileMenu);
    }

    if (dom.authForm) {
        dom.authForm.addEventListener('submit', handleAuthSubmit);
    }

    if (dom.filtersForm) {
        dom.filtersForm.addEventListener('submit', handleFiltersSubmit);
    }

    if (dom.profileForm) {
        dom.profileForm.addEventListener('submit', handleProfileSubmit);
    }

    if (dom.profileAvatarInput) {
        dom.profileAvatarInput.addEventListener('change', handleAvatarUpload);
    }

    if (dom.chatForm) {
        dom.chatForm.addEventListener('submit', handleChatSubmit);
    }

    [dom.authModal, dom.filtersModal, dom.profileModal, dom.chatModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', event => {
            if (event.target === modal || event.target.classList.contains('modal-backdrop')) {
                if (modal === dom.authModal) {
                    closeAuthModal();
                } else if (modal === dom.filtersModal) {
                    closeFiltersModal();
                } else if (modal === dom.profileModal) {
                    closeProfileModal();
                } else if (modal === dom.chatModal) {
                    closeChatModal();
                }
            }
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeChatModal();
            closeProfileModal();
            closeFiltersModal();
            closeAuthModal();
        }
    });
}

function restoreSession() {
    const savedUser = readStorage(STORAGE_KEYS.CURRENT_USER);
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (savedUser && token) {
        state.user = savedUser;
        showApp();
    }
}

function toggleMobileMenu() {
    if (!dom.navMenu || !dom.navToggle) return;
    dom.navMenu.classList.toggle('active');
    dom.navToggle.classList.toggle('active');
}
function showAuthModal(mode = 'login') {
    if (!dom.authModal) return;
    dom.authModal.dataset.mode = mode;
    openModal(dom.authModal);
    switchAuthTab(mode);
}

function closeAuthModal() {
    if (!dom.authModal) return;
    closeModal(dom.authModal);
}

function switchAuthTab(tab) {
    const loginTab = document.querySelector(".tab-btn[onclick=\"switchAuthTab('login')\"]");
    const registerTab = document.querySelector(".tab-btn[onclick=\"switchAuthTab('register')\"]");
    const registerFields = document.getElementById('register-fields');
    const submitText = document.getElementById('submit-text');
    const modalTitle = document.getElementById('modal-title');

    if (!loginTab || !registerTab || !registerFields || !submitText || !modalTitle) return;

    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        registerFields.style.display = 'none';
        submitText.textContent = 'Увійти';
        modalTitle.textContent = 'Увійти';
        dom.authModal.dataset.mode = 'login';
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerFields.style.display = 'flex';
        submitText.textContent = 'Зареєструватися';
        modalTitle.textContent = 'Зареєструватися';
        dom.authModal.dataset.mode = 'register';
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const payload = {
        email: (formData.get('email') || '').trim().toLowerCase(),
        password: (formData.get('password') || '').trim(),
        name: (formData.get('name') || '').trim(),
        age: formData.get('age'),
        gender: formData.get('gender'),
        sportGoal: (formData.get('sportGoal') || '').trim()
    };

    const mode = dom.authModal?.dataset.mode || 'login';

    try {
        if (mode === 'register') {
            await registerUser(payload);
        } else {
            await loginUser(payload);
        }
    } catch (error) {
        showNotification(error.message || 'Сталася помилка', 'error');
    }
}

async function registerUser(data) {
    await delay(700);

    if (!data.email || !data.password) {
        throw new Error('Email та пароль є обов\'язковими');
    }

    const users = readStorage(STORAGE_KEYS.USERS) || [];

    if (users.some(user => user.email === data.email)) {
        throw new Error('Користувач з таким email уже існує');
    }

    const newUser = {
        id: generateId(),
        email: data.email,
        password: data.password,
        name: data.name || 'Новий користувач',
        age: data.age ? parseInt(data.age, 10) : null,
        gender: data.gender || 'other',
        sportGoals: data.sportGoal || 'Активний спосіб життя',
        experienceLevel: 'beginner',
        distanceKm: 5,
        availability: ['weekdays', 'mornings'],
        avatar: null,
        bio: 'Я лише починаю шлях із SportBuddy та шукаю мотивацію тренуватись регулярно.',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeStorage(STORAGE_KEYS.USERS, users);

    persistSession(newUser);
    showNotification('Вітаємо у SportBuddy!', 'success');
    closeAuthModal();
    showApp();
}

async function loginUser(credentials) {
    await delay(500);

    if (!credentials.email || !credentials.password) {
        throw new Error('Введіть email та пароль');
    }

    const users = readStorage(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.email === credentials.email);

    if (!user || user.password !== credentials.password) {
        throw new Error('Невірна пара email / пароль');
    }

    persistSession(user);
    showNotification('Раді бачити знову!', 'success');
    closeAuthModal();
    showApp();
}

function persistSession(user) {
    const safeUser = sanitizeUser(user);
    state.user = safeUser;
    writeStorage(STORAGE_KEYS.CURRENT_USER, safeUser);
    localStorage.setItem(STORAGE_KEYS.TOKEN, generateToken());
}

function showApp() {
    if (!state.user) return;

    toggleLandingSections(false);
    if (dom.appContainer) {
        dom.appContainer.style.display = 'block';
    }

    showPage('find');
    loadUserProfile();
    loadSwipeCards();
    loadMatches();
    loadChats();
    populateFiltersForm();
}

function toggleLandingSections(visible) {
    landingSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (!element) return;
        element.style.display = visible ? '' : 'none';
    });
}

function logoutUser() {
    state.user = null;
    state.matches = [];
    state.swipeCards = [];
    state.cardIndex = 0;
    state.activeMatchId = null;

    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);

    if (dom.appContainer) {
        dom.appContainer.style.display = 'none';
    }

    toggleLandingSections(true);
    showNotification('Ви вийшли із профілю', 'info');
}

function loadUserProfile() {
    if (!state.user || !dom.profileName) return;

    dom.profileName.textContent = state.user.name;
    dom.profileDetails.textContent = formatProfileDetails(state.user);
    dom.profileBio.textContent = state.user.bio || 'Додайте трохи інформації про себе, щоб партнери краще вас розуміли.';

    if (dom.profileAvatar) {
        if (state.user.avatar) {
            dom.profileAvatar.style.backgroundImage = `url(${state.user.avatar})`;
            dom.profileAvatar.style.backgroundSize = 'cover';
            dom.profileAvatar.style.backgroundPosition = 'center';
            dom.profileAvatar.innerHTML = '';
        } else {
            dom.profileAvatar.style.backgroundImage = '';
            dom.profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }
    }

    dom.matchesCount.textContent = state.matches.length;
    dom.swipesCount.textContent = (readStorage(STORAGE_KEYS.SWIPES) || []).filter(swipe => swipe.fromUser === state.user.id).length;
    dom.streakCount.textContent = calculateMockStreak();
}

function loadSwipeCards() {
    if (!state.user || !dom.swipeCard) return;

    const candidates = generateMockUsers().filter(user => user.id !== state.user.id);
    state.swipeCards = applyFilters(candidates, state.filters);
    state.cardIndex = 0;

    if (state.swipeCards.length > 0) {
        displayCurrentCard();
    } else {
        showNoMoreCards();
    }
}

function applyFilters(users, filters) {
    if (!filters) return users;

    return users.filter(user => {
        if (filters.activity && !user.sportGoals.toLowerCase().includes(filters.activity.toLowerCase())) {
            return false;
        }

        if (filters.experience && user.experienceLevel !== filters.experience) {
            return false;
        }

        if (filters.gender && user.gender !== filters.gender) {
            return false;
        }

        if (filters.distance && user.distanceKm > Number(filters.distance)) {
            return false;
        }

        if (filters.days && filters.days.length > 0) {
            const hasOverlap = user.availability?.some(day => filters.days.includes(day));
            if (!hasOverlap) {
                return false;
            }
        }

        return true;
    });
}

function displayCurrentCard() {
    if (!dom.swipeCard) return;

    if (state.cardIndex >= state.swipeCards.length) {
        showNoMoreCards();
        return;
    }

    const card = state.swipeCards[state.cardIndex];
    dom.swipeCard.innerHTML = `
        <div class="card-overlay"></div>
        <div class="card-image" style="background-image: linear-gradient(135deg, rgba(97,244,200,0.25), rgba(124,92,255,0.25)), url('${card.avatar || ''}'); background-size: cover; background-position: center;"></div>
        <div class="card-content">
            <h3 class="card-name">${card.name}, ${card.age}</h3>
            <p class="card-info">${card.sportGoals} | ${getExperienceText(card.experienceLevel)}</p>
            <p class="card-bio">${card.bio}</p>
            <p class="card-bio">Доступність: ${formatAvailability(card.availability)} | ${card.distanceKm} км від вас</p>
        </div>
        <div class="card-actions">
            <button class="action-btn skip" onclick="swipeCard('left')"><i class="fas fa-xmark"></i></button>
            <button class="action-btn like" onclick="swipeCard('right')"><i class="fas fa-heart"></i></button>
        </div>
    `;
    dom.swipeCard.style.transform = 'translate(0, 0) rotate(0deg)';
    dom.swipeCard.style.opacity = '1';
}

function showNoMoreCards() {
    if (!dom.swipeCard) return;
    dom.swipeCard.innerHTML = `
        <div class="empty-state glass">
            <i class="fas fa-heart"></i>
            <h3>Карти закінчились</h3>
            <p>Спробуйте розширити фільтри або зайдіть трохи пізніше — ми підберемо нові рекомендації.</p>
        </div>
    `;
    dom.swipeCard.style.transform = 'translate(0, 0) rotate(0deg)';
    dom.swipeCard.style.opacity = '1';
}

function setupSwipeEvents() {
    const card = dom.swipeCard;
    if (!card) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;

    const startDrag = event => {
        const clientX = event.clientX || event.touches?.[0]?.clientX;
        const clientY = event.clientY || event.touches?.[0]?.clientY;
        if (clientX == null) return;

        isDragging = true;
        startX = clientX;
        startY = clientY || 0;
        card.classList.add('swiping');
    };

    const drag = event => {
        if (!isDragging) return;
        const clientX = event.clientX || event.touches?.[0]?.clientX;
        const clientY = event.clientY || event.touches?.[0]?.clientY;
        if (clientX == null) return;

        currentX = clientX - startX;
        currentY = (clientY || 0) - startY;

        const rotation = currentX * 0.08;
        card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
        const opacity = Math.max(0.3, 1 - Math.abs(currentX) / 260);
        card.style.opacity = opacity.toString();
    };

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove('swiping');

        const threshold = 110;
        if (Math.abs(currentX) > threshold) {
            swipeCard(currentX > 0 ? 'right' : 'left');
        } else {
            card.style.transform = 'translate(0, 0) rotate(0deg)';
            card.style.opacity = '1';
        }

        currentX = 0;
        currentY = 0;
    };

    card.addEventListener('mousedown', startDrag);
    card.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}
function swipeCard(direction) {
    if (state.cardIndex >= state.swipeCards.length) return;
    const card = state.swipeCards[state.cardIndex];

    const swipes = readStorage(STORAGE_KEYS.SWIPES) || [];
    swipes.push({
        id: generateId(),
        fromUser: state.user.id,
        toUser: card.id,
        direction,
        createdAt: new Date().toISOString()
    });
    writeStorage(STORAGE_KEYS.SWIPES, swipes);

    if (direction === 'right') {
        checkForMatch(card.id);
    }

    state.cardIndex += 1;
    requestAnimationFrame(() => displayCurrentCard());
}

function checkForMatch(userId) {
    const swipes = readStorage(STORAGE_KEYS.SWIPES) || [];
    const mutual = swipes.find(swipe => swipe.fromUser === userId && swipe.toUser === state.user.id && swipe.direction === 'right');

    if (mutual) {
        createMatch(userId);
    }
}

function createMatch(userId) {
    const matches = readStorage(STORAGE_KEYS.MATCHES) || [];

    const newMatch = {
        id: generateId(),
        userA: state.user.id,
        userB: userId,
        createdAt: new Date().toISOString()
    };

    matches.push(newMatch);
    writeStorage(STORAGE_KEYS.MATCHES, matches);
    state.matches = matches.filter(match => match.userA === state.user.id || match.userB === state.user.id);

    showMatchNotification(userId);
    loadMatches();
    loadChats();
}

function showMatchNotification(userId) {
    const user = getUserById(userId);
    if (!user) return;
    showNotification(`Взаємна симпатія! Тепер ви з ${user.name} у контакті.`, 'success');
}

function loadMatches() {
    if (!state.user || !dom.matchesList) return;

    const allMatches = readStorage(STORAGE_KEYS.MATCHES) || [];
    state.matches = allMatches.filter(match => match.userA === state.user.id || match.userB === state.user.id);

    if (state.matches.length === 0) {
        dom.matchesList.innerHTML = `
            <div class="empty-state glass">
                <i class="fas fa-heart"></i>
                <h3>Ще немає матчів</h3>
                <p>Продовжуйте свайпати — взаємні симпатії з'являться дуже скоро.</p>
            </div>
        `;
        return;
    }

    dom.matchesList.innerHTML = state.matches.map(match => {
        const partnerId = match.userA === state.user.id ? match.userB : match.userA;
        const partner = getUserById(partnerId);
        const subtitle = partner ? `${partner.sportGoals} • ${getExperienceText(partner.experienceLevel)}` : '';
        return `
            <div class="match-item" onclick="openChat('${match.id}')">
                <div class="match-avatar"><i class="fas fa-user"></i></div>
                <div class="match-info">
                    <h3>${partner ? partner.name : 'Користувач'}</h3>
                    <p>${subtitle}</p>
                </div>
            </div>
        `;
    }).join('');

    dom.matchesCount.textContent = state.matches.length;
}

function getChatThreads() {
    return readStorage(STORAGE_KEYS.CHAT_THREADS) || [];
}

function saveChatThreads(threads) {
    writeStorage(STORAGE_KEYS.CHAT_THREADS, threads);
}

function loadChats() {
    if (!state.user || !dom.chatList) return;

    if (state.matches.length === 0) {
        dom.chatList.innerHTML = `
            <div class="empty-state glass">
                <i class="fas fa-comments"></i>
                <h3>Поки що тихо</h3>
                <p>Як тільки з'явиться новий матч — чат відкриється тут.</p>
            </div>
        `;
        return;
    }

    const threads = getChatThreads();

    dom.chatList.innerHTML = state.matches.map(match => {
        const partnerId = match.userA === state.user.id ? match.userB : match.userA;
        const partner = getUserById(partnerId);
        const thread = threads.find(item => item.matchId === match.id);
        const lastMessage = thread?.messages?.slice(-1)[0];
        const preview = lastMessage ? lastMessage.text : 'Почніть розмову та домовтесь про тренування.';
        const time = lastMessage ? formatTime(lastMessage.createdAt) : formatDate(match.createdAt);

        return `
            <div class="chat-item" onclick="openChat('${match.id}')">
                <div class="chat-avatar"><i class="fas fa-user"></i></div>
                <div class="chat-content">
                    <div class="chat-name">${partner ? partner.name : 'Користувач'}</div>
                    <div class="chat-preview">${preview}</div>
                </div>
                <div class="chat-time">${time}</div>
            </div>
        `;
    }).join('');
}

function openChat(matchId) {
    if (!state.user || !dom.chatModal) return;

    const match = state.matches.find(item => item.id === matchId);
    if (!match) {
        showNotification('Не вдалося знайти чат для цього матчу', 'error');
        return;
    }

    state.activeMatchId = matchId;

    const partnerId = match.userA === state.user.id ? match.userB : match.userA;
    const partner = getUserById(partnerId);

    if (dom.chatPartnerName) {
        dom.chatPartnerName.textContent = partner ? partner.name : 'Партнер';
    }

    if (dom.chatPartnerMeta) {
        dom.chatPartnerMeta.textContent = partner ? `${partner.sportGoals} • ${getExperienceText(partner.experienceLevel)}` : '';
    }

    if (dom.chatPartnerAvatar) {
        dom.chatPartnerAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }

    renderChatThread(matchId);
    openModal(dom.chatModal);

    setTimeout(() => {
        dom.chatMessageInput?.focus();
    }, 150);
}

function renderChatThread(matchId) {
    if (!dom.chatThread) return;

    const threads = getChatThreads();
    const thread = threads.find(item => item.matchId === matchId) || { messages: [] };

    if (thread.messages.length === 0) {
        dom.chatThread.innerHTML = `
            <div class="empty-state glass" style="padding: 28px;">
                <i class="fas fa-paper-plane"></i>
                <h3>Скажіть привіт!</h3>
                <p>Почніть розмову, запропонуйте тренування або поділіться цілями.</p>
            </div>
        `;
        return;
    }

    dom.chatThread.innerHTML = thread.messages.map(message => `
        <div class="chat-bubble ${message.senderId === state.user.id ? 'self' : ''}">
            <span>${message.text}</span>
            <span class="chat-timestamp">${formatTime(message.createdAt)}</span>
        </div>
    `).join('');

    dom.chatThread.scrollTop = dom.chatThread.scrollHeight;
}

function handleChatSubmit(event) {
    event.preventDefault();
    if (!state.activeMatchId || !dom.chatMessageInput) return;

    const text = dom.chatMessageInput.value.trim();
    if (!text) return;

    const threads = getChatThreads();
    let thread = threads.find(item => item.matchId === state.activeMatchId);

    if (!thread) {
        thread = { matchId: state.activeMatchId, messages: [] };
        threads.push(thread);
    }

    const message = {
        id: generateId(),
        matchId: state.activeMatchId,
        senderId: state.user.id,
        text,
        createdAt: new Date().toISOString()
    };

    thread.messages.push(message);
    saveChatThreads(threads);
    dom.chatMessageInput.value = '';
    renderChatThread(state.activeMatchId);
    loadChats();

    setTimeout(() => simulatePartnerReply(state.activeMatchId), 1200);
}

function simulatePartnerReply(matchId) {
    const threads = getChatThreads();
    const thread = threads.find(item => item.matchId === matchId);
    if (!thread) return;

    const match = state.matches.find(item => item.id === matchId);
    const partnerId = match ? (match.userA === state.user.id ? match.userB : match.userA) : null;
    const partner = partnerId ? getUserById(partnerId) : null;

    const templates = [
        'Чудово! Коли зручно зустрітись?',
        'Готовий(-а) почати вже цими вихідними!',
        'Дуже хочу підтримувати ритм — домовляймось!'
    ];

    const reply = {
        id: generateId(),
        matchId,
        senderId: partnerId || 'bot',
        text: templates[Math.floor(Math.random() * templates.length)],
        createdAt: new Date().toISOString()
    };

    thread.messages.push(reply);
    saveChatThreads(threads);

    if (state.activeMatchId === matchId) {
        renderChatThread(matchId);
    }

    loadChats();
    if (partner) {
        showNotification(`${partner.name} відповів(-ла) у чаті`, 'info');
    }
}

function closeChatModal() {
    if (!dom.chatModal) return;
    closeModal(dom.chatModal);
}
function showFilters() {
    populateFiltersForm();
    if (dom.filtersModal) {
        openModal(dom.filtersModal);
    }
}

function closeFiltersModal() {
    if (!dom.filtersModal) return;
    closeModal(dom.filtersModal);
}

function handleFiltersSubmit(event) {
    event.preventDefault();
    if (!dom.filtersForm) return;

    const formData = new FormData(dom.filtersForm);
    const selectedDays = Array.from(dom.filtersForm.elements['days']?.selectedOptions || []).map(option => option.value);

    state.filters = {
        activity: (formData.get('activity') || '').trim(),
        experience: formData.get('experience') || '',
        distance: formData.get('distance') || '',
        days: selectedDays,
        gender: formData.get('gender') || ''
    };

    saveFilters(state.filters);
    loadSwipeCards();
    closeFiltersModal();
    showNotification('Фільтри оновлено', 'success');
}

function resetFilters() {
    state.filters = { activity: '', experience: '', distance: '', days: [], gender: '' };
    saveFilters(state.filters);
    dom.filtersForm?.reset();
    populateFiltersForm();
    loadSwipeCards();
    showNotification('Фільтри скинуто', 'info');
}

function populateFiltersForm() {
    if (!dom.filtersForm || !state.filters) return;

    dom.filtersForm.elements['activity'].value = state.filters.activity || '';
    dom.filtersForm.elements['experience'].value = state.filters.experience || '';
    dom.filtersForm.elements['distance'].value = state.filters.distance || '';
    dom.filtersForm.elements['gender'].value = state.filters.gender || '';

    const daysSelect = dom.filtersForm.elements['days'];
    if (daysSelect) {
        Array.from(daysSelect.options).forEach(option => {
            option.selected = state.filters.days?.includes(option.value);
        });
    }
}

function loadSavedFilters() {
    return readStorage(STORAGE_KEYS.FILTERS) || { activity: '', experience: '', distance: '', days: [], gender: '' };
}

function saveFilters(filters) {
    writeStorage(STORAGE_KEYS.FILTERS, filters);
}

function editProfile() {
    if (!state.user || !dom.profileModal) return;

    populateProfileForm();
    openModal(dom.profileModal);
}

function closeProfileModal() {
    if (!dom.profileModal) return;
    closeModal(dom.profileModal);
    state.pendingAvatar = null;
}

function populateProfileForm() {
    if (!dom.profileForm || !state.user) return;

    dom.profileForm.querySelector('#profile-name-input').value = state.user.name || '';
    dom.profileForm.querySelector('#profile-age-input').value = state.user.age || '';
    dom.profileForm.querySelector('#profile-gender-input').value = state.user.gender || 'other';
    dom.profileForm.querySelector('#profile-goal-input').value = state.user.sportGoals || '';
    dom.profileForm.querySelector('#profile-bio-input').value = state.user.bio || '';

    if (dom.profilePreviewAvatar) {
        if (state.user.avatar) {
            dom.profilePreviewAvatar.style.backgroundImage = `url(${state.user.avatar})`;
            dom.profilePreviewAvatar.style.backgroundSize = 'cover';
            dom.profilePreviewAvatar.style.backgroundPosition = 'center';
            dom.profilePreviewAvatar.innerHTML = '';
        } else {
            dom.profilePreviewAvatar.style.backgroundImage = '';
            dom.profilePreviewAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }
    }
}

function handleProfileSubmit(event) {
    event.preventDefault();
    if (!state.user) return;

    const name = event.target.querySelector('#profile-name-input').value.trim();
    const age = event.target.querySelector('#profile-age-input').value;
    const gender = event.target.querySelector('#profile-gender-input').value;
    const goal = event.target.querySelector('#profile-goal-input').value.trim();
    const bio = event.target.querySelector('#profile-bio-input').value.trim();

    if (!name) {
        showNotification('Вкажіть ім\'я для профілю', 'error');
        return;
    }

    const users = readStorage(STORAGE_KEYS.USERS) || [];
    const userIndex = users.findIndex(user => user.id === state.user.id);
    if (userIndex === -1) {
        showNotification('Не вдалося оновити профіль', 'error');
        return;
    }

    users[userIndex] = {
        ...users[userIndex],
        name,
        age: age ? parseInt(age, 10) : null,
        gender,
        sportGoals: goal || 'Активний спосіб життя',
        bio: bio || 'Я лише починаю шлях із SportBuddy та шукаю мотивацію тренуватись регулярно.',
        avatar: state.pendingAvatar ?? state.user.avatar
    };

    writeStorage(STORAGE_KEYS.USERS, users);
    state.user = sanitizeUser(users[userIndex]);
    writeStorage(STORAGE_KEYS.CURRENT_USER, state.user);

    state.pendingAvatar = null;
    closeProfileModal();
    loadUserProfile();
    loadSwipeCards();
    loadMatches();
    showNotification('Профіль оновлено', 'success');
}

function uploadAvatar() {
    if (!state.user || !dom.profileAvatarInput) return;
    editProfile();
    setTimeout(() => dom.profileAvatarInput?.click(), 200);
}

function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        state.pendingAvatar = reader.result;
        if (dom.profilePreviewAvatar) {
            dom.profilePreviewAvatar.style.backgroundImage = `url(${reader.result})`;
            dom.profilePreviewAvatar.style.backgroundSize = 'cover';
            dom.profilePreviewAvatar.style.backgroundPosition = 'center';
            dom.profilePreviewAvatar.innerHTML = '';
        }
        if (dom.profileAvatar) {
            dom.profileAvatar.style.backgroundImage = `url(${reader.result})`;
            dom.profileAvatar.innerHTML = '';
        }
    };
    reader.readAsDataURL(file);
}

function showPage(pageName) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    const target = document.getElementById(`${pageName}-page`);
    if (target) {
        target.classList.add('active');
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    const activeNav = document.querySelector(`.nav-item[onclick="showPage('${pageName}')"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    state.currentPage = pageName;

    if (pageName === 'profile') {
        loadUserProfile();
    }
}

function scrollToFeatures() {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
}

function openModal(modal) {
    if (!modal) return;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
    document.body.style.overflow = '';
}
function readStorage(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('Storage read error', error);
        return null;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Storage write error', error);
    }
}

function generateMockUsers() {
    const stored = readStorage(STORAGE_KEYS.USERS);
    if (stored && stored.length) {
        return stored;
    }

    return [];
}

function initializeMockData() {
    if (localStorage.getItem(STORAGE_KEYS.USERS)) return;

    const mockUsers = [
        {
            id: 'user1',
            email: 'anna@sportbuddy.com',
            password: 'sportbuddy',
            name: 'Аліна',
            age: 24,
            gender: 'female',
            sportGoals: 'Біг 5 км у парку',
            experienceLevel: 'intermediate',
            distanceKm: 4,
            availability: ['weekdays', 'mornings'],
            bio: 'Готуюсь до півмарафону, люблю ранкові пробіжки та каву після тренувань.',
            avatar: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'user2',
            email: 'rostyslav@sportbuddy.com',
            password: 'sportbuddy',
            name: 'Ростислав',
            age: 28,
            gender: 'male',
            sportGoals: 'Сквош двічі на тиждень',
            experienceLevel: 'advanced',
            distanceKm: 7,
            availability: ['weekdays', 'evenings'],
            bio: 'Працюю в IT, обожнюю швидкі командні ігри та вмію мотивувати до прогресу.',
            avatar: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'user3',
            email: 'olena@sportbuddy.com',
            password: 'sportbuddy',
            name: 'Олена',
            age: 26,
            gender: 'female',
            sportGoals: 'Йога та функціональні тренування',
            experienceLevel: 'beginner',
            distanceKm: 3,
            availability: ['weekend', 'mornings'],
            bio: 'Хочу відновитись після перерви, шукаю партнера для студійних занять та вуличних тренувань.',
            avatar: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'user4',
            email: 'marta@sportbuddy.com',
            password: 'sportbuddy',
            name: 'Марта',
            age: 30,
            gender: 'female',
            sportGoals: 'Велосипед і трейлран',
            experienceLevel: 'advanced',
            distanceKm: 9,
            availability: ['weekend'],
            bio: 'Люблю складні маршрути та гори. Шукаю того, хто не боїться довгих дистанцій.',
            avatar: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'user5',
            email: 'max@sportbuddy.com',
            password: 'sportbuddy',
            name: 'Максим',
            age: 27,
            gender: 'male',
            sportGoals: 'Басейн та сила',
            experienceLevel: 'intermediate',
            distanceKm: 6,
            availability: ['weekdays', 'mornings'],
            bio: 'Працюю з дому, тому можу тренуватись вранці. Хочу стабільності та нових знайомств.',
            avatar: null,
            createdAt: new Date().toISOString()
        },
        {
            id: 'user6',
            email: 'yura@sportbuddy.com',
            password: 'sportbuddy',
            name: 'Юра',
            age: 31,
            gender: 'male',
            sportGoals: 'Функціональні тренування на свіжому повітрі',
            experienceLevel: 'intermediate',
            distanceKm: 5,
            availability: ['weekend', 'evenings'],
            bio: 'Працюю тренером-аматором. Прагну знайти партнера для групових занять у дворі.',
            avatar: null,
            createdAt: new Date().toISOString()
        }
    ];

    writeStorage(STORAGE_KEYS.USERS, mockUsers);
}

function getUserById(userId) {
    const users = readStorage(STORAGE_KEYS.USERS) || [];
    return users.find(user => user.id === userId);
}

function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...rest } = user;
    return rest;
}

function calculateMockStreak() {
    return Math.floor(Math.random() * 6) + 1;
}

function formatAvailability(list) {
    if (!list || list.length === 0) return 'Будь-який час';
    const map = {
        weekdays: 'Будні',
        weekend: 'Вихідні',
        mornings: 'Ранок',
        evenings: 'Вечір'
    };
    return list.map(item => map[item] || item).join(', ');
}

function formatProfileDetails(user) {
    const genderMap = {
        male: 'Чоловік',
        female: 'Жінка',
        other: 'Інше'
    };

    const parts = [];
    if (user.age) parts.push(`${user.age} років`);
    if (user.gender) parts.push(genderMap[user.gender] || 'Уточнюється');
    return parts.join(' • ') || 'Оновіть інформацію у профілі';
}

function getExperienceText(level) {
    const levels = {
        beginner: 'Початківець',
        intermediate: 'Середній рівень',
        advanced: 'Просунутий рівень'
    };
    return levels[level] || 'Досвід уточнюється';
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сьогодні';
    if (diffDays === 1) return 'Вчора';
    if (diffDays < 7) return `${diffDays} дн. тому`;
    return date.toLocaleDateString('uk-UA');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateId() {
    return 'id_' + Math.random().toString(36).slice(2, 11);
}

function generateToken() {
    return 'token_' + Math.random().toString(36).slice(2, 22);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: ${type === 'success' ? 'linear-gradient(135deg, rgba(97,244,200,0.9), rgba(46,230,161,0.85))'
        : type === 'error' ? 'linear-gradient(135deg, rgba(255,92,122,0.9), rgba(255,126,165,0.85))'
        : type === 'warning' ? 'linear-gradient(135deg, rgba(246,195,92,0.9), rgba(255,222,146,0.9))'
        : 'rgba(12,18,35,0.9)'};
        color: ${type === 'success' ? '#04151f' : '#f5f8ff'};
        padding: 16px 22px;
        border-radius: 18px;
        box-shadow: 0 18px 40px rgba(4, 8, 22, 0.35);
        z-index: 5000;
        max-width: 320px;
        font-weight: 500;
        backdrop-filter: blur(14px);
        animation: fadeIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 280);
    }, 4200);
}

const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-12px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-8px); }
    }
`;
document.head.appendChild(animationStyle);

