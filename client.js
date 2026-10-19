/**
 * Browser half of `dsh-plugin-quick-invoke`.
 *
 * Surfaces contributed to the running Web UI:
 *  - a "插件调用" chip in `conversation.hero.options` (right of the workspace
 *    and agent-preset controls) and a compact chip in `conversation.input.left`
 *    (the resident composer tool row), so the picker is reachable both on a
 *    new Session and during a conversation;
 *  - an upward picker in `shell.overlay` that lists the plugins the user turned
 *    on. Rows are HTML5-draggable and carry the plugin display name as
 *    `text/plain`, so dropping one on the composer inserts the name at the drop
 *    caret through the composer's own Lexical drop path;
 *  - a right-Sidebar tab (registered through `ctx.sidebarRightTabs` and opened
 *    with `ctx.sidebarRight.openTab`), toggled by double-clicking the chip, that
 *    keeps the draggable plugin names on screen;
 *  - a Settings page in `settings.section` listing every installed plugin with
 *    a show/hide switch and a remark rendered as muted text under the name.
 *
 * Preferences are UI preferences: they live in this browser profile's
 * localStorage and never enter a Session log.
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-quick-invoke',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'pluginQuickInvoke';
    /** Browser-storage key of the user's picker preferences. */
    const STORAGE_KEY = 'dsh-plugin-quick-invoke:preferences:v1';
    /** This implementation's identity in the right Sidebar tab system. */
    const TAB_ID = 'dsh-plugin-quick-invoke';
    /** The right-Sidebar page kind opened by double-click. */
    const TAB_KIND = 'pluginQuickInvoke';
    /** The package name this bundle reports for itself; never offered in its own picker. */
    const OWN_PACKAGE = 'dsh-plugin-quick-invoke';
    /** Preferred width of the floating picker. */
    const PANEL_WIDTH = 300;
    /** Profile bundles that belong to the harness itself rather than to a feature. */
    const CORE_BUNDLES = [
      '@deepseek-ai/dsh-base',
      '@deepseek-ai/dsh-web-app',
      '@deepseek-ai/dsh-headless',
      '@deepseek-ai/dsh-sdk-app',
      '@deepseek-ai/dsh-acp-app',
      '@deepseek-ai/dsh-sdk-minimal',
    ];

    const zh = {
      trigger: '插件调用',
      triggerHint: '插件快捷调用：单击展开，双击固定到右侧栏',
      panelTitle: '插件调用',
      panelHint: '按住名称拖到输入框，即可在落点插入',
      loading: '正在读取已安装的插件…',
      loadFailed: '读取插件列表失败',
      managerNotReady: '插件管理器连接尚未就绪，请点「重试」',
      retry: '重试',
      refresh: '重新读取',
      emptyTitle: '还没有可调用的插件',
      emptyHint: '在「设置 → 插件快捷调用」中开启要显示的插件。',
      railTitle: '插件调用',
      railHint: '拖动名称到输入框插入；双击上方「插件调用」可以收起',
      railGuide: '把常用的插件名固定在右侧，拖进输入框即可',
      settingsTitle: '插件快捷调用',
      settingsDescription:
        '选择哪些已安装插件出现在输入框上方的快速调用面板中，并可为每个插件写一条备注；备注会以灰色小字显示在插件名下方。',
      searchPlaceholder: '搜索插件名或备注',
      remarkPlaceholder: '备注（显示在插件名下方）',
      remarkLabel: '插件备注',
      notEnabled: '未启用',
      rowHint: '按住并拖到输入框，在当前落点插入插件名',
      enabledCount: '已开启 {count} 个',
      footerHint: '开关只控制是否出现在快捷调用面板中，不会启用或停用插件本身。',
      emptyCatalog: '没有找到已安装的插件',
      noMatch: '没有匹配的插件',
      dragFailed: '无法开始拖动，请重试',
    };

    const en = {
      trigger: 'Plugins',
      triggerHint: 'Quick plugin invoke: click to open, double-click to pin the rail to the right sidebar',
      panelTitle: 'Plugin quick invoke',
      panelHint: 'Drag a name into the prompt to insert it at the drop point',
      loading: 'Reading installed plugins…',
      loadFailed: 'Could not read the plugin list',
      managerNotReady: 'The plugin manager connection is not ready yet; press Retry',
      retry: 'Retry',
      refresh: 'Refresh',
      emptyTitle: 'No plugins to invoke yet',
      emptyHint: 'Turn the ones you need on in Settings → Plugin Quick Invoke.',
      railTitle: 'Plugin quick invoke',
      railHint: 'Drag a name into the prompt; double-click the chip above to collapse this rail',
      railGuide: 'Pin frequently used plugin names here and drag them into the prompt',
      settingsTitle: 'Plugin Quick Invoke',
      settingsDescription:
        'Choose which installed plugins appear in the quick-invoke panel above the composer, and give each one an optional remark. Remarks render as muted text under the plugin name.',
      searchPlaceholder: 'Search plugin names or remarks',
      remarkPlaceholder: 'Remark (shown under the plugin name)',
      remarkLabel: 'Plugin remark',
      notEnabled: 'disabled',
      rowHint: 'Hold and drag into the prompt to insert this name at the drop point',
      enabledCount: '{count} shown',
      footerHint: 'Switches only hide a plugin from the quick-invoke panel; they never enable or disable the plugin itself.',
      emptyCatalog: 'No installed plugins found',
      noMatch: 'No matching plugins',
      dragFailed: 'Could not start the drag; please try again',
    };

    // ---------------------------------------------------------------------
    // Runtime wiring (filled by apply)
    // ---------------------------------------------------------------------

    const runtime = {
      /** Client root context. */
      ctx: null,
      /** Right-Sidebar navigation face, once the service is available. */
      sidebar: null,
    };

    function logError(message, error) {
      try {
        if (typeof console !== 'undefined' && console && typeof console.error === 'function') {
          console.error('[plugin-quick-invoke] ' + message, error);
        }
      } catch (ignored) {
        // Logging must never break a gesture.
      }
    }

    // ---------------------------------------------------------------------
    // Preferences and catalog store
    // ---------------------------------------------------------------------

    function emptyState() {
      return {
        catalog: { status: 'idle', error: null, items: [] },
        prefs: readPrefs(),
        hero: false,
        menu: { open: false, anchor: null },
      };
    }

    let state = emptyState();
    const storeListeners = new Set();

    function getState() {
      return state;
    }

    function subscribeStore(listener) {
      storeListeners.add(listener);
      return function unsubscribe() {
        storeListeners.delete(listener);
      };
    }

    function notifyStore() {
      for (const listener of Array.from(storeListeners)) {
        try {
          listener();
        } catch (error) {
          logError('a picker listener failed', error);
        }
      }
    }

    function setState(patch) {
      state = Object.assign({}, state, typeof patch === 'function' ? patch(state) : patch);
      notifyStore();
    }

    function useStore() {
      return React.useSyncExternalStore(subscribeStore, getState, getState);
    }

    function readPrefs() {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return {};
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        const plugins = parsed && typeof parsed === 'object' ? parsed.plugins : null;
        if (!plugins || typeof plugins !== 'object') return {};
        const clean = {};
        for (const name of Object.keys(plugins)) {
          const entry = plugins[name];
          if (!entry || typeof entry !== 'object') continue;
          const next = {};
          if (typeof entry.on === 'boolean') next.on = entry.on;
          if (typeof entry.note === 'string' && entry.note !== '') next.note = entry.note.slice(0, 200);
          if (Object.keys(next).length > 0) clean[name] = next;
        }
        return clean;
      } catch (error) {
        return {};
      }
    }

    function writePrefs() {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const plugins = {};
        for (const name of Object.keys(state.prefs)) {
          const entry = state.prefs[name] || {};
          const next = {};
          if (typeof entry.on === 'boolean') next.on = entry.on;
          if (typeof entry.note === 'string' && entry.note !== '') next.note = entry.note.slice(0, 200);
          if (Object.keys(next).length > 0) plugins[name] = next;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, plugins }));
      } catch (error) {
        // Storage can be unavailable (private mode, quota); preferences then
        // last for this page only, which is still better than failing.
      }
    }

    function prefOf(name) {
      return state.prefs[name] || {};
    }

    function isOn(item) {
      const pref = prefOf(item.name);
      if (typeof pref.on === 'boolean') return pref.on;
      // User-installed, currently enabled plugins are what the picker is for,
      // so they start on; harness-shipped optional bundles and plugins the user
      // disabled start off until asked for.
      return item.installed === true && item.enabled === true;
    }

    function noteOf(item) {
      const pref = prefOf(item.name);
      return pref && typeof pref.note === 'string' ? pref.note.trim() : '';
    }

    function setPref(name, patch) {
      const current = state.prefs[name] || {};
      const next = Object.assign({}, current, patch);
      const prefs = Object.assign({}, state.prefs);
      prefs[name] = next;
      setState({ prefs });
      writePrefs();
    }

    // ---------------------------------------------------------------------
    // Catalog: installed plugin bundles reported by the Host
    // ---------------------------------------------------------------------

    let catalogPromise = null;

    function localizedText(value) {
      if (value === undefined || value === null) return '';
      if (typeof value === 'string') return value;
      try {
        const locale = runtime.ctx && runtime.ctx.locale;
        if (locale && typeof locale.resolveText === 'function') {
          const resolved = locale.resolveText(value);
          if (typeof resolved === 'string' && resolved) return resolved;
        }
      } catch (error) {
        // Fall through to the plain language-map read.
      }
      if (typeof value === 'object') {
        for (const key of ['zh', 'en']) {
          if (typeof value[key] === 'string' && value[key]) return value[key];
        }
        for (const key of Object.keys(value)) {
          if (typeof value[key] === 'string' && value[key]) return value[key];
        }
      }
      return '';
    }

    function buildCandidates(bundles) {
      const items = [];
      const seen = new Set();
      const list = Array.isArray(bundles) ? bundles : [];
      for (const bundle of list) {
        try {
          if (!bundle || typeof bundle.name !== 'string' || bundle.name === '') continue;
          const name = bundle.name;
          if (seen.has(name) || name === OWN_PACKAGE) continue;
          if (CORE_BUNDLES.indexOf(name) !== -1) continue;
          const installed = bundle.installed === true;
          const enabled = bundle.enabled === true;
          const official = bundle.official === true;
          const readable = bundle.availability !== 'missing';
          if (!readable) continue;
          // Installed bundles are the user's own plugins. Harness-shipped
          // optional bundles join only while they are selected in the profile;
          // on-demand catalog entries nobody installed never appear.
          if (!installed && !(official && enabled)) continue;
          const title = localizedText(bundle.meta && bundle.meta.title) || name;
          const description =
            localizedText(bundle.meta && bundle.meta.description) ||
            (typeof bundle.description === 'string' ? bundle.description : '');
          seen.add(name);
          items.push({
            name,
            title,
            description,
            insertText: title,
            installed,
            official,
            enabled,
          });
        } catch (error) {
          // One malformed row must not hide the rest of the list.
        }
      }
      items.sort(function compare(left, right) {
        if (left.installed !== right.installed) return left.installed ? -1 : 1;
        return left.title.localeCompare(right.title, 'zh-Hans-CN');
      });
      return items;
    }

    /**
     * The generated `remote.pluginManager` namespace, once mounted.
     *
     * The namespace is its own Cordis service (`remote.<namespace>`), installed
     * asynchronously by the API assembly, so it may not exist yet when this
     * plugin (or a settings page mounted early) first asks. Every lookup path is
     * probed because a namespace service is reachable both through `ctx.get` and
     * through the `remote` gateway's nested property access.
     */
    let remoteManager = null;

    function asManager(value) {
      return value && typeof value.listBundles === 'function' ? value : null;
    }

    function probeManager(source) {
      if (!source) return null;
      const candidates = [];
      try {
        if (typeof source.get === 'function') candidates.push(source.get('remote.pluginManager'));
      } catch (error) {
        logError('ctx.get(remote.pluginManager) failed', error);
      }
      try {
        candidates.push(source['remote.pluginManager']);
      } catch (error) {
        logError('ctx[remote.pluginManager] failed', error);
      }
      try {
        const remote = typeof source.get === 'function' ? source.get('remote') : source.remote;
        candidates.push(remote && remote.pluginManager);
      } catch (error) {
        logError('ctx.remote access failed', error);
      }
      try {
        candidates.push(source.remote && source.remote.pluginManager);
      } catch (error) {
        logError('ctx.remote.pluginManager access failed', error);
      }
      for (const candidate of candidates) {
        const manager = asManager(candidate);
        if (manager) return manager;
      }
      return null;
    }

    function pluginManagerRemote() {
      if (remoteManager) return remoteManager;
      remoteManager = probeManager(runtime.ctx);
      return remoteManager;
    }

    function ensureCatalog(force) {
      if (catalogPromise && !force) return;
      if (!force && (state.catalog.status === 'ready' || state.catalog.status === 'loading')) return;
      const manager = pluginManagerRemote();
      if (!manager) {
        setState({
          catalog: {
            status: 'error',
            error: 'unavailable',
            items: state.catalog.items,
          },
        });
        return;
      }
      setState({ catalog: Object.assign({}, state.catalog, { status: 'loading', error: null }) });
      catalogPromise = manager.listBundles().then(
        function onBundles(result) {
          catalogPromise = null;
          if (!result || result.ok !== true) {
            const failure = result && result.error ? result.error : null;
            const message = failure ? failure.message || failure.code || 'listBundles failed' : 'listBundles failed';
            setState({ catalog: { status: 'error', error: String(message), items: [] } });
            return;
          }
          setState({ catalog: { status: 'ready', error: null, items: buildCandidates(result.value) } });
        },
        function onFailure(error) {
          catalogPromise = null;
          setState({
            catalog: {
              status: 'error',
              error: error && error.message ? error.message : String(error),
              items: [],
            },
          });
        },
      );
    }

    function visibleItems() {
      const items = [];
      for (const item of state.catalog.items) {
        if (!isOn(item)) continue;
        items.push(Object.assign({}, item, { note: noteOf(item) }));
      }
      return items;
    }

    // ---------------------------------------------------------------------
    // Picker and rail gestures
    // ---------------------------------------------------------------------

    function setHeroMounted(mounted) {
      if (state.hero !== mounted) setState({ hero: mounted });
    }

    function openMenu(anchor) {
      setState({ menu: { open: true, anchor } });
      ensureCatalog(false);
    }

    function closeMenu() {
      if (state.menu.open || state.menu.anchor) setState({ menu: { open: false, anchor: null } });
    }

    function toggleMenu(anchor) {
      if (state.menu.open) closeMenu();
      else openMenu(anchor);
    }

    function toggleRail() {
      const sidebar = runtime.sidebar;
      if (!sidebar) {
        logError('the right sidebar is unavailable in this build', null);
        return;
      }
      try {
        const active = typeof sidebar.active === 'function' ? sidebar.active() : undefined;
        if (active && active.kind === TAB_KIND) {
          sidebar.toggleExpanded();
          return;
        }
        sidebar.openTab(TAB_KIND);
        ensureCatalog(false);
      } catch (error) {
        logError('could not open the right sidebar tab', error);
      }
    }

    function anchorOf(element) {
      let rect;
      try {
        rect = element.getBoundingClientRect();
      } catch (error) {
        return null;
      }
      let lift = rect.top;
      try {
        // The dropdown must clear the whole composer card, not only the
        // control row that holds the chip, so the input content stays visible.
        const card = element.closest('[data-composer-card]');
        if (card) {
          const cardRect = card.getBoundingClientRect();
          if (cardRect.top > 0 && cardRect.top < lift) lift = cardRect.top;
        }
      } catch (error) {
        // Without a card the chip's own top is the ceiling.
      }
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        lift,
      };
    }

    // ---------------------------------------------------------------------
    // Icons
    // ---------------------------------------------------------------------

    function plugIcon(size) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: size || 16,
          height: size || 16,
          fill: 'none',
          'aria-hidden': true,
          focusable: false,
        },
        h('path', {
          d: 'M5.5 2.5v3M10.5 2.5v3',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M3.5 5.5h9v2.3A4.3 4.3 0 0 1 8.2 12h-.4a4.3 4.3 0 0 1-4.3-4.2V5.5Z',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M8 12v2.5',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
        }),
      );
    }

    function chevronIcon() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'none', 'aria-hidden': true, focusable: false },
        h('path', {
          d: 'M4 6.2 8 10l4-3.8',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    function gripIcon() {
      const dots = [];
      for (const x of [3.5, 8.5]) {
        for (const y of [4, 8, 12]) {
          dots.push(h('circle', { key: x + '-' + y, cx: x, cy: y, r: 1.15 }));
        }
      }
      return h(
        'svg',
        { viewBox: '0 0 12 16', width: 12, height: 16, fill: 'currentColor', 'aria-hidden': true, focusable: false },
        dots,
      );
    }

    /** The right-Sidebar guide glyph; also the chip artwork. */
    function QuickInvokeIcon(props) {
      return plugIcon(props && typeof props.size === 'number' ? props.size : 16);
    }

    // ---------------------------------------------------------------------
    // Styles (rendered with the components so unmounting removes them)
    // ---------------------------------------------------------------------

    const CSS = [
      '.qiq-trigger{display:inline-flex;align-items:center;gap:6px;height:28px;box-sizing:border-box;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:20px;cursor:pointer;white-space:nowrap;user-select:none;flex:none}',
      '.qiq-trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.qiq-trigger:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.qiq-trigger[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary)}',
      '.qiq-trigger-icon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex:none}',
      '.qiq-trigger-label{display:inline-block;max-width:140px;overflow:hidden;text-overflow:ellipsis}',
      '.qiq-trigger-chevron{display:inline-flex;align-items:center;color:var(--dsw-alias-label-tertiary);transition:transform .15s ease}',
      '.qiq-trigger[aria-expanded="true"] .qiq-trigger-chevron{transform:rotate(180deg)}',
      '.qiq-trigger-compact{height:26px;padding:0 6px;gap:4px}',
      '.qiq-panel{position:fixed;z-index:120;display:flex;flex-direction:column;box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:0 12px 32px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.08);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;overflow:hidden}',
      '.qiq-panel-header{display:flex;flex-direction:column;gap:2px;flex:none;padding:10px 12px 8px;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.qiq-panel-title{font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary)}',
      '.qiq-panel-subtitle{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.qiq-list{display:flex;flex-direction:column;gap:2px;min-height:0;overflow-y:auto;padding:6px}',
      '.qiq-row{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;cursor:grab;user-select:none;-webkit-user-drag:element;transition:background .1s ease}',
      '.qiq-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.qiq-row:active{cursor:grabbing}',
      '.qiq-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
      '.qiq-row-text{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}',
      '.qiq-row-title{font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.qiq-row-note{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.qiq-row-state{font-size:11px;line-height:16px;color:var(--dsw-alias-label-quaternary)}',
      '.qiq-row-grip{display:inline-flex;flex:none;align-items:center;color:var(--dsw-alias-label-tertiary);opacity:.45}',
      '.qiq-row:hover .qiq-row-grip{opacity:.85}',
      '.qiq-panel-empty{display:flex;flex-direction:column;gap:4px;padding:18px 16px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.qiq-panel-empty-title{color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.qiq-panel-error{display:flex;flex-direction:column;gap:8px;padding:14px 16px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.qiq-link-button{align-self:flex-start;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;padding:3px 10px;cursor:pointer}',
      '.qiq-link-button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.qiq-rail{display:flex;flex-direction:column;gap:10px;box-sizing:border-box;height:100%;padding:14px 12px 18px;overflow-y:auto;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}',
      '.qiq-rail-head{display:flex;flex-direction:column;gap:2px;flex:none}',
      '.qiq-rail-title{font-size:13px;font-weight:600;line-height:18px}',
      '.qiq-rail-hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}',
      '.qiq-rail-list{display:flex;flex-direction:column;gap:2px}',
      '.qiq-rail-empty{display:flex;flex-direction:column;gap:4px;padding:14px 2px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.qiq-settings{display:flex;flex-direction:column;gap:14px;box-sizing:border-box;width:100%;max-width:760px;color:var(--dsw-alias-label-primary)}',
      '.qiq-settings-title{margin:0;font-size:16px;font-weight:600;line-height:24px}',
      '.qiq-settings-desc{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}',
      '.qiq-settings-toolbar{display:flex;align-items:center;gap:10px}',
      '.qiq-search{display:flex;align-items:center;flex:1;min-width:0}',
      '.qiq-search input{box-sizing:border-box;width:100%;height:34px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;padding:0 10px;outline:none}',
      '.qiq-search input::placeholder{color:var(--dsw-alias-label-quaternary)}',
      '.qiq-search input:focus-visible{border-color:var(--dsw-alias-brand-primary)}',
      '.qiq-count{flex:none;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.qiq-settings-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
      '.qiq-settings-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}',
      '.qiq-settings-info{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}',
      '.qiq-settings-name{font-size:14px;line-height:20px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.qiq-settings-package{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.qiq-note-input{box-sizing:border-box;width:100%;max-width:420px;height:28px;margin-top:2px;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;padding:0 8px;outline:none}',
      '.qiq-note-input::placeholder{color:var(--dsw-alias-label-quaternary)}',
      '.qiq-note-input:focus-visible{border-color:var(--dsw-alias-brand-primary)}',
      '.qiq-switch{position:relative;flex:none;width:36px;height:20px;padding:0;border:0;border-radius:999px;background:var(--dsw-alias-border-l2);cursor:pointer;transition:background .15s ease}',
      '.qiq-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.qiq-switch-on{background:var(--dsw-alias-brand-primary)}',
      '.qiq-switch-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-bg-base);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:left .15s ease}',
      '.qiq-switch-on .qiq-switch-knob{left:18px;background:var(--dsw-alias-bg-overlay)}',
      '.qiq-settings-foot{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.qiq-settings-empty{padding:24px 0;text-align:center;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary)}',
      '.qiq-settings-error{display:flex;flex-direction:column;gap:8px;padding:12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)}',
    ].join('\n');

    function StyleTag() {
      return h('style', { 'data-plugin': OWN_PACKAGE }, CSS);
    }

    // ---------------------------------------------------------------------
    // Trigger chips
    // ---------------------------------------------------------------------

    function Trigger(props) {
      const t = props.t;
      const snapshot = useStore();
      const expanded = snapshot.menu.open === true;
      const onMouseDown = function onMouseDown(event) {
        // Keep the composer's focus/selection while pressing the chip.
        event.preventDefault();
      };
      const onClick = function onClick(event) {
        event.preventDefault();
        event.stopPropagation();
        toggleMenu(anchorOf(event.currentTarget));
      };
      const onDoubleClick = function onDoubleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        toggleRail();
      };
      return h(
        React.Fragment,
        null,
        // The chip's own stylesheet travels with it: the picker and settings
        // page may never mount, and the chip must still look like host chrome.
        h(StyleTag),
        h(
          'button',
          {
            type: 'button',
            className: props.compact ? 'qiq-trigger qiq-trigger-compact' : 'qiq-trigger',
            'data-quick-invoke-trigger': 'true',
            'aria-haspopup': 'dialog',
            'aria-expanded': expanded ? 'true' : 'false',
            title: t('triggerHint'),
            onMouseDown,
            onClick,
            onDoubleClick,
          },
          h('span', { className: 'qiq-trigger-icon', 'aria-hidden': 'true' }, plugIcon(16)),
          props.compact ? null : h('span', { className: 'qiq-trigger-label' }, t('trigger')),
          h('span', { className: 'qiq-trigger-chevron', 'aria-hidden': 'true' }, chevronIcon()),
        ),
      );
    }

    /** Chip in the New Session row, right of the workspace and preset controls. */
    function HeroTrigger(props) {
      React.useEffect(function mountHero() {
        setHeroMounted(true);
        return function unmountHero() {
          setHeroMounted(false);
          if (getState().menu.open) closeMenu();
        };
      }, []);
      return h(Trigger, { t: props.t, compact: false });
    }

    /** Compact chip in the resident composer tool row; hidden while the hero chip is up. */
    function ComposerTrigger(props) {
      const snapshot = useStore();
      React.useEffect(function hideOnUnmount() {
        return function closeOnUnmount() {
          if (getState().menu.open) closeMenu();
        };
      }, []);
      if (snapshot.hero) return null;
      return h(Trigger, { t: props.t, compact: true });
    }

    // ---------------------------------------------------------------------
    // Picker panel (shell.overlay)
    // ---------------------------------------------------------------------

    function PluginRow(props) {
      const item = props.item;
      const t = props.t;
      const onDragStart = function onDragStart(event) {
        try {
          const text = item.insertText || item.title || item.name;
          event.dataTransfer.setData('text/plain', text);
          event.dataTransfer.effectAllowed = 'copy';
        } catch (error) {
          logError('could not set the drag payload', error);
        }
      };
      return h(
        'div',
        {
          className: props.variant === 'rail' ? 'qiq-row qiq-row-rail' : 'qiq-row',
          role: 'option',
          'aria-label': item.title,
          tabIndex: 0,
          draggable: true,
          title: t('rowHint'),
          onDragStart,
          onKeyDown: function onKeyDown(event) {
            // Keyboard users can still inspect the row; insertion is a drag gesture.
            if (event.key === 'Enter') event.preventDefault();
          },
        },
        h(
          'div',
          { className: 'qiq-row-text' },
          h('div', { className: 'qiq-row-title' }, item.title),
          item.note ? h('div', { className: 'qiq-row-note' }, item.note) : null,
          item.enabled === false ? h('div', { className: 'qiq-row-state' }, t('notEnabled')) : null,
        ),
        h('span', { className: 'qiq-row-grip', 'aria-hidden': 'true' }, gripIcon()),
      );
    }

    function pickerBody(t, snapshot) {
      if (snapshot.catalog.status === 'loading' || snapshot.catalog.status === 'idle') {
        return h('div', { className: 'qiq-panel-empty' }, t('loading'));
      }
      if (snapshot.catalog.status === 'error') {
        const reason = snapshot.catalog.error === 'unavailable' ? t('managerNotReady') : t('loadFailed');
        return h(
          'div',
          { className: 'qiq-panel-error' },
          h('div', null, reason),
          h(
            'button',
            {
              type: 'button',
              className: 'qiq-link-button',
              onClick: function retry() {
                ensureCatalog(true);
              },
            },
            t('retry'),
          ),
        );
      }
      const items = visibleItems();
      if (items.length === 0) {
        return h(
          'div',
          { className: 'qiq-panel-empty' },
          h('div', { className: 'qiq-panel-empty-title' }, t('emptyTitle')),
          h('div', null, t('emptyHint')),
        );
      }
      return h(
        'div',
        { className: 'qiq-list', role: 'listbox', 'aria-label': t('panelTitle') },
        items.map(function renderRow(item) {
          return h(PluginRow, { key: item.name, item, t, variant: 'menu' });
        }),
      );
    }

    function QuickInvokePanel(props) {
      const t = props.t;
      const snapshot = useStore();
      const panelRef = React.useRef(null);
      const open = snapshot.menu.open === true;

      React.useEffect(
        function loadWhenOpened() {
          if (open) ensureCatalog(state.catalog.status === 'error');
        },
        [open],
      );

      React.useEffect(
        function bindDismissal() {
          if (!open) return undefined;
          const onPointerDown = function onPointerDown(event) {
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            if (target.closest('[data-quick-invoke-trigger]')) return;
            const panel = panelRef.current;
            if (panel && panel.contains(target)) return;
            closeMenu();
          };
          const onKeyDown = function onKeyDown(event) {
            if (event.key === 'Escape') closeMenu();
          };
          document.addEventListener('mousedown', onPointerDown, true);
          document.addEventListener('keydown', onKeyDown, true);
          return function unbindDismissal() {
            document.removeEventListener('mousedown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
          };
        },
        [open],
      );

      if (!open || !snapshot.menu.anchor) return null;
      const anchor = snapshot.menu.anchor;
      const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
      const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
      const width = Math.max(240, Math.min(PANEL_WIDTH, viewportWidth - 24));
      const left = Math.max(8, Math.min(anchor.left, viewportWidth - width - 8));
      const lift = typeof anchor.lift === 'number' && anchor.lift > 8 ? anchor.lift : anchor.top;
      const bottom = Math.max(8, viewportHeight - lift + 8);
      const available = Math.max(180, viewportHeight - bottom - 12);
      const maxHeight = Math.min(440, available);
      return h(
        'div',
        {
          ref: panelRef,
          className: 'qiq-panel',
          style: { left, bottom, width, maxHeight },
          role: 'dialog',
          'aria-label': t('panelTitle'),
        },
        h(StyleTag),
        h(
          'div',
          { className: 'qiq-panel-header' },
          h('div', { className: 'qiq-panel-title' }, t('panelTitle')),
          h('div', { className: 'qiq-panel-subtitle' }, t('panelHint')),
        ),
        pickerBody(t, snapshot),
      );
    }

    // ---------------------------------------------------------------------
    // Right-Sidebar rail
    // ---------------------------------------------------------------------

    function QuickInvokeRail(props) {
      const t = props.t;
      const snapshot = useStore();
      React.useEffect(function loadRail() {
        ensureCatalog(state.catalog.status === 'error');
      }, []);
      let body;
      if (snapshot.catalog.status === 'loading' || snapshot.catalog.status === 'idle') {
        body = h('div', { className: 'qiq-rail-empty' }, t('loading'));
      } else if (snapshot.catalog.status === 'error') {
        body = h(
          'div',
          { className: 'qiq-rail-empty' },
          t(snapshot.catalog.error === 'unavailable' ? 'managerNotReady' : 'loadFailed'),
        );
      } else {
        const items = visibleItems();
        body =
          items.length === 0
            ? h('div', { className: 'qiq-rail-empty' }, t('emptyTitle'), h('div', null, t('emptyHint')))
            : h(
                'div',
                { className: 'qiq-rail-list', role: 'listbox', 'aria-label': t('railTitle') },
                items.map(function renderRow(item) {
                  return h(PluginRow, { key: item.name, item, t, variant: 'rail' });
                }),
              );
      }
      return h(
        'div',
        { className: 'qiq-rail' },
        h(StyleTag),
        h(
          'div',
          { className: 'qiq-rail-head' },
          h('div', { className: 'qiq-rail-title' }, t('railTitle')),
          h('div', { className: 'qiq-rail-hint' }, t('railHint')),
        ),
        body,
      );
    }

    // ---------------------------------------------------------------------
    // Settings page
    // ---------------------------------------------------------------------

    function SettingsRow(props) {
      const item = props.item;
      const t = props.t;
      const on = isOn(item);
      const note = noteOf(item);
      const onToggle = function onToggle() {
        setPref(item.name, { on: !on });
      };
      const onNoteChange = function onNoteChange(event) {
        setPref(item.name, { note: event.target.value });
      };
      return h(
        'li',
        { className: 'qiq-settings-row' },
        h(
          'div',
          { className: 'qiq-settings-info' },
          h('div', { className: 'qiq-settings-name' }, item.title),
          h(
            'div',
            { className: 'qiq-settings-package' },
            item.name + (item.enabled === false ? ' · ' + t('notEnabled') : ''),
          ),
          h('input', {
            className: 'qiq-note-input',
            type: 'text',
            value: note,
            maxLength: 120,
            placeholder: t('remarkPlaceholder'),
            'aria-label': t('remarkLabel') + ': ' + item.title,
            onChange: onNoteChange,
          }),
        ),
        h(
          'button',
          {
            type: 'button',
            className: on ? 'qiq-switch qiq-switch-on' : 'qiq-switch',
            role: 'switch',
            'aria-checked': on ? 'true' : 'false',
            'aria-label': item.title,
            onClick: onToggle,
          },
          h('span', { className: 'qiq-switch-knob', 'aria-hidden': 'true' }),
        ),
      );
    }

    function QuickInvokeSettings(props) {
      const t = props.t;
      const snapshot = useStore();
      const [query, setQuery] = React.useState('');

      React.useEffect(function loadSettings() {
        ensureCatalog(state.catalog.status === 'error');
      }, []);

      const ready = snapshot.catalog.status === 'ready';
      const all = ready ? snapshot.catalog.items : [];
      const needle = query.trim().toLocaleLowerCase();
      const shown = needle
        ? all.filter(function matches(item) {
            const note = noteOf(item);
            return (
              item.title.toLocaleLowerCase().indexOf(needle) !== -1 ||
              item.name.toLocaleLowerCase().indexOf(needle) !== -1 ||
              note.toLocaleLowerCase().indexOf(needle) !== -1
            );
          })
        : all;
      let enabledCount = 0;
      for (const item of all) if (isOn(item)) enabledCount += 1;

      let body;
      if (snapshot.catalog.status === 'loading' || snapshot.catalog.status === 'idle') {
        body = h('div', { className: 'qiq-settings-empty' }, t('loading'));
      } else if (snapshot.catalog.status === 'error') {
        const detail =
          snapshot.catalog.error === 'unavailable'
            ? t('managerNotReady')
            : t('loadFailed') + ': ' + snapshot.catalog.error;
        body = h(
          'div',
          { className: 'qiq-settings-error' },
          h('div', null, detail),
          h(
            'button',
            {
              type: 'button',
              className: 'qiq-link-button',
              onClick: function retry() {
                ensureCatalog(true);
              },
            },
            t('retry'),
          ),
        );
      } else if (all.length === 0) {
        body = h('div', { className: 'qiq-settings-empty' }, t('emptyCatalog'));
      } else if (shown.length === 0) {
        body = h('div', { className: 'qiq-settings-empty' }, t('noMatch'));
      } else {
        body = h(
          'ul',
          { className: 'qiq-settings-list' },
          shown.map(function renderRow(item) {
            return h(SettingsRow, { key: item.name, item, t });
          }),
        );
      }

      return h(
        'section',
        { className: 'qiq-settings', 'aria-label': t('settingsTitle') },
        h(StyleTag),
        h('h3', { className: 'qiq-settings-title' }, t('settingsTitle')),
        h('p', { className: 'qiq-settings-desc' }, t('settingsDescription')),
        h(
          'div',
          { className: 'qiq-settings-toolbar' },
          h(
            'div',
            { className: 'qiq-search' },
            h('input', {
              type: 'search',
              value: query,
              placeholder: t('searchPlaceholder'),
              'aria-label': t('searchPlaceholder'),
              onChange: function onQueryChange(event) {
                setQuery(event.target.value);
              },
            }),
          ),
          h('span', { className: 'qiq-count' }, t('enabledCount', { count: enabledCount })),
          h(
            'button',
            {
              type: 'button',
              className: 'qiq-link-button',
              onClick: function refresh() {
                ensureCatalog(true);
              },
            },
            t('refresh'),
          ),
        ),
        body,
        h('p', { className: 'qiq-settings-foot' }, t('footerHint')),
      );
    }

    // ---------------------------------------------------------------------
    // Client plugin body
    // ---------------------------------------------------------------------

    /** The right-Sidebar page type this plugin owns. */
    function tabDefinition(t) {
      return {
        id: TAB_ID,
        kind: TAB_KIND,
        priority: 'extension',
        title: function title() {
          return t('railTitle');
        },
        guide: [
          {
            id: TAB_ID,
            order: 60,
            title: function guideTitle() {
              return t('railTitle');
            },
            description: function guideDescription() {
              return t('railGuide');
            },
            icon: QuickInvokeIcon,
          },
        ],
      };
    }

    function apply(ctx) {
      runtime.ctx = ctx;

      ctx.effect(function registerDictionaries() {
        return ctx.locale.register(NS, { zh, en });
      }, 'plugin-quick-invoke: dictionaries');

      // The generated Remote namespaces install asynchronously after the
      // gateway service exists; wait for the plugin-manager namespace instead
      // of reading it once during an early render. When it appears, retry a
      // catalog read that failed and preload an untouched one.
      ctx.inject(['remote.pluginManager'], function managerNamespaceReady(managerCtx) {
        const manager = probeManager(managerCtx) || probeManager(runtime.ctx);
        if (!manager) return;
        remoteManager = manager;
        try {
          if (state.catalog.status === 'error') ensureCatalog(true);
          else if (state.catalog.status === 'idle') ensureCatalog(false);
        } catch (error) {
          logError('preloading the plugin catalog failed', error);
        }
      });

      const t = ctx.locale.bind(NS);

      // The picker's floating panel: a frame-wide overlay, so the composer's
      // own clipping and stacking cannot hide it.
      ctx.effect(function registerPanel() {
        return ctx.slots.inject('shell.overlay', function panelSeat() {
          return ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'plugin-quick-invoke-panel',
              order: 100,
              locale: NS,
            },
            QuickInvokePanel,
          );
        });
      }, 'plugin-quick-invoke: picker overlay');

      // The requested seat: right of the workspace and work-mode controls.
      ctx.effect(function registerHeroTrigger() {
        return ctx.slots.inject('conversation.hero.options', function heroSeat() {
          return ctx.slots.register(
            {
              name: 'conversation.hero.options',
              id: 'plugin-quick-invoke',
              order: 0,
              locale: NS,
            },
            HeroTrigger,
          );
        });
      }, 'plugin-quick-invoke: hero chip');

      // The same chip in the resident composer tool row, so a conversation
      // keeps the picker after the first message.
      ctx.effect(function registerComposerTrigger() {
        return ctx.slots.inject('conversation.input.left', function composerSeat() {
          return ctx.slots.register(
            {
              name: 'conversation.input.left',
              id: 'plugin-quick-invoke',
              order: 60,
              locale: NS,
            },
            ComposerTrigger,
          );
        });
      }, 'plugin-quick-invoke: composer chip');

      // Preferences page: lists installed plugins with a switch and a remark.
      ctx.effect(function registerSettings() {
        return ctx.slots.inject('settings.section', function settingsSeat() {
          return ctx.slots.register(
            {
              name: 'settings.section',
              id: 'plugin-quick-invoke',
              order: 60,
              label: function settingsLabel() {
                return t('settingsTitle');
              },
              locale: NS,
            },
            QuickInvokeSettings,
          );
        });
      }, 'plugin-quick-invoke: settings section');

      // Right Sidebar: a draggable rail the double-click pins in place. The
      // service may activate after this plugin, so wait for it instead of
      // failing the whole bundle when the column is absent.
      ctx.inject(['sidebarRightTabs', 'sidebarRight'], function sidebarReady(sidebarCtx) {
        const tabs = sidebarCtx.sidebarRightTabs;
        const sidebar = sidebarCtx.sidebarRight;
        runtime.sidebar = sidebar;
        sidebarCtx.effect(function registerTabType() {
          return tabs.register(tabDefinition(t));
        }, 'plugin-quick-invoke: right sidebar type');
        sidebarCtx.effect(function registerTabBody() {
          return sidebarCtx.slots.inject('sidebar.right.pane.tab', function tabBodySeat() {
            return sidebarCtx.slots.register(
              {
                name: 'sidebar.right.pane.tab',
                key: TAB_ID,
                locale: NS,
              },
              QuickInvokeRail,
            );
          });
        }, 'plugin-quick-invoke: right sidebar body');
      });
    }

    return { inject: ['slots', 'locale', 'remote'], apply };
  },
});
