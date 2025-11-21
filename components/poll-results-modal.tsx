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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { X, Users, TrendingUp, BarChart3 } from "lucide-react"

interface Choice {
  id: string
  choice_text: string
  total_points: number
  vote_count: number
}

interface SupabaseChoice {
  id: string
  choice_text: string
}

interface SupabaseVote {
  choice_id: string
  points: number
  user_id: string
}

interface PollResultsModalProps {
  pollId: string
  pollTitle: string
  onClose: () => void
}

export function PollResultsModal({ pollId, pollTitle, onClose }: PollResultsModalProps) {
  const [choices, setChoices] = useState<Choice[]>([])
  const [loading, setLoading] = useState(true)
  const [totalVoters, setTotalVoters] = useState(0)
  const [consensusScore, setConsensusScore] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { data: choicesData, error: choicesError } = await supabase
          .from("poll_choices")
          .select("id, choice_text")
          .eq("poll_id", pollId)

        if (choicesError) throw choicesError

        const { data: votesData, error: votesError } = await supabase
          .from("votes")
          .select("choice_id, points, user_id")
          .eq("poll_id", pollId)

        if (votesError) throw votesError

        const typedChoices = choicesData as SupabaseChoice[]
        const typedVotes = votesData as SupabaseVote[]

        const choiceResults = typedChoices.map((choice) => {
          const choiceVotes = typedVotes.filter((v) => v.choice_id === choice.id)
          const totalPoints = choiceVotes.reduce((sum, v) => sum + Number(v.points), 0)

          return {
            id: choice.id,
            choice_text: choice.choice_text,
            total_points: totalPoints,
            vote_count: choiceVotes.length,
          }
        })

        choiceResults.sort((a, b) => b.total_points - a.total_points)

        const uniqueVoters = new Set(typedVotes.map((v) => v.user_id)).size
        setTotalVoters(uniqueVoters)

        const totalPoints = choiceResults.reduce((sum, c) => sum + c.total_points, 0)
        if (totalPoints > 0) {
          const herfindahl = choiceResults.reduce((sum, c) => {
            const proportion = c.total_points / totalPoints
            return sum + proportion * proportion
          }, 0)

          const normalizedScore =
            ((herfindahl - 1 / choiceResults.length) / (1 - 1 / choiceResults.length)) * 100

          setConsensusScore(Math.round(normalizedScore))
        }

        setChoices(choiceResults)
      } catch (error) {
        console.error("Error fetching results:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [pollId])

  const getBarColor = (index: number) => {
    const colors = ["#8b1d1d", "#9e3b36", "#b86b66", "#7a1a18", "#5f1514"]
    return colors[index % colors.length]
  }

  const getConsensusLabel = (score: number) => {
    if (score >= 80) return "Very High Consensus"
    if (score >= 60) return "High Consensus"
    if (score >= 40) return "Moderate Consensus"
    if (score >= 20) return "Low Consensus"
    return "Very Low Consensus"
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <Card className="bg-card border-border w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg shadow-xl">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading results...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const chartData = choices.map((choice) => ({
    name:
      choice.choice_text.length > 20
        ? choice.choice_text.substring(0, 20) + "..."
        : choice.choice_text,
    points: choice.total_points,
    fullName: choice.choice_text,
  }))

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="bg-card border-border w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg shadow-xl gap-0">

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-muted border-border rounded-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <CardDescription>Total Voters</CardDescription>
                  </div>
                  <CardTitle className="text-3xl text-primary">{totalVoters}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="bg-muted border-border rounded-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <CardDescription>Consensus Score</CardDescription>
                  </div>
                  <CardTitle className="text-3xl text-primary">{consensusScore}%</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getConsensusLabel(consensusScore)}
                  </p>
                </CardHeader>
              </Card>
            </div>

            {/* Bar Chart */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Point Distribution</h3>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border p-2 rounded shadow-lg">
                            <p className="font-semibold">{payload[0].payload.fullName}</p>
                            <p className="text-primary">Points: {payload[0].value}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Bar dataKey="points" fill="#8b1d1d" name="Total Points">
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={getBarColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Results Table */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Detailed Results</h3>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Choice</TableHead>
                    <TableHead className="text-right">Total Points</TableHead>
                    <TableHead className="text-right">Vote Count</TableHead>
                    <TableHead className="text-right">Avg Points/Vote</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {choices.map((choice, index) => (
                    <TableRow key={choice.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{choice.choice_text}</TableCell>
                      <TableCell className="text-right">{choice.total_points.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{choice.vote_count}</TableCell>
                      <TableCell className="text-right">
                        {choice.vote_count > 0
                          ? (choice.total_points / choice.vote_count).toFixed(2)
                          : "0.00"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Consensus Explanation */}
            <Card className="bg-muted border-border rounded-md">
              <CardHeader>
                <CardTitle className="text-sm">About Consensus Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The consensus score measures how much agreement exists among voters.
                  A score of 100% indicates complete agreement (all points to one choice),
                  while 0% indicates maximum disagreement (points evenly distributed).
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Header */}
        <CardHeader className="flex-shrink-0 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-semibold">{pollTitle}</CardTitle>
              <CardDescription>Poll Results</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}
