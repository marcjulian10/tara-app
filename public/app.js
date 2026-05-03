import { auth, db } from './firebase.js';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- STATE ---
let state = {
  partnerA: '',
  partnerB: '',
  income: 0,
  currency: 'PHP',
  savingsRate: 20,
  joinedDate: '',
  goals: [], // Array of goal objects
  chatHistory: []
};

// --- DOM ELEMENTS ---
const elements = {
  overlay: document.getElementById('onboarding-overlay'),
  onboardingForm: document.getElementById('onboarding-form'),
  app: document.getElementById('app'),
  
  // Nav
  navBtns: document.querySelectorAll('.nav-btn[data-view]'),
  views: document.querySelectorAll('.view'),
  coupleLabel: document.getElementById('couple-label'),
  greetingText: document.getElementById('greeting-text'),
  
  // Dashboard Stats
  statGoals: document.getElementById('stat-goals'),
  statSaved: document.getElementById('stat-saved'),
  statIncome: document.getElementById('stat-income'),
  statRate: document.getElementById('stat-rate'),
  goalsPreview: document.getElementById('goals-preview'),
  
  // Goals
  goalsList: document.getElementById('goals-list'),
  historyList: document.getElementById('history-list'),
  goalModal: document.getElementById('goal-modal'),
  goalForm: document.getElementById('goal-form'),
  btnOpenGoal: document.getElementById('btn-add-goal'),
  btnOpenGoalDash: document.getElementById('btn-add-goal-dash'),
  btnCloseGoal: document.getElementById('btn-close-modal'),
  splitSlider: document.getElementById('goal-split'),
  splitLabelA: document.getElementById('split-label-a'),
  splitLabelB: document.getElementById('split-label-b'),
  
  // Contribute
  contributeModal: document.getElementById('contribute-modal'),
  contributeForm: document.getElementById('contribute-form'),
  btnCloseContribute: document.getElementById('btn-close-contribute'),
  
  // Chat
  chatMessages: document.getElementById('chat-messages'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  
  // Reset
  btnReset: document.getElementById('btn-reset'),
  
  // Currency
  btnConvert: document.getElementById('btn-convert'),
  btnSwapCurrency: document.getElementById('btn-swap-currency'),
  converterResult: document.getElementById('converter-result'),
  resultAmount: document.getElementById('result-amount'),
  resultRate: document.getElementById('result-rate'),

  // Auth
  authContainer: document.getElementById('auth-container'),
  authForm: document.getElementById('auth-form'),
  tabLogin: document.getElementById('tab-login'),
  tabSignup: document.getElementById('tab-signup'),
  authSubmit: document.getElementById('auth-submit'),
  btnLogout: document.getElementById('btn-reset'), // Reusing reset button as logout for now

  // Invite
  btnInvitePartner: document.getElementById('btn-invite-partner'),
  inviteModal: document.getElementById('invite-modal'),
  btnCloseInvite: document.getElementById('btn-close-invite'),
  qrcodeContainer: document.getElementById('qrcode'),
  inviteLinkInput: document.getElementById('invite-link-input'),
  btnCopyLink: document.getElementById('btn-copy-link')
};

// --- UTILS ---
const formatMoney = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: state.currency
  }).format(amount);
};

const generateId = () => Math.random().toString(36).substr(2, 9);

let currentCoupleId = null;

const saveState = async () => {
  if (currentCoupleId) {
    try {
      await setDoc(doc(db, "couples", currentCoupleId), state);
    } catch (e) {
      console.error("Error saving state: ", e);
    }
  }
};

const joinCouple = async (user, coupleId) => {
  try {
    const coupleSnap = await getDoc(doc(db, "couples", coupleId));
    if (coupleSnap.exists()) {
      await setDoc(doc(db, "users", user.uid), { coupleId }, { merge: true });
      return true;
    }
    return false;
  } catch (e) {
    console.error("Join error: ", e);
    return false;
  }
};

let unsubscribe = null;

