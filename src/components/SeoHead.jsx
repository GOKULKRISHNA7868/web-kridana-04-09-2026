import { useEffect } from "react";

const DEFAULT_TITLE = "Kridana — Sports Academies & Trainers";
const DEFAULT_DESCRIPTION =
  "Discover sports academies, institutes, and solo trainers on Kridana. Browse profiles, book demos, and train with verified coaches near you.";
const DEFAULT_IMAGE = "/Kridana logo.png";
const SITE_NAME = "Kridana";

const absoluteUrl = (pathOrUrl) => {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (typeof window === "undefined") return pathOrUrl;
  const origin = window.location.origin;
  return `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
};

const upsertMeta = (attr, key, content) => {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertLink = (rel, href) => {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const upsertJsonLd = (id, data) => {
  const scriptId = `kridana-jsonld-${id}`;
  let el = document.getElementById(scriptId);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = scriptId;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
};

/**
 * Client-side SEO for public pages (profiles, listings, landing).
 * Sets title, description, Open Graph, Twitter, canonical, and JSON-LD
 * so Google and social previews can show academy / trainer cards.
 */
export default function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image,
  type = "website",
  noIndex = false,
  jsonLd,
  jsonLdId = "main",
}) {
  useEffect(() => {
    const fullTitle = title
      ? title.includes("Kridana")
        ? title
        : `${title} | ${SITE_NAME}`
      : DEFAULT_TITLE;
    const desc = (description || DEFAULT_DESCRIPTION).slice(0, 300);
    const url = absoluteUrl(path || window.location.pathname + window.location.search);
    const img = absoluteUrl(image || DEFAULT_IMAGE);

    document.title = fullTitle;

    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", noIndex ? "noindex,nofollow" : "index,follow,max-image-preview:large");
    upsertMeta("name", "author", SITE_NAME);
    upsertMeta("name", "theme-color", "#FF6A00");

    upsertLink("canonical", url);

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", img);
    upsertMeta("property", "og:locale", "en_IN");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", img);

    upsertJsonLd(jsonLdId, jsonLd);

    return () => {
      // Keep last tags; next page SeoHead overwrites. Clear page-specific JSON-LD only.
      upsertJsonLd(jsonLdId, null);
    };
  }, [title, description, path, image, type, noIndex, jsonLd, jsonLdId]);

  return null;
}

export const buildInstituteJsonLd = (inst, path) => {
  if (!inst) return null;
  const name = inst.instituteName || "Sports Academy";
  const url = absoluteUrl(path);
  const image =
    inst.coverImageUrl ||
    inst.profileImageUrl ||
    inst.logoUrl ||
    DEFAULT_IMAGE;
  const addressParts = [inst.street, inst.landmark, inst.city, inst.state]
    .filter(Boolean)
    .join(", ");

  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name,
    description: (inst.description || "").slice(0, 300) || undefined,
    url,
    image: absoluteUrl(image),
    telephone: inst.phone || inst.mobile || undefined,
    email: inst.email || undefined,
    address: addressParts
      ? {
          "@type": "PostalAddress",
          streetAddress: [inst.street, inst.landmark].filter(Boolean).join(", ") || undefined,
          addressLocality: inst.city || undefined,
          addressRegion: inst.state || undefined,
          addressCountry: "IN",
        }
      : undefined,
    geo:
      inst.latitude && inst.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: Number(inst.latitude),
            longitude: Number(inst.longitude),
          }
        : undefined,
    sameAs: [inst.websiteLink || inst.website].filter(Boolean),
  };
};

export const buildTrainerJsonLd = (trainer, path) => {
  if (!trainer) return null;
  const name =
    trainer.trainerName ||
    `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim() ||
    "Sports Trainer";
  const url = absoluteUrl(path);
  const image = trainer.profileImageUrl || trainer.coverImageUrl || DEFAULT_IMAGE;
  const sports = []
    .concat(trainer.category || [], trainer.subCategory || [])
    .flat()
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: trainer.designation || "Sports Trainer",
    description: (
      trainer.description ||
      trainer.about ||
      trainer.designation ||
      ""
    ).slice(0, 300) || undefined,
    url,
    image: absoluteUrl(image),
    telephone: trainer.phone || trainer.mobile || undefined,
    email: trainer.email || undefined,
    address: trainer.city
      ? {
          "@type": "PostalAddress",
          addressLocality: trainer.city,
          addressRegion: trainer.state || undefined,
          addressCountry: "IN",
        }
      : undefined,
    knowsAbout: sports.length ? sports : undefined,
    sameAs: [trainer.websiteLink || trainer.website].filter(Boolean),
  };
};

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION, SITE_NAME };
