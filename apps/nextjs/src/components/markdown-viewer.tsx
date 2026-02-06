"use client";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({
  content,
  className = "",
}: MarkdownViewerProps) {
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
