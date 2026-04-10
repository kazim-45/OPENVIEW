'use client'
import dynamic from 'next/dynamic'

const OpenView = dynamic(() => import('../components/OpenView'), { ssr: false })

export default function Page() {
  return <OpenView />
}
