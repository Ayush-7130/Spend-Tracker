/* 
SIGN-UP API DISABLED
To re-enable, replace this file content with route-backup.txt
*/

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Sign-up functionality is currently disabled' 
    },
    { status: 403 }
  );
}