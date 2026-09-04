import Parser from "rss-parser";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface YoutubeVideo {
  /** ID video YouTube (11 karakter, tanpa prefix yt:video:) */
  id: string;
  title: string;
  /** URL watch YouTube */
  link: string;
  /** Alias link untuk kompatibilitas dengan VideoCard */
  youtubeUrl: string;
  publishedAt: string;
  /** Label otomatis dari judul: 'Podcast' | 'Live' | null */
  label: "Podcast" | "Live" | null;
}

const CHANNEL_URL = "https://www.youtube.com/@tablighmusidoarjo";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
// ID kanal stabil @tablighmusidoarjo — dipakai jika scraping meta tag gagal.
const FALLBACK_CHANNEL_ID = "UC4GMOUwOG4MdFhylPzegtYA";

// Cache build-time terakhir agar halaman tetap terisi saat API YouTube flaky.
const CACHE_PATH = join(process.cwd(), "src", "data", "youtube-cache.json");

async function readCache(): Promise<YoutubeVideo[]> {
  try {
    const raw = await readFile(CACHE_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as YoutubeVideo[]) : [];
  } catch {
    return [];
  }
}

async function writeCache(videos: YoutubeVideo[]): Promise<void> {
  try {
    await mkdir(dirname(CACHE_PATH), { recursive: true });
    await writeFile(CACHE_PATH, JSON.stringify(videos, null, 2));
  } catch {
    // Cache bersifat best-effort
  }
}

/** Ekstrak ID video unik dari HTML halaman kanal. */
function extractVideoIds(html: string, limit = 15): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      ids.push(match[1]);
      if (ids.length >= limit) break;
    }
  }
  return ids;
}

/** Ambil judul + tanggal upload dari satu halaman watch. */
async function fetchWatchDetail(id: string): Promise<YoutubeVideo | null> {
  try {
    const html = await fetchText(`https://www.youtube.com/watch?v=${id}`, 2);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const dateMatch = html.match(/"uploadDate":"([^"]+)"/);
    const title = titleMatch ? titleMatch[1].replace(/\s*-\s*YouTube\s*$/, "").trim() : "";
    if (!title) return null;
    let label: YoutubeVideo["label"] = null;
    if (/podcast/i.test(title)) label = "Podcast";
    else if (/live/i.test(title)) label = "Live";
    return {
      id,
      title,
      link: `https://www.youtube.com/watch?v=${id}`,
      youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
      publishedAt: dateMatch ? dateMatch[1] : new Date().toISOString(),
      label,
    };
  } catch {
    return null;
  }
}

/**
 * Fallback: kumpulkan ID dari halaman /videos kanal lalu ambil
 * detail tiap video (dipakai saat endpoint RSS diblokir).
 */
async function fetchVideosFromChannelPage(): Promise<YoutubeVideo[]> {
  const html = await fetchText(`${CHANNEL_URL}/videos`, 2);
  const ids = extractVideoIds(html);
  const videos: YoutubeVideo[] = [];
  const concurrency = 4;
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = await Promise.all(ids.slice(i, i + concurrency).map(fetchWatchDetail));
    for (const video of batch) {
      if (video) videos.push(video);
    }
  }
  return videos;
}
async function fetchText(url: string, attempts = 3): Promise<string> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (i + 1)));
    }
  }
  throw lastError;
}

/**
 * Ambil video terbaru kanal YouTube via RSS (tanpa CMS/API key).
 * Dijalankan saat build (top-level await) sehingga hasilnya ter-cache
 * di HTML statis. Jika fetch gagal, fallback ke cache build terakhir.
 * Hasil di-dedupe dalam satu proses agar homepage + media tidak
 * menghantam endpoint YouTube dua kali per build.
 */
let inflight: Promise<YoutubeVideo[]> | null = null;

export function getYoutubeVideos(): Promise<YoutubeVideo[]> {
  if (!inflight) {
    inflight = loadVideos().catch(() => readCache());
  }
  return inflight;
}

/**
 * Batasi total waktu fetch agar satu upstream lambat tidak menggantung
 * render halaman (terasa seperti navigasi gagal, terutama di dev).
 * Di mode dev, cache disk yang masih ada dipakai langsung agar
 * navigasi selalu instan.
 */
async function loadVideos(): Promise<YoutubeVideo[]> {
  if (import.meta.env?.DEV) {
    const cached = await readCache();
    if (cached.length > 0) return cached;
  }
  const timeout = new Promise<YoutubeVideo[]>((_, reject) => {
    setTimeout(() => reject(new Error("YouTube fetch timeout")), 15000);
  });
  try {
    return await Promise.race([fetchVideos(), timeout]);
  } catch {
    return await readCache();
  }
}

async function fetchVideos(): Promise<YoutubeVideo[]> {
  try {
    // 1. Scraping meta tag untuk otomatis mendapatkan Channel ID
    let channelId = FALLBACK_CHANNEL_ID;
    try {
      const html = await fetchText(CHANNEL_URL, 2);
      const match = html.match(/<meta itemprop="identifier" content="([^"]+)">/i);
      if (match) channelId = match[1];
    } catch {
      // Pertahankan fallback ID
    }
    if (!channelId) return [];

    // 2. Fetch RSS feed YouTube (XML via fetch agar User-Agent terkontrol,
    //    lalu parse dengan rss-parser). Jika endpoint RSS diblokir,
    //    fallback ke scraping halaman /videos kanal.
    let videos: YoutubeVideo[] = [];
    try {
      const xml = await fetchText(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
      );
      const parser = new Parser();
      const feed = await parser.parseString(xml);
      videos = buildFromRssItems(feed.items ?? []);
    } catch {
      videos = [];
    }
    if (videos.length === 0) {
      try {
        videos = await fetchVideosFromChannelPage();
      } catch {
        videos = [];
      }
    }

    if (videos.length > 0) await writeCache(videos);
    return videos.length > 0 ? videos : await readCache();
  } catch {
    return await readCache();
  }
}

function buildFromRssItems(items: any[]): YoutubeVideo[] {
  return items
    .filter((item) => item.title && item.link && item.id)
    .map((item) => {
      const title = item.title as string;
      const link = item.link as string;

      let label: YoutubeVideo["label"] = null;
      if (/podcast/i.test(title)) label = "Podcast";
      else if (/live/i.test(title)) label = "Live";

      return {
        id: (item.id as string).replace("yt:video:", ""),
        title,
        link,
        youtubeUrl: link,
        publishedAt:
          (item.pubDate as string | undefined) ?? new Date().toISOString(),
        label,
      };
    })
    .filter((video) => video.id && video.title && video.link);
}
