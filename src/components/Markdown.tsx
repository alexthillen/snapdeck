/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  TypographyStylesProvider,
  useMantineColorScheme,
  Table,
} from '@mantine/core'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { CSSProperties, ReactNode } from 'react'
import 'katex/dist/katex.min.css'

// HTML entity decoding using DOMParser if available
const decodeHtmlEntities = (text: string): string => {
  const textArea = document.createElement('textarea')
  textArea.innerHTML = text
  return textArea.value
}

// Preprocess math content to handle <br> and decode entities inside math blocks
function decodeMarkdownMathContent(markdownText: string): string {
  // Block math: $$...$$ and \[...\]
  const blockMathRegex =
    /((?<!\\)\$\$([\s\S]*?)(?<!\\)\$\$|\\\[([\s\S]*?)\\\])/g

  let res = markdownText.replace(
    blockMathRegex,
    (_match, _fullMatch, dollarContent, bracketContent) => {
      let content = dollarContent || bracketContent
      if (content.endsWith('\\$')) {
        content += ' '
      }
      let processedContent = content.replace(/<br\s*\/?>/gi, '\n')
      processedContent = decodeHtmlEntities(processedContent)
      if (dollarContent !== undefined) {
        return `$$${processedContent}$$`
      } else {
        return `\\[${processedContent}\\]`
      }
    },
  )
  const inlineMathRegex =
    /((?<!\\)\$((?:[^$\n\\]|\\.)+?)(?<!\\)\$(?!\$)|\\\(([^)]*?)\\\))/g
  res = res.replace(
    inlineMathRegex,
    (_match, _fullMatch, dollarContent, parenContent) => {
      const content = dollarContent || parenContent
      let processedContent = content.replace(/<br\s*\/?>/gi, ' ')
      processedContent = processedContent.replace(/\\\$/g, '🪷')
      processedContent = decodeHtmlEntities(processedContent)
      if (dollarContent !== undefined) {
        return `$${processedContent}$`
      } else {
        return `\\(${processedContent}\\)`
      }
    },
  )
  return res
}

// Custom sanitization schema for safe HTML rendering
const createSanitizationSchema = () => ({
  tagNames: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'del',
    'ins',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'dl',
    'dt',
    'dd',
    'blockquote',
    'pre',
    'code',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'a',
    'img',
    'div',
    'span',
    'section',
    'article',
    'aside',
    'nav',
    'header',
    'footer',
    'main',
    'figure',
    'figcaption',
    'mark',
    'small',
    'sub',
    'sup',
    'kbd',
    'samp',
    'var',
  ],
  attributes: {
    '*': ['className', 'id', 'style'],
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['align', 'colspan', 'rowspan'],
    td: ['align', 'colspan', 'rowspan'],
    ol: ['start', 'type'],
    li: ['value'],
  },
  protocols: {
    href: ['http', 'https', 'mailto', 'tel'],
    src: ['http', 'https', 'data'],
  },
  strip: ['script', 'style', 'iframe', 'object', 'embed'],
  clobberPrefix: 'user-content-',
})

// Props for the Markdown component
interface MarkdownProps {
  children: string
  className?: string
  allowHtml?: boolean
  sanitize?: boolean
  customSanitizeSchema?: object | null
}

// Main Markdown component
const Markdown = ({
  children,
  className = '',
  allowHtml = false,
  sanitize = false,
  customSanitizeSchema = null,
}: MarkdownProps) => {
  const { colorScheme } = useMantineColorScheme()
  const syntaxTheme = colorScheme === 'dark' ? oneDark : oneLight

  // Preprocess special characters (e.g., \: → :)
  const preprocessSpecialCharacters = (content: string) =>
    content.replace(/\\:/g, ':')

  // Preprocess HTML breaks to newlines
  const preprocessHtmlBreaks = (content: string) =>
    content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')

  // Full content preprocessing pipeline
  const processedContent = (() => {
    let content = allowHtml ? children : decodeHtmlEntities(children)
    content = preprocessHtmlBreaks(content)
    content = preprocessSpecialCharacters(content)
    content = decodeMarkdownMathContent(content)
    return content
  })()

  const inlineCodeStyles: CSSProperties = {
    backgroundColor: colorScheme === 'dark' ? '#2d3748' : '#f7fafc',
    color: colorScheme === 'dark' ? '#e2e8f0' : '#2d3748',
    padding: '2px 4px',
    borderRadius: '4px',
    fontSize: '0.875em',
    fontFamily: 'monospace',
  }

  const syntaxHighlighterCustomStyle: CSSProperties = {
    borderRadius: '4px',
    padding: '8px',
    marginTop: '0.5em',
    marginBottom: '0.5em',
  }

  // Build rehype plugins array
  const buildRehypePlugins = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins: any[] = [rehypeKatex]
    if (allowHtml) {
      plugins.push(rehypeRaw)
      if (sanitize) {
        const schema = customSanitizeSchema || createSanitizationSchema()
        plugins.push([rehypeSanitize, schema])
      }
    }
    return plugins
  }

  return (
    <TypographyStylesProvider className={`${className} markdown-content`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={buildRehypePlugins()}
        components={{
          pre: ({ children, ...props }) => {
            // Avoid double <pre> by using a <div> and remove the ref prop to avoid type mismatch
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { ref, ...restProps } = props as any
            return <div {...restProps}>{children}</div>
          },
          code: ({
            inline,
            className: codeClassName,
            children: codeChildren,
            ...props
          }: {
            inline?: boolean
            className?: string
            children?: ReactNode
          }) => {
            const match = /language-(\w+)/.exec(codeClassName || '')
            const codeString = String(
              decodeHtmlEntities(
                typeof codeChildren === 'string'
                  ? codeChildren
                  : (codeChildren as string[]).join(''),
              ),
            )
              .replace(/^\n/, '')
              .replace(/\n$/, '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={syntaxTheme}
                language={match[1]}
                PreTag="div"
                customStyle={syntaxHighlighterCustomStyle}
                codeTagProps={{
                  style: {
                    lineHeight: 'inherit',
                    fontSize: 'inherit',
                    backgroundColor: 'inherit',
                    padding: '0',
                  },
                }}
                wrapLines
                {...props}
              >
                {codeString}
              </SyntaxHighlighter>
            ) : (
              <code style={inlineCodeStyles} {...props}>
                {codeString}
              </code>
            )
          },
          // Table rendering using Mantine Table
          table: ({ children, ...props }) => (
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
              style={{
                marginTop: '1em',
                marginBottom: '1em',
              }}
              {...props}
            >
              {children}
            </Table>
          ),
          thead: ({ children, ...props }) => (
            <Table.Thead {...props}>{children}</Table.Thead>
          ),
          tbody: ({ children, ...props }) => (
            <Table.Tbody {...props}>{children}</Table.Tbody>
          ),
          tr: ({ children, ...props }) => (
            <Table.Tr {...props}>{children}</Table.Tr>
          ),
          th: ({ children, ...props }) => (
            <Table.Th {...props}>{children}</Table.Th>
          ),
          td: ({ children, ...props }) => (
            <Table.Td {...props}>{children}</Table.Td>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </TypographyStylesProvider>
  )
}

export default Markdown
