// Instagram feed: fills every [data-instagram-feed] with the latest posts
// from /api/instagram. When the feed isn't configured (or fails), a feed
// marked data-instagram-feed="optional" removes its whole section, and any
// other feed shows a "follow us" card instead.

import { INSTAGRAM_HANDLE } from "./site-config.js";

const API_URL = new URL("../../api/instagram", import.meta.url);
const PROFILE_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function icon(name, root) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `${root}assets/img/icons.svg#${name}`);
  svg.appendChild(use);
  return svg;
}

function renderPosts(feed, posts, root) {
  feed.replaceChildren();
  feed.classList.add("ig-grid");
  for (const post of posts) {
    const link = el("a", "ig-post");
    link.href = post.permalink;
    link.target = "_blank";
    link.rel = "noreferrer";
    const img = el("img");
    img.src = post.image;
    img.alt = post.caption || `Instagram post by @${INSTAGRAM_HANDLE}`;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 640;
    img.height = 640;
    link.appendChild(img);
    if (post.type === "VIDEO" || post.type === "CAROUSEL_ALBUM") {
      const badge = el("span", "ig-post__badge");
      badge.appendChild(icon(post.type === "VIDEO" ? "i-play" : "i-layers", root));
      link.appendChild(badge);
    }
    if (post.caption) link.appendChild(el("span", "ig-post__caption", post.caption));
    feed.appendChild(link);
  }
}

function renderFollowCard(feed, root) {
  feed.replaceChildren();
  feed.classList.add("ig-follow");
  const card = el("a", "ig-follow__card");
  card.href = PROFILE_URL;
  card.target = "_blank";
  card.rel = "me noreferrer";
  const badge = el("span", "ig-follow__icon");
  badge.appendChild(icon("i-instagram", root));
  card.appendChild(badge);
  const body = el("span", "ig-follow__body");
  body.appendChild(el("strong", null, `@${INSTAGRAM_HANDLE}`));
  body.appendChild(el("span", null, "Follow us on Instagram for announcements, Ramadan and Eid notices and community news."));
  card.appendChild(body);
  const cta = el("span", "btn btn--accent btn--sm", "Follow on Instagram");
  card.appendChild(cta);
  feed.appendChild(card);
}

export async function initInstagramFeed(root) {
  const feeds = [...document.querySelectorAll("[data-instagram-feed]")];
  if (!feeds.length) return;
  const limit = Math.max(...feeds.map((f) => Number(f.dataset.limit) || 8));

  let data = null;
  try {
    const res = await fetch(`${API_URL}?limit=${limit}`, { headers: { Accept: "application/json" } });
    if (res.ok) data = await res.json();
  } catch {
    /* offline or no API on this host */
  }
  const posts = data && data.enabled && Array.isArray(data.posts) ? data.posts : [];

  for (const feed of feeds) {
    const wanted = Number(feed.dataset.limit) || 8;
    if (posts.length) {
      renderPosts(feed, posts.slice(0, wanted), root);
      feed.closest("[data-instagram-section]")?.removeAttribute("hidden");
    } else if (feed.dataset.instagramFeed === "optional") {
      const section = feed.closest("[data-instagram-section]") || feed;
      section.remove();
    } else {
      renderFollowCard(feed, root);
    }
  }
}
