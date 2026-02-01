if (!window.structuredClone) {
  window.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

const { eventSource, event_types, extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();

eventSource.on(event_types.APP_READY, async () => {
  const MODULE_NAME = 'MultiSpeakerColorizer';

  if (!extensionSettings[MODULE_NAME]) extensionSettings[MODULE_NAME] = {};
  const settings = extensionSettings[MODULE_NAME];

  if (settings.enabled === undefined) settings.enabled = true;
  if (settings.lightness === undefined) settings.lightness = 135;
  if (!settings.profiles) {
      settings.profiles = { 'Default': { 'Ellie': '#4ade80', 'Lumine': '#66ffcc', 'Eileen': '#4ade80' } };
  }
  if (!settings.activeProfile || !settings.profiles[settings.activeProfile]) {
      settings.activeProfile = Object.keys(settings.profiles)[0];
  }

  // --- THE COLORING ENGINE ---
  function colorizeMessage(container) {
    if (settings.enabled === false || settings.enabled === "false") return;
    if (container.classList.contains('msc-processed')) return;

    const colorMap = settings.profiles[settings.activeProfile] || {};
    const names = Object.keys(colorMap);
    let activeSpeaker = null;

    // Determine initial speaker for this specific message
    const fullContent = container.innerText.toLowerCase();
    let firstPos = Infinity;
    names.forEach(name => {
        const pos = fullContent.indexOf(name.toLowerCase());
        if (pos !== -1 && pos < firstPos) {
            firstPos = pos;
            activeSpeaker = name;
        }
    });

    const blocks = container.querySelectorAll('p, li, blockquote, em');
    blocks.forEach(block => {
        names.forEach(name => {
            if (block.innerText.toLowerCase().includes(name.toLowerCase())) activeSpeaker = name;
        });
        if (!activeSpeaker) return;

        block.querySelectorAll('q').forEach(q => {
            q.style.cssText = `color: ${colorMap[activeSpeaker]} !important; filter: brightness(${settings.lightness}%); font-weight: inherit;`;
        });

        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while(node = walker.nextNode()) {
            if (node.nodeValue.includes('"') && !node.parentElement.closest('q, a, img, code')) {
                const text = node.nodeValue;
                const parts = text.split(/(".*?")/g);
                const fragment = document.createDocumentFragment();
                parts.forEach(part => {
                    if (part.startsWith('"') && part.endsWith('"')) {
                        const span = document.createElement('span');
                        span.className = "msc-quote";
                        span.style.cssText = `color: ${colorMap[activeSpeaker]} !important; filter: brightness(${settings.lightness}%);`;
                        span.textContent = part;
                        fragment.appendChild(span);
                    } else {
                        fragment.appendChild(document.createTextNode(part));
                    }
                });
                node.replaceWith(fragment);
            }
        }
    });
    container.classList.add('msc-processed');
  }

  // --- THE PERFORMANCE OBSERVERS ---
  
  // 1. Lazy Loader: Colors messages as they scroll into view
  const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              colorizeMessage(entry.target);
          }
      });
  }, { threshold: 0.1 });

  function scanCurrentView() {
      const messages = Array.from(document.querySelectorAll('.mes:not([is_user="true"]) .mes_text'));
      // Only "watch" the last 15 messages for active changes
      const recentMessages = messages.slice(-15);
      
      messages.forEach(msg => {
          if (!msg.classList.contains('msc-processed')) {
              scrollObserver.observe(msg); // Add to lazy loader
          }
      });

      // Force colorize the most recent ones immediately
      recentMessages.forEach(colorizeMessage);
  }

  // UI Code remains identical to previous version, just updating version name in logic
  const renderUI = async () => {
    const extensionsSettings = document.querySelector('#extensions_settings');
    if (!extensionsSettings || document.querySelector('.msc-settings-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'msc-settings-wrapper';
    wrapper.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-header"><b>Multi-Speaker Colorizer</b></div>
            <div class="inline-drawer-content" style="padding:15px; border: 1px solid #444; background: rgba(0,0,0,0.1);">
                <div style="margin-bottom:15px;">
                    <label><b>Active Profile:</b></label>
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <select id="msc-profile-sel" class="text_pole" style="flex:1; background:#111; color:white;"></select>
                        <button id="msc-add-profile" class="menu_button" title="New Profile">+</button>
                        <button id="msc-rename-profile" class="menu_button" title="Rename Profile">✎</button>
                        <button id="msc-del-profile" class="menu_button" title="Delete Profile" style="background:#622;">&times;</button>
                    </div>
                </div>
                <div style="display:flex; gap:5px; margin-bottom:15px;">
                    <button id="msc-export" class="menu_button" style="flex:1;">Export Profile</button>
                    <button id="msc-import" class="menu_button" style="flex:1;">Import Profile</button>
                    <input type="file" id="msc-import-file" style="display:none;" accept=".json">
                </div>
                <div style="margin-bottom:15px;">
                    <label style="cursor:pointer;"><input type="checkbox" id="msc-enabled"> <b>Enable Colorizer</b></label>
                </div>
                <div style="margin-bottom:15px;">
                    <label><b>Global Lightness:</b> <span id="msc-lightness-val">${settings.lightness}</span>%</label>
                    <input type="range" id="msc-lightness" min="50" max="300" value="${settings.lightness}" style="width:100%;">
                </div>
                <div id="color-overrides"></div>
                <button id="add-override" class="menu_button" style="width:100%; margin-top:10px;">+ Add Character</button>
                <button id="msc-save-manual" class="menu_button" style="width:100%; margin-top:10px; background:var(--bracket-color);">Manual Save All</button>
            </div>
        </div>`;
    
    extensionsSettings.appendChild(wrapper);

    const refreshRows = () => {
        const list = document.getElementById('color-overrides');
        list.innerHTML = '';
        const currentData = settings.profiles[settings.activeProfile] || {};
        Object.entries(currentData).forEach(([n, c]) => addRow(n, c));
    };

    const refreshProfileList = () => {
        const sel = document.getElementById('msc-profile-sel');
        sel.innerHTML = '';
        Object.keys(settings.profiles).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.textContent = p;
            if (p === settings.activeProfile) opt.selected = true;
            sel.appendChild(opt);
        });
    };

    const save = (force = false) => {
        const currentData = {};
        wrapper.querySelectorAll('.msc-row').forEach(r => {
            const name = r.querySelector('.name-input').value.trim();
            if (name) currentData[name] = r.querySelector('.color-input').value;
        });
        settings.profiles[settings.activeProfile] = currentData;
        settings.enabled = document.getElementById('msc-enabled').checked;
        settings.lightness = document.getElementById('msc-lightness').value;
        document.getElementById('msc-lightness-val').textContent = settings.lightness;
        saveSettingsDebounced();
        if(force) {
            document.querySelectorAll('.msc-processed').forEach(m => {
                m.classList.remove('msc-processed');
                m.querySelectorAll('q').forEach(q => q.style.color = "");
                m.querySelectorAll('.msc-quote').forEach(s => s.replaceWith(s.textContent));
            });
        }
        scanCurrentView();
    };

    const addRow = (n = '', c = '#ffffff') => {
        const row = document.createElement('div');
        row.className = 'msc-row';
        row.style = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
        row.innerHTML = `<input type="text" class="name-input" value="${n}" style="flex:1; background: rgba(0,0,0,0.3); color: white; border: 1px solid #666; padding: 5px;" /><input type="color" class="color-input" value="${c}" style="width:40px; height:32px; border:none; background:transparent;" /><button class="menu_button remove-row">&times;</button>`;
        row.querySelector('.remove-row').onclick = () => { row.remove(); save(true); };
        row.querySelectorAll('input').forEach(i => i.onchange = () => save(true));
        document.getElementById('color-overrides').appendChild(row);
    };

    document.getElementById('msc-profile-sel').onchange = (e) => { settings.activeProfile = e.target.value; refreshRows(); save(true); };
    document.getElementById('msc-add-profile').onclick = () => {
        const name = prompt("Profile Name:");
        if (name && !settings.profiles[name]) { settings.profiles[name] = {}; settings.activeProfile = name; refreshProfileList(); refreshRows(); save(true); }
    };
    document.getElementById('msc-rename-profile').onclick = () => {
        const oldName = settings.activeProfile;
        const newName = prompt("Rename profile to:", oldName);
        if (newName && newName !== oldName) {
            settings.profiles[newName] = settings.profiles[oldName];
            delete settings.profiles[oldName];
            settings.activeProfile = newName;
            refreshProfileList(); save();
        }
    };
    document.getElementById('msc-del-profile').onclick = () => {
        if (Object.keys(settings.profiles).length <= 1) return;
        if (confirm(`Delete "${settings.activeProfile}"?`)) { delete settings.profiles[settings.activeProfile]; settings.activeProfile = Object.keys(settings.profiles)[0]; refreshProfileList(); refreshRows(); save(true); }
    };

    document.getElementById('msc-export').onclick = () => {
        const profileToExport = settings.profiles[settings.activeProfile];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profileToExport, null, 4));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `msc_profile_${settings.activeProfile}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };
    
    document.getElementById('msc-import').onclick = () => document.getElementById('msc-import-file').click();
    document.getElementById('msc-import-file').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                const defaultName = file.name.replace('.json', '').replace('msc_profile_', '');
                const profileName = prompt("Name this profile:", defaultName) || defaultName;
                settings.profiles[profileName] = importedData;
                settings.activeProfile = profileName;
                refreshProfileList(); refreshRows(); save(true);
            } catch (err) { alert("Invalid JSON."); }
        };
        reader.readAsText(file);
    };

    refreshProfileList(); refreshRows();
    document.getElementById('add-override').onclick = () => addRow();
    document.getElementById('msc-save-manual').onclick = () => { save(); alert("Saved!"); };
    document.getElementById('msc-enabled').checked = settings.enabled;
    document.getElementById('msc-enabled').onchange = () => save(true);
    document.getElementById('msc-lightness').oninput = save;
    wrapper.querySelector('.inline-drawer-header').onclick = () => $(wrapper.querySelector('.inline-drawer-content')).slideToggle(200);
  };

  const observer = new MutationObserver(() => {
      if (document.querySelector('#extensions_settings')) { renderUI(); observer.disconnect(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, () => setTimeout(scanCurrentView, 400));
  setInterval(scanCurrentView, 3000);
});
