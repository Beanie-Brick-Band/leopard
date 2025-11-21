"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import ShikiHighlighter from "react-shiki";

import { api } from "@package/backend/convex/_generated/api";

interface Event {
  content: string;
  filePath: string;
}

function getLanguageFromFilePath(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    py: "python",
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    html: "html",
    css: "css",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    r: "r",
    m: "matlab",
  };
  return languageMap[extension ?? ""] ?? "text";
}

function ReplayItem({
  workspaceId,
  events,
}: {
  workspaceId: string;
  events:
    | Record<
        string,
        {
          content: string;
          filePath: string;
        }
      >[]
    | undefined;
}) {
  const [showReplay, setShowReplay] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const typedEvents = useMemo(() => {
    if (!events) return null;
    const filtered: Event[] = [];
    for (const e of events) {
      if (typeof e === "object" && "content" in e && "filePath" in e) {
        const content = (e as unknown as { content: unknown }).content;
        const filePath = (e as unknown as { filePath: unknown }).filePath;
        if (typeof content === "string" && typeof filePath === "string") {
          filtered.push({
            content,
            filePath,
          });
        }
      }
    }
    return filtered.length > 0 ? filtered : null;
  }, [events]);

  const filePath = typedEvents?.[0]?.filePath ?? "";
  const fileName = filePath ? (filePath.split("/").pop() ?? filePath) : "";
  const language = useMemo(() => getLanguageFromFilePath(filePath), [filePath]);

  const accumulatedContent = useMemo(() => {
    if (!typedEvents || typedEvents.length === 0) return "";
    const position = isLive
      ? typedEvents.length - 1
      : Math.min(sliderPosition, typedEvents.length - 1);
    const event = typedEvents[position];
    return event ? event.content : "";
  }, [isLive, sliderPosition, typedEvents]);

  if (!typedEvents || typedEvents.length === 0) return null;

  const handleShowReplay = () => {
    setShowReplay(!showReplay);
    if (!showReplay) {
      setSliderPosition(typedEvents.length - 1);
      setIsLive(true);
    }
  };

  const handleSliderChange = (value: number) => {
    setSliderPosition(value);
    setIsLive(false);
  };

  const handleToggleLive = () => {
    setIsLive(true);
    setSliderPosition(typedEvents.length - 1);
  };

  return (
    <div className="mb-8 rounded-lg border p-4">
      <h2 className="mb-2 text-xl font-semibold">{workspaceId}</h2>
      <button
        onClick={handleShowReplay}
        className="mb-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        {showReplay ? "Hide Replay" : "Show Replay"}
      </button>
      {showReplay && (
        <div className="space-y-4">
          <div className="font-mono text-sm text-gray-600 dark:text-gray-400">
            {fileName}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <ShikiHighlighter
              language={language}
              className="w-full"
              theme={{
                light: "github-light",
                dark: "github-dark",
              }}
              defaultColor="light-dark()"
              showLineNumbers={true}
              showLanguage={true}
            >
              {accumulatedContent}
            </ShikiHighlighter>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={typedEvents.length - 1}
                value={isLive ? typedEvents.length - 1 : sliderPosition}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={handleToggleLive}
                className={`rounded px-3 py-1 text-sm ${
                  isLive
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-300 text-gray-700 hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                }`}
              >
                Live
              </button>
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Event {isLive ? typedEvents.length : sliderPosition + 1} of{" "}
              {typedEvents.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LivePage() {
  const data = useQuery(api.web.replay.getReplays);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      items: {Object.entries(data).length}
      {Object.entries(data).map(([key, value]) => (
        <ReplayItem key={key} workspaceId={key} events={value} />
      ))}
    </div>
  );
}
