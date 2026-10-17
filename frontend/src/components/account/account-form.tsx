'use client';
import Link from 'next/link';
import {useAccountForm} from './use-account-form';
import styles from './account.module.css';
export function AccountForm({signup=false,returnTo='/',created=false}:{signup?:boolean;returnTo?:string;created?:boolean}) {
 const {busy,error,submit,login,register,wrongAccount,switchAccount}=useAccountForm(signup,returnTo);
 return <main id="public-main" className={`${styles.page} ${signup ? '' : styles.loginPage}`}><form className={styles.form} onSubmit={submit} aria-busy={busy}>
  <h1>{signup ? 'Create account' : 'Log in'}</h1><p>{signup ? 'Create your public Techy Fellow account.' : 'Sign in to your public Techy Fellow account.'}</p>
  {wrongAccount&&<p role="status">A staff account is signed in. <button type="button" disabled={busy} onClick={()=>void switchAccount()}>Switch to a member account</button> <Link href="/admin/login">Admin sign in</Link></p>}{created&&<p role="status">Account created. Log in to continue. Email verification may still be pending.</p>}<>
   {signup && <label>Name<input name="name" autoComplete="name" required maxLength={120}/></label>}
   <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
   <label>Password<input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 6 : undefined} maxLength={128} aria-describedby={signup ? 'password-guidance' : undefined}/></label>
   {signup && <><p id="password-guidance">Use at least 6 characters, including a letter and a number.</p><label>Confirm password<input name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={6} maxLength={128}/></label></>}
   {error && <p role="alert">{error}</p>}<button className={styles.submit} disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}</button>
   <p>{signup ? 'Already have an account? ' : 'New here? '}<Link href={signup ? login : register}>{signup ? 'Log in' : 'Create account'}</Link></p>
  </>
 </form></main>;
}
