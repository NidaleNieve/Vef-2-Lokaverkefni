import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Factory returning a configured Supabase client for server components / routes.
export const serverClient = async () => {
	const cookieStore = await cookies()
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				get(name: string) {
					return cookieStore.get(name)?.value
				},
				set(name: string, value: string, options: any) {
					try { cookieStore.set(name, value, options) } catch {}
				},
				remove(name: string, options: any) {
					try { cookieStore.set(name, '', { ...options, maxAge: 0 }) } catch {}
				},
			}
		}
	)
}

// Backwards compatible alias
export const createClient = serverClient