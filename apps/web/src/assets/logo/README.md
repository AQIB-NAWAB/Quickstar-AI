# QuickStart AI Brand Assets

This directory contains the official brand marks, symbols, and lockups used by QuickStart AI.

## Structure

```
apps/web/src/assets/logo/
├── icons/
│   └── quickstart-app-icon.svg             # Square app icon
├── lockups/
│   ├── quickstart-lockup-horizontal.svg    # Light horizontal lockup
│   ├── quickstart-lockup-horizontal-dark.svg # Dark horizontal lockup
│   └── quickstart-lockup-stacked.svg       # Stacked lockup
├── symbols/
│   ├── quickstart-symbol.svg               # Primary brand symbol mark
│   ├── quickstart-symbol-obsidian.svg      # Obsidian dark symbol mark
│   └── quickstart-symbol-favicon-cut.svg   # Favicon cut symbol
├── previews/
│   └── quickstart-ignition-in-context.png  # Brand preview in context
```

The core SVG paths are also programmatically rendered via `BrandLogo` in `@/components/brand/brand-logo`.
Public web assets are served from `/public/brand/` and `/public/logo.svg`.
