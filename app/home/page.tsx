"use client"

import Link from "next/link"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { PollCard } from "@/components/poll-card"
import { PollResultsModal } from "@/components/poll-results-modal"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface Poll {
  id: string
  title: string
  description: string
  user_id: string
  created_at: string
  profiles?: {
    full_name: string
  }
}

export default function HomePage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null)
  const [resultsPoll, setResultsPoll] = useState<{ id: string; title: string } | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const {
  //         data: { user },
  //       } = await supabase.auth.getUser()
  //       if (!user) {
  //         router.push("/auth/login")
  //         return
  //       }
  //       setUser(user)

  //       const { data, error } = await supabase
  //         .from("polls")
  //         .select("*, profiles(full_name)")
  //         .order("created_at", { ascending: false })

  //       if (error) throw error
  //       setPolls(data || [])
  //     } catch (error) {
  //       console.error("Error fetching polls:", error)
  //     } finally {
  //       setLoading(false)
  //     }
  //   }

  //   fetchData()
  // }, [supabase, router])

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

        console.log("Fetching polls for user:", user.id)

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

        // Log everything we get back
        console.log("Raw response:", { data, error })

        if (error) {
          // Log the error as a string to see its actual content
          console.error("Supabase error (stringified):", JSON.stringify(error, null, 2))
          console.error("Error message:", error.message)
          console.error("Error details:", error.details)
          console.error("Error hint:", error.hint)
          console.error("Error code:", error.code)
          
          // Don't throw, just return to see what happens
          return
        }

        console.log("Polls fetched successfully:", data)
        setPolls(data || [])
      } catch (error) {
        // Log the caught error in multiple ways
        console.error("Caught error (type):", typeof error)
        console.error("Caught error (stringified):", JSON.stringify(error, null, 2))
        console.error("Caught error (raw):", error)
        
        if (error instanceof Error) {
          console.error("Error message:", error.message)
          console.error("Error stack:", error.stack)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, router])

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
              <p className="text-sm text-muted-foreground">Create balanced, point-allocation polls and see clear results — fair, equitable decision-making for groups.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="default">
                <Link href="/my-polls">Create a Poll</Link>
              </Button>
              <Button variant="ghost">
                <Link href="/my-polls">My Polls</Link>
              </Button>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4 text-primary">All Polls</h2>

        {polls.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No polls yet. Be the first to create one!</p>
            <Button>
              <Link href="/my-polls">Create a Poll</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {polls.map((poll) => (
              <div key={poll.id} className="transform hover:-translate-y-1 transition">
                <PollCard
                  poll={poll}
                  onVote={() => setExpandedPollId(null)}
                  expanded={expandedPollId === poll.id}
                  onToggleExpand={(id) => setExpandedPollId(id)}
                  onRequestResults={(id, title) => setResultsPoll({ id, title })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      {resultsPoll && (
        <PollResultsModal pollId={resultsPoll.id} pollTitle={resultsPoll.title} onClose={() => setResultsPoll(null)} />
      )}
    </div>
  )
}