const loadState = async (user) => {
  console.log("Loading state for user:", user.email);
  if (unsubscribe) unsubscribe();
  
  // Check for join parameter
  const urlParams = new URLSearchParams(window.location.search);
  const joinId = urlParams.get('join');
  console.log("Join ID from URL:", joinId);
  
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    let coupleId = userDoc.exists() ? userDoc.data().coupleId : null;
    console.log("Existing coupleId for user:", coupleId);

    if (joinId && joinId !== coupleId) {
      console.log("Attempting to join couple:", joinId);
      const success = await joinCouple(user, joinId);
      if (success) {
        coupleId = joinId;
        // Clear URL params
        window.history.replaceState({}, document.title, "/");
      } else {
        alert("Invalid or expired invite link.");
      }
    }

    if (!coupleId) {
      // Check if there's legacy data under their UID (from Phase 1)
      const legacySnap = await getDoc(doc(db, "couples", user.uid));
      if (legacySnap.exists()) {
        console.log("Found legacy data, migrating...");
        coupleId = user.uid;
        await setDoc(doc(db, "users", user.uid), { coupleId }, { merge: true });
      } else {
        // New user, show onboarding
        console.log("New user detected, showing onboarding form.");
        elements.overlay.classList.remove('hidden');
        elements.authContainer.classList.add('hidden');
        elements.onboardingForm.classList.remove('hidden');
        return;
      }
    }

    currentCoupleId = coupleId;
    unsubscribe = onSnapshot(doc(db, "couples", coupleId), (docSnap) => {
      if (docSnap.exists()) {
        state = docSnap.data();
        elements.overlay.classList.add('hidden');
        elements.app.classList.remove('hidden');
        updateUI();
      } else {
        console.warn("Couple document not found despite having coupleId");
        elements.overlay.classList.remove('hidden');
        elements.authContainer.classList.add('hidden');
        elements.onboardingForm.classList.remove('hidden');
      }
    });
  } catch (error) {
    console.error("Error in loadState:", error);
  }
};

// --- INITIALIZATION ---
const init = () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadState(user);
    } else {
      elements.app.classList.add('hidden');
      elements.overlay.classList.remove('hidden');
      elements.authContainer.classList.remove('hidden');
      elements.onboardingForm.classList.add('hidden');
    }
  });
  setupEventListeners();
};

