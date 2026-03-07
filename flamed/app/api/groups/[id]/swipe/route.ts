import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	// placeholder - real implementation lives elsewhere
	return NextResponse.json({ ok: true, message: 'swipe placeholder' })
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204 })
}

