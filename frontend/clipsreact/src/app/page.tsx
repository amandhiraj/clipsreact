"use client";

import { useState, useEffect } from "react";

interface Clip {
  id: number;
  url: string;
  creator: string;
  tags: string[];
  source: string;
}

function getTwitchEmbedUrl(url: string) {
  if (typeof window === "undefined") return null;
  const parent = "localhost";

  // 1) clips.twitch.tv/ClipID (old format)
  let clipMatch = url.match(/clips\.twitch\.tv\/([^/?]+)/);
  if (clipMatch) {
    return `https://clips.twitch.tv/embed?clip=${clipMatch[1]}&parent=${parent}`;
  }

  // 2) twitch.tv/videos/VideoID
  let videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (videoMatch) {
    return `https://player.twitch.tv/?video=${videoMatch[1]}&parent=${parent}`;
  }

  // 3) twitch.tv/{user}/clip/{clipId} (your case)
  let userClipMatch = url.match(/twitch\.tv\/[^/]+\/clip\/([^/?]+)/);
  if (userClipMatch) {
    return `https://clips.twitch.tv/embed?clip=${userClipMatch[1]}&parent=${parent}`;
  }

  return null;
}

function getYouTubeEmbedUrl(url: string) {
  const videoIdMatch = url.match(/[?&]v=([^&]+)/);
  if (videoIdMatch) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
  }
  return null;
}

export default function HomePage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tagFilter, setTagFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");

  async function fetchClips() {
    setLoading(true);
    setError(null);

    try {
      let query = [];
      if (tagFilter) query.push(`tag=${encodeURIComponent(tagFilter)}`);
      if (creatorFilter) query.push(`creator=${encodeURIComponent(creatorFilter)}`);
      const queryString = query.length > 0 ? `?${query.join("&")}` : "";

      const res = await fetch(`http://127.0.0.1:8000/clips/${queryString}`);
      if (!res.ok) throw new Error("Failed to fetch clips");

      const data: Clip[] = await res.json();
      setClips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClips();
  }, [tagFilter, creatorFilter]);

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Clip Showcase</h1>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Filter by tag (e.g. funny)"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="border rounded p-2 flex-1"
        />
        <input
          type="text"
          placeholder="Filter by creator (e.g. FaZeSilky)"
          value={creatorFilter}
          onChange={(e) => setCreatorFilter(e.target.value)}
          className="border rounded p-2 flex-1"
        />
      </div>

      {loading && <p>Loading clips...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      <div className="grid grid-cols-1 gap-6">
        {clips.length === 0 && !loading && <p>No clips found.</p>}

        {clips.map(({ id, url, creator, tags, source }) => {
          // Determine embed URLs for supported platforms
          const twitchEmbedUrl = getTwitchEmbedUrl(url);
          const youtubeEmbedUrl = getYouTubeEmbedUrl(url);

          return (
            <div key={id} className="border rounded p-4 shadow">
              <p className="font-semibold">{creator} ({source})</p>

              {youtubeEmbedUrl ? (
                <iframe
                  width="100%"
                  height="200"
                  src={youtubeEmbedUrl}
                  title="YouTube clip"
                  allowFullScreen
                  className="my-2 rounded"
                />
              ) : twitchEmbedUrl ? (
                <iframe
                  src={twitchEmbedUrl}
                  height={378}
                  width={620}
                  frameBorder="0"
                  allowFullScreen
                  scrolling="no"
                  title="Twitch clip/video"
                  className="my-2 rounded"
                />
              ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  Watch clip
                </a>
              )}

              <p className="mt-2 text-sm text-gray-600">
                Tags: {Array.isArray(tags) ? tags.join(", ") : JSON.parse(tags).join(", ")}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
