import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, TrendingUp } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">EquiPoll</h1>
          <div className="flex gap-4">
            <Link href="/home">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link href="/my-polls">
              <Button variant="ghost">My Polls</Button>
            </Link>
            <Link href="/account">
              <Button variant="ghost">Account</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to Equi Poll</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Create polls, allocate points, and see what others think
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Browse Polls
              </CardTitle>
              <CardDescription>
                Explore public polls and see what others are voting on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/home">
                <Button variant="outline" className="w-full">
                  View Public Polls
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create Poll
              </CardTitle>
              <CardDescription>
                Start a new poll and invite others to vote with points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/my-polls">
                <Button className="w-full">
                  Create New Poll
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="bg-card border-border mt-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Equi Poll lets you make better group decisions with point-based voting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-medium">Create a Poll</h3>
                <p className="text-sm text-muted-foreground">
                  Add your question and multiple choice options
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-medium">Allocate Points</h3>
                <p className="text-sm text-muted-foreground">
                  Voters distribute points among options based on preference
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-medium">See Results</h3>
                <p className="text-sm text-muted-foreground">
                  View detailed results with consensus scores and analytics
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}