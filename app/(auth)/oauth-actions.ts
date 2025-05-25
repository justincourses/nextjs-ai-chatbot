'use server';

import { signIn, signOut } from './auth-server';

export async function signInWithGoogle() {
  await signIn('google', { redirectTo: '/' });
}

export async function signInWithGitHub() {
  await signIn('github', { redirectTo: '/' });
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' });
}
