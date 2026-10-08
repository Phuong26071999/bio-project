import React, { memo, ReactNode } from 'react';

/**
 * Renders the small Markdown subset the assistant is asked to use:
 * paragraphs, line breaks, "-"/"*" and "1." lists, **bold**, [text](url),
 * bare URLs and emails. Everything is rendered as React text nodes, so model
 * output can never inject HTML. Links are limited to safe schemes.
 */

interface Props {
  text: string;
  onSectionLink?: () => void;
}

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|#[a-z][\w-]*$)/i;
const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s)]+[^\s).,!?;:])|([\w.+-]+@[\w-]+\.[\w.-]*\w)/g;

function renderLink(key: string, href: string, label: ReactNode, onSectionLink?: () => void) {
  if (!SAFE_URL.test(href)) return <React.Fragment key={key}>{label}</React.Fragment>;
  if (href.startsWith('#')) {
    return (
      <a key={key} href={href} onClick={onSectionLink}>
        {label}
      </a>
    );
  }
  const external = /^https?:/i.test(href);
  return (
    <a key={key} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {label}
    </a>
  );
}

function renderInline(text: string, keyPrefix: string, onSectionLink?: () => void): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${match.index}`;
    const [, bold, linkText, linkHref, url, email] = match;
    if (bold) nodes.push(<strong key={key}>{bold}</strong>);
    else if (linkText) nodes.push(renderLink(key, linkHref, linkText, onSectionLink));
    else if (url) nodes.push(renderLink(key, url, url, onSectionLink));
    else if (email) nodes.push(renderLink(key, `mailto:${email}`, email, onSectionLink));
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { type: 'p'; lines: string[] }
  | { type: 'ul' | 'ol'; items: string[] };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  text.replace(/\r\n?/g, '\n').split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      current = null;
      return;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const listType = bullet ? 'ul' : numbered ? 'ol' : null;
    const content = line.replace(/^#{1,6}\s+/, '');
    if (listType) {
      const item = (bullet || numbered)![1];
      if (current && current.type !== 'p' && current.type === listType) current.items.push(item);
      else blocks.push((current = { type: listType, items: [item] }));
    } else if (current && current.type === 'p') {
      current.lines.push(content);
    } else {
      blocks.push((current = { type: 'p', lines: [content] }));
    }
  });
  return blocks;
}

const MessageContent = ({ text, onSectionLink }: Props) => (
  <>
    {parseBlocks(text).map((block, i) => {
      const key = `b${i}`;
      if (block.type === 'p') {
        return (
          <p key={key}>
            {block.lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line, `${key}-${j}`, onSectionLink)}
              </React.Fragment>
            ))}
          </p>
        );
      }
      const List = block.type;
      return (
        <List key={key}>
          {block.items.map((item, j) => (
            <li key={j}>{renderInline(item, `${key}-${j}`, onSectionLink)}</li>
          ))}
        </List>
      );
    })}
  </>
);

export default memo(MessageContent);
