const STORAGE_KEY = 'student-forum-data-v3';
const state = {
  threads: [],
  users: [],
  currentUser: null,
  activeThreadId: null,
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    threads: state.threads,
    users: state.users,
    currentUser: state.currentUser,
  }));
};

const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const oldRaw = localStorage.getItem('student-forum-data-v2');
    if (oldRaw) {
      try {
        const parsed = JSON.parse(oldRaw);
        state.threads = Array.isArray(parsed.threads) ? parsed.threads : [];
        state.users = Array.isArray(parsed.users) ? parsed.users : [];
        state.currentUser = parsed.currentUser || null;
      } catch {
        state.threads = [];
        state.users = [];
        state.currentUser = null;
      }
    }
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.threads = Array.isArray(parsed.threads) ? parsed.threads : [];
    state.users = Array.isArray(parsed.users) ? parsed.users : [];
    state.currentUser = parsed.currentUser || null;
  } catch {
    state.threads = [];
    state.users = [];
    state.currentUser = null;
  }
};

const formatDate = (iso) => new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

const $ = (id) => document.getElementById(id);

const getUserAvatar = (avatar, username) => {
  if (avatar) return avatar;
  const user = state.users.find((u) => u.username === username);
  return user?.avatar || '👤';
};

const renderThreadList = () => {
  const list = $('thread-list');
  list.innerHTML = '';

  if (!state.threads.length) {
    list.innerHTML = '<li class="card">Список пуст. Создайте первый тред.</li>';
    return;
  }

  state.threads
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((thread) => {
      const avatar = getUserAvatar(thread.authorAvatar, thread.author);
      const li = document.createElement('li');
      li.className = 'thread-item';
      li.innerHTML = `
        <div class="thread-header">
          <span class="avatar-sm">${escapeHtml(avatar)}</span>
          <div>
            <h3>${escapeHtml(thread.title)}</h3>
            <div class="meta">Автор: ${escapeHtml(thread.author)} • ${formatDate(thread.createdAt)} • ${thread.comments.length} комментариев</div>
          </div>
        </div>
        <p>${escapeHtml(thread.body)}</p>
      `;
      li.addEventListener('click', () => openThread(thread.id));
      list.appendChild(li);
    });
};

const renderCurrentUser = () => {
  const userInfo = $('user-info');
  const authForm = $('login-form');
  const threadAuthorDisplay = $('thread-author-display');
  const commentAuthorDisplay = $('comment-author-display');

  if (state.currentUser) {
    userInfo.innerHTML = `
      <span class="avatar-sm">${escapeHtml(state.currentUser.avatar)}</span>
      Вошёл как ${escapeHtml(state.currentUser.username)}
    `;
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.textContent = 'Выйти';
    logoutBtn.addEventListener('click', logout);
    logoutBtn.className = 'logout-btn';
    userInfo.appendChild(logoutBtn);
    userInfo.classList.remove('hidden');
    authForm.classList.add('hidden');
    threadAuthorDisplay.textContent = `Автор: ${state.currentUser.username}`;
    commentAuthorDisplay.textContent = `Комментарий от: ${state.currentUser.username}`;
  } else {
    userInfo.classList.add('hidden');
    authForm.classList.remove('hidden');
    threadAuthorDisplay.textContent = 'Только для авторизованных пользователей';
    commentAuthorDisplay.textContent = 'Только для авторизованных пользователей';
  }
};

const setupAvatarPicker = () => {
  const buttons = document.querySelectorAll('.avatar-option');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const avatar = button.dataset.avatar || '👤';
      $('auth-avatar').value = avatar;
    });
  });
};

const registerUser = (username, password, avatar) => {
  const exists = state.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    alert('Пользователь с таким логином уже существует');
    return false;
  }
  const newUser = { username, password, avatar: avatar || '👤' };
  state.users.push(newUser);
  saveState();
  setCurrentUser(newUser);
  return true;
};

const loginUser = (username, password) => {
  const user = state.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) {
    alert('Неверный логин или пароль');
    return false;
  }
  setCurrentUser(user);
  return true;
};

