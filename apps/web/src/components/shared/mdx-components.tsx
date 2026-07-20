import type { MDXComponents } from 'mdx/types'
import Image from 'next/image'
import Link from 'next/link'
import type { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes } from 'react'

import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'

export const mdxComponents: MDXComponents = {
  h1: ({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className={cn(
        'font-display mt-14 scroll-m-24 text-4xl leading-tight font-semibold tracking-[-0.035em] text-balance first:mt-0 sm:text-5xl',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className={cn(
        'font-display mt-14 scroll-m-24 text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance first:mt-0 sm:text-4xl',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className={cn(
        'mt-10 scroll-m-24 text-xl leading-7 font-semibold tracking-[-0.02em] first:mt-0 sm:text-2xl',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className={cn('mt-8 scroll-m-24 text-lg font-semibold first:mt-0', className)} {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h5 className={cn('mt-8 scroll-m-24 text-base font-semibold first:mt-0', className)} {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h6
      className={cn(
        'text-muted-foreground mt-8 scroll-m-24 text-sm font-semibold first:mt-0',
        className
      )}
      {...props}
    >
      {children}
    </h6>
  ),
  p: ({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className={cn('text-foreground/90 mt-5 text-[1.0625rem] leading-8 first:mt-0', className)}
      {...props}
    >
      {children}
    </p>
  ),
  a: ({
    href,
    children,
    className,
    target,
    rel,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = /^https?:\/\//.test(href ?? '')
    const isHeadingAnchor = className?.split(' ').includes('anchor-link')
    const linkClassName = cn(
      isHeadingAnchor
        ? 'text-inherit no-underline'
        : 'text-primary font-medium underline decoration-current/35 underline-offset-4 transition-colors hover:decoration-current',
      className
    )

    if (!href) {
      return (
        <a className={linkClassName} target={target} rel={rel} {...props}>
          {children}
        </a>
      )
    }

    if (isExternal) {
      return (
        <a
          href={href}
          className={linkClassName}
          target={target ?? '_blank'}
          rel={rel ?? 'noopener noreferrer'}
          {...props}
        >
          {children}
        </a>
      )
    }

    return (
      <Link href={href} className={linkClassName} target={target} rel={rel} {...props}>
        {children}
      </Link>
    )
  },
  ul: ({ children, className, ...props }: HTMLAttributes<HTMLUListElement>) => (
    <ul
      className={cn(
        'text-foreground/90 marker:text-muted-foreground my-6 ml-5 flex list-disc flex-col gap-2 text-[1.0625rem] leading-8',
        className
      )}
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }: HTMLAttributes<HTMLOListElement>) => (
    <ol
      className={cn(
        'text-foreground/90 marker:text-muted-foreground my-6 ml-5 flex list-decimal flex-col gap-2 text-[1.0625rem] leading-8',
        className
      )}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }: HTMLAttributes<HTMLLIElement>) => (
    <li className={cn('pl-1 [&>ol]:my-3 [&>ul]:my-3', className)} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, className, ...props }: HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className={cn(
        'border-primary [&>p]:font-display [&>p]:text-foreground my-9 border-l-2 pl-5 sm:pl-6 [&>p]:mt-0 [&>p]:text-xl [&>p]:leading-8 [&>p]:font-medium sm:[&>p]:text-2xl',
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }: HTMLAttributes<HTMLElement>) => (
    <code
      className={cn('bg-muted rounded px-1.5 py-0.5 font-mono text-[0.9em] font-medium', className)}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children, className, ...props }: HTMLAttributes<HTMLPreElement>) => (
    <pre
      className={cn(
        'bg-foreground text-background my-8 overflow-x-auto rounded-lg p-5 font-mono text-sm leading-6 [&>code]:rounded-none [&>code]:bg-transparent [&>code]:p-0 [&>code]:font-normal [&>code.hljs]:p-0',
        className
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  img: ({
    src,
    alt,
    className,
    width: _width,
    height: _height,
    ..._props
  }: ImgHTMLAttributes<HTMLImageElement>) => {
    if (!src || typeof src !== 'string') return null

    return (
      <Image
        src={src}
        alt={alt ?? ''}
        width={1200}
        height={675}
        className={cn('my-10 h-auto w-full rounded-xl object-cover', className)}
        sizes="(max-width: 768px) 100vw, 672px"
      />
    )
  },
  hr: () => <Separator className="bg-foreground/20 my-12" />,
  table: ({ children, className, ...props }: HTMLAttributes<HTMLTableElement>) => (
    <div className="my-8 w-full overflow-x-auto">
      <table
        className={cn('w-full min-w-[36rem] border-collapse text-left text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className={cn('border-foreground/35 border-b-2', className)} {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, className, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
    <tr className={cn('border-foreground/18 border-b', className)} {...props}>
      {children}
    </tr>
  ),
  th: ({ children, className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
    <th className={cn('px-3 py-3 font-semibold first:pl-0 last:pr-0', className)} {...props}>
      {children}
    </th>
  ),
  td: ({ children, className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className={cn('text-foreground/85 px-3 py-3 align-top first:pl-0 last:pr-0', className)}
      {...props}
    >
      {children}
    </td>
  ),
}
