# Discuno Blog Documentation

This directory contains the blog pages for the Discuno platform. The blog is built with Next.js 15, MDX, and is fully optimized for SEO and AI indexing.

## 📁 Directory Structure

```
apps/web/
├── src/app/(app)/(public)/blog/
│   ├── [slug]/
│   │   └── page.tsx          # Individual blog post page
│   ├── page.tsx               # Blog listing page
│   └── README.md              # This file
├── content/blog/              # Blog post content (MDX files)
│   ├── welcome-to-discuno-blog.mdx
│   ├── choosing-the-right-mentor.mdx
│   └── maximize-mentorship-sessions.mdx
├── src/lib/blog.ts           # Blog utility functions
├── src/components/shared/
│   └── mdx-components.tsx    # Custom MDX components
└── src/app/
    ├── sitemap.ts            # Dynamic sitemap generation
    ├── robots.ts             # Robots.txt configuration
    └── api/feed/             # RSS/Atom/JSON feeds
        ├── rss.xml/
        ├── atom.xml/
        └── feed.json/
```

## 📝 Creating a New Blog Post

### 1. Create an MDX File

Create a new `.mdx` file in `apps/web/content/blog/` with kebab-case naming:

```bash
touch apps/web/content/blog/your-post-slug.mdx
```

### 2. Add Frontmatter

Every blog post must include frontmatter with metadata:

```mdx
---
title: 'Your Compelling Blog Post Title'
description: 'A concise description for SEO and social sharing (150-160 characters recommended)'
date: '2025-11-05'
author: 'Author Name'
tags: ['tag1', 'tag2', 'tag3']
image: '/images/blog/your-featured-image.jpg' # Optional
published: true
---

Your blog post content starts here...
```

### 3. Write Content with MDX

MDX allows you to use standard Markdown with React components:

```mdx
## Headings Work Great

You can use **bold**, _italic_, and ~~strikethrough~~ text.

### Code Blocks with Syntax Highlighting

\`\`\`typescript
const greeting = (name: string): string => {
return `Hello, ${name}!`
}
\`\`\`

### Lists

- Bullet points work
- Just like markdown
- Use them liberally

1. Numbered lists
2. Also work perfectly
3. For step-by-step guides

### Links

[Link to Discuno](/) or [External link](https://example.com)

### Images

![Alt text](/images/blog/example.jpg)

### Blockquotes

> This is a quote from someone wise.
> It can span multiple lines.

### Tables

| Feature | Status |
| ------- | ------ |
| MDX     | ✅     |
| SEO     | ✅     |
| RSS     | ✅     |
```

## 🎨 Frontmatter Options

| Field         | Type    | Required | Description                                     |
| ------------- | ------- | -------- | ----------------------------------------------- |
| `title`       | string  | ✅       | Post title (used in SEO, OpenGraph)             |
| `description` | string  | ✅       | Brief description (used in SEO, OpenGraph, RSS) |
| `date`        | string  | ✅       | Publication date in `YYYY-MM-DD` format         |
| `author`      | string  | ✅       | Author name (defaults to "Discuno Team")        |
| `tags`        | array   | ✅       | Array of tag strings for categorization         |
| `image`       | string  | ❌       | Featured image path (relative to `/public/`)    |
| `published`   | boolean | ✅       | Whether post is visible (`true`/`false`)        |

## 🔧 Blog Utility Functions

Located in `apps/web/src/lib/blog.ts`:

### `getAllPosts(): BlogPostMetadata[]`

Returns all published blog posts sorted by date (newest first).

```typescript
import { getAllPosts } from '~/lib/blog'

const posts = getAllPosts()
// Returns: [{ slug, title, description, date, author, tags, image, published, readingTime }, ...]
```

### `getPostBySlug(slug: string): BlogPost | null`

Get a single blog post by its slug (filename without extension).

```typescript
import { getPostBySlug } from '~/lib/blog'

const post = getPostBySlug('welcome-to-discuno-blog')
// Returns: { slug, title, description, date, author, tags, image, published, content, readingTime }
```

