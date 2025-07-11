"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tweet } from "react-tweet";

interface Clip {
  id: number;
  url: string;
  creator: string;
  tags: string[];
  source: string;
  title?: string; // optional, if you add title
  likes: number;
  likedBy: string[];
}

function getTwitchEmbedUrl(url: string) {
  const parent = typeof window !== "undefined" ? window.location.hostname : "localhost";
  let userClipMatch = url.match(/twitch\.tv\/[^/]+\/clip\/([^/?]+)/);
  if (userClipMatch) return `https://clips.twitch.tv/embed?clip=${userClipMatch[1]}&parent=${parent}`;
  let clipMatch = url.match(/clips\.twitch\.tv\/([^/?]+)/);
  if (clipMatch) return `https://clips.twitch.tv/embed?clip=${clipMatch[1]}&parent=${parent}`;
  let videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (videoMatch) return `https://player.twitch.tv/?video=${videoMatch[1]}&parent=${parent}`;
  return null;
}

function getYouTubeEmbedUrl(url: string) {
  const videoIdMatch = url.match(/[?&]v=([^&]+)/);
  return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
}

function getKickEmbedUrl(url: string) {
  const clipMatch = url.match(/kick\.com\/[^/]+\/clips\/(clip_[^/?]+)/);
  return clipMatch ? `https://kick.com/embed/${clipMatch[1]}` : null;
}

function getRedditEmbedUrl(url: string) {
  try {
    return `https://www.redditmedia.com${new URL(url).pathname}?ref_source=embed&ref=share&embed=true`;
  } catch {
    return null;
  }
}

function extractTweetId(url: string): string | null {
  const match = url.match(/twitter\.com\/[^/]+\/status\/(\d+)/) || url.match(/x\.com\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : null;
}
export default function HomePage() {
  const { data: session } = useSession();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState(""); // single search input
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [source, setSource] = useState("");

  async function fetchClips() {
    setLoading(true);
    setError(null);
    try {
      const queryString = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
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

  async function submitClip() {
    if (!url || !source) return alert("Please provide URL and Source");
    try {
      const clipData = {
        url,
        tags,
        creator: session?.user?.name || "Anonymous",
        source,
      };
      const res = await fetch("http://127.0.0.1:8000/clips/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clipData),
      });
      if (!res.ok) throw new Error("Failed to submit clip");
      fetchClips();
      setUrl(""); setTags([]); setSource("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleLike(clipId: number) {
    if (!session?.user?.name) {
      alert("You must be signed in to like clips.");
      return;
    }

    try {
      // call backend like API
      const res = await fetch(`http://127.0.0.1:8000/clips/${clipId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to update like");

      const updatedClip = await res.json();

      // Update the local clips state with new likes & likedBy
      setClips((prev) =>
        prev.map((clip) =>
          clip.id === clipId
            ? { ...clip, likes: updatedClip.likes, likedBy: updatedClip.liked_by }
            : clip
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    fetchClips();
  }, []); // fetch clips on mount only

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🎬 Clip Showcase</h1>

      {!session ? (
        <Button onClick={() => signIn()} className="mb-6">Sign in to submit clips</Button>
      ) : (
        <div className="flex items-center justify-between mb-6">
          <p>Signed in as <strong>{session.user?.name}</strong></p>
          <Button variant="destructive" onClick={() => signOut()}>Sign out</Button>
        </div>
      )}

      {session && (
        <Card className="mb-6">
          <CardContent className="space-y-3 p-4">
            <h2 className="text-xl font-semibold">Submit a Clip</h2>

            {/* URL input */}
            <Input
              placeholder="Clip URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            {/* Tags input */}
            <div>
              <Input
                placeholder="Enter tag and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const newTag = e.currentTarget.value.trim();
                    if (newTag && !tags.includes(newTag)) {
                      setTags([...tags, newTag]);
                      e.currentTarget.value = "";
                    }
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                  >
                    {tag} ✕
                  </Badge>
                ))}
              </div>
            </div>

            {/* Source select */}
            <Select onValueChange={(value) => setSource(value)} defaultValue={source}>
              <SelectTrigger>
                <SelectValue placeholder="Select Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="Twitch">Twitch</SelectItem>
                <SelectItem value="Kick">Kick</SelectItem>
                <SelectItem value="Reddit">Reddit</SelectItem>
                <SelectItem value="Twitter">Twitter</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={submitClip}>Submit</Button>
          </CardContent>
        </Card>
      )}

      {/* Single search input */}
      <div className="mb-6 flex gap-4 items-center">
        <Input
          placeholder="Search clips by creator, tag, title, source..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") fetchClips();
          }}
        />
        <Button onClick={fetchClips}>Search</Button>
      </div>

      
      {loading && <p>Loading clips...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      <div className="columns-1 sm:columns-2 gap-6 space-y-6">
        {clips.length === 0 && !loading && <p>No clips found.</p>}
        {clips.map(({ id, url, creator, tags, source, likes, likedBy }) => {
          const twitch = getTwitchEmbedUrl(url);
          const youtube = getYouTubeEmbedUrl(url);
          const kick = getKickEmbedUrl(url);
          const reddit = getRedditEmbedUrl(url);
          const tweetId = extractTweetId(url);

          const userId = session?.user?.name;
          const likedByArray = Array.isArray(likedBy) ? likedBy : [];
          const userLiked = userId ? likedByArray.includes(userId) : false;

          return (
            <Card key={id} className="break-inside-avoid mb-6">
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-2">{creator} • {source}</p>
                {youtube && <iframe src={youtube} width="100%" height="200" allowFullScreen className="rounded" />}
                {twitch && <iframe src={twitch} width="100%" height="378" allowFullScreen className="rounded" />}
                {kick && <iframe src={kick} width="100%" height="400" allowFullScreen className="rounded" />}
                {reddit && source.toLowerCase() === "reddit" && <iframe src={reddit} width="100%" height="400" allowFullScreen className="rounded" />}
                {tweetId && <Tweet id={tweetId} />}
                {!youtube && !twitch && !kick && !reddit && !tweetId && (
                  <a href={url} target="_blank" className="text-blue-600 underline">Watch clip</a>
                )}
                <p className="mt-2 text-sm text-gray-600">
                  Tags: {Array.isArray(tags) ? tags.join(", ") : JSON.parse(tags).join(", ")}
                </p>

                {/* Like button */}
                <Button
                  variant={userLiked ? "destructive" : "default"}
                  onClick={() => handleLike(id)}
                  className="mt-3"
                >
                  {userLiked ? "❤️ Unlike" : "🤍 Like"} ({likes ?? 0})
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
