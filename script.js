if (!window.structuredClone) {
  window.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

const { eventSource, event_types, extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();

eventSource.on(event_types.APP_READY, async () => {
  const MODULE_NAME = 'MultiSpeakerColorizer';

  if (!extensionSettings[MODULE_NAME]) extensionSettings[MODULE_NAME] = {};
  const settings = extensionSettings[MODULE_NAME];

  if (settings.enabled === undefined) settings.enabled = true;
  if (!settings.profiles) {
      settings.profiles = { 'Default': { 'Claire': '#11A5E4', 'Citlali': '#A020F0', 'Einkk': '#FF8C00' } };
  }
  if (!settings.activeProfile || !settings.profiles[settings.activeProfile]) {
      settings.activeProfile = Object.keys(settings.profiles)[0];
  }

  // --- GLOBAL CSS (The "Emphasis Insurance") ---
  const style = document.createElement('style');
  style.innerHTML = `
    .msc-quote, .msc-quote *, q, q * { 
        color: inherit !important; 
        text-decoration: inherit !important;
        filter: none !important;
        text-shadow: none !important;
    }
  `;
  document.head.appendChild(style);

  function colorizeMessage(container) {
    if (settings.enabled === false) return;
    if (container.classList.contains('msc-processed')) return;

    const colorMap = settings.profiles[settings.activeProfile] || {};
    const speakerEntries = Object.entries(colorMap);
    const messageWrapper = container.closest('.mes');
    const firstBits = container.innerText.substring(0, 500).toLowerCase(); 

    let globalOwnerColor = null;
    const header = messageWrapper?.querySelector('.ch_name, .name_text')?.innerText?.toLowerCase() || "";
    for (const [names, color] of speakerEntries) {
        if (names.split(',').some(a => header.includes(a.trim().toLowerCase()) || firstBits.includes(a.trim().toLowerCase()))) {
            globalOwnerColor = color;
            break;
        }
    }

    const blocks = container.querySelectorAll('p, li, blockquote');
    blocks.forEach(block => {
        const blockText = block.innerText.toLowerCase();
        let activeColor = globalOwnerColor;

        for (const [names, color] of speakerEntries) {
            const aliases = names.split(',').map(n => n.trim().toLowerCase());
            if (aliases.some(a => blockText.includes(a))) {
                activeColor = color;
                break;
            }
        }

        if (!activeColor) return;

        // Path 1: <q> tags (Dankholme structure)
        block.querySelectorAll('q').forEach(q => {
            q.style.setProperty('color', activeColor, 'important');
        });

        // Path 2: Surgical node-walk (Image Safe)
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const textNodes = [];
        while(node = walker.nextNode()) textNodes.push(node);

        textNodes.forEach(textNode => {
            const val = textNode.nodeValue;
            if (val.includes('"') && !textNode.parentElement.closest('q')) {
                const parts = val.split(/(".*?")/g);
                const fragment = document.createDocumentFragment();
                parts.forEach(part => {
                    if (part.startsWith('"')) {
                        const span = document.createElement('span');
                        span.className = "msc-quote";
                        span.style.cssText = `color: ${activeColor} !important; display: inline;`;
                        span.textContent = part;
                        fragment.appendChild(span);
                    } else {
                        fragment.appendChild(document.createTextNode(part));
                    }
                });
                textNode.replaceWith(fragment);
            }
        });
    });
    container.classList.add('msc-processed');
  }

  // --- FULL UI ENGINE ---
  const renderUI = async () => {
    const target = document.querySelector('#extensions_settings');
    if (!target || document.querySelector('.msc-settings-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'msc-settings-wrapper';
    wrapper.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-header"><b>Multi-Speaker Colorizer/b></div>
            <div class="inline-drawer-content" style="padding:15px; border: 1px solid #444; background: rgba(0,0,0,0.1);">
                <div style="margin-bottom:15px;">
                    <label><b>Profiles:</b></label>
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <select id="msc-profile-sel" class="text_pole" style="flex:1; background:#111; color:white;"></select>
                        <button id="msc-add-profile" class="menu_button" title="Add Profile">+</button>
                        <button id="msc-ren-profile" class="menu_button" title="Rename Profile">✎</button>
                        <button id="msc-del-profile" class="menu_button" style="background:#622;" title="Delete Profile">&times;</button>
                    </div>
                </div>
                <div id="color-overrides"></div>
                <button id="add-override" class="menu_button" style="width:100%; margin-top:10px;">+ Add Character</button>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button id="msc-export" class="menu_button" style="flex:1;">Export</button>
                    <button id="msc-import" class="menu_button" style="flex:1;">Import</button>
                </div>
                <button id="msc-force" class="menu_button" style="width:100%; margin-top:10px; background:var(--bracket-color);">Apply & Save All</button>
            </div>
        </div>`;
    
    target.appendChild(wrapper);
    const list = document.getElementById('color-overrides');
    const sel = document.getElementById('msc-profile-sel');

    const save = () => {
        const newData = {};
        wrapper.querySelectorAll('.msc-row').forEach(r => {
            const n = r.querySelector('.n-in').value.trim();
            if (n) newData[n] = r.querySelector('.c-in').value;
        });
        settings.profiles[settings.activeProfile] = newData;
        saveSettingsDebounced();
    };

    const addRow = (n='', c='#ffffff') => {
        const row = document.createElement('div');
        row.className = 'msc-row';
        row.style = "display:flex; gap:8px; margin-bottom:8px; align-items:center;";
        row.innerHTML = `<input type="text" class="n-in" value="${n}" style="flex:1; background:#111; color:white; border:1px solid #666; padding:5px;"/><input type="color" class="c-in" value="${c}"/><button class="msc-del menu_button">&times;</button>`;
        row.querySelector('.msc-del').onclick = () => { row.remove(); save(); };
        list.appendChild(row);
    };

    const refreshList = () => {
        list.innerHTML = '';
        Object.entries(settings.profiles[settings.activeProfile] || {}).forEach(([n,c]) => addRow(n,c));
    };

    const refreshProfiles = () => {
        sel.innerHTML = '';
        Object.keys(settings.profiles).forEach(p => {
            const opt = document.createElement('option'); opt.value = p; opt.textContent = p;
            opt.selected = (p === settings.activeProfile);
            sel.appendChild(opt);
        });
    };

    refreshProfiles(); refreshList();

    sel.onchange = (e) => { settings.activeProfile = e.target.value; refreshList(); save(); };
    document.getElementById('msc-add-profile').onclick = () => { 
        const n = prompt("New Profile Name:"); 
        if(n) { settings.profiles[n] = {}; settings.activeProfile = n; refreshProfiles(); refreshList(); save(); } 
    };
    document.getElementById('msc-ren-profile').onclick = () => {
        const n = prompt("Rename profile to:", settings.activeProfile);
        if(n && n !== settings.activeProfile) {
            settings.profiles[n] = settings.profiles[settings.activeProfile];
            delete settings.profiles[settings.activeProfile];
            settings.activeProfile = n; refreshProfiles(); save();
        }
    };
    document.getElementById('msc-del-profile').onclick = () => { 
        if(Object.keys(settings.profiles).length > 1 && confirm("Delete this profile?")) { 
            delete settings.profiles[settings.activeProfile]; 
            settings.activeProfile = Object.keys(settings.profiles)[0]; 
            refreshProfiles(); refreshList(); save(); 
        } 
    };
    document.getElementById('add-override').onclick = () => addRow();

    // Export / Import Logic
    document.getElementById('msc-export').onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings.profiles));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "msc_profiles.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    document.getElementById('msc-import').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = readerEvent => {
                try {
                    const content = JSON.parse(readerEvent.target.result);
                    settings.profiles = content;
                    settings.activeProfile = Object.keys(content)[0];
                    refreshProfiles(); refreshList(); save();
                    alert("Profiles imported successfully!");
                } catch (err) { alert("Invalid file format."); }
            };
            reader.readAsText(file, 'UTF-8');
        };
        input.click();
    };

    document.getElementById('msc-force').onclick = () => {
        save();
        document.querySelectorAll('.msc-processed').forEach(m => {
            m.classList.remove('msc-processed');
            m.querySelectorAll('.msc-quote').forEach(s => s.replaceWith(s.textContent));
        });
        document.querySelectorAll('.mes_text').forEach(colorizeMessage);
    };

    wrapper.querySelector('.inline-drawer-header').onclick = () => $(wrapper.querySelector('.inline-drawer-content')).slideToggle(200);
  };

  const observer = new MutationObserver(() => { if (document.querySelector('#extensions_settings')) renderUI(); });
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(() => document.querySelectorAll('.mes_text:not(.msc-processed)').forEach(colorizeMessage), 3000);
});
