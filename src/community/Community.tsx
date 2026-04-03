import { useState, useEffect } from 'react'
import useCommunity from "@/community/useCommunity";
import {createPost} from "@/community/communityApi";
import type { LeaderboardEntry} from "@/shared/types";
import { PostList, PostDetail, CreatePostForm } from "@/community/component";
import useIdentity from "@/shared/hooks/useIdentity";

type View = 'list' | 'detail' | 'create'

interface CommunityProps {
  leaderboardEntries?: LeaderboardEntry[]
}

export default function Community({ leaderboardEntries }: CommunityProps) {
  const community = useCommunity()
  const { getUsername, ensureIdentity } = useIdentity()
  const [view, setView] = useState<View>('list')
  const [postType, setPostType] = useState('')

  useEffect(() => {
    community.loadPosts(1, postType || undefined).then()
  }, [postType])

  const handleSelectPost = (id: number) => {
    community.openPost(id).then()
    setView('detail')
  }

  const handleBack = () => {
    community.closePost()
    setView('list')
    community.loadPosts(community.page, postType || undefined).then()
  }

  const handlePostTypeChange = (type: string) => {
    setPostType(type)
  }

  const handlePageChange = (page: number) => {
    community.loadPosts(page, postType || undefined).then()
  }

  const handleCreatePost = async (title: string, body: string, type: string) => {
    await ensureIdentity()
    await createPost(title, body, type)
    setView('list')
    community.loadPosts(1, postType || undefined).then()
  }

  const handleDeleted = () => {
    setView('list')
    community.loadPosts(community.page, postType || undefined).then()
  }

  return (
    <div className="panel">
      {view === 'list' && (
        <PostList
          posts={community.posts}
          total={community.total}
          page={community.page}
          pageSize={community.pageSize}
          loading={community.loading}
          error={community.error}
          postType={postType}
          onPostTypeChange={handlePostTypeChange}
          onPageChange={handlePageChange}
          onSelectPost={handleSelectPost}
          onRefresh={() => community.loadPosts(community.page, postType || undefined).then()}
          onWrite={() => setView('create')}
          leaderboardEntries={leaderboardEntries}
        />
      )}

      {view === 'detail' && community.detailLoading && (
        <p className="state-msg">로딩 중...</p>
      )}
      {view === 'detail' && community.detailError && (
        <p className="state-msg error">{community.detailError}</p>
      )}
      {view === 'detail' && community.selectedPost && (
        <PostDetail
          post={community.selectedPost}
          username={getUsername()}
          onBack={handleBack}
          onRefresh={community.refreshDetail}
          ensureIdentity={ensureIdentity}
          onDeleted={handleDeleted}
          leaderboardEntries={leaderboardEntries}
        />
      )}

      {view === 'create' && (
        <CreatePostForm
          onSubmit={handleCreatePost}
          onCancel={() => setView('list')}
        />
      )}
    </div>
  )
}
