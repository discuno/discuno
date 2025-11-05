import type { MDXComponents } from 'mdx/types'
import Image from 'next/image'
import Link from 'next/link'
import type { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes } from 'react'

/**
 * Custom components for MDX rendering
 * These components replace default HTML elements with styled versions
 */
export const mdxComponents: MDXComponents = {
  // Custom heading components with anchor links
  h1: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-6 mt-8 text-4xl font-bold tracking-tight" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-4 mt-8 text-3xl font-semibold tracking-tight" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-3 mt-6 text-2xl font-semibold tracking-tight" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="mb-2 mt-4 text-xl font-semibold tracking-tight" {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h5 className="mb-2 mt-4 text-lg font-semibold tracking-tight" {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h6 className="mb-2 mt-4 text-base font-semibold tracking-tight" {...props}>
      {children}
    </h6>
  ),

  // Paragraph
  p: ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 leading-7 [&:not(:first-child)]:mt-6" {...props}>
      {children}
    </p>
  ),

  // Links
  a: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = href?.startsWith('http')
    const Component = isExternal ? 'a' : Link

    return (
      <Component
        href={href ?? '#'}
        className="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </Component>
    )
  },

  // Lists
  ul: ({ children, ...props }: HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-6 ml-6 list-disc space-y-2 [&>li]:mt-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-6 ml-6 list-decimal space-y-2 [&>li]:mt-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-7" {...props}>
      {children}
    </li>
  ),

  // Blockquote
  blockquote: ({ children, ...props }: HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-primary/40 text-muted-foreground [&>*]:text-muted-foreground border-l-4 pl-6 italic"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Code blocks
  code: ({ children, className, ...props }: HTMLAttributes<HTMLElement>) => {
    const isInline = !className
    if (isInline) {
      return (
        <code
          className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }: HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="bg-muted mb-4 mt-6 overflow-x-auto rounded-lg border p-4 font-mono text-sm"
      {...props}
    >
      {children}
    </pre>
  ),

  // Images with Next.js Image optimization
  // All images use next/image for automatic optimization
  // Configure allowed domains in next.config.js under images.remotePatterns
  img: ({
    src,
    alt,
    width: _width,
    height: _height,
    ..._props
  }: ImgHTMLAttributes<HTMLImageElement>) => {
    if (!src || typeof src !== 'string') return null

    return (
      <Image
        src={src}
        alt={alt ?? ''}
        width={800}
        height={450}
        className="my-8 rounded-lg border"
        sizes="(max-width: 768px) 100vw, 800px"
      />
    )
  },

  // Horizontal rule
  hr: (props: HTMLAttributes<HTMLHRElement>) => <hr className="border-border my-8" {...props} />,

  // Table components
  table: ({ children, ...props }: HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-y-auto">
      <table className="border-border w-full border-collapse border" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-muted" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-border border-b" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border-border border px-4 py-2 text-left font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-border border px-4 py-2" {...props}>
      {children}
    </td>
  ),
}
