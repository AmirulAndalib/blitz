"use client"

import {useQuery, useMutation, useSuspenseQuery} from "@blitzjs/rpc"
import logout from "../auth/mutations/logout"
import getCurrentUser from "../users/queries/getCurrentUser"
import {useTransition} from "react"
import {useRouter} from "next/navigation"

export default function Test() {
  const router = useRouter()
  const [user] = useSuspenseQuery(getCurrentUser, null)
  const [isPending, startTransition] = useTransition()
  const [logoutMutation] = useMutation(logout)
  console.log(user)
  return (
    <div>
      <h1>Test</h1>
      <p>{user?.email}</p>
      <button
        className="button small"
        onClick={async () => {
          await logoutMutation()
          startTransition(() => {
            // Refresh the current route and fetch new data from the server without
            // losing client-side browser or React state.
            router.refresh()
          })
        }}
      >
        Logout
      </button>
    </div>
  )
}