### `getAllPostSlugs(): string[]`

Get all blog post slugs for static generation.

```typescript
import { getAllPostSlugs } from '~/lib/blog'

const slugs = getAllPostSlugs()
// Returns: ['welcome-to-discuno-blog', 'choosing-the-right-mentor', ...]
```

### `getPostsByTag(tag: string): BlogPostMetadata[]`

Get all posts with a specific tag.

```typescript
import { getPostsByTag } from '~/lib/blog'

const mentorshipPosts = getPostsByTag('mentorship')
```

### `getAllTags(): string[]`

Get all unique tags from all posts.

```typescript
import { getAllTags } from '~/lib/blog'

const tags = getAllTags()
// Returns: ['announcement', 'career-planning', 'mentorship', ...]
```

### `formatDate(dateString: string): string`

Format an ISO date string to a readable format.

```typescript
import { formatDate } from '~/lib/blog'

const readable = formatDate('2025-11-05')
// Returns: "November 5, 2025"
```

## 🎨 Custom MDX Components

Custom components are defined in `apps/web/src/components/shared/mdx-components.tsx`. All standard HTML elements are styled automatically:

- **Headings** (h1-h6): Styled with appropriate sizing and spacing
- **Paragraphs**: Optimized line height and spacing
- **Links**: Styled with primary color, external links open in new tab
- **Lists**: Proper spacing and styling
- **Code**: Inline code with background, code blocks with syntax highlighting
- **Images**: Automatic optimization with Next.js Image for local images
- **Tables**: Bordered, responsive tables
- **Blockquotes**: Styled with left border and muted text

### Adding Custom Components

To add custom React components to your MDX:

1. Create the component in `apps/web/src/components/shared/`
2. Import it in `mdx-components.tsx`
3. Add it to the `mdxComponents` object
4. Use it in your MDX files

Example:

```tsx
// In mdx-components.tsx
import { CustomCallout } from './CustomCallout'

export const mdxComponents: MDXComponents = {
  // ... existing components
  Callout: CustomCallout,
}
```

```mdx
<!-- In your blog post -->

<Callout type="info">This is a custom callout component!</Callout>
```

## 🔍 SEO Features

### Automatic SEO Optimization

Each blog post automatically includes:

1. **Meta Tags**: Title, description, keywords
2. **OpenGraph Tags**: For social media sharing (Facebook, LinkedIn)
3. **Twitter Cards**: Optimized previews for Twitter/X
4. **JSON-LD Structured Data**: BlogPosting schema for rich search results
5. **Canonical URLs**: Proper canonical URL configuration
6. **Reading Time**: Automatically calculated

### Sitemap

All published blog posts are automatically included in the sitemap at `/sitemap.xml`.

View at: `https://discuno.com/sitemap.xml`

### RSS/Atom/JSON Feeds

The blog provides multiple feed formats:

- **RSS 2.0**: `/api/feed/rss.xml`
- **Atom**: `/api/feed/atom.xml`
- **JSON Feed**: `/api/feed/feed.json`

All feeds include:

- Post title, description, link
- Publication date
- Author information
- Tags/categories
- Featured images (if present)

### Robots.txt

The `robots.txt` is configured to:

- Allow all search engines to crawl the blog
- Explicitly allow AI crawlers (GPTBot, Claude-Web, anthropic-ai, Google-Extended, CCBot)
- Disallow crawling of API routes and auth pages
- Reference the sitemap

View at: `https://discuno.com/robots.txt`

## 🚀 Best Practices

### Writing for SEO

1. **Title**: 50-60 characters, include target keywords
2. **Description**: 150-160 characters, compelling summary
3. **Headings**: Use H2-H6 in hierarchical order
4. **Links**: Include internal links to other posts/pages
5. **Images**: Always include alt text
6. **Tags**: Use 3-5 relevant tags per post

### Writing for Readers

