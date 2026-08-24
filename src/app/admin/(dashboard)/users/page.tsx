import type { Metadata } from "next";
import { KeyRoundIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SetupNotice } from "@/components/admin/setup-notice";
import { AddStaffForm } from "@/components/admin/add-staff-form";
import { removeStaff, setStaffRole } from "@/app/admin/data-actions";
import { adminClientAvailable, createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Staff" };

type StaffRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

async function listStaff(): Promise<StaffRow[]> {
  if (!adminClientAvailable()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_users")
    .select("id, email, full_name, role, created_at")
    .order("created_at");
  return (data ?? []) as StaffRow[];
}

export default async function AdminUsersPage() {
  const me = await requireAdmin();

  const connected = adminClientAvailable();
  const staff = await listStaff();
  const isOwner = me.role === "owner";

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Staff
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Everyone who can reach the back office. Being able to sign in to
        Supabase is not enough on its own — without a row here, a real account
        is still turned away at the door.
      </p>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      <div className="border-border mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              {["Name", "Email", "Role", "Added", ""].map((heading) => (
                <th
                  key={heading}
                  className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground p-6 text-center">
                  No staff listed.
                </td>
              </tr>
            ) : (
              staff.map((person) => {
                const isMe = person.id === me.id;
                return (
                <tr key={person.id}>
                  <td className="p-3 font-medium">
                    {person.full_name ?? "—"}
                    {isMe ? (
                      <span className="text-muted-foreground ml-2 text-xs">
                        (you)
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs">{person.email}</td>
                  <td className="p-3">
                    {isOwner && !isMe ? (
                      <form
                        action={setStaffRole}
                        className="flex items-center gap-1.5"
                      >
                        <input type="hidden" name="id" value={person.id} />
                        <select
                          name="role"
                          defaultValue={person.role}
                          aria-label={`Role for ${person.email}`}
                          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                        >
                          <option value="staff">Staff</option>
                          <option value="owner">Owner</option>
                        </select>
                        <Button type="submit" size="sm" variant="outline" className="h-8">
                          Set
                        </Button>
                      </form>
                    ) : (
                      <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase">
                        {person.role}
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground p-3 text-xs whitespace-nowrap">
                    {new Date(person.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    {isOwner && !isMe ? (
                      <form action={removeStaff}>
                        <input type="hidden" name="id" value={person.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-8"
                        >
                          Revoke
                        </Button>
                      </form>
                    ) : null}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isOwner ? (
        <div className="mt-8">
          <AddStaffForm />
        </div>
      ) : (
        <div className="border-border bg-muted/40 mt-6 flex items-start gap-3 rounded-xl border p-4">
          <KeyRoundIcon className="text-primary mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Owners manage staff</p>
            <p className="text-muted-foreground mt-1">
              Your role is staff, so this list is read-only for you. An owner
              can add people and change roles.
            </p>
          </div>
        </div>
      )}

      <p className="text-muted-foreground mt-4 text-xs">
        You cannot change or revoke your own row — that is how a back office
        ends up with no owners and nobody able to get back in. Revoking removes
        someone&rsquo;s access without deleting their Supabase login, so
        anything recorded against them stays attributed.
      </p>

    </div>
  );
}
