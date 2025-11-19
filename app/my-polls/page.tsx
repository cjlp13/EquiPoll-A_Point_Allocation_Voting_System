"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { PollCreationModal } from "@/components/poll-creation-modal"
import { PollEditModal } from "@/components/poll-edit-modal"
import { PollResultsModal } from "@/components/poll-results-modal"
import { PollCard } from "@/components/poll-card"
import { BarChart2, Edit2, Trash2 } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Poll {
  id: string
  title: string
  description: string
  created_at: string
}

export default function MyPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null)
  const [viewingResultsPoll, setViewingResultsPoll] = useState<Poll | null>(null)
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null)
  const [resultsPoll, setResultsPoll] = useState<{ id: string; title: string } | null>(null)
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
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error
        setPolls(data || [])
      } catch (error) {
        console.error("Error fetching polls:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, router])

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm("Are you sure you want to delete this poll?")) return

    try {
      const { error } = await supabase.from("polls").delete().eq("id", pollId)

      if (error) throw error
      setPolls((prev) => prev.filter((p) => p.id !== pollId))
    } catch (error) {
      console.error("Error deleting poll:", error)
    }
  }

  const handlePollCreated = (newPoll: Poll) => {
    setPolls((prev) => [newPoll, ...prev])
    setShowCreateModal(false)
  }

  const handlePollUpdated = (updatedPoll: Poll) => {
    setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)))
    setEditingPoll(null)
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary">My Polls</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            Create New Poll
          </Button>
        </div>

        {polls.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">You haven&apos;t created any polls yet.</p>
            <Button onClick={() => setShowCreateModal(true)}>Create Your First Poll</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {polls.map((poll) => (
              <div key={poll.id} className="flex gap-4 items-start">
                <div className="flex-1">
                  <PollCard
                    poll={poll as any}
                    onVote={() => setExpandedPollId(null)}
                    expanded={expandedPollId === poll.id}
                    onToggleExpand={(id) => setExpandedPollId(id)}
                    onRequestResults={(id, title) => setResultsPoll({ id, title })}
                  />
                </div>
                <div className="w-48 flex-shrink-0 flex flex-col gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setResultsPoll({ id: poll.id, title: poll.title })} className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Results</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingPoll(poll)} className="flex items-center gap-2">
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeletePoll(poll.id)} className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <PollCreationModal onClose={() => setShowCreateModal(false)} onPollCreated={handlePollCreated} />
        )}

        {editingPoll && (
          <PollEditModal poll={editingPoll} onClose={() => setEditingPoll(null)} onPollUpdated={handlePollUpdated} />
        )}
        {editingPoll && (
          <PollEditModal poll={editingPoll} onClose={() => setEditingPoll(null)} onPollUpdated={handlePollUpdated} />
        )}

        {viewingResultsPoll && (
          <PollResultsModal
            pollId={viewingResultsPoll.id}
            pollTitle={viewingResultsPoll.title}
            onClose={() => setViewingResultsPoll(null)}
          />
        )}

        {resultsPoll && (
          <PollResultsModal pollId={resultsPoll.id} pollTitle={resultsPoll.title} onClose={() => setResultsPoll(null)} />
        )}
      </div>
    </div>
  )
}