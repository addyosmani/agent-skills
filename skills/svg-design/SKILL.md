---
name: svg-design
description: Generates and edits SVG logos, icons, and graphics. Use when creating SVG files, designing logos or icons, writing path data, optimizing SVGs, building icon systems, animating SVG elements, or modifying existing vector graphics. Covers path commands, shape primitives, styling, accessibility, gradients, masks, sprites, optimization, and animation (CSS keyframes, GPU acceleration, staggering, easing, SVG-specific techniques).
---

> **Consolidated single-file edition.** This file merges the original `svg-design` SKILL.md
> with all 8 of its `references/` files inline (folded in under "Reference Library" at the
> bottom), so it works as one standalone document. Source: github.com/tryopendata/skills (MIT).


# SVG Creation and Editing

**Core principle:** SVGs are code. Write them by hand like you'd write any markup: clean, minimal, semantically meaningful. Every element and attribute should earn its place.

## Topic Routing

| Task | Load reference |
|------|---------------|
| Arc flag combinations, common path shapes | [Path Patterns](#path-patterns) |
| Logo design, typography, negative space | [Logo Techniques](#logo-techniques) |
| Icon design, grid systems, pixel alignment | [Icon Design](#icon-design) |
| Gradients, masks, clips, filters, transforms (design decisions) | [Advanced Techniques (Gradients, Masks, Clips, Filters)](#advanced-techniques-gradients-masks-clips-filters) |
| Animation (CSS keyframes, stagger, GPU, easing, SVG-specific) | [Animation](#animation) |
| Optimization, sprites, SVGO config | [Optimization, Sprites & SVGO](#optimization-sprites--svgo) |
| Accessibility, browser pitfalls | [Accessibility & Browser Pitfalls](#accessibility--browser-pitfalls) |
| Editing workflow, boolean operations, combining SVGs | [Editing Workflow & Combining SVGs](#editing-workflow--combining-svgs) |

## SVG Skeleton

Always start from this structure:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- content -->
</svg>
```

Adjust `viewBox` to match the design canvas. Omit `width`/`height` attributes to let the SVG scale with its container (add them only when a fixed size is needed).

## Canvas Size Conventions

| Size | Use case | Notes |
|------|----------|-------|
| `0 0 16 16` | Micro icons, favicons | Heroicons micro, GitHub Octicons |
| `0 0 20 20` | Small UI icons, form elements | Heroicons mini |
| `0 0 24 24` | Standard icons (most common) | Lucide, Heroicons outline, Material |
| `0 0 32 32` | Medium icons, navigation | Phosphor uses 256x256 internally |
| `0 0 48 48` | Large display icons | App icons, illustrations |
| Custom | Logos, illustrations | Match the natural aspect ratio |

**Default to 24x24** unless there's a reason not to. It's the industry standard.

## Shape vs Path Decision

| Use shape primitive when... | Use `<path>` when... |
|---|---|
| The shape is a basic geometric form | The shape has curves, complex outlines |
| Readability matters (a circle should look like `<circle>`) | You need to minimize element count |
| You need to animate individual properties (r, cx, cy) | Combining multiple shapes into one element |
| The shape will be programmatically modified | Exporting from design tools (paths are universal) |

## Styling Defaults

Set these on the root `<svg>` element to avoid repetition on children:

| Attribute | Icon default | Logo default | Why |
|-----------|-------------|--------------|-----|
| `fill` | `none` | varies | Icons are typically stroked, logos are filled |
| `stroke` | `currentColor` | `none` or `currentColor` | Inherits text color from parent |
| `stroke-width` | `2` (on 24x24) | varies | Consistent weight across icons |
| `stroke-linecap` | `round` | `round` or `butt` | Rounded ends look cleaner at small sizes |
| `stroke-linejoin` | `round` | `round` or `miter` | Prevents sharp spikes at joins |

**`currentColor` is your friend.** It lets the SVG inherit whatever color the parent element has, making icons themeable with zero extra CSS.

## Stroke-Width Relative to ViewBox

`stroke-width` is in viewBox units, not pixels. Always set relative to your canvas dimensions:

| viewBox | Typical stroke-width | Visual result |
|---------|---------------------|---------------|
| 16x16 | 1.5 | ~9.4% of canvas |
| 24x24 | 2 | ~8.3% of canvas |
| 32x32 | 2-2.5 | ~6.3-7.8% of canvas |
| 48x48 | 3 | ~6.3% of canvas |
| 256x256 | 16 | ~6.3% of canvas |

## When to Convert Shapes to Paths

**Convert when:**
- Combining multiple shapes into a single compound path (boolean operations)
- You need the shape as part of a larger path composition
- Distributing to environments that only support `<path>`
- Optimizing for minimal DOM elements

**Keep as shapes when:**
- Code readability matters (a `<circle>` is self-documenting)
- You need to animate specific properties (animating `r` on a circle is cleaner than animating path data)
- The SVG will be programmatically modified

### Rounded rect-to-path template

The arc parameters here are error-prone to derive. Use this as a reference:

```xml
<!-- <rect x="2" y="2" width="20" height="20" rx="3" /> becomes: -->
<path d="M 5 2 h 14 a 3 3 0 0 1 3 3 v 14 a 3 3 0 0 1 -3 3 h -14 a 3 3 0 0 1 -3 -3 v -14 a 3 3 0 0 1 3 -3 Z" />
```

## fill-rule: evenodd vs nonzero

Use `evenodd` when you have compound shapes with holes. It's simpler because you don't need to worry about winding direction:

```xml
<!-- Donut using evenodd (direction doesn't matter) -->
<path fill-rule="evenodd" d="
  M 12 2 A 10 10 0 1 1 12 22 A 10 10 0 1 1 12 2 Z
  M 12 7 A 5 5 0 1 1 12 17 A 5 5 0 1 1 12 7 Z
" fill="black" />
```

With `nonzero` (default), the inner circle must wind in the opposite direction to create the hole.

## Logo Design Process

When creating logos (not icons), follow this process:

0. **Always clarify design direction before creating logos.** Use AskUserQuestion to present curated design direction choices before writing any SVG code. This step is mandatory for all logo projects. Even when the user provides some direction (like "modern" or "YC style"), those are vibes, not design briefs. A designer would still present options to narrow the direction before investing in 5-15 concepts.

    Present choices like a designer showing mood boards. Don't ask open-ended questions. Tailor options to the user's domain:

    ```
    AskUserQuestion({
      questions: [
        {
          question: "What visual personality fits your brand?",
          header: "Mood",
          multiSelect: false,
          options: [
            { label: "Bold & geometric", description: "Clean shapes, strong lines, confident. Think Stripe, Figma." },
            { label: "Organic & crafted", description: "Hand-drawn feel, natural curves, warmth. Think Mailchimp, Basecamp." },
            { label: "Minimal & typographic", description: "Wordmark-driven, restrained, sophisticated. Think Glossier, Everlane." },
            { label: "Playful & dynamic", description: "Energetic, colorful, movement. Think Slack, Discord." }
          ]
        },
        {
          question: "What should the logo emphasize?",
          header: "Focus",
          multiSelect: false,
          options: [
            { label: "What we do", description: "Visual metaphor tied to your product's core function" },
            { label: "How it feels", description: "Abstract mark that conveys emotion or energy" },
            { label: "Who we are", description: "Letterform or wordmark built from the brand name" }
          ]
        },
        {
          question: "Which of these logos in your space resonates most?",
          header: "Inspiration",
          multiSelect: false,
          options: [
            // IMPORTANT: populate these with 3-4 real, well-known brands
            // in or adjacent to the user's specific industry/domain.
            // Examples below are for an AI startup - replace entirely
            // for other domains.
            { label: "Linear", description: "Precise geometric icon, purple gradient, premium feel" },
            { label: "Stripe", description: "Simple bold wordmark, single accent color, confident restraint" },
            { label: "Notion", description: "Friendly icon with personality, approachable, slightly playful" },
            { label: "Vercel", description: "Abstract minimal triangle, stark black/white, developer-focused" }
          ]
        }
      ]
    })
    ```

    **Tailoring the questions to the domain is critical.** The mood options, focus options, and especially the inspiration logos must be specific to the user's industry. A coffee brand gets Blue Bottle, Stumptown, Intelligentsia, Counter Culture as inspiration options. A fintech startup gets Stripe, Plaid, Mercury, Ramp. A fitness app gets Peloton, Strava, Nike Run Club, Whoop. Pick brands the user will immediately recognize and have an opinion about. The inspiration question does the most work here because it anchors the entire aesthetic direction to something concrete.

    The only exception: skip if the user has specified both a concrete visual style AND specific imagery (e.g., "minimalist geometric logo using a mountain silhouette in navy blue").

1. **Explore multiple metaphors, not multiple layouts of one metaphor.** Conceptual diversity matters more than layout variations. Follow the full ideation process in [Logo Techniques](#logo-techniques), which covers domain-specific brainstorming, category diversity requirements, and cliche avoidance.
2. **Guarantee structural variety.** Every logo set must span multiple *categories* of approach, not just multiple metaphors within the same style. Include at least one from each column when presenting 5+ options: a typographic/wordmark approach, a symbolic icon, an abstract geometric mark, and a letterform-meets-metaphor hybrid. See the category diversity table in [Logo Techniques](#logo-techniques).
3. **Set up the preview immediately, then populate it progressively.** Don't design all logos first and then show them. The user should see results as they're created:
    1. Copy this skill's `assets/preview.html` to the project directory using `cp` with the absolute path from where this skill was loaded (do not read or modify the file).
    2. Design the first logo and write its SVG file.
    3. Write `variants.js` with just that first variant (format in [Editing Workflow & Combining SVGs](#editing-workflow--combining-svgs)).
    4. Open the preview with `open preview.html` (macOS) or `xdg-open preview.html` (Linux). The user now sees the first logo while you keep working.
    5. For each subsequent logo: write the SVG file, then update `variants.js` to add it. The preview auto-reloads both every 3 seconds, so new logos appear in the browser as they're completed.

    This gives the user visual feedback within seconds of the first logo being ready, rather than waiting for all logos to be designed before seeing anything.
4. **For colored logos, always create a `-dark.svg` variant.** Dark navy edges (#1E3A5F) that look great on white disappear on dark backgrounds. Dark variants need lighter edges (#4B8BBE), lighter rings (#3B6B8A), and off-white centers (#E2E8F0).
5. **Plan your vertical budget before drawing.** On a 32x32 canvas with 3 stacked elements, you have ~30 usable units. Sketch the vertical distribution first (e.g., box=12, gap=2, layer=5, gap=2, layer=5) to avoid clipping at viewBox edges.

## Anti-Patterns

| Don't | Do instead |
|-------|-----------|
| Hardcode `width="24" height="24"` without `viewBox` | Use `viewBox` always; add width/height only if needed |
| Set `fill="none"` on a `<g>` group | Set fill on individual elements or the root `<svg>` |
| Use `px` units inside SVG | SVG coordinates are unitless; they map to viewBox |
| Include editor metadata (`<sodipodi:*>`, `<inkscape:*>`) | Strip all editor cruft |
| Use `<text>` for logo wordmarks in distributed SVGs | Convert text to paths for portability |
| Nest transforms three levels deep | Flatten transforms into path coordinates |
| Use `xlink:href` | Use `href` (xlink is deprecated) |
| Forget `xmlns` on standalone SVG files | Always include `xmlns="http://www.w3.org/2000/svg"` |
| Use decimal precision beyond 2-3 places for icons | Round to 2 decimals for icons, 3 max for complex art |

## Cross-References

- **Design aesthetics**: If the `ce` plugin is installed, `Skill(ce:design)` covers broader visual design decisions
- **Mermaid diagrams**: If the `ce` plugin is installed, `Skill(ce:visualizing-with-mermaid)` covers diagram-specific visualizations (not SVG)


---

# Reference Library


## Path Patterns

## Arc Flag Combinations

Given two points and a radius, there are 4 possible arcs. The flags select which one:

```
A rx ry x-rotation large-arc-flag sweep-flag x y

large-arc=0, sweep=0  ->  small arc, counter-clockwise
large-arc=0, sweep=1  ->  small arc, clockwise
large-arc=1, sweep=0  ->  large arc, counter-clockwise
large-arc=1, sweep=1  ->  large arc, clockwise
```

## Hand-Written Path Templates (24x24 grid)

```xml
<!-- Square (10x10 at origin 2,2) -->
<path d="M 2 2 h 10 v 10 h -10 Z" />

<!-- Equilateral triangle centered roughly at 12,12 -->
<path d="M 12 4 L 20 20 L 4 20 Z" />

<!-- Plus/cross icon -->
<path d="M 12 5 v 14 M 5 12 h 14" />

<!-- Checkmark -->
<path d="M 5 12 l 4 4 l 8 -8" />

<!-- X mark -->
<path d="M 6 6 l 12 12 M 18 6 l -12 12" />

<!-- Circle (using arcs) -->
<path d="M 12 2 A 10 10 0 1 1 12 22 A 10 10 0 1 1 12 2 Z" />

<!-- Rounded rectangle (12x8 with 2px radius at 6,8) -->
<path d="M 8 8 h 8 a 2 2 0 0 1 2 2 v 4 a 2 2 0 0 1 -2 2 h -8 a 2 2 0 0 1 -2 -2 v -4 a 2 2 0 0 1 2 -2 Z" />

<!-- Heart -->
<path d="M 12 21 C 5 15 2 11 2 8 A 4 4 0 0 1 6 4 C 8 4 10 5.5 12 8 C 14 5.5 16 4 18 4 A 4 4 0 0 1 22 8 C 22 11 19 15 12 21 Z" />

<!-- Star (5-point) -->
<path d="M 12 2 l 3 7 h 7 l -5.5 4.5 l 2 7 L 12 16 l -6.5 4.5 l 2 -7 L 2 9 h 7 Z" />
```


## Logo Techniques

## Principles of Clean, Scalable Logos

1. **Simplicity scales.** A logo must read clearly at 16px favicon size and 200px hero size. Eliminate detail that disappears at small sizes.
2. **Geometric construction.** Build from circles, rectangles, and triangles. Organic curves should still derive from geometric foundations.
3. **Consistent stroke weight.** If using strokes, keep them uniform unless intentional contrast is the design concept.
4. **Limited color palette.** 1-3 colors max. A good logo works in single-color (monochrome) form first, then gets color added.
5. **No raster effects.** Avoid filters, blur, drop shadows in the SVG itself. These don't scale cleanly and add file size.

## Typography in SVGs

### When to use `<text>`

- Internal tools, dashboards, or prototypes where the font is guaranteed
- Dynamic text that changes (user names, labels)
- SVGs that need to be searchable/indexable
- When file size matters (text is tiny compared to outlined paths)

### When to convert text to paths

- Logo wordmarks distributed as standalone files
- Any SVG that must render identically without font dependencies
- Icons containing letterforms (like a "B" for bold icon)
- Print/brand assets

**Trade-off:** Outlined text bloats file size significantly. A single word can go from ~200 bytes as `<text>` to 5-10KB as paths. Only outline when portability is required.

## Negative Space Techniques

Negative space creates shapes through absence rather than presence. This is how you create logos where two meanings coexist (like the FedEx arrow).

### Using fill-rule="evenodd"

The simplest way. Overlapping subpaths within a single `<path>` automatically create holes:

```xml
<!-- Circle with square hole (badge icon) -->
<path fill-rule="evenodd" d="
  M 12 2 A 10 10 0 1 1 12 22 A 10 10 0 1 1 12 2 Z
  M 8 8 h 8 v 8 h -8 Z
" fill="currentColor" />
```

### Using clip-path

Cut one shape out of another:

```xml
<defs>
  <clipPath id="cut-hole">
    <path d="M 0 0 h 24 v 24 h -24 Z M 8 8 h 8 v 8 h -8 Z" fill-rule="evenodd" />
  </clipPath>
</defs>
<circle cx="12" cy="12" r="10" clip-path="url(#cut-hole)" fill="currentColor" />
```

### Using mask with white/black

White areas of a mask are visible, black areas are hidden:

```xml
<defs>
  <mask id="knockout">
    <rect width="24" height="24" fill="white" />
    <rect x="8" y="8" width="8" height="8" fill="black" />
  </mask>
</defs>
<circle cx="12" cy="12" r="10" mask="url(#knockout)" fill="currentColor" />
```

## Combining Geometric Shapes

### Layered composition

Stack shapes using document order (later elements render on top):

```xml
<!-- Shield logo -->
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <!-- Shield body -->
  <path d="M 12 2 L 4 6 v 6 c 0 5 3.5 9.5 8 11 c 4.5 -1.5 8 -6 8 -11 V 6 Z" fill="#3B82F6" />
  <!-- Inner checkmark -->
  <path d="M 8 12 l 3 3 l 5 -6" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
</svg>
```

### Compound path (single path, multiple subpaths)

Multiple `M` commands in one path create subpaths. Combined with `fill-rule="evenodd"`, overlapping areas become transparent:

```xml
<!-- Ring with notch -->
<path fill-rule="evenodd" d="
  M 12 1 A 11 11 0 1 1 12 23 A 11 11 0 1 1 12 1 Z
  M 12 5 A 7 7 0 1 1 12 19 A 7 7 0 1 1 12 5 Z
" fill="currentColor" />
```

## Creating Symmetrical Designs

### Mirror technique

Design half the shape, then mirror it. For horizontal symmetry, design the right half and negate x-offsets for the left:

```xml
<!-- Symmetrical leaf/wing using relative commands -->
<path d="
  M 12 4
  C 16 4 20 8 20 12
  C 20 16 16 20 12 20
  C 8 20 4 16 4 12
  C 4 8 8 4 12 4 Z
" />
```

### Using transform for symmetry

```xml
<g>
  <!-- Left wing -->
  <path d="M 12 8 Q 6 4 4 12 Q 6 16 12 16 Z" fill="currentColor" />
  <!-- Right wing (mirrored) -->
  <path d="M 12 8 Q 18 4 20 12 Q 18 16 12 16 Z" fill="currentColor" />
</g>
```

### Rotational symmetry with transform

```xml
<!-- 3-part rotational logo -->
<g fill="currentColor">
  <path d="M 12 4 L 14 10 L 12 12 Z" />
  <path d="M 12 4 L 14 10 L 12 12 Z" transform="rotate(120 12 12)" />
  <path d="M 12 4 L 14 10 L 12 12 Z" transform="rotate(240 12 12)" />
</g>
```

## Logo Ideation: Exploring Metaphors

Don't fixate on one concept. Before writing any SVG code, brainstorm 8-10 visual metaphors that represent the product. Then pick the 3-4 strongest and create variants of each.

### Step 1: Mine the domain

The biggest source of generic logos is skipping this step. Before thinking about shapes, list 10-15 physical objects, tools, environments, textures, and actions that are *specific to this product's world*:

- A marine logistics company: knots, anchors, currents, hull cross-sections, container stacks, signal flags, wake patterns, bollards, cargo nets
- A code editor: cursors, brackets, indentation, diff markers, tree structures, merge arrows, syntax highlighting bands, terminal prompts
- A bakery: wheat stalks, dough scoring patterns, rolling pins, oven arches, braided loaves, flour dusting, banneton spiral imprints

These domain objects become the raw material. If you can't list 10, you don't know the domain well enough yet.

### Step 2: Semantic branching (literal -> abstract -> unexpected)

For each promising domain object, push through three levels of abstraction:

| Level | Example (coffee roaster) | What it produces |
|---|---|---|
| **Literal** | A coffee bean shape | Recognizable but generic, likely overused |
| **Abstract** | The bean's center crease as a single curved line | Distinctive, still evocative |
| **Unexpected** | The crease becomes a sound wave (roasting = transformation) | Unique, carries a second meaning |

The best logos live at level 2-3. Level 1 is where cliches come from. Always push at least to level 2.

### Step 3: Check against industry cliches

Before finalizing concepts, reject any that match common overused motifs:

| Industry | Overused motifs to avoid |
|---|---|
| Tech/SaaS | Hexagons, circuit boards, generic nodes-and-edges, globe with lines |
| Finance | Bar charts going up, shield shapes, dollar signs, generic buildings |
| Health/wellness | Hearts, crosses, leaves, human silhouettes with arms up |
| Education | Open books, graduation caps, lightbulbs, apples |
| Food/restaurant | Fork-and-knife, chef hats, plates, steam swirls |
| Creative/design | Pencils, color wheels, paintbrushes, eye symbols |
| Environment/green | Leaves, globes, trees, recycling arrows |

If a concept matches this list, push it to level 2-3 abstraction or replace it entirely.

### Step 4: Guarantee category diversity

Every logo set of 5+ options must include concepts from different *structural categories*, not just different metaphors rendered the same way:

| Category | What it means | Forces you to... |
|---|---|---|
| **Typographic/wordmark** | The brand name IS the logo, styled distinctively | Explore letterform design, ligatures, custom strokes |
| **Symbolic icon** | A recognizable object or scene, simplified | Think about what single image represents the brand |
| **Abstract geometric** | Non-representational shapes, patterns, or compositions | Work with pure form, color, and spatial relationships |
| **Letterform + metaphor** | A letter that doubles as a visual concept | Find where typography and meaning intersect |
| **Negative space / dual-read** | Two meanings coexist in one mark (FedEx arrow style) | Think about figure-ground relationships |

Include at least 3 of these 5 categories. If all your concepts are symbolic icons, the set lacks structural variety regardless of how different the symbols are.

### Step 5: SCAMPER one concept to push it further

Pick your most promising concept and run it through these lenses to generate unexpected variants:

- **Substitute**: Swap the expected symbol for something from a different domain
- **Combine**: Merge two unrelated visual ideas into one mark
- **Adapt**: Borrow visual language from another industry entirely
- **Modify**: Push scale, weight, or proportion to an extreme
- **Put to other use**: Use typography as illustration, or vice versa
- **Eliminate**: Strip to the absolute minimum recognizable form
- **Reverse**: Flip figure/ground, invert the concept, use negative space

You don't need all 7. Even running 2-3 lenses on one concept often produces the most distinctive option in the set.

### Rendering techniques that work at small sizes

These are techniques for *how* to render a concept, not concepts themselves. Pair with domain-specific metaphors:

| Technique | Why it works at 16px | Example |
|---|---|---|
| **Single bold silhouette** | One shape, no detail to lose | Stripe, Spotify |
| **Stylized letterform** | Instantly recognizable, scales perfectly | Medium, Facebook |
| **Overlapping shapes** (2-3 max) | Reads as a unit | Mastercard, Olympics |
| **Isometric projection** | 3 flat faces = 3 colors, very readable | Figma files icon |
| **Broken/open shape** (gap implies meaning) | The absence carries the concept | OpenAI |
| **Abstract mark** | Pure shape, no literal meaning needed | Nike, Slack |
| **Negative space cutout** | Two meanings coexist | FedEx arrow, NBC peacock |
| **Contained symbol** (shape inside a frame) | Frame provides structure at small sizes | Instagram, App Store |

### What to avoid at small sizes

- Thin lines or strokes under 1.5px (on 32x32 viewBox)
- More than 6-7 distinct elements
- Text or letterforms with serifs
- Gradients with more than 2 stops (muddy at small sizes)
- Details that only appear above 48px

## Isometric and 3D Techniques

Isometric projection creates a sense of depth using three visible faces. No perspective distortion, so it scales cleanly.

### Basic isometric cube

Three parallelogram faces. The key angles: left face leans right, right face leans left, top face is a diamond.

```xml
<!-- viewBox 0 0 32 32 -->
<!-- Top face (lightest) -->
<path d="M 16 4 L 28 11 L 16 18 L 4 11 Z" fill="#38BDF8" />
<!-- Left face (medium) -->
<path d="M 4 11 L 16 18 L 16 28 L 4 21 Z" fill="#2563EB" />
<!-- Right face (darkest) -->
<path d="M 16 18 L 28 11 L 28 21 L 16 28 Z" fill="#1E3A5F" />
```

**Color convention:** Top = lightest (lit from above), left = medium, right = darkest. This creates convincing depth with flat colors.

### Stacked floating layers

Multiple diamond shapes floating above a base, suggesting data layers lifting out of a container.

```xml
<!-- Base box -->
<path d="M 4 18 L 16 23 L 28 18 L 16 13 Z" fill="#2563EB" opacity="0.25" />
<path d="M 4 18 L 16 23 L 16 30 L 4 25 Z" fill="#2563EB" />
<path d="M 16 23 L 28 18 L 28 25 L 16 30 Z" fill="#1E3A5F" />
<!-- Floating layer 1 -->
<path d="M 4 13 L 16 18 L 28 13 L 16 8 Z" fill="#10B981" />
<!-- Floating layer 2 -->
<path d="M 4 9 L 16 14 L 28 9 L 16 4 Z" fill="#38BDF8" />
```

### Spatial budgeting for multi-element compositions

Before coding, plan the vertical distribution to avoid clipping:

```
viewBox height: 32
Top padding:     2  (y=0 to y=2)
Layer 2:         4  (y=2 to y=6, diamond spans 4 units tall)
Gap:             2
Layer 1:         4  (y=8 to y=12)
Gap:             2
Box top:         5  (y=14 to y=19)
Box sides:       7  (y=19 to y=26)
Bottom padding:  2  (y=26 to y=32, but box extends to ~y=30)
```

Sketch this budget on paper first. Adjusting after the fact is tedious because moving one element means moving everything.

## Dark Mode Variants for Colored Logos

Logos with hardcoded colors need separate dark-mode SVG files. `currentColor` logos can use CSS `filter: brightness(0) invert(1)` but colored logos cannot.

### Color mapping for dark variants

| Element | Light mode | Dark mode | Why |
|---|---|---|---|
| Connection lines | `#1E3A5F` (dark navy) | `#4B8BBE` (medium blue) | Navy disappears on dark backgrounds |
| Node outer rings | `#1E3A5F` | `#3B6B8A` (steel blue) | Needs contrast against dark bg |
| White fills | `#FFFFFF` | `#E2E8F0` (off-white) | Pure white is harsh on dark bg |
| Colored fills | Same hex values | Same or slightly brighter | Colors already pop on dark |

### File naming convention

```
logo-color-blue.svg          # Light mode
logo-color-blue-dark.svg     # Dark mode variant
```

### Node ring + fill pattern (illustrated icon style)

A popular technique for colored logos: each node has a dark outer ring with a colored inner fill. Creates depth and reads well at small sizes.

```xml
<!-- Light mode node -->
<circle cx="12" cy="8" r="3" fill="#1E3A5F" />   <!-- outer ring -->
<circle cx="12" cy="8" r="2" fill="#38BDF8" />   <!-- inner fill -->

<!-- Dark mode equivalent -->
<circle cx="12" cy="8" r="3" fill="#3B6B8A" />   <!-- lighter ring -->
<circle cx="12" cy="8" r="2" fill="#38BDF8" />   <!-- same fill -->
```

## Logo File Checklist

Before shipping a logo SVG:

- [ ] Works at 16px (favicon), 32px, 64px, and 200px+
- [ ] Works in monochrome (single color)
- [ ] Works on both light and dark backgrounds (use `currentColor` or provide dark variants for colored logos)
- [ ] Dark variants created for any logo with hardcoded colors (see dark mode section above)
- [ ] No content clipping at viewBox edges (check all coordinates are within bounds)
- [ ] No embedded fonts (text converted to paths)
- [ ] No editor metadata or hidden layers
- [ ] `viewBox` is tight to the artwork (no excess whitespace)
- [ ] `xmlns` attribute present
- [ ] File is optimized (see optimization reference)


## Icon Design

## Industry Conventions by Library

| Library | viewBox | Stroke width | Linecap | Linejoin | Fill | Sizes |
|---------|---------|-------------|---------|----------|------|-------|
| **Lucide** | 0 0 24 24 | 2 | round | round | none | 24 |
| **Heroicons outline** | 0 0 24 24 | 1.5 | round | round | none | 24 |
| **Heroicons solid** | 0 0 24 24 | n/a | n/a | n/a | #0F172A | 24 |
| **Heroicons mini** | 0 0 20 20 | n/a | n/a | n/a | #0F172A | 20 |
| **Heroicons micro** | 0 0 16 16 | n/a | n/a | n/a | #0F172A | 16 |
| **Material** | 0 0 24 24 | 2 | n/a | n/a | varies | 24 |
| **Phosphor** | 0 0 256 256 | ~16 | round | round | none | 256 (scaled) |

## Pixel-Perfect Alignment

Icons at small sizes (16-24px) render on actual device pixels. Misalignment causes blurry edges.

### Rules for sharp rendering

1. **Snap to integer coordinates.** Points at `x=12` render sharply. Points at `x=12.5` may blur.
2. **Account for stroke width.** A stroke-width of 2 on a line at `y=12` extends 1px above and 1px below (from y=11 to y=13). The line center should be on an integer.
3. **Odd stroke widths need half-pixel positioning.** A stroke-width of 1 centered on `y=12` extends from 11.5 to 12.5, which doesn't align to pixels. Center it on `y=12.5` instead.
4. **Use whole-number dimensions.** Icon containers should be integer widths/heights.

### Stroke alignment cheat sheet

| Stroke width | Position line center at | Why |
|-------------|------------------------|-----|
| 1 | x.5 (half pixel) | 0.5 + 0.5 = fills exactly 1 pixel |
| 1.5 | integer | 0.75 on each side, rounds to 1px each |
| 2 | integer | 1 + 1 = fills exactly 2 pixels |
| 3 | x.5 (half pixel) | 1.5 + 1.5 = fills exactly 3 pixels |

## Consistent Stroke Weights

Within an icon set, every icon should use the same stroke width. This creates visual cohesion.

**For a 24x24 grid:**
- Lucide: `stroke-width="2"` everywhere
- Heroicons: `stroke-width="1.5"` everywhere
- Never mix weights within a single icon unless it's a deliberate design choice (like a bold accent)

**For filled icons:** Use uniform path widths. A "line" in a filled icon is a rectangle or path with consistent width. Measure your paths to ensure uniformity.

## Optical Balance and Visual Weight

Not all shapes have equal visual weight at the same physical size. Compensate:

| Shape | Adjustment needed |
|-------|------------------|
| Circle | Slightly larger than a square to look the same size |
| Triangle | Needs to be taller than a square to match visual weight |
| Horizontal line | Looks lighter than vertical line of same dimensions |
| Detailed icon | Looks heavier than simple icon at same size |

### The blur test

Squint at your icon or apply a gaussian blur. If it looks significantly darker/lighter than neighboring icons, adjust the visual weight. A set of icons should look roughly equally "dense" when blurred.

### Optical centering

Mathematical center != visual center. A "play" triangle centered mathematically looks too far left. Shift it slightly right to look visually centered. An arrow pointing right needs to be shifted a few units right.

**General rule:** Shift directional shapes ~1-2 units (on 24x24 grid) in their "pointing" direction.

## Icon Grid System

Material Design defines a grid system that most icon sets loosely follow:

### The 24x24 grid zones

```
+------------------------+
|  1px padding (all sides)|
|  +------------------+  |
|  |   20x20 live     |  |
|  |    area          |  |
|  |                  |  |
|  |   Content goes   |  |
|  |   here           |  |
|  +------------------+  |
+------------------------+
```

- **Trim area:** Full 24x24 canvas. Nothing should extend beyond this.
- **Live area:** 20x20 (2px padding on each side). All icon content should fit within this zone.
- **Padding:** 2px minimum on all sides. Some icons (circles, squares) may use the full live area; others should have more breathing room.

### Keyline shapes (Material Design)

These are reference shapes that define the "bounding box" of different icon types:

| Shape | Dimensions (within 20x20 live area) | Use for |
|-------|-------------------------------------|---------|
| Circle | 20px diameter | Round icons (globe, user avatar) |
| Square | 18x18 | Square icons (file, card) |
| Vertical rectangle | 16x20 | Tall icons (document, phone) |
| Horizontal rectangle | 20x16 | Wide icons (landscape, video) |

The keylines ensure different-shaped icons occupy similar visual space.

### Corner radius

| Element size | Corner radius |
|-------------|---------------|
| >= 8px | 2px |
| < 8px | 1px |
| Interior corners | 0px (square) |

## Lucide Element Constraints

Lucide convention prohibits `<g>`, `transform`, `<use>`, `<defs>`, `<filter>`, inline styles, and `<text>`. Flatten everything to bare shape/path elements with styling on the root `<svg>`. Follow these constraints when building icon sets. For standalone icons or logos, you can be more flexible.

## Naming Conventions

| Convention | Example |
|-----------|---------|
| Lowercase kebab-case | `arrow-up-right.svg` |
| Describe appearance, not function | `arrow-up` not `scroll-to-top` |
| Group variants | `chevron-left`, `chevron-right`, `chevron-up` |
| Size elements largest-to-smallest | `circle-dot` (circle is bigger than dot) |
| No numerals (unless the icon shows a number) | `calendar` not `calendar1` |


## Advanced Techniques (Gradients, Masks, Clips, Filters)

## Gradient Tips for Logos

- Use gradients sparingly. A logo should work in flat/monochrome first.
- Prefer 2-3 stops max. Complex gradients don't scale down well.
- Always provide a flat-color fallback version of gradient logos.
- Use `gradientUnits="userSpaceOnUse"` when applying the same gradient across multiple shapes to get a unified gradient rather than per-shape gradients.

## Clip-path vs Mask

| Feature | clip-path | mask |
|---------|-----------|------|
| Transparency | Binary (in or out) | Gradient (luminance-based) |
| Performance | Faster | Slower |
| Use case | Hard edges, shape cutouts | Fade effects, soft edges |
| Defined with | Shapes/paths | Any elements (including gradients) |

## When to Use Filters in Logos

Almost never. Filters are raster operations that:
- Don't scale cleanly at different sizes
- Increase rendering cost
- Add complexity to the SVG

If you need a shadow or glow on a logo, consider:
- Using a slightly offset duplicate shape with reduced opacity
- Applying the shadow via CSS `filter: drop-shadow()` on the container instead
- Creating the shadow effect with actual vector shapes

## SVG Transform vs CSS Transform

| Aspect | SVG `transform` attribute | CSS `transform` property |
|--------|--------------------------|-------------------------|
| Default origin | `0 0` (top-left of SVG canvas) | `50% 50%` (center of element) |
| Origin control | Via `rotate(angle, cx, cy)` parameter | Via `transform-origin` property |
| Priority | Lower (CSS overrides) | Higher |
| Animation | Harder (SMIL or JS) | Easier (CSS transitions/keyframes) |
| Units | SVG user units only | Supports px, %, em, etc. |

**When baking transforms into path data is better:** For distributed icons, flatten transforms into the path coordinates. This avoids rendering differences and makes the SVG simpler. Design tools do this on export. For dynamic/animated SVGs, keep transforms as attributes or CSS.


## Animation

Non-obvious patterns and gotchas for animating SVG elements, especially in React/JSX projects with bundlers like Vite.

## Vite/Bundler Trap

**Never use `<style>` tags inside JSX-rendered SVGs.** Vite's `EnvironmentPluginContainer.transform` crashes with `Cannot read properties of undefined (reading 'call')`. SMIL elements (`<animate>`, `<animateTransform>`) work but run on CPU with no GPU acceleration.

**Solution:** Create a separate `.css` file, import it in the component, apply classes via `className`. This gets GPU compositing and avoids bundler issues.

## Splitting Opacity and Transform

When opacity and transform need different easing (common for assembly-line effects), split into separate `@keyframes` and stack them on one element:

```css
.element {
  animation:
    fade 14s linear infinite,        /* opacity: clean boundaries */
    move 14s cubic-bezier(0.12, 0, 1, 1) infinite;  /* transform: parabolic */
}
```

This is the key to making multi-phase animations feel right. Linear on opacity prevents weird fade artifacts, while the bezier on transform controls the motion feel.

## Hidden Phase Math

If a layer is active for 20% of its cycle, 80% is invisible. This ratio controls density:

- **Visible layers at any time** ≈ `(active% / 100) * (cycle_duration / stagger_interval)`
- To show 2-3 simultaneous layers: active phase ~20%, stagger ~2-3s on a 14-21s cycle
- If layers overlap at the same position, you have a z-ordering problem (see below)

## Negative Delays for Instant Start

Positive `animation-delay` creates a broken-looking ramp-up on page load where only some layers are active. Negate all delays so the animation appears already mid-cycle:

```
negative-delay = -(cycle-duration) + positive-delay
```

## Organic Stagger and Burst Pairs

Even spacing feels mechanical. Vary gaps for organic feel: `0, 1.6, 3.5, 5.0, 6.8` instead of `0, 2, 4, 6, 8`.

**Burst pairs:** Group elements in pairs (200-500ms apart) with larger gaps (~3-3.5s) between pairs. Creates an assembly-line pulse.

**Critical z-order rule for pairs:** The trailing element (later delay) must render *first* in DOM so the leading element (earlier delay, higher position) paints on top. SVG paints later DOM elements on top. This prevents the newer/lower layer from rendering over the older/higher one.

## Easing + Keyframe Interaction

**Use `linear` timing when you have many keyframe stops.** The motion curve is already baked into keyframe positions. A bezier on top causes double-easing/jitter.

**Use a bezier when you have few stops.** With 2-3 position keyframes, the bezier controls interpolation between them. `cubic-bezier(0.12, 0, 1, 1)` gives a parabolic O(n²) acceleration.

## SVG-Specific Techniques

### ViewBox clipping

The `viewBox` naturally clips content outside bounds. Calculate when an element's top point exits: if top is at `y=13` and viewBox starts at `y=0`, clip happens at `translateY = -13px`. Fade out *before* this point to avoid a hard cut.

### Box occlusion (emerge-from-container)

Make layers appear to rise from inside a container using SVG paint order instead of clipPath/mask:

1. Render container lid *before* animated layers (behind)
2. Render animated layers (start at positive Y, inside the box)
3. Render container walls *after* layers (on top, occluding layers while inside)

The walls naturally hide layers until they rise above the top edge. Add a subtle opacity fade-in (~200-400ms) during the emerge for a cleaner reveal. No mask/clip elements needed.

### Stagger spacing to prevent overlap

When layers share the same spawn position, ensure `stagger_interval > linger_duration` so a new layer never fades in while the previous one is still sitting at the same position. If they overlap spatially, no DOM order can fix the z-fighting since the correct stacking changes over time.

## SVG vs HTML Animation Differences

These are critical differences that will silently break your animations if you assume SVG elements behave like HTML elements.

### CSS `clip-path: inset()` does not work on SVG `<g>` elements

`clip-path: inset()` needs a reference bounding box. HTML elements have one. SVG `<g>` groups do NOT have an intrinsic box, so `inset()` percentages resolve to nothing. The clip has no visual effect.

**Apply clip-path to individual child elements** (rect, path, circle), not to groups. For grouped clipping, use SVG `<clipPath>` with a `<rect>` child, not CSS `clip-path`.

Exception: `<g>` elements containing `<path>` children sometimes work because the path establishes a bounding box. Test case by case, don't assume.

### CSS `transform` conflicts with SVG `transform` attribute

An SVG element with `<g transform="translate(100,50)">` cannot have an independent CSS `transform: scale(0.5)` animation. CSS `transform` and SVG `transform` occupy the same property slot. The CSS value replaces the SVG attribute, displacing the element entirely.

**Fix:** For elements positioned with SVG `transform` attributes (common with arc/pie slices, force-directed graph nodes), use `opacity`-only animations. Never add CSS transform animations to these elements.

### SVG elements have no consistent DOM wrapper structure

Different SVG mark types may render as:
- `<g class="mark-type"><rect>` (wrapped in a group)
- `<circle class="mark-type">` (bare element, no wrapper)
- `<text class="mark-type">` (bare element)

A CSS selector like `.mark-type circle` fails when the circle IS the `.mark-type` element. Always inspect the actual DOM structure before writing selectors. Use `circle.mark-type` (element selector) vs `.mark-type circle` (descendant selector) accordingly.

### Sequential chained animations need linear easing

When chaining animations so segment B starts when segment A ends, non-linear easing creates visible jitter at handoffs. Segment A decelerates, then segment B starts at full speed, producing a stutter.

**Fix:** Use `animation-timing-function: linear` for all segments in a chain. Reserve non-linear easing (spring, ease-out, bezier) for standalone animations that don't hand off to another element.


## Optimization, Sprites & SVGO

## Consolidate Styles to Root Element

```xml
<!-- Before: repeated on every element -->
<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" d="..." />
<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" d="..." />

<!-- After: set once on root -->
<svg stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" ...>
  <path d="..." />
  <path d="..." />
</svg>
```

## SVGO (Automated Optimization)

Install via npm: `npm install -g svgo`

```bash
svgo input.svg -o output.svg
svgo input.svg                  # Overwrite in place
svgo -f ./icons/                # Process entire folder
```

### Recommended config for icons

```js
// svgo.config.mjs
export default {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,          // CRITICAL: never remove viewBox
          cleanupIds: false,             // Keep IDs if using defs/use
        },
      },
    },
    'removeXMLNS',                       // Only if inlining in HTML
    {
      name: 'convertPathData',
      params: {
        floatPrecision: 2,              // 2 decimals for icons
      },
    },
  ],
};
```

### Dangerous SVGO defaults to disable

| Plugin | Risk | Fix |
|--------|------|-----|
| `removeViewBox` | Breaks responsive scaling | Set `removeViewBox: false` |
| `cleanupIds` | Breaks gradient/mask/clipPath references | Disable if using defs |
| `removeHiddenElems` | Can remove elements that are revealed via CSS/JS | Disable for animated SVGs |
| `collapseGroups` | Removes groups that may carry important transforms | Review output |

## Sprites

**Pros:** Single HTTP request for all icons, browser caches the file, consistent styling.

**Cons:** Downloads all icons even if page uses one. No tree-shaking. External sprite files don't work with `<use>` in Safari for cross-origin requests.

## When to Use `<g>` Groups

Groups are free (no rendering cost) but add DOM complexity. Use them when:

- Applying a shared `transform` to multiple elements
- Applying a shared `opacity`, `clip-path`, `mask`, or `filter`
- Logically grouping elements for readability
- Adding event handlers to a collection of shapes

Don't use them just for organization in distributed icons (Lucide prohibits them entirely).


## Accessibility & Browser Pitfalls

## Accessibility Quick Reference

| SVG role | Implementation |
|----------|---------------|
| Decorative (next to text) | `aria-hidden="true"` on svg |
| Informative (standalone icon) | `role="img"` + `<title>` + `aria-labelledby` |
| Complex (illustration) | `role="img"` + `<title>` + `<desc>` + `aria-labelledby` |
| Inside a button | Button gets `aria-label`, SVG gets `aria-hidden="true"` |
| Focusable but shouldn't be | Add `focusable="false"` (IE/Edge legacy issue) |

`<title>` must be the **first child** of its parent element. Use `role="img"` to tell screen readers to treat the SVG as a single image.

## Common Pitfalls

### stroke-width scales with viewBox

`stroke-width` is in viewBox units, not pixels. A `stroke-width="2"` on a `viewBox="0 0 24 24"` SVG rendered at 48px appears as 4px thick. Use `vector-effect="non-scaling-stroke"` only for maps/technical drawings where you need fixed-pixel strokes.

### fill="none" on groups overrides children

Setting `fill="none"` on a `<g>` group makes all children without explicit `fill` invisible. Set fill on individual elements or the root `<svg>`, not on groups.

### Missing width/height causes 0x0 in some contexts

SVGs without `width`/`height` attributes render as 0x0 in:
- Flexbox containers (Safari)
- Absolutely positioned elements
- `<img>` tags without CSS sizing
- Email clients

For `<img>` usage, always provide `width` and `height` attributes.

### viewBox mismatch clips content

Content extending beyond viewBox boundaries gets clipped. Either adjust the viewBox to contain all content, or add `overflow="visible"` (but this can cause layout issues).

### Stroke extends beyond the path

Strokes are centered on the path. A `stroke-width="2"` extends 1 unit on each side. If your path touches the viewBox edge, the stroke gets clipped. Inset shapes by half the stroke width. This is why icon guidelines specify 1-2px padding from the viewBox edge.

### Browser rendering differences

| Issue | Browsers affected | Workaround |
|-------|-------------------|------------|
| SVG in flexbox renders at 0x0 | Safari | Add explicit `width`/`height` |
| `<use>` with external file doesn't work cross-origin | Safari, older Firefox | Inline the sprite or use same-origin |
| `transform-origin` default differs | Firefox vs Chrome (historically) | Always set `transform-origin` explicitly |
| CSS `filter: drop-shadow()` clips at viewBox | Some browsers | Add padding to viewBox |
| `<text>` font rendering varies | All browsers | Convert to paths for exact rendering |

### Colored SVGs invisible on dark backgrounds

Logos with hardcoded dark colors (like `#1E3A5F` for edges) disappear on dark backgrounds. CSS `filter: brightness(0) invert(1)` only works for monochrome SVGs. Create separate `-dark.svg` variants with lighter structural colors. Keep colored fills the same; lighten edges, rings, and connection lines.

```
logo-brand.svg        ->  edges: #1E3A5F, rings: #1E3A5F, centers: white
logo-brand-dark.svg   ->  edges: #4B8BBE, rings: #3B6B8A, centers: #E2E8F0
```


## Editing Workflow & Combining SVGs

## Flipping/Mirroring

The `translate` compensates for the flip moving content off-canvas. Values should match the viewBox dimensions.

```xml
<!-- Horizontal flip -->
<g transform="scale(-1, 1) translate(-24, 0)">...</g>

<!-- Vertical flip -->
<g transform="scale(1, -1) translate(0, -24)">...</g>
```

## Combining Multiple SVGs

Merge SVGs by placing their content into a single `<svg>` element. Adjust positions using `transform="translate(x, y)"` or by wrapping in `<g>` groups.

```xml
<!-- Icon + text logo composition -->
<svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
  <!-- Icon (scaled down from 24x24 to 32x32 area, positioned at left) -->
  <g transform="translate(4, 4) scale(1.33)">
    <!-- paste icon paths here -->
  </g>
  <!-- Wordmark text -->
  <text x="44" y="28" font-family="Inter" font-size="20" font-weight="700" fill="currentColor">
    BrandName
  </text>
</svg>
```

## Boolean Operations as Compound Paths

Design tools have union, subtract, intersect, and exclude. In raw SVG, achieve these with compound paths and fill rules.

### Union (combine two shapes)

Merge both shapes' path data into a single `<path>`. With the default `fill-rule="nonzero"`, overlapping same-direction subpaths just fill.

For a true outline-only union (merged contour), you'd need to calculate the actual merged path. In practice, either accept overlapping paths (they render the same when filled) or manually trace the combined outline.

### Subtract (cut one shape out of another)

Use `fill-rule="evenodd"` with overlapping subpaths. The intersection becomes transparent:

```xml
<!-- Circle with rectangular cutout -->
<path fill-rule="evenodd" d="
  M 12 2 A 10 10 0 1 1 12 22 A 10 10 0 1 1 12 2 Z
  M 8 8 h 8 v 8 h -8 Z
" />
```

Alternatively, use `<mask>` for non-path shapes.

### Intersect (keep only the overlap)

Use `<clipPath>` with one shape clipping the other:

```xml
<defs>
  <clipPath id="clip-circle">
    <circle cx="14" cy="12" r="8" />
  </clipPath>
</defs>
<circle cx="10" cy="12" r="8" clip-path="url(#clip-circle)" />
```

### Exclude (XOR: only non-overlapping areas)

Use `fill-rule="evenodd"` with both shapes in a single path. Where they overlap, the fill cancels out. The key difference from union: with `evenodd`, the overlapping region is transparent. With `nonzero` (default), it's filled.

## Multi-Variant Preview Page

When creating multiple logo/icon options, use the data-driven preview system. This separates the static HTML scaffold from the variant data, so iterating on designs only requires updating a small data file.

### Setup

1. **Copy `assets/preview.html`** to the project directory using `cp` with the absolute path from where this skill was loaded (e.g., `cp /path/to/this/skill/assets/preview.html ./preview.html`). Do not read it into context or modify it.
2. **Write `variants.js`** in the same directory with the variant data (format below).
3. **Auto-open** with `open preview.html` (macOS) or `xdg-open preview.html` (Linux).

### `variants.js` Format

```js
window.VARIANTS = {
  projectName: "Acme",
  brandName: "Acme",
  concepts: [
    {
      name: "Geometric",
      variants: [
        {
          id: "01",
          name: "Prism",
          description: "Light refracting through a triangular prism. Suggests transformation.",
          light: "logo-prism.svg",
          dark: "logo-prism-dark.svg"
        },
        {
          id: "02",
          name: "Hexagon Stack",
          description: "Layered hexagons suggesting modularity and structure.",
          light: "logo-hex.svg"
        }
      ]
    }
  ]
};
```

| Field | Required | Notes |
|-------|----------|-------|
| `projectName` | Yes | Used in page title and heading |
| `brandName` | Yes | Shown in nav bar mockups |
| `concepts[].name` | Yes | Section heading (group by concept, not layout) |
| `concepts[].variants[].id` | Yes | Short identifier, e.g. "01", "02" |
| `concepts[].variants[].name` | Yes | Variant name shown on card |
| `concepts[].variants[].description` | Yes | Metaphor explanation |
| `concepts[].variants[].light` | Yes | Path to light-background SVG |
| `concepts[].variants[].dark` | No | Path to dark-background SVG. Omit for monochrome (auto-applies `filter:brightness(0) invert(1)`) |

### What the preview renders per card

The scaffold in `assets/preview.html` reads `variants.js` and generates:
- **Size ramp** (16, 32, 64px) on white background
- **Dark background row** (16, 32, 64px) using the dark SVG or monochrome filter
- **Favicon mockup** (16px in a browser tab strip)
- **Nav bar mockup** (logo + brand name, light and dark)
- **Click-to-compare** bar (pin up to 4 cards for side-by-side evaluation)
- **Live reload** (3s poll cache-busts SVG images and reloads `variants.js`, no manual refresh needed)

### Iteration workflow

| Change type | What to update | Then |
|-------------|---------------|------|
| Edit an SVG (colors, shapes, paths) | Just the `.svg` file | Nothing. Live reload picks it up in 3s. |
| Add/remove/rename a variant | `variants.js` | Nothing. Live reload picks it up in 3s. |
| Replace a variant (new SVG + new filename) | The `.svg` file + `variants.js` | Nothing. Both auto-reload. |
| Add a new concept group | `variants.js` | Nothing. Live reload picks it up in 3s. |
| Change project or brand name | `variants.js` | Nothing. Live reload picks it up in 3s. |

**Do NOT rewrite `preview.html`.** It is a static scaffold copied from the skill assets. All project-specific data lives in `variants.js`.

### Checklist

- **Copy `assets/preview.html`** to the project directory (do not modify it)
- **Write `variants.js`** with all variant data
- **Group by concept** (e.g., "Geometric", "Network / Graph", "Abstract")
- **Description per card** explaining the metaphor and what it conveys
- For colored logos, provide a `-dark.svg` variant (not CSS filters)
- For monochrome logos, omit the `dark` field (auto-applies invert filter)
- **Auto-open** the preview so the user sees options immediately
- On subsequent iterations, **only edit `variants.js`** and SVG files. Live reload handles the rest.

## Workflow Tips

1. **Start with shape primitives**, convert to paths only when needed for optimization or compound operations
2. **Use relative coordinates** (`m`, `l`, `c`) when hand-writing paths. Easier to reason about incrementally
3. **Test at multiple sizes**: render at 16px, 24px, 48px, and 200px to verify clean scaling
4. **Keep a monochrome version**: if using color, ensure it also works with a single `currentColor`
5. **Validate the output**: open in a browser, not just a code editor. Check for rendering artifacts
6. **Round coordinates to the grid**: snap to integers on 24x24 canvas for pixel-perfect rendering at 1x
