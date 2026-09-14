import { z } from "zod";
import { HttpUrl } from "./primitives";

export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "youtube",
  "pinterest",
  "linkedin",
  "threads",
  "snapchat",
  "other",
] as const;
export const SocialPlatformSchema = z.enum(SOCIAL_PLATFORMS);
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const SocialLinkSchema = z.object({
  platform: SocialPlatformSchema,
  url: HttpUrl,
});
export type SocialLink = z.infer<typeof SocialLinkSchema>;

/** Stored as a JSON array on the brand. `[]` means "the portal lists none", which is the common case here. */
export const SocialLinksSchema = z.array(SocialLinkSchema);
export type SocialLinks = z.infer<typeof SocialLinksSchema>;
