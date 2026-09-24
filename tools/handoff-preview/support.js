/* global React, ReactDOM */
/*
 * Stand-in for the design tool's missing `support.js`, so the `.dc.html`
 * handoff prototypes render in a plain browser (served by ./server.mjs).
 *
 * The prototype format: an <x-dc> template (HTML with {{ path }} bindings,
 * <sc-if value> and <sc-for list as>) plus a <script type="text/x-dc"> holding
 * `class Component extends DCLogic` whose renderVals() returns the bindings.
 * Props come from the query string, e.g. ?role=Manager&page=Reports.
 */
(function () {
  'use strict';

  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const RAW = new Set(['style', 'script', 'textarea']);
  // https://html.spec.whatwg.org/#special
  const SPECIAL = new Set(
    ('address applet area article aside base basefont bgsound blockquote body br button caption center col colgroup dd details dir div dl dt ' +
      'embed fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hgroup hr html iframe img input keygen li link ' +
      'listing main marquee menu meta nav noembed noframes noscript object ol p param plaintext pre script search section select source style ' +
      'summary table tbody td template textarea tfoot th thead title tr track ul wbr xmp').split(' ')
  );

  // --- A forgiving HTML tokenizer that keeps attribute case (onClick, autoComplete)
  // and never reparents nodes the way the browser's parser does inside <select>/<p>.
  function parse(src) {
    const root = { tag: '#root', attrs: {}, children: [] };
    const stack = [root];
    let i = 0;
    const top = () => stack[stack.length - 1];
    while (i < src.length) {
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        i = end < 0 ? src.length : end + 3;
        continue;
      }
      if (src[i] === '<' && src[i + 1] === '/') {
        const end = src.indexOf('>', i);
        const name = src.slice(i + 2, end).trim();
        // The HTML parser's "any other end tag" rule: walk up to the matching open
        // element, but give up (ignore the stray end tag) on reaching a "special"
        // element such as a div. The handoff has one stray </sc-if> that relies on it.
        for (let k = stack.length - 1; k > 0; k--) {
          if (stack[k].tag === name) {
            stack.length = k;
            break;
          }
          if (SPECIAL.has(stack[k].tag.toLowerCase())) break;
        }
        i = end + 1;
        continue;
      }
      if (src[i] === '<' && /[a-zA-Z]/.test(src[i + 1] || '')) {
        let j = i + 1;
        while (j < src.length && /[^\s/>]/.test(src[j])) j++;
        const tag = src.slice(i + 1, j);
        const attrs = {};
        let selfClose = false;
        for (;;) {
          while (/\s/.test(src[j])) j++;
          if (src[j] === '>') { j++; break; }
          if (src[j] === '/' && src[j + 1] === '>') { selfClose = true; j += 2; break; }
          let k = j;
          while (k < src.length && /[^\s=>/]/.test(src[k])) k++;
          const name = src.slice(j, k);
          j = k;
          while (/\s/.test(src[j])) j++;
          let value = true;
          if (src[j] === '=') {
            j++;
            while (/\s/.test(src[j])) j++;
            const q = src[j];
            if (q === '"' || q === "'") {
              const end = src.indexOf(q, j + 1);
              value = decode(src.slice(j + 1, end));
              j = end + 1;
            } else {
              let e = j;
              while (e < src.length && /[^\s>]/.test(src[e])) e++;
              value = decode(src.slice(j, e));
              j = e;
            }
          }
          if (name) attrs[name] = value;
          else j++;
        }
        const node = { tag, attrs, children: [] };
        top().children.push(node);
        if (RAW.has(tag.toLowerCase())) {
          const end = src.indexOf('</' + tag, j);
          node.children.push({ text: src.slice(j, end < 0 ? src.length : end) });
          i = end < 0 ? src.length : src.indexOf('>', end) + 1;
          continue;
        }
        if (!selfClose && !VOID.has(tag.toLowerCase())) stack.push(node);
        i = j;
        continue;
      }
      let j = src.indexOf('<', i + 1);
      if (j < 0) j = src.length;
      top().children.push({ text: decode(src.slice(i, j)) });
      i = j;
    }
    return root;
  }

  const ta = document.createElement('textarea');
  function decode(s) {
    if (s.indexOf('&') < 0) return s;
    ta.innerHTML = s;
    return ta.value;
  }

  // --- Bindings
  const BIND = /\{\{\s*([^}]*?)\s*\}\}/g;
  function lookup(expr, scope) {
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    const parts = expr.split('.');
    let v;
    for (let s = scope; s; s = s.parent) {
      if (s.vars && Object.prototype.hasOwnProperty.call(s.vars, parts[0])) {
        v = s.vars[parts[0]];
        break;
      }
    }
    for (let k = 1; k < parts.length && v != null; k++) v = v[parts[k]];
    return v;
  }
  function interpolate(str, scope) {
    const only = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/.exec(str);
    if (only) return lookup(only[1], scope);
    return str.replace(BIND, (_, e) => {
      const v = lookup(e, scope);
      return v == null || v === false ? '' : String(v);
    });
  }

  function styleObject(css) {
    if (css == null || css === false) return undefined;
    if (typeof css === 'object') return css;
    const out = {};
    let depth = 0;
    let start = 0;
    const decls = [];
    for (let i = 0; i <= css.length; i++) {
      const c = css[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if ((c === ';' && depth === 0) || i === css.length) {
        decls.push(css.slice(start, i));
        start = i + 1;
      }
    }
    for (const d of decls) {
      const k = d.indexOf(':');
      if (k < 0) continue;
      const prop = d.slice(0, k).trim();
      const value = d.slice(k + 1).trim();
      if (!prop) continue;
      const key = prop.startsWith('--')
        ? prop
        : prop.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      out[key] = value;
    }
    return out;
  }

  const RENAME = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', colspan: 'colSpan', rowspan: 'rowSpan', crossorigin: 'crossOrigin', autocomplete: 'autoComplete', autofocus: 'autoFocus' };
  const BOOL = new Set(['checked', 'disabled', 'selected', 'readOnly', 'multiple', 'hidden', 'required', 'autoFocus', 'open']);

  function toProps(attrs, scope, key) {
    const props = { key };
    for (const name in attrs) {
      if (name.startsWith('hint-')) continue;
      const raw = attrs[name];
      let v = raw === true ? true : interpolate(raw, scope);
      const prop = RENAME[name] || name;
      if (prop === 'style') v = styleObject(v);
      else if (BOOL.has(prop)) v = !(v === '' || v === false || v == null || v === 'false');
      if (v === undefined) continue;
      props[prop] = v;
    }
    if ('value' in props && props.value == null) props.value = '';
    if ('value' in props && !props.onChange && !props.readOnly && /^(input|textarea|select)$/.test(this_tag)) props.readOnly = true;
    return props;
  }
  let this_tag = '';

  function render(nodes, scope, keyPrefix) {
    const out = [];
    nodes.forEach((n, idx) => {
      const key = keyPrefix + '.' + idx;
      if (n.text != null) {
        if (!n.text.includes('{{')) {
          out.push(n.text);
          return;
        }
        let last = 0;
        let m;
        BIND.lastIndex = 0;
        let part = 0;
        while ((m = BIND.exec(n.text))) {
          if (m.index > last) out.push(n.text.slice(last, m.index));
          const v = lookup(m[1], scope);
          if (v != null && v !== false && v !== true) {
            out.push(React.isValidElement(v) ? React.cloneElement(v, { key: key + ':' + part }) : v);
          }
          part++;
          last = BIND.lastIndex;
        }
        if (last < n.text.length) out.push(n.text.slice(last));
        return;
      }
      if (n.tag === 'sc-if') {
        if (interpolate(n.attrs.value, scope)) out.push(React.createElement(React.Fragment, { key }, render(n.children, scope, key)));
        return;
      }
      if (n.tag === 'sc-for') {
        const list = interpolate(n.attrs.list, scope) || [];
        const as = n.attrs.as || 'item';
        const items = Array.from(list).map((item, i) =>
          React.createElement(
            React.Fragment,
            { key: key + '#' + i },
            render(n.children, { parent: scope, vars: { [as]: item, index: i } }, key + '#' + i)
          )
        );
        out.push(React.createElement(React.Fragment, { key }, items));
        return;
      }
      if (n.tag === 'helmet') return;
      this_tag = n.tag.toLowerCase();
      const props = toProps(n.attrs, scope, key);
      const kids = n.tag === 'style' ? undefined : render(n.children, scope, key);
      if (n.tag === 'style') props.dangerouslySetInnerHTML = { __html: n.children.map((c) => c.text || '').join('') };
      if (this_tag === 'textarea') {
        const txt = (kids || []).join('');
        if (!('value' in props) && txt) props.defaultValue = txt;
        out.push(React.createElement(n.tag, props));
        return;
      }
      out.push(React.createElement(n.tag, props, ...(kids && kids.length ? kids : [])));
    });
    return out;
  }

  function mountHelmet(helmet) {
    for (const n of helmet.children) {
      if (!n.tag) continue;
      const el = document.createElement(n.tag);
      for (const a in n.attrs) el.setAttribute(a, n.attrs[a] === true ? '' : n.attrs[a]);
      if (n.children.length) el.textContent = n.children.map((c) => c.text || '').join('');
      document.head.appendChild(el);
    }
  }

  function findTag(node, tag) {
    if (node.tag === tag) return node;
    for (const c of node.children || []) {
      const f = findTag(c, tag);
      if (f) return f;
    }
    return null;
  }

  function coerce(value, spec) {
    if (!spec) return value;
    if (spec.editor === 'boolean') return value === 'true' || value === '1' || value === '';
    if (spec.editor === 'number') return Number(value);
    return value;
  }

  async function boot() {
    const html = await (await fetch(location.pathname)).text();
    const start = html.indexOf('<x-dc>');
    const end = html.indexOf('</x-dc>');
    const tree = parse(html.slice(start + 6, end));
    const helmet = findTag(tree, 'helmet');
    if (helmet) mountHelmet(helmet);

    const scriptEl = document.querySelector('script[data-dc-script]');
    const propSpecs = JSON.parse(scriptEl.getAttribute('data-props') || '{}');
    const props = {};
    for (const k in propSpecs) if ('default' in propSpecs[k]) props[k] = propSpecs[k].default;
    new URLSearchParams(location.search).forEach((v, k) => {
      props[k] = coerce(v, propSpecs[k]);
    });

    class DCLogic extends React.Component {
      render() {
        const vals = this.renderVals ? this.renderVals() : {};
        return React.createElement(React.Fragment, null, render(tree.children, { vars: vals }, 'r'));
      }
    }
    // eslint-disable-next-line no-new-func
    const Component = new Function('React', 'ReactDOM', 'DCLogic', scriptEl.textContent + '\n;return Component;')(React, ReactDOM, DCLogic);

    const mount = document.createElement('div');
    mount.id = 'dc-root';
    document.body.appendChild(mount);
    ReactDOM.createRoot(mount).render(React.createElement(Component, props));
    window.__dcReady = true;
  }

  function load(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  // Keep the raw template out of the page; the tokenizer reads the source text instead.
  const hide = document.createElement('style');
  hide.textContent = 'x-dc{display:none!important}';
  document.head.appendChild(hide);

  load('/__vendor/react.js')
    .then(() => load('/__vendor/react-dom.js'))
    .then(() => (document.readyState === 'loading' ? new Promise((r) => document.addEventListener('DOMContentLoaded', r)) : null))
    .then(boot)
    .catch((e) => {
      document.body.insertAdjacentHTML('beforeend', '<pre style="color:red">' + String(e && e.stack) + '</pre>');
      throw e;
    });
})();
