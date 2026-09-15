# Marketing homepage

The homepage at `/` is a design proposal for Engagement Agents, prepared as part of this take-home project. The company, customer names, marks, illustrations, and published results belong to their respective owners. This context is kept in the project documentation rather than in the customer-facing page.

## Design and behavior

- White and neutral editorial surfaces, plum typography, sky-blue identity, and pink conversion actions. The `.ea-site` scope stays light even when the application uses dark mode; it never changes the saved application theme.
- Twelve prominent retailers appear in a stationary logo wall. A native disclosure exposes the remaining 34 featured customers. The full roster comes from the company homepage; testimonial brands are not silently added to the featured-customer count.
- A persistent “Read testimonials” action sits directly beneath the logo wall beside the customer disclosure. Its native anchor transfers keyboard focus to the testimonial section and scrolls beneath the sticky header. Smooth scrolling is scoped to the homepage and disabled for reduced motion.
- Navigation links, proof actions and disclosure controls share hover/focus feedback. The mobile menu dismisses on outside pointer interaction or when focus leaves, in addition to Escape and section selection.
- Original illustrations accompany the hero, four results, and the complete process explanation. The founder portrait stays at its native 150px size.
- Native disclosures and ordinary links work without JavaScript. Motion is a progressive enhancement: artwork and section entrances, followed by a single sequence emphasizing the four process markers. No content is hidden in server HTML. Reduced motion bypasses enhancement.
- Login links to `/login` and retains existing Field Agent authentication behavior. Booking, calculators, legal pages and articles link to the existing company destinations.
- The homepage has no API/database dependency. `/ea-social` supplies a static company-specific social card; application metadata remains separate.

## Content provenance

Typed collections in `apps/web/src/components/marketing/content.ts` record source URLs for customer names, outcomes, testimonial excerpts and articles. Results remain individual retailer outcomes, with store counts and annual units preserved. Anonymous results are not assigned to named brands. Testimonial text is excerpted rather than rewritten as a direct quote. The founder narrative is paraphrased from [Our Story](https://www.engagementagents.com/our-story).

## Original assets

Downloaded unchanged on 2026-09-15. All paths below are relative to `apps/web/public/ea/illustrations`. Images are served locally with explicit dimensions; below-fold images load lazily.

| Local asset                | Dimensions | Source                                                                                                    |
| -------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| hero.png                   | 593 × 371  | [Original](https://www.engagementagents.com/homepage-hero-background-2x-1.png)                            |
| how-it-works.png           | 970 × 476  | [Original](https://www.engagementagents.com/NEW-3-Group-207-1-1.png)                                      |
| success-1.png              | 167 × 195  | [Original](https://www.engagementagents.com/success-1.png)                                                |
| success-2.png              | 233 × 195  | [Original](https://www.engagementagents.com/success-2.png)                                                |
| success-3.png              | 167 × 192  | [Original](https://www.engagementagents.com/success-3.png)                                                |
| success-4.png              | 167 × 189  | [Original](https://www.engagementagents.com/success-4.png)                                                |
| insight-coresight.jpg      | 1000 × 500 | [Original](https://www.engagementagents.com/blog-image/Coresight-Engagment-Agents_t6zic9.jpg)             |
| insight-mall-marketing.png | 1000 × 500 | [Original](https://www.engagementagents.com/files/ScreenShot2020-01-16at3.07.41PM_posmxm.png)             |
| insight-discovery.jpg      | 532 × 298  | [Original](https://www.engagementagents.com/blog-image/Retail-World-Retail-Congress-Dicovery-50-logo.jpg) |

The existing `ea/logo.png`, `ea/sean.jpg`, and `ea/logos/*` assets are reused. Original sources: [company homepage](https://www.engagementagents.com/) and [founder portrait](https://www.engagementagents.com/sean.jpg).

## Acceptance checks

- At 1440×900 and 1280×800: headline, booking CTA and at least one full logo row are visible on arrival.
- At 768, 390 and 360px: no horizontal overflow; customer logos precede hero artwork; process explanation stacks and a native disclosure opens the full-size diagram in a horizontally scrollable, keyboard-focusable region.
- Check customer/testimonial disclosures, mobile menu open/close, Escape and keyboard operation, section anchors, Login, external destinations, image loading, and company-specific share metadata.
- Check the homepage while the API is unavailable and with an inherited dark app theme. Essential content must be present in server HTML; motion must remain optional.
- Run web typecheck, lint and production build. Conversion impact requires future measurement; this change introduces no analytics, forms or deployment.

## Verification completed — 2026-09-15

- Web lint, typecheck, production build and `git diff --check` passed. Next.js prerenders `/` and `/ea-social` as static routes.
- Browser checks at all five widths found no page overflow. The first logo row ends at 752px at 1440×900 and 740px at 1280×800. Mobile/tablet customer logos precede the hero artwork.
- Customer expansion exposes all 46 featured retailers; testimonial expansion exposes six quotes. Mobile menu opens by keyboard, closes with Escape, and closes after choosing a section. Diagram enlargement retains its 970px width within the mobile scroll region.
- No broken loaded images or invalid local anchors were found. Booking, calculator, story, legal and insight destinations returned HTTP 200 (article pages require GET rather than HEAD).
- The homepage renders with the local API stopped and stays white with the app's dark preference active. Login reaches the existing Field Agent route; local auth-disabled behavior was confirmed. Authenticated sign-in was not exercised because the local API was unavailable.
- Primary text/action contrast ratios: pink CTA 5.41:1, blue text 5.66:1, muted text 6.28:1, plum text 15.23:1. These checks exclude text embedded in original artwork.
- Essential content and native disclosures were verified in server HTML. Reduced-motion behavior was reviewed in code; a browser session with JavaScript disabled or reduced motion forced was not available through the active browser controls. No real-user conversion or performance measurements were collected.
