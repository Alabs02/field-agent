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
