"use client"

// app/home/page.tsx
"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { PollCard } from "@/components/poll-card"
import { PollResultsModal } from "@/components/poll-results-modal"
import PollVotingModal from "@/components/poll-voting-modal"
import { PollCreationModal } from "@/components/poll-creation-modal"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface Vote {
  poll_id: string
}

interface Poll {
  id: string
  title: string
  description: string
  user_id: string
  created_at: string
  profiles?: { full_name: string }
  voteCount?: number
  options?: { id: string; text: string }[]
}

export default function HomePage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null)
  const [resultsPoll, setResultsPoll] = useState<{ id: string; title: string } | null>(null)
  const [votingPoll, setVotingPoll] = useState<{ id: string; title: string; description?: string; options?: { id: string; text: string }[] } | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [votingInProgress, setVotingInProgress] = useState(false)

  // NEW states for search + filter + sorting
  const [searchQuery, setSearchQuery] = useState("")
  const [voteFilter, setVoteFilter] = useState<"all" | "voted" | "not-voted">("all")
  const [votedPollIds, setVotedPollIds] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<"recent" | "trending">("recent")

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        setUser(user)

        // PARALLEL FETCHING - fetch polls and votes simultaneously
        const [pollsResponse, votesResponse, voteCountsResponse] = await Promise.all([
          supabase
            .from("polls")
            .select(`
              id,
              title,
              description,
              user_id,
              created_at,
              profiles(full_name)
            `)
            .order("created_at", { ascending: false }),
          
          supabase
            .from("votes")
            .select("poll_id")
            .eq("user_id", user.id),
          
          supabase
            .from("votes")
            .select("poll_id")
        ])

        if (pollsResponse.error) {
          console.error(pollsResponse.error)
          return
        }

        // Calculate vote counts efficiently
        const voteCountMap = new Map<string, number>()
        voteCountsResponse.data?.forEach((vote: Vote) => {
          voteCountMap.set(vote.poll_id, (voteCountMap.get(vote.poll_id) || 0) + 1)
        })

        const pollsWithVotes = pollsResponse.data?.map((poll: Poll) => ({
          ...poll,
          voteCount: voteCountMap.get(poll.id) || 0
        })) || []

        setPolls(pollsWithVotes)
        setVotedPollIds(new Set(votesResponse.data?.map((v: Vote) => v.poll_id) || []))
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // REAL-TIME SUBSCRIPTION - update UI when votes change
    const votesChannel = supabase
      .channel('votes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes'
        },
        async (payload: RealtimePostgresChangesPayload<{ poll_id: string }>) => {
          // Refetch vote counts when a vote changes
          const { data: voteCountsResponse } = await supabase
            .from("votes")
            .select("poll_id")

          const voteCountMap = new Map<string, number>()
          voteCountsResponse?.forEach((vote: Vote) => {
            voteCountMap.set(vote.poll_id, (voteCountMap.get(vote.poll_id) || 0) + 1)
          })

          setPolls(prevPolls => 
            prevPolls.map(poll => ({
              ...poll,
              voteCount: voteCountMap.get(poll.id) || 0
            }))
          )

          // Update voted polls if it's the current user's vote
          if (payload.eventType === 'INSERT' && user) {
            const { data: userVotes } = await supabase
              .from("votes")
              .select("poll_id")
              .eq("user_id", user.id)
            
            setVotedPollIds(new Set(userVotes?.map((v: Vote) => v.poll_id) || []))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(votesChannel)
    }
  }, [supabase, router])

  // MEMOIZED FILTERED POLLS - prevent unnecessary recalculations
  const filteredPolls = useMemo(() => {
    let result = polls.filter((poll) => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        poll.title.toLowerCase().includes(searchLower) ||
        poll.description?.toLowerCase().includes(searchLower) ||
        poll.profiles?.full_name?.toLowerCase().includes(searchLower)

      const hasVoted = votedPollIds.has(poll.id)
      const matchesVoteFilter =
        voteFilter === "all" ||
        (voteFilter === "voted" && hasVoted) ||
        (voteFilter === "not-voted" && !hasVoted)

      return matchesSearch && matchesVoteFilter
    })

    if (sortBy === "trending") {
      result = [...result].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
    }

    return result
  }, [polls, searchQuery, voteFilter, votedPollIds, sortBy])

  const handleRequestVote = useCallback(async (poll: Poll) => {
    // Fetch poll options if not already loaded
    if (!poll.options) {
      const { data: options } = await supabase
        .from("poll_choices")
        .select("id, choice_text")
        .eq("poll_id", poll.id)
      
      // Map choice_text to text for consistency
      poll.options = (options || []).map((opt: { id: string; choice_text: string }) => ({ 
        id: opt.id, 
        text: opt.choice_text 
      }))
    }

    setVotingPoll({ 
      id: poll.id, 
      title: poll.title, 
      description: poll.description,
      options: poll.options 
    })
  }, [supabase])

  // OPTIMISTIC UPDATE - add callback for when vote completes
  const handleVoteComplete = useCallback((pollId: string) => {
    // Optimistically update the UI
    setVotedPollIds(prev => {
      const newSet = new Set(prev)
      newSet.add(pollId)
      return newSet
    })

    setPolls(prevPolls =>
      prevPolls.map(poll =>
        poll.id === pollId
          ? { ...poll, voteCount: (poll.voteCount || 0) + 1 }
          : poll
      )
    )

    setVotingPoll(null)
    setExpandedPollId(null)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userEmail={user?.email} />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading polls...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userEmail={user?.email} />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8 rounded-lg bg-card/90 border border-border p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold mb-1 text-primary">Welcome to EquiPoll</h1>
              <p className="text-sm text-muted-foreground">
                Create balanced, point-allocation polls and see clear results.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowCreateModal(true)}>Create a Poll</Button>
              <Button variant="ghost" onClick={() => router.push("/my-polls")}>My Polls</Button>
            </div>
          </div>
        </div>

        {/* SEARCH / SORT / FILTER */}
        <div className="mb-6 flex flex-col gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search polls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background"
          />

          {/* Sort */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <Button size="sm" variant={sortBy === "recent" ? "default" : "outline"} onClick={() => setSortBy("recent")}>Recent</Button>
            <Button size="sm" variant={sortBy === "trending" ? "default" : "outline"} onClick={() => setSortBy("trending")}>Trending</Button>
          </div>

          {/* Filter */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Button size="sm" variant={voteFilter === "all" ? "default" : "outline"} onClick={() => setVoteFilter("all")}>All</Button>
            <Button size="sm" variant={voteFilter === "voted" ? "default" : "outline"} onClick={() => setVoteFilter("voted")}>Voted</Button>
            <Button size="sm" variant={voteFilter === "not-voted" ? "default" : "outline"} onClick={() => setVoteFilter("not-voted")}>Not Voted</Button>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4 text-primary">All Polls</h2>

        {filteredPolls.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No polls match your search or filters.</p>
            <Button onClick={() => setShowCreateModal(true)}>Create a Poll</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                expanded={expandedPollId === poll.id}
                hasVoted={votedPollIds.has(poll.id)}
                onToggleExpand={(id) => setExpandedPollId(id)}
                onRequestVote={(p) => handleRequestVote(p)}
                onRequestResults={(id, title) => setResultsPoll({ id, title })}
                onVote={() => setExpandedPollId(null)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && <PollCreationModal onClose={() => setShowCreateModal(false)} onPollCreated={() => setShowCreateModal(false)} />}
      {resultsPoll && <PollResultsModal pollId={resultsPoll.id} pollTitle={resultsPoll.title} onClose={() => setResultsPoll(null)} />}
      {votingPoll && (
        <PollVotingModal 
          open={!!votingPoll} 
          poll={votingPoll} 
          onClose={() => setVotingPoll(null)} 
          onVoteComplete={() => handleVoteComplete(votingPoll.id)} 
        />
      )}
    </div>
  )
}
