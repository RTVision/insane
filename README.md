# insane

Lean and configurable whitelist-oriented HTML sanitizer with native Sanitizer API support.

## Features

- **Whitelist-based** - Only allows tags, attributes, and classes you explicitly permit
- **URL sanitization** - Validates URL schemes in href, src, and other URI attributes
- **Lightweight** - ~4KB gzipped with zero runtime dependencies (except `html-entities`)
- **TypeScript** - Full type definitions included
- **Native API support** - Automatically uses the browser's native Sanitizer API when available and compatible
- **Universal** - Works in Node.js and browsers
- **Security hardened** - Fixes CVE-2020-26303 (ReDoS vulnerability) and includes 180+ security tests

## Security

This v3 rewrite addresses the following security issues from the original package:

- **CVE-2020-26303**: Regular Expression Denial of Service (ReDoS) - Fixed by rewriting the HTML parser to use a state machine approach instead of vulnerable regex patterns
- Comprehensive security test suite covering:
  - XSS attack vectors (script injection, event handlers, javascript: URLs)
  - URL scheme validation (blocks javascript:, data:, vbscript:, etc.)
  - HTML entity encoding bypasses
  - Malformed HTML handling
  - Nested/recursive attack patterns
  - ReDoS prevention

## Installation

```bash
npm install insane
# or
pnpm add insane
# or
yarn add insane
```

## Usage

```typescript
import insane from 'insane'

// Basic usage with defaults
insane('<script>alert(1)</script><p>Hello</p>')
// => '<p>Hello</p>'

// Custom options
insane('<div class="foo bar">text</div>', {
  allowedTags: ['div'],
  allowedClasses: { div: ['foo'] }
})
// => '<div class="foo">text</div>'
```

## API

### `insane(html, options?, strict?)`

Sanitizes an HTML string.

- `html` - The HTML string to sanitize
- `options` - Optional sanitization options (merged with defaults)
- `strict` - If `true`, options are used as-is without merging with defaults

Returns the sanitized HTML string.

## Options

### `allowedTags`

Array of allowed HTML tag names (lowercase).

```typescript
insane('<div><script>bad</script></div>', {
  allowedTags: ['div']
})
// => '<div></div>'
```

### `allowedAttributes`

Map of tag names to allowed attribute names. Use `'*'` for attributes allowed on all tags.

```typescript
insane('<a href="/foo" onclick="bad()">link</a>', {
  allowedTags: ['a'],
  allowedAttributes: { a: ['href'] }
})
// => '<a href="/foo">link</a>'
```

### `allowedClasses`

Map of tag names to allowed class names. Only applies when `'class'` is NOT in `allowedAttributes` for that tag.

```typescript
insane('<div class="safe danger">text</div>', {
  allowedTags: ['div'],
  allowedClasses: { div: ['safe'] }
})
// => '<div class="safe">text</div>'
```

### `allowedSchemes`

Array of allowed URL schemes for URI attributes.

```typescript
insane('<a href="javascript:alert(1)">link</a>', {
  allowedSchemes: ['http', 'https']
})
// => '<a>link</a>'
```

Default: `['http', 'https', 'mailto']`

### `filter`

Custom filter function to accept/reject tags. Return `true` to keep the tag, `false` to remove it.

```typescript
insane('<span data-user="admin">secret</span><span>public</span>', {
  allowedTags: ['span'],
  filter: (token) => !token.attrs['data-user']
})
// => '<span>public</span>'
```

### `transformText`

Transform text content before output.

```typescript
insane('<p>hello world</p>', {
  transformText: (text) => text.toUpperCase()
})
// => '<p>HELLO WORLD</p>'
```

## Default Options

```typescript
{
  allowedTags: [
    'a', 'abbr', 'article', 'b', 'blockquote', 'br', 'caption', 'code',
    'del', 'details', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hr', 'i', 'img', 'ins', 'kbd', 'li', 'main', 'mark', 'ol', 'p',
    'pre', 'section', 'span', 'strike', 'strong', 'sub', 'summary',
    'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul'
  ],
  allowedAttributes: {
    '*': ['title', 'accesskey'],
    a: ['href', 'name', 'target', 'aria-label'],
    iframe: ['allowfullscreen', 'frameborder', 'src'],
    img: ['src', 'alt', 'title', 'aria-label']
  },
  allowedClasses: {},
  allowedSchemes: ['http', 'https', 'mailto'],
  filter: null,
  transformText: null
}
```

## Native Sanitizer API

In supported browsers (Chrome 145+, Firefox 148+), `insane` will automatically use the native [Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API) when:

1. The API is available in the browser
2. The options don't use features unsupported by the native API (`allowedClasses`, `filter`, `transformText`, or custom `allowedSchemes`)

This provides better performance and security in modern browsers while maintaining full compatibility everywhere else.

## TypeScript

Full TypeScript support with exported types:

```typescript
import insane, { type InsaneOptions, type TokenInfo, defaults } from 'insane'

const options: InsaneOptions = {
  allowedTags: ['p', 'strong'],
  filter: (token: TokenInfo) => token.tag !== 'script'
}

console.log(defaults.allowedTags)
```

## License

MIT
