import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { getWorkspace, mutateWorkspace } from "@/lib/firebase/workspace";
import type { ApplyMode, SavedApplication, UserProfile } from "@/lib/types";
import type { RoleDefinition } from "@/lib/default-roles";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspace = await getWorkspace(userId);
    return NextResponse.json(workspace);
  } catch (err) {
    console.error("[GET /api/workspace]", err);
    return NextResponse.json(
      { error: "Could not load workspace. Check Firebase Admin credentials and Firestore." },
      { status: 500 },
    );
  }
}

type PostBody =
  | { action: "setActiveProfile"; profileId: string }
  | { action: "setApplyMode"; applyMode: ApplyMode }
  | { action: "createProfile"; name: string }
  | {
      action: "updateProfile";
      id: string;
      patch: Partial<
        Pick<
          UserProfile,
          "name" | "headline" | "baseResume" | "resumePdfFileName"
        >
      >;
    }
  | { action: "deleteProfile"; id: string }
  | { action: "addCustomRole"; label: string; keywords: string[] }
  | {
      action: "updateCustomRole";
      id: string;
      patch: Partial<Pick<RoleDefinition, "label" | "keywords">>;
    }
  | { action: "removeCustomRole"; id: string }
  | { action: "toggleBuiltInRole"; id: string; enabled: boolean }
  | {
      action: "createApplication";
      app: Omit<
        SavedApplication,
        "id" | "savedAt" | "profileId" | "appliedAt" | "nextFollowUp"
      > & { profileId?: string };
    }
  | {
      action: "updateApplication";
      id: string;
      patch: Partial<SavedApplication>;
    }
  | { action: "deleteApplication"; id: string }
  | { action: "importBackup"; state: unknown };

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await mutateWorkspace(userId, body);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/workspace]", err);
    return NextResponse.json(
      { error: "Workspace update failed. Check Firebase Admin credentials and Firestore." },
      { status: 500 },
    );
  }
}
