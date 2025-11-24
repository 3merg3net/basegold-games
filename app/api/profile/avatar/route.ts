import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase service env vars missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient(url, key)
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseService()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Missing file or userId' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = file.name.split('.').pop() || 'png'
    const path = `${userId}/${randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('poker-avatars') // 👈 your existing bucket
      .upload(path, buffer, {
        contentType: file.type || 'image/png',
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: uploadError.message || 'Upload failed at storage layer.' },
        { status: 500 }
      )
    }

    const { data } = supabase.storage.from('poker-avatars').getPublicUrl(path)

    if (!data?.publicUrl) {
      return NextResponse.json(
        { error: 'Upload succeeded but no public URL was returned.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ publicUrl: data.publicUrl })
  } catch (err: any) {
    console.error('Avatar upload route error:', err)
    return NextResponse.json(
      {
        error:
          err?.message ||
          'Unexpected server error while uploading avatar.',
      },
      { status: 500 }
    )
  }
}
