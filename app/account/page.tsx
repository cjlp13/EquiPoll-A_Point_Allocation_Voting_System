"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

interface Profile {
  id: string
  email: string
  full_name: string | null
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error && error.code !== "PGRST116") throw error

        const profileData = data || {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || null,
        }

        setProfile(profileData)
        setFullName(profileData.full_name || "")
        setEmail(profileData.email)
      } catch (error) {
        console.error("Error fetching profile:", error)
        setError("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase, router])

  const handleSaveProfile = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Update profile in database
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email,
          full_name: fullName || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )

      if (profileError) throw profileError

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      })

      if (authError) throw authError

      setProfile({
        id: user.id,
        email,
        full_name: fullName || null,
      })

      setSuccess("Profile updated successfully")
      setEditing(false)

      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error("Error saving profile:", error)
      setError(error instanceof Error ? error.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push("/")
    } catch (error) {
      console.error("Error logging out:", error)
      setError("Failed to logout")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userEmail={profile?.email} />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userEmail={profile?.email} />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>{editing ? "Edit your profile details" : "View and manage your account"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="bg-input border-border"
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-input border-border"
                  disabled={!editing}
                  type="email"
                />
              </div>

              {error && <p className="text-sm text-accent">{error}</p>}
              {success && <p className="text-sm text-secondary">{success}</p>}

              <div className="flex gap-2 pt-4">
                {editing ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 border-border text-foreground hover:bg-muted bg-transparent"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:opacity-90"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} className="w-full bg-accent text-accent-foreground hover:opacity-90">
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
