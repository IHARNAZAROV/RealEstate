"use strict";

/* =============================================================
   ЯНДЕКС ДИРЕКТ API - MAIN SCRIPT
============================================================= */

const DirectAPI = (function () {
  // =========================================================
  // STATE
  // =========================================================
  let state = {
    isAuthenticated: false,
    credentials: null,
    campaigns: [],
    allCampaigns: [],
    currentData: null,
    filters: {
      period: 1,
      dateFrom: null,
      dateTo: null,
      device: 'all',
      campaign: '',
      campaignScope: 'all_except_archived'
    },
    sortBy: 'name',
    sortDir: 'asc',
    searchQuery: ''
  };

  const CONFIG_KEY = 'directApiConfig';
  const CACHE_KEY = 'directApiCache';
  let campaignsRequestController = null;
  let campaignsRequestSeq = 0;
  let searchDebounceTimer = null;
  let campaignRowDelegationBound = false;

  const currencyFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'BYN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  const numberFormatter = new Intl.NumberFormat('ru-RU');

  // =========================================================
  // INITIALIZATION
  // =========================================================
  function init() {
    loadConfig();
    populateCredentialFields();
    setupEventListeners();
    initializeInstructions();
    handleOAuthCallback();
    syncInitialFiltersFromUI();
    
    if (state.isAuthenticated && state.credentials?.token) {
      showAnalytics();
      loadData();
    } else {
      showInstructions();
    }
  }

  // =========================================================
  // CONFIG MANAGEMENT
  // =========================================================
  function loadConfig() {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        state.credentials = config;
        state.isAuthenticated = !!(config.token && config.login);
      }
    } catch (e) {
      console.error('Error loading config:', e);
    }
  }

  function syncInitialFiltersFromUI() {
    const periodFilter = document.getElementById('periodFilter');
    if (!periodFilter) return;

    if (periodFilter.value === 'custom') {
      return;
    }

    const parsed = parseInt(periodFilter.value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      state.filters.period = parsed;
    }
  }

  function populateCredentialFields() {
    if (!state.credentials) return;

    const clientIdInput = document.getElementById('clientId');
    const clientSecretInput = document.getElementById('clientSecret');
    const accountLoginInput = document.getElementById('accountLogin');

    if (clientIdInput && state.credentials.clientId) {
      clientIdInput.value = state.credentials.clientId;
    }
    if (clientSecretInput && state.credentials.clientSecret) {
      clientSecretInput.value = state.credentials.clientSecret;
    }
    if (accountLoginInput && state.credentials.login && state.credentials.login !== 'unknown') {
      accountLoginInput.value = state.credentials.login;
    }
  }

  function saveConfig(credentials) {
    try {
      state.credentials = credentials;
      state.isAuthenticated = !!(credentials.token && credentials.login);
      localStorage.setItem(CONFIG_KEY, JSON.stringify(credentials));
      updateStatusCard();
      
      // Only show analytics if we have a token
      if (state.isAuthenticated) {
        showAnalytics();
        loadData();
        showNotification('Подключено к Яндекс Директ');
      } else {
        showNotification('Учетные данные сохранены');
      }
    } catch (e) {
      showError('Ошибка при сохранении конфигурации');
      console.error(e);
    }
  }

  function saveCredentials() {
    const clientId = document.getElementById('clientId').value.trim();
    const clientSecret = document.getElementById('clientSecret').value.trim();
    const accountLogin = document.getElementById('accountLogin').value.trim();

    if (!clientId || !clientSecret) {
      showError('Заполните Client ID и Client Secret');
      return;
    }

    // In production, exchange code for token via backend
    // For now, we'll create a placeholder that will be filled by user
    const credentials = {
      clientId,
      clientSecret,
      login: accountLogin || '',
      token: null,
      lastSync: null
    };

    saveConfig(credentials);
    
    if (credentials.token) {
      // Already have token, show analytics
      showAnalytics();
      loadData();
    } else {
      // Need to complete oauth flow
      updateStatusCard();
    }
  }

  // =========================================================
  // UI UPDATES
  // =========================================================
  function updateStatusCard() {
    const statusCard = document.getElementById('statusCard');
    
    if (!state.isAuthenticated || !state.credentials?.token) {
      // Not authenticated yet
      if (state.credentials?.clientId && state.credentials?.clientSecret) {
        // Have credentials, show authorize button
        statusCard.innerHTML = `
          <div class="status-icon">🔐</div>
          <div class="status-content">
            <h3>Статус подключения</h3>
            <p>Учетные данные сохранены. Нажмите для авторизации.</p>
            <button class="btn-primary" id="authorizeBtn">
              🔗 Авторизоваться
            </button>
          </div>
        `;
        // Add event listener
        const authorizeBtn = document.getElementById('authorizeBtn');
        if (authorizeBtn) {
          authorizeBtn.addEventListener('click', initiateOAuthFlow);
        }
      } else {
        // No credentials yet
        statusCard.innerHTML = `
          <div class="status-icon">🔌</div>
          <div class="status-content">
            <h3>Статус подключения</h3>
            <p>Яндекс Директ не подключен</p>
            <button class="btn-primary" id="connectBtn">
              Подключить
            </button>
          </div>
        `;
        // Ensure connect button listener is set
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
          connectBtn.addEventListener('click', showAuthForm);
        }
      }
    } else {
      // Authenticated with token
      const lastSync = state.credentials.lastSync 
        ? new Date(state.credentials.lastSync).toLocaleString('ru-RU')
        : 'Никогда';
      
      statusCard.innerHTML = `
        <div class="status-icon">✅</div>
        <div class="status-content">
          <h3>Статус подключения</h3>
          <div class="status-details">
            <div class="status-item">
              <span class="label">Статус:</span>
              <span class="value">Подключено</span>
            </div>
            <div class="status-item">
              <span class="label">Логин кабинета:</span>
              <span class="value">${state.credentials.login}</span>
            </div>
            <div class="status-item">
              <span class="label">Последнее обновление:</span>
              <span class="value">${lastSync}</span>
            </div>
          </div>
        </div>
        <button class="btn-secondary" id="disconnectBtn">
            Отключить
        </button>
      `;
      // Add event listener
      const disconnectBtn = document.getElementById('disconnectBtn');
      if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnect);
      }
    }
  }

  function showAnalytics() {
    document.getElementById('statusSection').style.display = 'block';
    document.getElementById('analyticsSection').style.display = 'block';
    document.getElementById('instructionsSection').style.display = 'none';
    updateStatusCard();
  }

  function showInstructions() {
    document.getElementById('statusSection').style.display = 'block';
    document.getElementById('analyticsSection').style.display = 'none';
    document.getElementById('instructionsSection').style.display = 'block';
    
    // Auto-expand instructions if no auth
    const instructionsCard = document.querySelector('.instructions-card');
    if (instructionsCard && !state.isAuthenticated) {
      instructionsCard.classList.add('expanded');
    }
  }

  function showAuthForm() {
    const instructionsCard = document.querySelector('.instructions-card');
    instructionsCard.classList.add('expanded');
    document.getElementById('clientId').focus();
  }

  function initiateOAuthFlow() {
    const clientId = document.getElementById('clientId').value.trim() || state.credentials?.clientId || '';
    
    if (!clientId) {
      showError('Сначала введите и сохраните Client ID');
      return;
    }

    // Generate authorization URL
    const redirectUri = encodeURIComponent('https://oauth.yandex.ru/verification_code');
    const authUrl = `https://oauth.yandex.ru/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`;
    
    // Redirect to OAuth server
    window.location.href = authUrl;
  }

  function handleOAuthCallback() {
    // Check if we have authorization code in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      showError(`Ошибка авторизации: ${error}`);
      return;
    }

    if (code) {
      // Exchange code for token
      const clientId = document.getElementById('clientId').value.trim() || state.credentials?.clientId || '';
      const clientSecret = document.getElementById('clientSecret').value.trim() || state.credentials?.clientSecret || '';

      if (!clientId || !clientSecret) {
        showError('Введите Client ID и Client Secret');
        return;
      }

      exchangeCodeForToken(code, clientId, clientSecret);
    }
  }

  async function exchangeCodeForToken(code, clientId, clientSecret) {
    try {
      const response = await fetch('/adminka_objects/api-direct.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'exchangeCode',
          code,
          clientId,
          clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        showError(data.error || 'Ошибка при получении токена');
        return;
      }

      // Save token even if credentials were not explicitly saved before
      const loginFromInput = document.getElementById('accountLogin')?.value.trim() || '';
      const nextCredentials = state.credentials || {
        clientId,
        clientSecret,
        login: loginFromInput,
        token: null,
        lastSync: null
      };

      nextCredentials.clientId = clientId;
      nextCredentials.clientSecret = clientSecret;
      if (!nextCredentials.login && loginFromInput) {
        nextCredentials.login = loginFromInput;
      }
      nextCredentials.token = data.data.token;
      nextCredentials.lastSync = new Date().toISOString();

      saveConfig(nextCredentials);
      showAnalytics();
      loadData();
      showNotification('Успешно подключено к Яндекс Директ');

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error) {
      showError(`Ошибка: ${error.message}`);
      console.error(error);
    }
  }

  function submitVerificationCode() {
    const verificationCode = document.getElementById('verificationCode').value.trim();
    const clientId = document.getElementById('clientId').value.trim() || state.credentials?.clientId || '';
    const clientSecret = document.getElementById('clientSecret').value.trim() || state.credentials?.clientSecret || '';

    if (!verificationCode) {
      showError('Введите код подтверждения');
      return;
    }

    if (!clientId || !clientSecret) {
      showError('Сначала сохраните Client ID и Client Secret');
      return;
    }

    // Exchange verification code for token
    exchangeCodeForToken(verificationCode, clientId, clientSecret);

    // Clear the verification code field
    document.getElementById('verificationCode').value = '';
  }

  // =========================================================
  // DATA LOADING AND CACHING
  // =========================================================
  async function loadData() {
    if (!state.credentials?.token) {
      showError('Требуется авторизация');
      return;
    }

    if (campaignsRequestController) {
      campaignsRequestController.abort();
    }
    campaignsRequestController = new AbortController();
    const requestId = ++campaignsRequestSeq;

    try {
      // Show loading state
      document.getElementById('campaignsTableBody').innerHTML = 
        '<tr class="empty-row"><td colspan="5">Загрузка данных...</td></tr>';

      // Call backend API
      const response = await fetch('/adminka_objects/api-direct.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getCampaigns',
          token: state.credentials.token,
          login: state.credentials.login,
          filters: state.filters
        }),
        signal: campaignsRequestController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (requestId !== campaignsRequestSeq) {
        return;
      }

      if (!data.success) {
        showError(data.error || 'Ошибка при загрузке данных');
        return;
      }

      state.currentData = data.data;

      const campaignsFromResponse = data.data.campaigns || [];
      if (state.filters.campaign) {
        state.campaigns = state.allCampaigns.length ? [...state.allCampaigns] : campaignsFromResponse;
      } else {
        state.allCampaigns = [...campaignsFromResponse];
        state.campaigns = [...campaignsFromResponse];
      }
      
      // Update UI
      updateStatsCards();
      renderCampaignsTable();
      updateAnalyticsCards();
      updateCampaignFilter();

      // Update last sync time
      if (state.credentials) {
        state.credentials.lastSync = new Date().toISOString();
        localStorage.setItem(CONFIG_KEY, JSON.stringify(state.credentials));
      }

      showNotification('Данные обновлены');
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      showError(`Ошибка: ${error.message}`);
      console.error(error);
    } finally {
      if (requestId === campaignsRequestSeq) {
        campaignsRequestController = null;
      }
    }
  }

  // =========================================================
  // STATS CARDS UPDATE
  // =========================================================
  function updateStatsCards() {
    if (!state.currentData) return;

    const data = state.currentData;

    // Total spent
    const totalSpent = formatCurrency(data.totalCost);
    document.getElementById('totalSpent').textContent = totalSpent;
    updateChangeDiv('totalSpentChange', data.costChange);

    // Total clicks
    const totalClicks = formatNumber(data.totalClicks);
    document.getElementById('totalClicks').textContent = totalClicks;
    updateChangeDiv('totalClicksChange', data.clicksChange);

    // Total impressions
    const totalImpressions = formatNumber(data.totalImpressions);
    document.getElementById('totalImpressions').textContent = totalImpressions;
    updateChangeDiv('totalImpressionsChange', data.impressionsChange);

    // Average CTR
    const avgCtr = data.avgCtr.toFixed(2) + '%';
    document.getElementById('avgCtr').textContent = avgCtr;
    updateChangeDiv('avgCtrChange', data.ctrChange);

    const avgCpc = typeof data.avgCpc === 'number' ? formatCurrency(data.avgCpc) : '—';
    const cpm = typeof data.cpm === 'number' ? `${data.cpm.toFixed(2)} BYN` : '—';
    document.getElementById('avgCpc').textContent = avgCpc;
    document.getElementById('cpmValue').textContent = cpm;

    const activeCount = data.statusCounts?.ON ?? 0;
    document.getElementById('activeCampaignsCount').textContent = formatNumber(activeCount);

    renderBreakdown('technicalBreakdown', data.breakdowns?.technical, 'Устройства');
    renderBreakdown('technicalOsBreakdown', data.breakdowns?.technicalOs, 'Операционные системы');
    renderBreakdown('demographyBreakdown', data.breakdowns?.demography, 'Возраст');
    renderBreakdown('demographyGenderBreakdown', data.breakdowns?.demographyGender, 'Пол');
    renderBreakdown('geographyBreakdown', data.breakdowns?.geography, 'Регион');
    renderBreakdown('trafficSourcesBreakdown', data.breakdowns?.trafficSources, 'Источники трафика');
  }


  function formatTechnicalLabel(rawLabel) {
    const normalized = String(rawLabel || '').trim().toUpperCase();
    const labels = {
      MOBILE: 'Мобильные устройства',
      DESKTOP: 'Компьютеры',
      TABLET: 'Планшеты',
      SMART_TV: 'Смарт-ТВ',
      UNKNOWN: 'Не определено'
    };

    return labels[normalized] || rawLabel || 'Не определено';
  }

  function formatOperatingSystemLabel(rawLabel) {
    const normalized = String(rawLabel || '').trim().toUpperCase();
    const labels = {
      ANDROID: 'Android',
      IOS: 'iOS',
      WINDOWS_PHONE: 'Windows Phone',
      WINDOWS: 'Windows',
      MACOS: 'macOS',
      LINUX: 'Linux',
      OTHER: 'Другая ОС',
      UNKNOWN: 'Не определено'
    };

    return labels[normalized] || rawLabel || 'Не определено';
  }

  function formatAgeLabel(rawLabel) {
    const normalized = String(rawLabel || '').trim().toUpperCase();
    const labels = {
      AGE_0_17: 'До 18 лет',
      AGE_18_24: '18–24 года',
      AGE_25_34: '25–34 года',
      AGE_35_44: '35–44 года',
      AGE_45_54: '45–54 года',
      AGE_55: '55 лет и старше',
      UNKNOWN: 'Возраст не определён'
    };

    return labels[normalized] || rawLabel || 'Не определено';
  }

  function formatGenderLabel(rawLabel) {
    const normalized = String(rawLabel || '').trim().toUpperCase();
    const labels = {
      GENDER_MALE: 'Мужчины',
      GENDER_FEMALE: 'Женщины',
      MALE: 'Мужчины',
      FEMALE: 'Женщины',
      UNKNOWN: 'Пол не определён'
    };

    return labels[normalized] || rawLabel || 'Не определено';
  }

  function formatTrafficSourceLabel(rawLabel) {
    const normalized = String(rawLabel || '').trim().toUpperCase();
    const labels = {
      AD_NETWORK: 'Переходы по рекламе',
      AD: 'Переходы по рекламе',
      ADVERTISING: 'Переходы по рекламе',
      ORGANIC: 'Переходы из поисковых систем',
      SEARCH: 'Переходы из поисковых систем'
    };

    return labels[normalized] || rawLabel || 'Не определено';
  }

  function humanizeBreakdownLabel(containerId, label) {
    if (containerId === 'technicalBreakdown') {
      return formatTechnicalLabel(label);
    }

    if (containerId === 'technicalOsBreakdown') {
      return formatOperatingSystemLabel(label);
    }

    if (containerId === 'demographyBreakdown') {
      return formatAgeLabel(label);
    }

    if (containerId === 'demographyGenderBreakdown') {
      return formatGenderLabel(label);
    }

    if (containerId === 'trafficSourcesBreakdown') {
      return formatTrafficSourceLabel(label);
    }

    return label || 'Не определено';
  }

  function renderBreakdown(containerId, items, fallbackTitle) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = `<div class="insight-empty">${fallbackTitle}: нет данных в текущем отчёте</div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="insight-row">
        <strong>${escapeHtml(humanizeBreakdownLabel(containerId, item.label))}</strong>
        <span>${formatNumber(item.impressions || 0)} показов</span>
        <span>${formatNumber(item.clicks || 0)} кликов</span>
        <span>${formatCurrency(Number(item.cost || 0))}</span>
      </div>
    `).join('');
  }

  function updateChangeDiv(elementId, changePercent) {
    const el = document.getElementById(elementId);
    if (!changePercent) {
      el.textContent = '';
      return;
    }

    const isPositive = changePercent > 0;
    const sign = isPositive ? '+' : '';
    
    el.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
    el.textContent = `${sign}${changePercent.toFixed(1)}%`;
  }

  // =========================================================
  // CAMPAIGNS TABLE
  // =========================================================
  function renderCampaignsTable() {
    const tbody = document.getElementById('campaignsTableBody');

    if (!state.campaigns || state.campaigns.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Нет данных</td></tr>';
      return;
    }

    let filtered = [...state.campaigns];

    // Filter by search
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(query));
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[state.sortBy];
      let bVal = b[state.sortBy];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (state.sortDir === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    tbody.innerHTML = filtered.map(campaign => {
      const isSelected = state.filters.campaign && state.filters.campaign === String(campaign.id);

      return `
      <tr class="campaign-row ${isSelected ? 'campaign-row--selected' : ''}" data-campaign-id="${campaign.id}" tabindex="0" role="button" aria-label="Фильтровать по кампании ${escapeHtml(campaign.name)}">
        <td>${escapeHtml(campaign.name)}</td>
        <td>${formatNumber(campaign.impressions)}</td>
        <td>${formatNumber(campaign.clicks)}</td>
        <td>${campaign.ctr.toFixed(2)}%</td>
        <td>${formatCurrency(campaign.cost)}</td>
      </tr>
    `;
    }).join('');

  }


  function setCampaignFilterAndReload(campaignId) {
    state.filters.campaign = campaignId;

    const campaignSelect = document.getElementById('campaignFilter');
    if (campaignSelect) {
      campaignSelect.value = campaignId;
    }

    loadData();
  }

  function setupCampaignRowDelegation() {
    if (campaignRowDelegationBound) return;

    const tbody = document.getElementById('campaignsTableBody');
    if (!tbody) return;

    campaignRowDelegationBound = true;

    tbody.addEventListener('click', (event) => {
      const row = event.target.closest('tr[data-campaign-id]');
      if (!row || !tbody.contains(row)) return;

      const campaignId = row.getAttribute('data-campaign-id') || '';
      setCampaignFilterAndReload(campaignId);
    });

    tbody.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const row = event.target.closest('tr[data-campaign-id]');
      if (!row || !tbody.contains(row)) return;

      event.preventDefault();
      const campaignId = row.getAttribute('data-campaign-id') || '';
      setCampaignFilterAndReload(campaignId);
    });
  }

  function updateCampaignFilter() {
    const select = document.getElementById('campaignFilter');
    const currentValue = state.filters.campaign || select.value;

    const options = ['<option value="">Все кампании</option>'];
    if (state.allCampaigns) {
      state.allCampaigns.forEach(c => {
        options.push(`<option value="${c.id}">${escapeHtml(c.name)}</option>`);
      });
    }

    select.innerHTML = options.join('');
    select.value = currentValue;
  }

  // =========================================================
  // ANALYTICS CARDS
  // =========================================================
  function updateAnalyticsCards() {
    if (!state.campaigns || state.campaigns.length === 0) {
      return;
    }

    // Most expensive
    const mostExpensive = [...state.campaigns].sort((a, b) => b.cost - a.cost)[0];
    if (mostExpensive) {
      document.getElementById('mostExpensiveCampaign').textContent = escapeHtml(mostExpensive.name);
      document.getElementById('mostExpensiveCost').textContent = formatCurrency(mostExpensive.cost);
    }

    // Best CTR
    const bestCtr = [...state.campaigns].sort((a, b) => b.ctr - a.ctr)[0];
    if (bestCtr) {
      document.getElementById('bestCtrCampaign').textContent = escapeHtml(bestCtr.name);
      document.getElementById('bestCtrValue').textContent = bestCtr.ctr.toFixed(2) + '%';
    }

    // Most clicks
    const mostClicks = [...state.campaigns].sort((a, b) => b.clicks - a.clicks)[0];
    if (mostClicks) {
      document.getElementById('mostClicksCampaign').textContent = escapeHtml(mostClicks.name);
      document.getElementById('mostClicksCount').textContent = formatNumber(mostClicks.clicks) + ' кликов';
    }

    // Worst performing (lowest CTR)
    const worstPerforming = [...state.campaigns].sort((a, b) => a.ctr - b.ctr)[0];
    if (worstPerforming) {
      document.getElementById('worstPerformingCampaign').textContent = escapeHtml(worstPerforming.name);
      document.getElementById('worstPerformingDetail').textContent = worstPerforming.ctr.toFixed(2) + '% CTR';
    }
  }

  // =========================================================
  // FILTERS AND SEARCH
  // =========================================================
  function handlePeriodChange() {
    const value = document.getElementById('periodFilter').value;
    const customRange = document.getElementById('customDateRange');

    if (value === 'custom') {
      customRange.style.display = 'flex';
    } else {
      customRange.style.display = 'none';
      state.filters.period = parseInt(value);
      state.filters.dateFrom = null;
      state.filters.dateTo = null;
      loadData();
    }
  }

  function handleCustomDateRange() {
    const from = document.getElementById('dateFrom').value;
    const to = document.getElementById('dateTo').value;

    if (!from || !to) {
      showError('Укажите обе даты');
      return;
    }

    state.filters.dateFrom = from;
    state.filters.dateTo = to;
    state.filters.period = null;
    loadData();
  }

  function handleFilterChange() {
    const device = document.getElementById('deviceFilter').value;
    const campaign = document.getElementById('campaignFilter').value;
    const previousCampaign = state.filters.campaign;

    state.filters.device = device;
    state.filters.campaign = campaign;

    if (previousCampaign !== campaign) {
      loadData();
      return;
    }

    // Re-render table with new filters
    renderCampaignsTable();
  }

  function handleCampaignScopeChange() {
    const campaignScope = document.getElementById('campaignScopeFilter').value;
    state.filters.campaignScope = campaignScope || 'all_except_archived';
    loadData();
  }

  function setupSearchListener() {
    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const nextValue = e.target.value;
        if (searchDebounceTimer) {
          clearTimeout(searchDebounceTimer);
        }
        searchDebounceTimer = setTimeout(() => {
          state.searchQuery = nextValue;
          renderCampaignsTable();
          searchDebounceTimer = null;
        }, 200);
      });
    }
  }

  function sortTable(column) {
    if (state.sortBy === column) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortBy = column;
      state.sortDir = 'asc';
    }
    renderCampaignsTable();
  }

  function refreshData() {
    loadData();
  }

  // =========================================================
  // DISCONNECT
  // =========================================================
  function disconnect() {
    if (!confirm('Вы уверены? Эта кабина будет отключена.')) {
      return;
    }

    if (campaignsRequestController) {
      campaignsRequestController.abort();
      campaignsRequestController = null;
    }
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }

    state.isAuthenticated = false;
    state.credentials = null;
    state.campaigns = [];
    state.allCampaigns = [];
    state.currentData = null;
    localStorage.removeItem(CONFIG_KEY);
    
    showInstructions();
    document.getElementById('clientId').value = '';
    document.getElementById('clientSecret').value = '';
    document.getElementById('accountLogin').value = '';
    
    showNotification('Отключено от Яндекс Директ');
  }

  // =========================================================
  // ERROR AND NOTIFICATION HANDLING
  // =========================================================
  function showError(message) {
    const container = document.getElementById('errorContainer');
    
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `
      <span>⚠️ ${escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(errorEl);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorEl.remove();
    }, 5000);
  }

  function showNotification(message) {
    const notif = document.getElementById('notification');
    notif.textContent = '✓ ' + message;
    notif.classList.add('show');

    setTimeout(() => {
      notif.classList.remove('show');
    }, 3000);
  }

  // =========================================================
  // UTILITIES
  // =========================================================
  function formatCurrency(value) {
    if (typeof value !== 'number') return '—';
    return currencyFormatter.format(value);
  }

  function formatNumber(value) {
    if (typeof value !== 'number') return '—';
    return numberFormatter.format(value);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function initializeInstructions() {
    const header = document.querySelector('.instructions-header');
    if (header) {
      header.addEventListener('click', function() {
        this.parentElement.classList.toggle('expanded');
      });
    }
  }

  function setupEventListeners() {
    setupCampaignRowDelegation();
    setupSearchListener();

    // Period filter change
    const periodFilter = document.getElementById('periodFilter');
    if (periodFilter) {
      periodFilter.addEventListener('change', handlePeriodChange);
    }

    const saveCredsBtn = document.querySelector('[data-action="save-credentials"]');
    if (saveCredsBtn) {
      saveCredsBtn.addEventListener('click', saveCredentials);
    }

    const submitVerificationBtn = document.querySelector('[data-action="submit-verification-code"]');
    if (submitVerificationBtn) {
      submitVerificationBtn.addEventListener('click', submitVerificationCode);
    }

    const applyDateRangeBtn = document.querySelector('[data-action="apply-date-range"]');
    if (applyDateRangeBtn) {
      applyDateRangeBtn.addEventListener('click', handleCustomDateRange);
    }

    const refreshBtn = document.querySelector('[data-action="refresh-data"]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refreshData);
    }

    const deviceSelect = document.getElementById('deviceFilter');
    if (deviceSelect) {
      deviceSelect.addEventListener('change', handleFilterChange);
    }

    const campaignSelect = document.getElementById('campaignFilter');
    if (campaignSelect) {
      campaignSelect.addEventListener('change', handleFilterChange);
    }

    const campaignScopeSelect = document.getElementById('campaignScopeFilter');
    if (campaignScopeSelect) {
      campaignScopeSelect.value = state.filters.campaignScope || 'all_except_archived';
      campaignScopeSelect.addEventListener('change', handleCampaignScopeChange);
    }

    // Table header clicks for sorting
    document.querySelectorAll('.campaigns-table th[data-sort]').forEach(th => {
      th.addEventListener('click', function() {
        const column = this.getAttribute('data-sort');
        if (column) {
          sortTable(column);
        }
      });
    });
  }

// =========================================================
// PUBLIC API
// =========================================================
  return {
    init,
    saveCredentials,
    showAuthForm,
    disconnect,
    handlePeriodChange,
    handleCampaignScopeChange,
    handleCustomDateRange,
    handleFilterChange,
    sortTable,
    refreshData,
    loadData,
    updateStatusCard,
    initiateOAuthFlow
  };
})();

// Make DirectAPI available globally
window.DirectAPI = DirectAPI;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  DirectAPI.init();
});
