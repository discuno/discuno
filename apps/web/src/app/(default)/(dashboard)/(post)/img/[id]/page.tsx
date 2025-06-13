import { PostPage } from '~/app/(default)/(dashboard)/(post)/img/[id]/FullPostPage'
import { requireAuth } from '~/lib/auth/auth-utils'

const FullPostPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  await requireAuth()

  const postId = (await params).id
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-y-hidden bg-white dark:bg-gray-900">
      <PostPage id={postId} />
    </div>
  )
}

export default FullPostPage