1. **Start Strong**: Hook readers in the first paragraph
2. **Scannable**: Use headings, lists, and short paragraphs
3. **Actionable**: Provide clear takeaways and action items
4. **Examples**: Include real-world examples and use cases
5. **Visual**: Break up text with images, code blocks, quotes

### Content Structure

Recommended structure for blog posts:

```mdx
---
# Frontmatter
---

## Introduction

Brief overview and hook (2-3 paragraphs)

## Main Content

### Section 1

Content...

### Section 2

Content...

### Section 3

Content...

## Conclusion / Next Steps

Summarize key points and provide call-to-action

---

_Call-to-action link to relevant Discuno page_
```

## 🧪 Testing Your Blog Post

### 1. Local Preview

Start the development server:

```bash
pnpm dev:web
```

Visit: `http://localhost:3000/blog/your-post-slug`

### 2. Check Build

Ensure the post builds without errors:

```bash
pnpm build:web
```

### 3. Verify in Sitemap

After building, check that your post appears in the sitemap:

```bash
curl http://localhost:3000/sitemap.xml | grep your-post-slug
```

### 4. Test RSS Feed

Verify your post is in the RSS feed:

```bash
curl http://localhost:3000/api/feed/rss.xml
```

## 📊 Analytics & Tracking

Blog posts are tracked using PostHog analytics. The following events are automatically tracked:

- Page views
- Reading time
- Scroll depth
- Click-throughs from blog listing page

## 🔄 Publishing Workflow

### Draft → Published

1. Create your MDX file with `published: false`
2. Preview locally at `/blog/your-slug` (requires direct URL access)
3. When ready, change to `published: true`
4. Commit and push to trigger deployment

### Updating Posts

1. Edit the MDX file in `apps/web/content/blog/`
2. Update the `date` field if making significant changes
3. Commit and push

### Unpublishing

1. Change `published: true` to `published: false`
2. Post will be removed from listing and feeds
3. Direct URL will return 404

## 🎯 Common Use Cases

### Series of Posts

Tag related posts with a series identifier:

```mdx
---
tags: ['series-getting-started', 'mentorship']
---
```

Then filter by tag in custom pages or components.

### Author Pages

Filter posts by author:

```typescript
const authorPosts = getAllPosts().filter(post => post.author === 'Brad')
```

### Featured Posts

Add a `featured` field to frontmatter and filter:

```mdx
---
featured: true
---
```

```typescript
const featuredPosts = getAllPosts().filter(post => post.featured)
```

## 🐛 Troubleshooting

### Post Not Showing Up

1. Check `published: true` in frontmatter
2. Verify file is in `apps/web/content/blog/`
3. Ensure filename ends with `.mdx` or `.md`
4. Check for YAML syntax errors in frontmatter
5. Rebuild the application

### Build Errors

1. Check frontmatter syntax (YAML)
2. Ensure all required fields are present
3. Verify MDX syntax is valid
4. Check for TypeScript errors in custom components

### Images Not Loading

1. Ensure image is in `public/` directory
2. Use absolute paths starting with `/`
3. For external images, use full URLs
4. Check image file permissions

## 📚 Examples

See the sample blog posts in `apps/web/content/blog/` for complete examples:

- `welcome-to-discuno-blog.mdx` - Announcement post
- `choosing-the-right-mentor.mdx` - Long-form guide
- `maximize-mentorship-sessions.mdx` - List-based how-to

## 🔗 Related Documentation

- [Next.js MDX Documentation](https://nextjs.org/docs/app/building-your-application/configuring/mdx)
- [Gray Matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter parsing
- [Rehype Plugins](https://github.com/rehypejs/rehype) - HTML processing
- [Remark Plugins](https://github.com/remarkjs/remark) - Markdown processing

## 💡 Tips

- Use the `reading-time` automatically calculated in `BlogPostMetadata`
- Keep frontmatter consistent across all posts
- Use tags strategically for content discovery
- Include featured images for better social sharing
- Write compelling descriptions for better click-through rates
- Update older posts periodically to keep content fresh
- Cross-link related posts for better user engagement
