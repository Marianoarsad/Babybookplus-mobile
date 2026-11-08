# Approved blue onboarding artwork

The three PNGs below replace the previous purple illustrations. They are separate
RGBA assets; all headings, buttons, dots and navigation are rendered by the app.
The existing filenames preserve App.js startup preloading.

| Asset | Approved reference | Dimensions |
| --- | --- | --- |
| `onboarding-book-collage.png` | D, `Downloads/screen 1.png` | 1536 × 1024 |
| `onboarding-qr-hand.png` | E, `Downloads/screen 2.png` | 1200 × 1296 |
| `onboarding-care-circle.png` | F, `Downloads/screen 3.png` | 1536 × 1024 |

Prepared with built-in imagegen background-extraction edits, as approved by the
user. The reference QR is illustrative artwork, not a generated consultation code.

Extraction prompt set:

- Book: isolate the existing white seal and open blue digital baby book, preserving
  its expression, composition, medical icons and floating blue shapes. Remove the
  page background, text, dots, navigation and button; return transparent alpha.
- Phone: isolate the existing hand, blue smartphone, seal portrait, QR pattern,
  lock, clock and floating shapes. Preserve faces, pose, proportions and rendering;
  remove every screen UI element and background, with no new content or glow.
- Parent: isolate the parent, same white seal, open digital book, medical shield
  and blue accents. Preserve the exact composition and glossy rendering; remove
  all page UI and background, with genuine transparent alpha and no text.

`components/onboarding/OnboardingArt.js` fits each asset's canvas independently so
the visible illustration has the approved proportions without stretching or
clipping it on short screens. Run `node components/Onboarding.check.js` from
`front-end/` to check asset dimensions, alpha, layout bounds and interactions.
