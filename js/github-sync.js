// GitHub Sync & Data Persistence Manager for CheckDan
class GitHubSyncManager {
  constructor() {
    this.storageKey = 'checkdan_checkpoints_v1';
    this.configKey = 'checkdan_github_config_v1';
    this.defaultConfig = {
      owner: '',
      repo: '',
      branch: 'main',
      filePath: 'data/checkpoints.json',
      token: ''
    };
  }

  getConfig() {
    try {
      const saved = localStorage.getItem(this.configKey);
      return saved ? { ...this.defaultConfig, ...JSON.parse(saved) } : { ...this.defaultConfig };
    } catch (e) {
      return { ...this.defaultConfig };
    }
  }

  saveConfig(config) {
    localStorage.setItem(this.configKey, JSON.stringify(config));
  }

  // Load checkpoints:
  // 1. Check if user configured a remote GitHub repo
  // 2. Fetch fresh data/checkpoints.json with cache buster to ensure real-time up-to-date data
  // 3. Merge with any local user-created checkpoints from localStorage
  // 4. Fallback to localStorage cache or window.INITIAL_CHECKPOINTS
  async loadCheckpoints(forceRemote = false) {
    const config = this.getConfig();

    // Try remote GitHub Raw if configured
    if (config.owner && config.repo) {
      const rawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch || 'main'}/${config.filePath || 'data/checkpoints.json'}?t=${Date.now()}`;
      try {
        const res = await fetch(rawUrl);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            console.log('Loaded from GitHub Raw:', rawUrl);
            const merged = this.mergeWithLocalUserReports(data);
            this.saveLocalCache(merged);
            return merged;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch from GitHub Raw, falling back to local:', err);
      }
    }

    // Always fetch fresh local data/checkpoints.json to ensure data is up to date
    try {
      const res = await fetch(`data/checkpoints.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const merged = this.mergeWithLocalUserReports(data);
          this.saveLocalCache(merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('Could not fetch data/checkpoints.json directly (likely offline or file://):', err);
    }

    // Fallback to localStorage cache
    const cached = this.getLocalCache();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    // Fallback to initial mock data
    if (window.INITIAL_CHECKPOINTS) {
      this.saveLocalCache(window.INITIAL_CHECKPOINTS);
      return window.INITIAL_CHECKPOINTS;
    }

    return [];
  }

  // Merge newly fetched data with any user-reported or newly added checkpoints from localStorage
  mergeWithLocalUserReports(freshList) {
    const cached = this.getLocalCache();
    if (!cached || !Array.isArray(cached)) return freshList;

    const freshMap = new Map();
    freshList.forEach(item => freshMap.set(item.id, item));

    // Keep any user-reported items (e.g. id starting with 'cp-user' or not in freshList)
    cached.forEach(c => {
      if (!freshMap.has(c.id)) {
        freshList.unshift(c);
      }
    });

    return freshList;
  }

  getLocalCache() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  saveLocalCache(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  // Download checkpoints as a formatted JSON file to upload/commit to GitHub
  exportJsonFile(checkpoints) {
    const jsonStr = JSON.stringify(checkpoints, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'checkpoints.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Optional direct GitHub API Commit (if token is provided)
  async pushToGitHubAPI(checkpoints, commitMessage = 'Update checkpoints data via CheckDan Web App') {
    const config = this.getConfig();
    if (!config.owner || !config.repo || !config.token) {
      throw new Error('กรุณากรอก GitHub Token, Owner และ Repo ในหน้าตั้งค่าก่อนบันทึกตรงสู่ GitHub');
    }

    const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath || 'data/checkpoints.json'}`;
    
    // First get SHA of existing file if it exists
    let sha = null;
    try {
      const getRes = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }
    } catch (e) {
      console.warn('Could not get existing file SHA, will try creating new:', e);
    }

    // Encode content to Base64 (supporting UTF-8 Thai characters)
    const jsonString = JSON.stringify(checkpoints, null, 2);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    const base64Content = btoa(binary);

    const body = {
      message: commitMessage,
      content: base64Content,
      branch: config.branch || 'main'
    };
    if (sha) {
      body.sha = sha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const errorJson = await putRes.json().catch(() => ({}));
      throw new Error(errorJson.message || `GitHub API error: ${putRes.status}`);
    }

    return await putRes.json();
  }

  resetToDefault() {
    localStorage.removeItem(this.storageKey);
    if (window.INITIAL_CHECKPOINTS) {
      this.saveLocalCache(window.INITIAL_CHECKPOINTS);
      return window.INITIAL_CHECKPOINTS;
    }
    return [];
  }
}

window.githubSync = new GitHubSyncManager();
