"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PointAllocationVoting } from "@/components/point-allocation-voting"
import { PollResultsModal } from "@/components/poll-results-modal"

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

interface PollCardProps {
  poll: Poll
  onVote: () => void
}

export function PollCard({ poll, onVote }: PollCardProps) {
  const [showVoting, setShowVoting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkUserAndVote = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (!user) return

        const { data } = await supabase
          .from("votes")
          .select("id")
          .eq("poll_id", poll.id)
          .eq("user_id", user.id)
          .limit(1)

        setHasVoted((data && data.length > 0) || false)
      } catch (error) {
        console.error("Error checking vote:", error)
      }
    }

    checkUserAndVote()
  }, [poll.id, supabase])

  const handleVoteComplete = () => {
    setShowVoting(false)
    setHasVoted(true)
    onVote()
  }

  if (showVoting) {
    return (
    <PointAllocationVoting
      poll={poll}
      onClose={() => setShowVoting(false)}
      onVoteComplete={handleVoteComplete}
    />
    )
  }

  return (
    <>
      <Card className="bg-card border-border hover:shadow-lg transition-shadow h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl">{poll.title}</CardTitle>
          <CardDescription>by {poll.profiles?.full_name || "Anonymous"}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <p className="text-sm text-muted-foreground mb-4">{poll.description || "No description provided"}</p>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowVoting(true)}
              className={`flex-1 ${
                hasVoted
                  ? "bg-muted text-muted-foreground hover:bg-muted"
                  : "bg-accent text-accent-foreground hover:opacity-90"
              }`}
              disabled={hasVoted}
            >
              {hasVoted ? "Already Voted" : "Vote Now"}
            </Button>
            <Button
              onClick={() => setShowResults(true)}
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-muted bg-transparent"
            >
              View Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {showResults && (
        <PollResultsModal
          pollId={poll.id}
          pollTitle={poll.title}
          onClose={() => setShowResults(false)}
        />
      )}
    </>
  )
}