// --- EVENT LISTENERS ---
const setupEventListeners = () => {
  // Auth Tabs
  let authMode = 'login';
  if (elements.tabLogin && elements.tabSignup) {
    elements.tabLogin.addEventListener('click', () => {
      authMode = 'login';
      elements.tabLogin.classList.add('active');
      elements.tabSignup.classList.remove('active');
      elements.authSubmit.textContent = 'Login';
    });
    elements.tabSignup.addEventListener('click', () => {
      authMode = 'signup';
      elements.tabSignup.classList.add('active');
      elements.tabLogin.classList.remove('active');
      elements.authSubmit.textContent = 'Sign Up';
    });
  }

  // Auth Form Submit
  if (elements.authForm) {
    elements.authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      
      console.log(`Attempting ${authMode}...`);
      elements.authSubmit.disabled = true;
      elements.authSubmit.textContent = authMode === 'login' ? 'Logging in...' : 'Signing up...';

      try {
        if (authMode === 'login') {
          await signInWithEmailAndPassword(auth, email, password);
          console.log("Login success");
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
          console.log("Sign up success");
        }
      } catch (error) {
        console.error("Auth error:", error.code, error.message);
        alert(error.message);
        elements.authSubmit.disabled = false;
        elements.authSubmit.textContent = authMode === 'login' ? 'Login' : 'Sign Up';
      }
    });
  }

  if (elements.onboardingForm) {
    elements.onboardingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const user = auth.currentUser;
      if (user) {
        state.partnerA = document.getElementById('partner-a-name').value;
        state.partnerB = document.getElementById('partner-b-name').value;
        state.income = Number(document.getElementById('combined-income').value);
        state.currency = document.getElementById('currency-select').value;
        state.savingsRate = Number(document.getElementById('savings-rate').value);
        state.joinedDate = new Date().toISOString();

        currentCoupleId = user.uid;
        await setDoc(doc(db, "users", user.uid), { coupleId: user.uid }, { merge: true });
        await saveState();
        elements.overlay.classList.add('hidden');
        elements.app.classList.remove('hidden');
        updateUI();
      }
    });
  }

  const rateSlider = document.getElementById('savings-rate');
  const rateDisplayOnboarding = document.getElementById('rate-display-onboarding');
  if (rateSlider && rateDisplayOnboarding) {
    rateSlider.addEventListener('input', (e) => {
      rateDisplayOnboarding.textContent = e.target.value;
    });
  }

  // Navigation
  if (elements.navBtns) {
    elements.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        elements.navBtns.forEach(b => b.classList.remove('active'));
        elements.views.forEach(v => v.classList.remove('active'));
        
        btn.classList.add('active');
        const viewEl = document.getElementById(`view-${targetView}`);
        if(viewEl) viewEl.classList.add('active');
      });
    });
  }

  // Goal Modal
  const openGoalModal = () => {
    if(elements.goalModal) elements.goalModal.classList.remove('hidden');
  };
  
  const closeGoalModal = () => {
    if(elements.goalModal) elements.goalModal.classList.add('hidden');
    if(elements.goalForm) elements.goalForm.reset();
    if(elements.splitSlider) elements.splitSlider.value = 50;
    if(elements.splitLabelA) elements.splitLabelA.textContent = '50%';
    if(elements.splitLabelB) elements.splitLabelB.textContent = '50%';
    const editGoalId = document.getElementById('edit-goal-id');
    if(editGoalId) editGoalId.value = '';
  };

  if(elements.btnOpenGoal) elements.btnOpenGoal.addEventListener('click', openGoalModal);
  if(elements.btnOpenGoalDash) elements.btnOpenGoalDash.addEventListener('click', openGoalModal);
  if(elements.btnCloseGoal) elements.btnCloseGoal.addEventListener('click', closeGoalModal);
  
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-first-goal') openGoalModal();
  });

  // Split Slider Update
  if (elements.splitSlider) {
    elements.splitSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      if (elements.splitLabelA) elements.splitLabelA.textContent = `${val}%`;
      if (elements.splitLabelB) elements.splitLabelB.textContent = `${100 - val}%`;
    });
  }

  // Add or Edit Goal Form Submit
  if (elements.goalForm) {
    elements.goalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = document.getElementById('btn-save-goal');
      if (btnSubmit) {
        btnSubmit.innerHTML = 'Saving...';
        btnSubmit.disabled = true;
      }

      const query = document.getElementById('goal-cover-query').value || document.getElementById('goal-name').value;
      let coverUrl = '';
      
      try {
        const res = await fetch(`/api/pexels?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          coverUrl = data.url;
        }
      } catch (err) {
        console.warn('Failed to fetch cover image');
      }

      const editGoalId = document.getElementById('edit-goal-id').value;

      if (editGoalId) {
        state.goals = state.goals.map(g => {
          if (g.id === editGoalId) {
            return {
              ...g,
              name: document.getElementById('goal-name').value,
              target: Number(document.getElementById('goal-target').value),
              deadline: document.getElementById('goal-deadline').value,
              splitA: Number(elements.splitSlider.value),
              splitB: 100 - Number(elements.splitSlider.value),
              coverUrl: coverUrl || g.coverUrl
            };
          }
          return g;
        });
      } else {
        const newGoal = {
          id: generateId(),
          name: document.getElementById('goal-name').value,
          target: Number(document.getElementById('goal-target').value),
          deadline: document.getElementById('goal-deadline').value,
          splitA: Number(elements.splitSlider.value),
          splitB: 100 - Number(elements.splitSlider.value),
          savedA: 0,
          savedB: 0,
          coverUrl: coverUrl,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
        state.goals.push(newGoal);
      }

      await saveState();
      closeGoalModal();
      updateUI();
      
      if (btnSubmit) {
        btnSubmit.innerHTML = 'Save Goal';
        btnSubmit.disabled = false;
      }
    });
  }

  // Contribute Modal
  if (elements.btnCloseContribute) {
    elements.btnCloseContribute.addEventListener('click', () => {
      if(elements.contributeModal) elements.contributeModal.classList.add('hidden');
      if(elements.contributeForm) elements.contributeForm.reset();
    });
  }

  if (elements.contributeForm) {
    elements.contributeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const goalId = document.getElementById('contribute-goal-id').value;
      const partner = document.getElementById('contribute-partner').value;
      const amount = Number(document.getElementById('contribute-amount').value);

      const goal = state.goals.find(g => g.id === goalId);
      if (goal) {
        if (partner === 'A') goal.savedA += amount;
        else goal.savedB += amount;
      }
      
      await saveState();
      if(elements.contributeModal) elements.contributeModal.classList.add('hidden');
      updateUI();
    });
  }

  // Logout
  if (elements.btnLogout) {
    elements.btnLogout.addEventListener('click', async () => {
      if (confirm('Are you sure you want to logout?')) {
        try {
          await signOut(auth);
          currentCoupleId = null;
          state = {
            partnerA: '',
            partnerB: '',
            income: 0,
            currency: 'PHP',
            savingsRate: 20,
            joinedDate: '',
            goals: [],
            chatHistory: []
          };
        } catch (e) {
          console.error("Logout error: ", e);
        }
      }
    });
  }

  // Invite Partner
  if (elements.btnInvitePartner) {
    elements.btnInvitePartner.addEventListener('click', () => {
      if (!currentCoupleId) return;
      
      const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${currentCoupleId}`;
      if (elements.inviteLinkInput) elements.inviteLinkInput.value = inviteUrl;
      
      if (elements.qrcodeContainer) {
        elements.qrcodeContainer.innerHTML = '';
        new QRCode(elements.qrcodeContainer, {
          text: inviteUrl,
          width: 200,
          height: 200,
          colorDark : "#000000",
          colorLight : "#ffffff",
          correctLevel : QRCode.CorrectLevel.H
        });
      }
      
      if (elements.inviteModal) elements.inviteModal.classList.remove('hidden');
    });
  }

  if (elements.btnCloseInvite) {
    elements.btnCloseInvite.addEventListener('click', () => {
      if (elements.inviteModal) elements.inviteModal.classList.add('hidden');
    });
  }

  if (elements.btnCopyLink) {
    elements.btnCopyLink.addEventListener('click', () => {
      if (elements.inviteLinkInput) {
        elements.inviteLinkInput.select();
        document.execCommand('copy');
        elements.btnCopyLink.textContent = 'Copied!';
        setTimeout(() => {
          elements.btnCopyLink.textContent = 'Copy Link';
        }, 2000);
      }
    });
  }

  // Chat Submission
  if (elements.chatForm) {
    elements.chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = elements.chatInput.value.trim();
      if (!msg) return;

      await appendMessage('user', msg);
      elements.chatInput.value = '';
      elements.chatInput.disabled = true;
      
      const context = {
        partnerA: state.partnerA,
        partnerB: state.partnerB,
        combinedIncome: state.income,
        currency: state.currency,
        savingsRate: state.savingsRate,
        goals: state.goals.map(g => ({
          name: g.name, 
          target: g.target, 
          saved: g.savedA + g.savedB,
          deadline: g.deadline
        }))
      };

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, context, history: state.chatHistory })
        });
        
        const data = await res.json();
        if (data.reply) {
          await appendMessage('tara', data.reply);
        } else if (data.error) {
          await appendMessage('tara', `⚠️ Error: ${data.error}`);
        }
      } catch (err) {
        await appendMessage('tara', "Sorry, I couldn't connect right now. Make sure my server is running!");
      } finally {
        elements.chatInput.disabled = false;
        elements.chatInput.focus();
      }
    });
  }

  // Currency Converter
  if (elements.btnSwapCurrency) {
    elements.btnSwapCurrency.addEventListener('click', () => {
      const fromSel = document.getElementById('convert-from');
      const toSel = document.getElementById('convert-to');
      if(fromSel && toSel) {
        const temp = fromSel.value;
        fromSel.value = toSel.value;
        toSel.value = temp;
      }
    });
  }

  if (elements.btnConvert) {
    elements.btnConvert.addEventListener('click', async () => {
      const amountEl = document.getElementById('convert-amount');
      const fromEl = document.getElementById('convert-from');
      const toEl = document.getElementById('convert-to');
      if(!amountEl || !fromEl || !toEl) return;

      const amount = Number(amountEl.value);
      const from = fromEl.value;
      const to = toEl.value;
      
      const btn = elements.btnConvert;
      btn.innerHTML = 'Converting...';
      btn.disabled = true;

      try {
        const res = await fetch(`/api/exchange-rate?base=${from}&target=${to}`);
        const data = await res.json();
        
        if (data.rate) {
          const converted = amount * data.rate;
          if(elements.resultAmount) elements.resultAmount.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: to }).format(converted);
          if(elements.resultRate) elements.resultRate.textContent = `1 ${from} = ${data.rate.toFixed(4)} ${to}`;
          if(elements.converterResult) elements.converterResult.style.display = 'block';
        }
      } catch (err) {
        alert("Failed to fetch exchange rate.");
      } finally {
        btn.innerHTML = 'Convert';
        btn.disabled = false;
      }
    });
  }
};

