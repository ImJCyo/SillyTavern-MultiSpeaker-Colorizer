if (!window.structuredClone) {
  window.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

const { eventSource, event_types, extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();

eventSource.on(event_types.APP_READY, async () => {
  const MODULE_NAME = 'MultiSpeakerColorizer';

  // Initialize Settings with defaults
  if (!extensionSettings[MODULE_NAME]) {
    extensionSettings[MODULE_NAME] = {
      enabled: true,
      lightness: 135,
      colorOverrides: { 'Ellie': '#4ade80', 'Lumine': '#66ffcc', 'Eileen': '#4ade80' }
    };
    saveSettingsDebounced();
  }
  const settings = extensionSettings[MODULE_NAME];

  function applyColoring() {
    // Corrected boolean check for the toggle
    if (settings.enabled === false || settings.enabled === "false") return;

    const messages = document.querySelectorAll('.mes:not([is_user="true"]) .mes_text');
    
    messages.forEach((container) => {
        const names = Object.keys(settings.colorOverrides);
        let activeSpeaker = null;

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
                if (block.innerText.toLowerCase().includes(name.toLowerCase())) {
                    activeSpeaker = name;
                }
            });

            if (!activeSpeaker) return;

            // Target the <q> tags found in your Inspector
            const quotes = block.querySelectorAll('q');
            quotes.forEach(q => {
                q.style.cssText = `color: ${settings.colorOverrides[activeSpeaker]} !important; filter: brightness(${settings.lightness}%); font-weight: inherit;`;
            });

            // Standard Quote Fallback
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
                            span.style.cssText = `color: ${settings.colorOverrides[activeSpeaker]} !important; filter: brightness(${settings.lightness}%);`;
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
    });
  }

  const renderUI = async () => {
    const extensionsSettings = document.querySelector('#extensions_settings');
    if (!extensionsSettings || document.querySelector('.msc-settings-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'msc-settings-wrapper';
    wrapper.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-header"><b>Multi-Speaker Colorizer (V12)</b></div>
            <div class="inline-drawer-content" style="padding:15px; border: 1px solid #444; background: rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <label style="cursor:pointer;"><input type="checkbox" id="msc-enabled"> <b>Enable Extension</b></label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label><b>Global Lightness:</b> <span id="msc-lightness-val">${settings.lightness}</span>%</label>
                    <input type="range" id="msc-lightness" min="50" max="300" value="${settings.lightness}" style="width:100%; accent-color: #4ade80;">
                </div>

                <div id="color-overrides"></div>
                <button id="add-override" class="menu_button" style="width:100%; margin-top:10px;">+ Add Character</button>
            </div>
        </div>`;
    
    extensionsSettings.appendChild(wrapper);

    const update = () => {
        settings.enabled = document.getElementById('msc-enabled').checked;
        settings.lightness = document.getElementById('msc-lightness').value;
        document.getElementById('msc-lightness-val').textContent = settings.lightness;

        settings.colorOverrides = {};
        wrapper.querySelectorAll('.msc-row').forEach(r => {
            const name = r.querySelector('.name-input').value.trim();
            if (name) settings.colorOverrides[name] = r.querySelector('.color-input').value;
        });

        saveSettingsDebounced();
        // Visual Reset
        document.querySelectorAll('.msc-quote').forEach(el => el.replaceWith(el.textContent));
        document.querySelectorAll('q').forEach(el => el.style.color = "");
        applyColoring();
    };

    const addRow = (n = '', c = '#ffffff') => {
        const row = document.createElement('div');
        row.className = 'msc-row';
        row.style = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
        row.innerHTML = `
            <input type="text" class="name-input" value="${n}" style="flex:1; background: rgba(0,0,0,0.3); color: white; border: 1px solid #666; padding: 5px;" />
            <input type="color" class="color-input" value="${c}" style="width:40px; height:32px; border:none; background:transparent;" />
            <button class="menu_button remove-row" style="padding: 2px 8px;">&times;</button>`;
        row.querySelector('.remove-row').onclick = () => { row.remove(); update(); };
        row.querySelectorAll('input').forEach(i => i.onchange = update);
        wrapper.querySelector('#color-overrides').appendChild(row);
    };

    Object.entries(settings.colorOverrides).forEach(([n, c]) => addRow(n, c));
    document.getElementById('add-override').onclick = () => addRow();
    document.getElementById('msc-enabled').checked = settings.enabled;
    document.getElementById('msc-enabled').onchange = update;
    document.getElementById('msc-lightness').oninput = update;
    
    wrapper.querySelector('.inline-drawer-header').onclick = () => $(wrapper.querySelector('.inline-drawer-content')).slideToggle(200);
  };

  const observer = new MutationObserver(() => {
      if (document.querySelector('#extensions_settings')) {
          renderUI();
          observer.disconnect();
      }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, () => setTimeout(applyColoring, 500));
  setInterval(applyColoring, 3000);
});