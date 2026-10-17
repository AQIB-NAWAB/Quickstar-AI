"use client";

import React, { useMemo } from "react";

export interface FormattedChatMessageProps {
  text: string;
  isUser?: boolean;
  className?: string;
}

type Block =
  | { type: "code"; language: string; content: string }
  | { type: "heading"; level: number; content: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "paragraph"; content: string };

function normalizeChatText(raw: string): string {
  if (!raw) return "";
  let text = raw.replace(/\r\n/g, "\n");

  // 1. Separate inline bullets that follow punctuation or closing bold tag
  // e.g. "Here's how I can help: **📅 Booking** * Check availability" -> split before "* "
  // e.g. "Dr. Sarah Miller * **Tomorrow at 3:30 PM**" -> split before "* **"
  text = text.replace(/([.:!?]|\*\*)\s+\*\s+/g, "$1\n* ");
  text = text.replace(/([^\n*])\s+\*\s+(\*\*|[A-Z0-9])/g, "$1\n* $2");

  // 2. Separate trailing prompt/question that follows bullet lists
  // e.g. "* **Monday at 11:30 AM** with Dr. Alex Reed Would you like to book one of these times?"
  text = text.replace(
    /([a-zA-Z0-9.)])\s+(Would you like|Do you have|Please let me|If so|Once you provide|Aapko inmein se)/g,
    "$1\n\n$2",
  );

  // 3. Separate major emoji/bold sections onto their own paragraph
  // e.g. "picked a time. **🦷 Services We Provide** While I can"
  // e.g. "dental injuries. **💡 How to get started:** If you're"
  text = text.replace(/([.:!?])\s+(\*\*[^a-z\n]+?\*\*)/g, "$1\n\n$2");
  text = text.replace(/(\*\*[^a-z\n]+?\*\*)\s+([A-Z][a-z])/g, "$1\n$2");

  // 4. Numbered list items in one line
  // e.g. "two quick details: 1. **Which time slot**... 2. **What is your full name?**"
  text = text.replace(/([.:!?])\s+(\d+\.\s+)/g, "$1\n$2");

  return text;
}

function parseBlocks(rawText: string): Block[] {
  const normalized = normalizeChatText(rawText);
  const lines = normalized.split("\n");
  const blocks: Block[] = [];

  let inCode = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  let currentList: { type: "unordered" | "ordered"; items: string[] } | null = null;
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      blocks.push({
        type: "paragraph",
        content: currentParagraphLines.join("\n"),
      });
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      if (currentList.type === "unordered") {
        blocks.push({
          type: "unordered-list",
          items: currentList.items,
        });
      } else {
        blocks.push({
          type: "ordered-list",
          items: currentList.items,
        });
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block fences
    if (trimmed.startsWith("```")) {
      if (!inCode) {
        flushParagraph();
        flushList();
        inCode = true;
        codeLanguage = trimmed.slice(3).trim();
        codeLines = [];
      } else {
        inCode = false;
        blocks.push({
          type: "code",
          language: codeLanguage,
          content: codeLines.join("\n"),
        });
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      continue;
    }

    // Unordered list item: * , - , •
    const ulistMatch = line.match(/^(\*|-|•)\s+(.*)$/);
    if (ulistMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "unordered") {
        flushList();
        currentList = { type: "unordered", items: [ulistMatch[2]] };
      } else {
        currentList.items.push(ulistMatch[2]);
      }
      continue;
    }

    // Ordered list item: 1. , 2.
    const olistMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olistMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "ordered") {
        flushList();
        currentList = { type: "ordered", items: [olistMatch[2]] };
      } else {
        currentList.items.push(olistMatch[2]);
      }
      continue;
    }

    // Indented sub-line of list item
    if (currentList && (line.startsWith("  ") || line.startsWith("\t"))) {
      const lastIdx = currentList.items.length - 1;
      currentList.items[lastIdx] += "\n" + trimmed;
      continue;
    }

    // Normal text
    flushList();
    currentParagraphLines.push(line);
  }

  if (inCode) {
    blocks.push({
      type: "code",
      language: codeLanguage,
      content: codeLines.join("\n"),
    });
  }
  flushParagraph();
  flushList();

  return blocks;
}

function renderInline(text: string, isUser?: boolean): React.ReactNode {
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const token = match[0];

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    const key = `inline-${matchIndex}`;

    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={key}
          className={
            isUser
              ? "px-1.5 py-0.5 rounded-[4px] bg-white/20 font-mono text-[13px]"
              : "px-1.5 py-0.5 rounded-[4px] bg-black/5 text-[#1D2939] font-mono text-[13px] border border-black/10 font-medium"
          }
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key} className="font-semibold text-inherit">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={key} className="italic text-inherit">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("[") && token.includes("](")) {
      const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isUser
                ? "text-orange-200 underline hover:text-white transition-colors"
                : "text-[#FF571A] underline hover:text-[#E0460D] transition-colors font-medium"
            }
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        parts.push(token);
      }
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      parts.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isUser
              ? "text-orange-200 underline hover:text-white transition-colors break-all"
              : "text-[#FF571A] underline hover:text-[#E0460D] transition-colors break-all font-medium"
          }
        >
          {token}
        </a>,
      );
    } else {
      parts.push(token);
    }

    lastIndex = matchIndex + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function FormattedChatMessage({
  text,
  isUser = false,
  className = "",
}: FormattedChatMessageProps) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  if (!text) return null;

  return (
    <div
      className={`space-y-2.5 text-[14px] leading-relaxed break-words [overflow-wrap:anywhere] ${className}`}
    >
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "code":
            return (
              <pre
                key={idx}
                className="my-2 p-3 rounded-[8px] bg-[#1E222A] text-[#F8F9FB] font-mono text-[12.5px] overflow-x-auto leading-relaxed border border-[#2D333F]"
              >
                <code>{block.content}</code>
              </pre>
            );

          case "heading": {
            if (block.level === 1) {
              return (
                <h1 key={idx} className="text-[16px] font-bold text-inherit mt-3 mb-1">
                  {renderInline(block.content, isUser)}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2 key={idx} className="text-[15px] font-bold text-inherit mt-2.5 mb-1">
                  {renderInline(block.content, isUser)}
                </h2>
              );
            }
            return (
              <h3 key={idx} className="text-[14px] font-semibold text-inherit mt-2 mb-0.5">
                {renderInline(block.content, isUser)}
              </h3>
            );
          }

          case "unordered-list":
            return (
              <ul
                key={idx}
                className="my-2 space-y-1.5 pl-5 list-disc marker:text-[#FF571A] text-inherit"
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed pl-1">
                    {renderInline(item, isUser)}
                  </li>
                ))}
              </ul>
            );

          case "ordered-list":
            return (
              <ol
                key={idx}
                className="my-2 space-y-1.5 pl-5 list-decimal marker:font-semibold marker:text-[#667085] text-inherit"
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed pl-1">
                    {renderInline(item, isUser)}
                  </li>
                ))}
              </ol>
            );

          case "paragraph":
          default:
            return (
              <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                {renderInline(block.content, isUser)}
              </div>
            );
        }
      })}
    </div>
  );
}
