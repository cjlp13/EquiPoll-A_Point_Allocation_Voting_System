"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { X, Target } from "lucide-react"

interface AllocationItem {
  choice_text: string
  points: number
}

interface PollAllocationsModalProps {
  pollId: string
  pollTitle: string
  onClose: () => void
}

export default function PollAllocationsModal({ pollId, pollTitle, onClose }: PollAllocationsModalProps) {
  const [allocations, setAllocations] = useState<AllocationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPoints, setTotalPoints] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        // Fetch user's votes with choice details for this poll
        const { data: votesData, error: votesError } = await supabase
          .from("votes")
          .select(`
            points,
            poll_choices (
              choice_text
            )
          `)
          .eq("poll_id", pollId)
          .eq("user_id", user.id)

        if (votesError) throw votesError

        const allocationsData = (votesData || [])
          .filter((v: any) => v.poll_choices)
          .map((v: any) => ({
            choice_text: v.poll_choices.choice_text,
            points: Number(v.points || 0)
          }))

        // Sort by points descending
        allocationsData.sort((a: AllocationItem, b: AllocationItem) => b.points - a.points)

        const total = allocationsData.reduce((sum: number, item: AllocationItem) => sum + item.points, 0)

        setAllocations(allocationsData)
        setTotalPoints(total)
      } catch (error) {
        console.error("Error fetching allocations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllocations()
  }, [pollId, supabase])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <Card className="bg-card border-border w-full max-w-2xl rounded-lg shadow-xl">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading your allocations...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="bg-card border-border w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg shadow-xl">
        <CardHeader className="flex-shrink-0 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-semibold">{pollTitle}</CardTitle>
              <CardDescription>Your Point Allocations</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Total Points Summary */}
            <Card className="bg-muted border-border rounded-md">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <CardDescription>Total Points Allocated</CardDescription>
                </div>
                <CardTitle className="text-3xl text-primary">{totalPoints}</CardTitle>
              </CardHeader>
            </Card>

            {/* Allocations Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Point Distribution</h3>

              {allocations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No allocations found for this poll.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Choice</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation, index) => (
                      <TableRow key={index}>
                        <TableCell>{allocation.choice_text}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {allocation.points}
                        </TableCell>
                        <TableCell className="text-right">
                          {totalPoints > 0
                            ? ((allocation.points / totalPoints) * 100).toFixed(1)
                            : "0"}
                          %
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
