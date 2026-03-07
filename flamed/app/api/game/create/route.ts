import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	return NextResponse.json({ ok: true, message: 'create placeholder' })
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204 })
}

