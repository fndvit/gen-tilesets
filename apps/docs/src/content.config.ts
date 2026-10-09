import { defineCollection } from "astro:content";
import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // Only to rename one UI string: Starlight labels the top of every page's table of contents
  // "Overview", and every module page here opens with its own `## Overview`, so the contents
  // listed it twice. See src/content/i18n/en.json.
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