// --- RENDER LOGIC ---

// Simple markdown parser for bold, italic, lists inside chat
const parseMarkdown = (text) => {
  if(!text) return '';
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n- (.*?)(?=\n|$)/g, '<ul><li>$1</li></ul>');
  html = html.replace(/<\/ul><ul>/g, ''); // merge lists
  return `<p>${html}</p>`;
};

const appendMessage = async (role, content) => {
  if(!elements.chatMessages) return;
  
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  div.innerHTML = `<div class="bubble-content">${role === 'user' ? content : parseMarkdown(content)}</div>`;
  elements.chatMessages.appendChild(div);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  
  state.chatHistory.push({ role: role === 'tara' ? 'assistant' : 'user', content });
  // Keep history short for local storage
  if (state.chatHistory.length > 10) state.chatHistory.shift();
  await saveState();
};

const openContributeModal = (goalId) => {
  const goalIdEl = document.getElementById('contribute-goal-id');
  const select = document.getElementById('contribute-partner');
  if(goalIdEl) goalIdEl.value = goalId;
  if(select && select.options.length >= 2) {
    select.options[0].text = state.partnerA;
    select.options[1].text = state.partnerB;
  }
  if(elements.contributeModal) elements.contributeModal.classList.remove('hidden');
};

const renderGoals = () => {
  const renderContainer = (container, goalsList, emptyMsg, isHistory = false) => {
    if(!container) return;

    if (goalsList.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <span class="empty-emoji">${isHistory ? '🏆' : '🎯'}</span>
        <p>${emptyMsg}</p>
        ${!isHistory && container.id === 'goals-preview' ? '<button class="btn-primary sm" id="btn-first-goal">Create Goal</button>' : ''}
      </div>`;
      return;
    }

    container.innerHTML = goalsList.map(goal => {
      const totalSaved = goal.savedA + goal.savedB;
      const progressPercent = Math.min(100, (totalSaved / goal.target) * 100);
      
      const percentA = totalSaved === 0 ? 0 : (goal.savedA / totalSaved) * 100;
      const percentB = totalSaved === 0 ? 0 : (goal.savedB / totalSaved) * 100;

      const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      const deadlineText = isHistory ? 'Goal Completed' : (daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed');
      
      const coverStyle = goal.coverUrl ? `background-image: url('${goal.coverUrl}')` : '';

      const actionButtons = isHistory 
        ? `<div class="goal-badge" style="color: var(--teal-500); font-weight: 600; margin-bottom: 0.5rem; width: 100%;">🎉 Goal Achieved!</div>
           <button class="btn-outline sm btn-delete-goal" data-action="delete" data-id="${goal.id}" style="color: var(--rose-500); border-color: var(--rose-500);">Delete</button>`
        : `<button class="btn-primary sm btn-contribute" data-id="${goal.id}">Add Funds</button>
           <button class="btn-outline sm btn-complete-goal" data-action="complete" data-id="${goal.id}" style="color: var(--teal-500); border-color: var(--teal-500);">Complete</button>
           <button class="btn-outline sm btn-edit-goal" data-action="edit" data-id="${goal.id}">Edit</button>
           <button class="btn-outline sm btn-delete-goal" data-action="delete" data-id="${goal.id}" style="color: var(--rose-500); border-color: var(--rose-500);">Delete</button>`;

      return `
        <div class="goal-card">
          <div class="goal-cover" style="${coverStyle}"></div>
          <div class="goal-content">
            <h3 class="goal-title">${goal.name}</h3>
            <div class="goal-meta">
              <span>Target: ${formatMoney(goal.target)}</span>
              <span>${deadlineText}</span>
            </div>
            
            <div class="goal-progress">
              <div class="progress-header">
                <span>${formatMoney(totalSaved)} saved</span>
                <span>${progressPercent.toFixed(1)}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill-a" style="width: ${progressPercent * (percentA/100)}%"></div>
                <div class="progress-fill-b" style="width: ${progressPercent * (percentB/100)}%"></div>
              </div>
              <div class="partner-contributions">
                <span class="partner-a-label">${state.partnerA}: ${formatMoney(goal.savedA)}</span>
                <span class="partner-b-label">${state.partnerB}: ${formatMoney(goal.savedB)}</span>
              </div>
            </div>
            
            <div class="goal-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              ${actionButtons}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners
    if (!isHistory) {
      container.querySelectorAll('.btn-contribute').forEach(btn => {
        btn.addEventListener('click', (e) => {
          openContributeModal(e.target.dataset.id);
        });
      });

      container.querySelectorAll('.btn-complete-goal').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm("Mark this goal as completed? It will be moved to your Achievements tab.")) {
            const goal = state.goals.find(g => g.id === id);
            if (goal) goal.status = 'completed';
            await saveState();
            updateUI();
          }
        });
      });

      container.querySelectorAll('.btn-edit-goal').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const goal = state.goals.find(g => g.id === id);
          if (goal) {
            const editGoalId = document.getElementById('edit-goal-id');
            if (editGoalId) editGoalId.value = goal.id;
            document.getElementById('goal-name').value = goal.name;
            document.getElementById('goal-target').value = goal.target;
            document.getElementById('goal-deadline').value = goal.deadline;
            
            if (elements.splitSlider) elements.splitSlider.value = goal.splitA;
            if (elements.splitLabelA) elements.splitLabelA.textContent = `${goal.splitA}%`;
            if (elements.splitLabelB) elements.splitLabelB.textContent = `${goal.splitB}%`;
            
            if (elements.goalModal) elements.goalModal.classList.remove('hidden');
          }
        });
      });
    }

    container.querySelectorAll('.btn-delete-goal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm("Remove this goal? All contributions will be lost.")) {
          state.goals = state.goals.filter(g => g.id !== id);
          await saveState();
          updateUI();
        }
      });
    });
  };

  const activeGoals = state.goals.filter(g => g.status === 'active');
  const completedGoals = state.goals.filter(g => g.status === 'completed');

  renderContainer(elements.goalsPreview, activeGoals, 'No goals yet. Start by creating your first shared goal!');
  renderContainer(elements.goalsList, activeGoals, 'Create your first shared goal and start saving together!');
  renderContainer(elements.historyList, completedGoals, 'Your completed goals will appear here. Keep saving!', true);
};

const updateUI = () => {
  // Update Labels
  const coupleText = `${state.partnerA} & ${state.partnerB}`;
  if(elements.coupleLabel) elements.coupleLabel.textContent = coupleText;
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  if(elements.greetingText) elements.greetingText.textContent = `${greeting}, ${coupleText}! 👋`;

  // Stats Dashboard
  const totalSavedAll = state.goals.reduce((acc, g) => acc + g.savedA + g.savedB, 0);
  if(elements.statGoals) elements.statGoals.textContent = state.goals.length;
  if(elements.statSaved) elements.statSaved.textContent = formatMoney(totalSavedAll);
  if(elements.statIncome) elements.statIncome.textContent = formatMoney(state.income);
  if(elements.statRate) elements.statRate.textContent = `${state.savingsRate}%`;

  // Render Goals
  renderGoals();
};

// Start the app
init();
