"use client"

// app/home/page.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { PollCard } from "@/components/poll-card"
import { PollResultsModal } from "@/components/poll-results-modal"
import PollVotingModal from "@/components/poll-voting-modal"
import { PollCreationModal } from "@/components/poll-creation-modal"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

// ... rest of your existing home page code remains the same, but remove the duplicate Navigation component usage

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

        // Fetch polls
        const { data, error } = await supabase
          .from("polls")
          .select(`
            id,
            title,
            description,
            user_id,
            created_at,
            profiles(full_name)
          `)
          .order("created_at", { ascending: false })

        if (error) return

        // Fetch vote counts (trending sort)
        const pollsWithVotes = await Promise.all(
          (data || []).map(async (poll: Poll) => {
            const { count } = await supabase
              .from("votes")
              .select("*", { count: "exact", head: true })
              .eq("poll_id", poll.id)

            return { ...poll, voteCount: count || 0 }
          })
        )

        setPolls(pollsWithVotes)

        // Fetch user's votes
        const { data: votes } = await supabase
          .from("votes")
          .select("poll_id")
          .eq("user_id", user.id)

        setVotedPollIds(new Set(votes?.map((v: Vote) => v.poll_id) || []))
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, router])

  // --- SEARCH + FILTER + SORT LOGIC ---
  let filteredPolls = polls.filter((poll) => {
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
    filteredPolls = [...filteredPolls].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
  }

   const handleRequestVote = async (poll: Poll) => {
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
  }

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
      {votingPoll && <PollVotingModal open={!!votingPoll} poll={votingPoll} onClose={() => setVotingPoll(null)} onVoteComplete={() => setExpandedPollId(null)} />}
    </div>
  )
}
