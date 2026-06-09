import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="flex flex-col md:flex-row -mx-4 -my-4 sm:-mx-5 sm:-my-5" style={{ minHeight: 'calc(100vh - 60px)' }}>
      <AdminSidebar />
      <div className="flex-1 p-4 sm:p-5 min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
