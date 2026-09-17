import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useCommunity from "@/community/useCommunity";
import { pathOf, postPath } from "@/config/routes";
import {createPost, type PostInput} from "@/community/communityApi";
import type { LeaderboardEntry} from "@/shared/types";
import { PostList, PostDetail, CreatePostForm } from "@/community/component";
import useIdentity from "@/shared/hooks/useIdentity";
import { statusBody } from "@/shared/util/panelStatus";
import { ListSkeleton } from "@/shared/components/Skeleton";

/** 'detail' is not in this union: which post is open is the URL's answer, not
 * a second copy of it here. 'create' is a genuinely local mode — there is
 * nothing to link to until the post exists. */
type View = 'list' | 'create'

interface CommunityProps {
  leaderboardEntries?: LeaderboardEntry[]
}

export default function Community({ leaderboardEntries }: CommunityProps) {
  const community = useCommunity()
  const navigate = useNavigate()
  const { postId } = useParams()
  const { getUsername, ensureIdentity } = useIdentity()
  const [view, setView] = useState<View>('list')
  const [postType, setPostType] = useState('')
  const [characters, setCharacters] = useState<string[]>([])

  // A post id in the path is the whole trigger for the detail view, so it works
  // the same whether the reader clicked a row, pressed Back, or opened a shared
  // link cold.
  const openId = postId ? Number(postId) : null
  const showDetail = openId != null && Number.isFinite(openId)
  // One value decides what the panel shows, so the three branches below stay
  // mutually exclusive: a path with a post id wins over the local 'create'
  // mode, which navigating away from the form has already left behind.
  const mode: 'detail' | View = showDetail ? 'detail' : view

  // Every reload goes through here, so the filters cannot be dropped by a
  // caller that forgot one — which is what happened when the character filter
  // was added and six of the seven call sites still passed only the category.
  const reload = (page = community.page) =>
    community.loadPosts(page, postType || undefined, characters).then()

  useEffect(() => {
    reload(1)
  }, [postType, characters])

  useEffect(() => {
    if (!showDetail) return
    community.openPost(openId).then()
  }, [openId, showDetail])

  const handleSelectPost = (id: number) => {
    navigate(postPath(id))
  }

  const handleBack = () => {
    community.closePost()
    navigate(pathOf('community'))
    reload()
  }

  const handlePostTypeChange = (type: string) => {
    setPostType(type)
  }

  const handlePageChange = (page: number) => {
    reload(page)
  }

  const handleCreatePost = async (input: PostInput) => {
    await ensureIdentity()
    await createPost(input)
    setView('list')
    reload(1)
  }

  const handleDeleted = () => {
    navigate(pathOf('community'))
    reload()
  }

  return (
    <div className="panel">
      {mode === 'list' && (
        <PostList
          posts={community.posts}
          total={community.total}
          page={community.page}
          pageSize={community.pageSize}
          loading={community.loading}
          error={community.error}
          postType={postType}
          onPostTypeChange={handlePostTypeChange}
          characters={characters}
          onCharactersChange={setCharacters}
          onPageChange={handlePageChange}
          onSelectPost={handleSelectPost}
          onRefresh={() => reload()}
          onWrite={() => setView('create')}
          leaderboardEntries={leaderboardEntries}
        />
      )}

      {/* The board was the last tab reporting its own states by hand: a bare
          "로딩 중..." with no announced role, and a raw error string with no way
          back. Both now go through the shared panel status, so a failed post
          offers a retry the same way every other tab does. */}
      {mode === 'detail' && statusBody(community.detailLoading, community.detailError, {
        loadingMsg: '게시글을 불러오는 중',
        onRetry: () => { if (openId != null) community.openPost(openId).then() },
        skeleton: <ListSkeleton rows={3} label="게시글을 불러오는 중" />,
      })}
      {mode === 'detail' && community.selectedPost && (
        <PostDetail
          key={community.selectedPost.id}
          post={community.selectedPost}
          username={getUsername()}
          onBack={handleBack}
          onRefresh={() => {
            community.refreshDetail()
            reload()
          }}
          ensureIdentity={ensureIdentity}
          onDeleted={handleDeleted}
          leaderboardEntries={leaderboardEntries}
        />
      )}

      {mode === 'create' && (
        <CreatePostForm
          onSubmit={handleCreatePost}
          onCancel={() => setView('list')}
        />
      )}
    </div>
  )
}
