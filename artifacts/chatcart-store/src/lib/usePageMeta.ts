import { useEffect } from "react";

function setMeta(
  selector: string,
  attrKey: string,
  attrVal: string,
  content: string
) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrKey, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export interface PageMetaInput {
  title: string;
  description: string;
  ogImage?: string | null;
  ogUrl?: string | null;
}

export function usePageMeta(meta: PageMetaInput | null) {
  const title = meta?.title ?? null;
  const description = meta?.description ?? null;
  const ogImage = meta?.ogImage ?? null;
  const ogUrl = meta?.ogUrl ?? null;

  useEffect(() => {
    if (!title || !description) return;

    document.title = title;

    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    if (ogImage) {
      setMeta('meta[property="og:image"]', "property", "og:image", ogImage);
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
    }

    if (ogUrl) {
      setMeta('meta[property="og:url"]', "property", "og:url", ogUrl);
    }
  }, [title, description, ogImage, ogUrl]);
}

export function absImgUrl(path: string | null | undefined, imgSrcFn: (p: string) => string): string | null {
  if (!path) return null;
  const rel = imgSrcFn(path);
  if (rel.startsWith("http")) return rel;
  return `${window.location.origin}${rel}`;
}
