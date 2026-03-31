import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { supabase } from "@/lib/supabaseServer"
import bcrypt from 'bcryptjs'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const { data: userRows, error } = await supabase.from('users').select('id, name, email, password_hash, role, current_balance').eq('email', credentials.email).maybeSingle()
        if (error) return null
        const user: any = userRows
        if (!user) return null
        if (!user.password_hash) return null
        const ok = bcrypt.compareSync(credentials.password, user.password_hash)
        if (!ok) return null
        // Return a minimal user object for NextAuth session
        return { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.current_balance }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      try {
        // For OAuth providers, ensure a user exists in our users table and link provider
        if (account && account.provider && account.provider !== 'credentials') {
          const email = (user as any).email
          if (!email) return false
          const { data: dbUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
          if (!dbUser) return false // deny sign-in if user not created by admin

          // upsert provider link
          const providerType = account.provider
          const providerKey = account.providerAccountId ?? (account as any).id ?? null
          if (providerKey) {
            const { error } = await supabase.from('user_login_providers').upsert({ user_id: (dbUser as any).id, provider_type: providerType, provider_key: providerKey }).select()
            if (error) {
              // don't block login for non-critical failure, but log
              console.error('failed to link provider', error.message)
            }
          }
        }
        return true
      } catch (e) {
        return false
      }
    },
    async jwt({ token, user }) {
      // when user signs in, attach role and balance to token
      if (user) {
        if ((user as any).role) token.role = (user as any).role
        if ((user as any).balance !== undefined) token.balance = (user as any).balance
      }
      return token
    },

    async session({ session, token }) {
      try {
        // prefer token values (kept in sync via jwt callback); fallback to DB lookup
        session.user = session.user || {}
        session.user.role = token.role ?? session.user.role
        session.user.balance = token.balance ?? session.user.balance

        if (!session.user.id && session.user.email) {
          const { data: dbUser } = await supabase.from('users').select('id, role, current_balance, name').eq('email', session.user.email).maybeSingle()
          if (dbUser) {
            session.user.id = (dbUser as any).id
            session.user.role = (dbUser as any).role
            session.user.balance = (dbUser as any).current_balance
            session.user.name = (dbUser as any).name ?? session.user.name
          }
        }

        return session
      } catch (e) {
        return session
      }
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
