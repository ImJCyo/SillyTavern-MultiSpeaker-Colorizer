if (!window.structuredClone) {
  window.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

const { eventSource, event_types, extensionSettings, saveSettingsDebounced, user } = SillyTavern.getContext();

async function initializeMSC() {
    const MODULE_NAME = 'MultiSpeakerColorizer';
    if (!extensionSettings[MODULE_NAME]) extensionSettings[MODULE_NAME] = {};
    const settings = extensionSettings[MODULE_NAME];

    const defaultProfiles = { 'Default': { 'Gandalf,Mithrandir': '#9b59b6', 'Lyra': '#add8e6', 'Kita': '#ff6b6b' } };
    
    if (settings.enabled === undefined) settings.enabled = true;
    if (settings.loggingEnabled === undefined) settings.loggingEnabled = true;
    if (settings.userName === undefined) settings.userName = user || "John";
    if (!settings.profiles) settings.profiles = structuredClone(defaultProfiles);
    if (!settings.activeProfile || !settings.profiles[settings.activeProfile]) {
        settings.activeProfile = Object.keys(settings.profiles)[0];
    }

    let globalActiveSpeaker = "Narrator";
    const normalize = (str) => str.toLowerCase().replace(/['’'"`*.,!?;:]/g, '').trim();

    function processTextNodes(node, color) {
        if (node.nodeType === Node.TEXT_NODE) {
            const regex = /["“]([^"“”]+)["”]/g;
            if (regex.test(node.textContent)) {
                const span = document.createElement('span');
                span.innerHTML = node.textContent.replace(regex, `<span class="msc-quote" style="color: ${color} !important;">"$1"</span>`);
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.getAttribute('style') || node.classList.contains('msc-quote')) return;
            Array.from(node.childNodes).forEach(child => processTextNodes(child, color));
        }
    }

    function colorizeMessage(container) {
        if (!settings.enabled || container.classList.contains('msc-processed')) return;
        
        const colorMap = settings.profiles[settings.activeProfile] || {};
        const speakerEntries = Object.entries(colorMap);
        const messageWrapper = container.closest('.mes');
        const myName = normalize(settings.userName); 
        const headerElement = messageWrapper?.querySelector('.ch_name, .name_text');
        const headerNormalized = normalize(headerElement ? headerElement.innerText.split('\n')[0] : "");

        if (headerNormalized === myName) {
            container.classList.add('msc-processed');
            return; 
        }

        let currentActiveColor = null;
        let currentActiveSpeaker = "Narrator";
        const blocks = container.querySelectorAll('p, li, blockquote');

        blocks.forEach((block, index) => {
            const blockText = block.innerText.trim();
            const narrationOnly = blockText.replace(/["“”][^"“”]*["“”]/g, ' '); 
            const words = narrationOnly.split(/\s+/).map(w => normalize(w));
            const ignorePreps = ['to', 'at', 'with', 'and', 'is', 'was', 'for', 'about', 'of', 'from', 'than', 'like'];

            let foundNewSpeaker = false;
            for (const [names, color] of speakerEntries) {
                const aliases = names.split(',').map(n => normalize(n));
                for (const alias of aliases) {
                    const aliasIndex = words.indexOf(alias);
                    if (aliasIndex !== -1) {
                        const prevWord = words[aliasIndex - 1] || "";
                        if (!ignorePreps.includes(prevWord)) {
                            currentActiveColor = color;
                            currentActiveSpeaker = names.split(',')[0];
                            foundNewSpeaker = true;
                            if (settings.loggingEnabled) console.log(`[MSC] Match: "${alias}" in Block ${index} -> Color: ${color}`);
                            break;
                        }
                    }
                }
                if (foundNewSpeaker) break;
            }

            if (currentActiveColor) {
                processTextNodes(block, currentActiveColor);
            }
        });

        container.classList.add('msc-processed');
        globalActiveSpeaker = currentActiveSpeaker;
        const indicator = document.getElementById('msc-active-indicator');
        if (indicator) indicator.innerText = globalActiveSpeaker;
    }

    function renderUI() {
        const target = document.querySelector('#extensions_settings');
        if (!target || document.querySelector('.msc-settings-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'msc-settings-wrapper';
        wrapper.innerHTML = `
            <style>
                .msc-box { padding: 20px; border: 1px solid var(--smart-theme-border); background: var(--smart-theme-bg); margin-bottom: 15px; border-radius: 8px; min-width: 340px; }
                .msc-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; width: 100%; }
                .msc-section-label { font-size: 0.85em; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: block; }
                .msc-tool-btn { padding: 8px; background: #444; color: #fff; border: 1px solid #666; cursor: pointer; border-radius: 4px; font-size: 0.85em; flex: 1; }
                .msc-active-badge { background: var(--bracket-color); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8em; margin-left: 10px; font-weight: bold; }
                .msc-help { cursor: help; opacity: 0.6; font-size: 0.9em; margin-left: 5px; }
            </style>
            <div class="inline-drawer">
                <div class="inline-drawer-header">
                    <b>Multi-Speaker Colorizer</b> 
                    <span id="msc-active-indicator" class="msc-active-badge">${globalActiveSpeaker}</span>
                </div>
                <div class="inline-drawer-content msc-box" style="display:none;">
                    
                    <span class="msc-section-label">General Settings</span>
                    <label>User Shield <span class="msc-help" title="Enter your persona name here. The script will NEVER colorize messages sent by this name.">ⓘ</span></label>
                    <input type="text" id="msc-user" class="text_pole" style="width:100%; margin-top:5px; margin-bottom:15px;" value="${settings.userName}" />
                    
                    <span class="msc-section-label">Profile Management</span>
                    <div class="msc-row">
                        <select id="msc-prof" class="text_pole" style="flex:2;">
                            ${Object.keys(settings.profiles).map(p => `<option value="${p}" ${p === settings.activeProfile ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                        <button id="msc-del-prof" class="menu_button" style="color:#ff5f5f;" title="Delete Profile">✕</button>
                    </div>
                    <div class="msc-row">
                        <button id="msc-new" class="menu_button" style="flex:1;">+ New</button>
                        <button id="msc-ren" class="menu_button" style="flex:1;">Rename</button>
                    </div>

                    <span class="msc-section-label" style="margin-top:15px;">Characters <span class="msc-help" title="Format: Name,Alias (e.g. 'Gandalf,Mithrandir'). Text will be colored AFTER one of these names appears in narration.">ⓘ</span></span>
                    <div id="msc-list"></div>
                    <button id="msc-add" class="menu_button" style="width:100%; margin-top:10px;">+ Add Character</button>
                    
                    <hr style="opacity:0.1; margin: 20px 0;">

                    <div style="display:flex; gap:8px; margin-bottom:10px;">
                        <button id="msc-exp" class="msc-tool-btn">Export JSON</button>
                        <button id="msc-imp" class="msc-tool-btn">Import JSON</button>
                    </div>
                    <button id="msc-reset" class="msc-tool-btn" style="width:100%; background:#633; margin-bottom:10px;">Factory Reset</button>

                    <div style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" id="msc-log" ${settings.loggingEnabled ? 'checked' : ''}>
                        <label for="msc-log" style="font-size:0.9em;">Debug Logs <span class="msc-help" title="Writes detection logic to the browser console (F12). Useful for troubleshooting missed colors.">ⓘ</span></label>
                    </div>

                    <button id="msc-apply" class="menu_button" style="width:100%; background:var(--bracket-color); margin-top:15px; font-weight:bold;">Apply to Recent (20)</button>
                    <input type="file" id="msc-f" style="display:none" />
                </div>
            </div>`;
        
        target.appendChild(wrapper);
        const list = document.getElementById('msc-list');

        const save = () => {
            const newData = {};
            list.querySelectorAll('.msc-row').forEach(row => {
                const n = row.querySelector('.n').value.trim();
                if(n) newData[n] = row.querySelector('.c').value;
            });
            settings.profiles[settings.activeProfile] = newData;
            settings.userName = document.getElementById('msc-user').value.trim();
            settings.loggingEnabled = document.getElementById('msc-log').checked;
            saveSettingsDebounced();
        };

        const renderRows = () => {
            list.innerHTML = '';
            Object.entries(settings.profiles[settings.activeProfile] || {}).forEach(([n, c]) => {
                const row = document.createElement('div');
                row.className = 'msc-row';
                row.innerHTML = `<input type="text" class="n text_pole" value="${n}" style="flex:1;"><input type="color" class="c" value="${c}" style="width:45px; height:32px; border:none; background:none; padding:0;"><button class="del menu_button">✕</button>`;
                row.querySelector('.del').onclick = () => { row.remove(); save(); };
                list.appendChild(row);
            });
        };

        document.getElementById('msc-reset').onclick = () => {
            if(confirm("Factory reset?")) { settings.profiles = structuredClone(defaultProfiles); settings.activeProfile = 'Default'; saveSettingsDebounced(); renderUI_Refresh(); }
        };
        document.getElementById('msc-new').onclick = () => {
            const n = prompt("Profile Name:");
            if(n) { settings.profiles[n] = {}; settings.activeProfile = n; renderUI_Refresh(); save(); }
        };
        document.getElementById('msc-ren').onclick = () => {
            const n = prompt("Rename to:", settings.activeProfile);
            if(n && n !== settings.activeProfile) {
                settings.profiles[n] = settings.profiles[settings.activeProfile];
                delete settings.profiles[settings.activeProfile];
                settings.activeProfile = n; renderUI_Refresh(); save();
            }
        };
        document.getElementById('msc-del-prof').onclick = () => {
            if (Object.keys(settings.profiles).length <= 1) return;
            if (confirm(`Delete "${settings.activeProfile}"?`)) {
                delete settings.profiles[settings.activeProfile];
                settings.activeProfile = Object.keys(settings.profiles)[0];
                renderUI_Refresh(); save();
            }
        };
        document.getElementById('msc-add').onclick = () => {
            const row = document.createElement('div');
            row.className = 'msc-row';
            row.innerHTML = `<input type="text" class="n text_pole" placeholder="Name"><input type="color" class="c" value="#ffffff" style="width:45px; height:32px; border:none; background:none; padding:0;"><button class="del menu_button">✕</button>`;
            row.querySelector('.del').onclick = () => { row.remove(); save(); };
            list.appendChild(row);
        };
        document.getElementById('msc-apply').onclick = () => { save(); throttledScan(true); };
        document.getElementById('msc-prof').onchange = (e) => { settings.activeProfile = e.target.value; renderRows(); save(); };
        document.getElementById('msc-exp').onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings.profiles, null, 2));
            const dl = document.createElement('a'); dl.setAttribute("href", dataStr); dl.setAttribute("download", "MSC_Backup.json"); dl.click();
        };
        document.getElementById('msc-imp').onclick = () => document.getElementById('msc-f').click();
        document.getElementById('msc-f').onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => { settings.profiles = JSON.parse(ev.target.result); saveSettingsDebounced(); renderUI_Refresh(); };
            reader.readAsText(file);
        };
        wrapper.querySelector('.inline-drawer-header').onclick = (e) => { if(e.target.id !== 'msc-active-indicator') $(wrapper.querySelector('.inline-drawer-content')).slideToggle(200); };
        renderRows();
    }

    function renderUI_Refresh() {
        const ex = document.querySelector('.msc-settings-wrapper');
        if(ex) ex.remove();
        renderUI();
    }

    let scanTimeout;
    function throttledScan(force = false) {
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
            const messages = Array.from(document.querySelectorAll('.mes_text'));
            const limit = force ? 3 : 3;
            const targets = messages.slice(-limit);
            if (settings.loggingEnabled && force) console.log(`[MSC] Force Scan: Processing last ${targets.length} messages.`);
            targets.forEach(m => {
                if (force) m.classList.remove('msc-processed');
                colorizeMessage(m);
            });
        }, 150);
    }

    const observer = new MutationObserver(() => { if (!document.querySelector('.msc-settings-wrapper')) renderUI(); });
    observer.observe(document.body, { childList: true, subtree: true });
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, () => throttledScan());
    setTimeout(() => { throttledScan(false); renderUI(); }, 500);
}

eventSource.on(event_types.APP_READY, () => { setTimeout(initializeMSC, 500); });
