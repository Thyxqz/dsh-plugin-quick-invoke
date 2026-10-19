/**
 * Host half of the plugin-quick-invoke bundle.
 *
 * The capability is entirely browser-side: the picker renders in the Web
 * composer, the right rail is a right-Sidebar tab, and its preferences are UI
 * preferences kept in the page's localStorage. The Host row exists so the
 * bundle has a Loader entry the Web app mounts and the plugin registry lists;
 * it registers nothing and holds no configuration.
 */
export function apply() {}
