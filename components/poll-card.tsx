"use client"

import { useState, useEffect, useRef } from "react"
import { User, ThumbsUp, BarChart2 } from "lucide-react"
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
  expanded?: boolean
  onToggleExpand?: (pollId: string | null) => void
  onRequestResults?: (pollId: string, pollTitle: string) => void
  onRequestVote?: (poll: Poll) => void
}

export function PollCard({ poll, onVote, expanded = false, onToggleExpand, onRequestResults, onRequestVote }: PollCardProps) {
  const [showResults, setShowResults] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [choicesCount, setChoicesCount] = useState<number | null>(null)
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

  useEffect(() => {
    // fetch choices count to add some metadata to the card
    const fetchChoicesCount = async () => {
      try {
        const { data } = await supabase.from("poll_choices").select("id").eq("poll_id", poll.id)
        setChoicesCount(data ? data.length : 0)
      } catch (err) {
        console.error("Error fetching choices count:", err)
        setChoicesCount(0)
      }
    }
    fetchChoicesCount()
  }, [poll.id, supabase])

  const handleVoteComplete = () => {
    // Collapse after voting and notify parent
    onVote()
    if (onToggleExpand) onToggleExpand(null)
    setHasVoted(true)
  }

  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    // Measure content height for smooth animation
    if (expanded) {
      // Use a small delay to ensure content is rendered
      const timer = setTimeout(() => {
        const full = el.scrollHeight
        el.style.maxHeight = `${full}px`
        el.style.opacity = '1'
      }, 50)
      return () => clearTimeout(timer)
    } else {
      el.style.maxHeight = '0px'
      el.style.opacity = '0'
    }
  }, [expanded])

  // Also remeasure when the voting component renders to account for async loading
  useEffect(() => {
    if (!expanded) return
    const el = contentRef.current
    if (!el) return
    
    const observer = new ResizeObserver(() => {
      const full = el.scrollHeight
      el.style.maxHeight = `${full}px`
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [expanded])

  return (
    <>
      <Card className={`bg-card border-border transition-shadow h-full flex flex-col rounded-lg ${expanded ? 'shadow-2xl' : 'hover:shadow-lg'}`}>
        <CardHeader>
          <div className="flex justify-between items-start w-full">
            <div className="flex-1">
              <CardTitle className="text-xl">{poll.title}</CardTitle>
              <CardDescription className="text-sm flex flex-col gap-1">
                <span className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> <span>by {poll.profiles?.full_name || "Anonymous"}</span></span>
                <span className="text-xs text-muted-foreground">Created {poll.created_at ? new Date(poll.created_at).toLocaleDateString() : '—'}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{poll.description || "No description provided"}</p>

          <div
            ref={contentRef}
            className="mb-4 overflow-hidden transition-[max-height,opacity] duration-300"
            style={{ maxHeight: 0, opacity: 0 }}
            aria-hidden={!expanded}
          >
            <div className="pt-2">
              {expanded && (
                <PointAllocationVoting poll={poll} onClose={() => onToggleExpand && onToggleExpand(null)} onVoteComplete={handleVoteComplete} />
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Button
              onClick={() => {
                if (onRequestVote) {
                  onRequestVote(poll)
                } else {
                  onToggleExpand && onToggleExpand(expanded ? null : String(poll.id))
                }
              }}
              className={`flex-1 ${
                hasVoted
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
              disabled={hasVoted}
            >
              <div className="flex items-center justify-center gap-2">
                <ThumbsUp className="h-4 w-4" />
                <span>{hasVoted ? "Already Voted" : (expanded ? 'Continue Voting' : 'Vote Now')}</span>
              </div>
            </Button>
            <Button
              onClick={() => onRequestResults ? onRequestResults(poll.id, poll.title) : setShowResults(true)}
              variant="outline"
              className="flex-1"
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span>View Results</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {showResults && (
        <PollResultsModal pollId={poll.id} pollTitle={poll.title} onClose={() => setShowResults(false)} />
      )}
    </>
  )
}