const setCurrentUser = (user) => {
  state.currentUser = { username: user.username, avatar: user.avatar || '👤' };
  saveState();
  renderCurrentUser();
};

const logout = () => {
  state.currentUser = null;
  saveState();
  renderCurrentUser();
};

const showPane = (id) => {
  $('list-pane').classList.toggle('hidden', id !== 'list');
  $('thread-pane').classList.toggle('hidden', id !== 'thread');
};

const openThread = (threadId) => {
  state.activeThreadId = threadId;
  const thread = state.threads.find((item) => item.id === threadId);
  if (!thread) return;

  const avatar = getUserAvatar(thread.authorAvatar, thread.author);
  const details = $('thread-details');
  details.innerHTML = `
    <div class="thread-header">
      <span class="avatar-sm">${escapeHtml(avatar)}</span>
      <div>
        <h2>${escapeHtml(thread.title)}</h2>
        <div class="meta">Автор: ${escapeHtml(thread.author)} • ${formatDate(thread.createdAt)}</div>
      </div>
    </div>
    <p>${escapeHtml(thread.body)}</p>
  `;

  renderComments(thread.comments);
  showPane('thread');
};

const renderComments = (comments) => {
  const list = $('comment-list');
  list.innerHTML = '';

  if (!comments.length) {
    list.innerHTML = '<li class="card">Пока нет комментариев.</li>';
    return;
  }

  comments
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .forEach((comment) => {
      const avatar = getUserAvatar(comment.authorAvatar, comment.author);
      const li = document.createElement('li');
      li.className = 'comment-item';
      li.innerHTML = `
        <div class="comment-header">
          <span class="avatar-sm">${escapeHtml(avatar)}</span>
          <div>
            <div class="meta">${escapeHtml(comment.author)} • ${formatDate(comment.createdAt)}</div>
          </div>
        </div>
        <p>${escapeHtml(comment.body)}</p>
      `;
      list.appendChild(li);
    });
};

const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const addThread = (title, body) => {
  if (!state.currentUser) {
    alert('Нужно войти, чтобы создать тред');
    return;
  }

  const newThread = {
    id: 'thread-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    title,
    body,
    author: state.currentUser.username,
    authorAvatar: state.currentUser.avatar,
    createdAt: new Date().toISOString(),
    comments: [],
  };


  state.threads.push(newThread);
  saveState();
  renderThreadList();
};

const addComment = (threadId, body) => {
  if (!state.currentUser) {
    alert('Нужно войти, чтобы отправлять комментарии');
    return;
  }

  const thread = state.threads.find((item) => item.id === threadId);
  if (!thread) return;

  thread.comments.push({
    id: 'comment-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    body,
    author: state.currentUser.username,
    authorAvatar: state.currentUser.avatar,
    createdAt: new Date().toISOString(),
  });

  saveState();
  renderComments(thread.comments);
  renderThreadList();
};

window.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderThreadList();
  renderCurrentUser();

  $('login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const username = $('auth-login').value.trim();
    const password = $('auth-password').value.trim();

    if (!username || !password) {
      alert('Введите логин и пароль');
      return;
    }

    loginUser(username, password);
    $('auth-login').value = '';
    $('auth-password').value = '';
  });

  $('register-btn').addEventListener('click', () => {
    const username = $('auth-login').value.trim();
    const password = $('auth-password').value.trim();
    const avatar = $('auth-avatar').value || '👤';

    if (!username || !password) {
      alert('Введите логин и пароль');
      return;
    }

    registerUser(username, password, avatar);
    $('auth-login').value = '';
    $('auth-password').value = '';
  });

  setupAvatarPicker();

  $('new-thread-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = $('thread-title').value.trim();
    const body = $('thread-body').value.trim();

    if (!title || !body) return;

    addThread(title, body);
    $('thread-title').value = '';
    $('thread-body').value = '';
  });

  $('back-button').addEventListener('click', () => {
    state.activeThreadId = null;
    showPane('list');
  });

  $('new-comment-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const body = $('comment-body').value.trim();

    if (!body) return;

    if (state.activeThreadId) {
      addComment(state.activeThreadId, body);
      $('comment-body').value = '';
    }
  });
});
