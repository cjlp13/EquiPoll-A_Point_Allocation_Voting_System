import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Equi Poll</h1>
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

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Welcome to the Voting System</h2>
          <p className="text-muted-foreground mb-8 text-lg">Create polls, allocate points, and see what others think</p>
          <div className="flex gap-4 justify-center">
            <Link href="/home">
              <Button className="bg-primary text-primary-foreground hover:opacity-90">View All Polls</Button>
            </Link>
            <Link href="/my-polls">
              <Button className="bg-secondary text-secondary-foreground hover:opacity-90" variant="outline">
                Create a Poll
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
