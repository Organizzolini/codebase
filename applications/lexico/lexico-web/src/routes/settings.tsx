import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Separator,
} from "@codebase/components-web";

import { deleteAccount, getGoogleSignInUrl, signOut } from "../lib/auth";

import type { ReactNode } from "react";

// 🧭 Route

/**
 * The signed-in reader's account settings.
 */
export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

/**
 * Handle sign in.
 */
async function handleSignIn(): Promise<void> {
  const redirectTo = `${location.origin}/settings`;
  const { url } = await getGoogleSignInUrl({ data: { redirectTo } });
  if (url) {
    location.href = url;
  }
}

// 🧩 Component

/**
 * Settings page component for user account management.
 *
 * @returns React node.
 */
function SettingsPage(): ReactNode {
  // 🪝 Hooks
  const router = useRouter();
  const { user } = Route.useRouteContext();

  // 🏗 Setup

  // 💪 Handlers
  const handleSignOut = async (): Promise<void> => {
    await signOut();
    await router.invalidate();
  };

  const handleDeleteAccount = async (): Promise<void> => {
    await deleteAccount();
    await router.invalidate();
    await router.navigate({ to: "/" });
  };

  // ♻️ Lifecycle

  // 🏁 Early Returns
  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Sign in to save your bookmarks, preferences, and reading progress
              across devices.
            </p>
            <Button
              className="w-full"
              onClick={() => void handleSignIn()}
            >
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 🎨 Markup
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email</Label>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <Button
              onClick={() => void handleSignOut()}
              variant="outline"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p className="text-sm italic">User preferences coming soon!</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Font size</li>
            <li>Default translation expansion</li>
            <li>Default forms expansion</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-2xl border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <Button
              onClick={() => void handleDeleteAccount()}
              variant="destructive"
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
