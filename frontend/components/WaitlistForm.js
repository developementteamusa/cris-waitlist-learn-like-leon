'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {ArrowRight,CheckCircle2,AlertCircle,LoaderCircle} from 'lucide-react';
const plain = /^[\p{L}\p{M}\p{N} .,'’()&+\-\/!?\n\r]*$/u;
const safe = (max) => z.string().trim().max(max).refine(v => plain.test(v), 'Please use ordinary text without markup or special characters.');
const required = (max) => safe(max).pipe(z.string().min(2,'Enter at least 2 characters.'));
const schema = z.object({
  full_name:required(100),
  email:z.string().trim().email('Enter a valid email address.').max(254),
  company_name:required(120),
  industry:z.enum(['Healthcare','Education & Childcare','Transportation','Other']),
  role:safe(100),
  company_size:z.enum(['1-50','51-200','201-1000','1000+']),
  message:safe(1000),
  website:z.string().max(200).optional()
});
const fields=[{name:'full_name',label:'Full name',placeholder:'Alex Morgan',required:true},{name:'email',label:'Work email',placeholder:'alex@company.com',type:'email',required:true},{name:'company_name',label:'Company name',placeholder:'Your organization',required:true},{name:'role',label:'Role / title',placeholder:'e.g. HR Director'}];
export default function WaitlistForm(){
 const [status,setStatus]=useState('idle');const [serverMessage,setServerMessage]=useState('');
 const {register,handleSubmit,formState:{errors,isSubmitting},reset}=useForm({resolver:zodResolver(schema),defaultValues:{full_name:'',email:'',company_name:'',industry:'',role:'',company_size:'',message:'',website:''}});
 async function submit(data){setStatus('loading');setServerMessage('');try{
  const api=(process.env.NEXT_PUBLIC_API_BASE_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
  const response=await fetch(`${api}/api/v1/waitlist`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){throw new Error(typeof result.detail==='string'?result.detail:'Unable to submit right now. Please try again.');}
  setStatus('success');setServerMessage(result.message||"You're on the list!");reset();
 }catch(err){setStatus('error');setServerMessage(err.message||'Unable to connect. Please try again later.');}}
 const formField=(field)=><div key={field.name}><label htmlFor={field.name} className="mb-2 block text-sm font-semibold text-navy">{field.label}{field.required&&<span className="ml-1 text-azure">*</span>}</label><input id={field.name} type={field.type||'text'} autoComplete={field.name==='email'?'email':field.name==='full_name'?'name':field.name==='company_name'?'organization':'organization-title'} className="field" placeholder={field.placeholder} aria-invalid={!!errors[field.name]} aria-describedby={errors[field.name]?`${field.name}-error`:undefined} {...register(field.name)}/>{errors[field.name]&&<p id={`${field.name}-error`} role="alert" className="mt-1.5 text-xs text-red-600">{errors[field.name].message}</p>}</div>;
 return <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-5 sm:grid-cols-2" aria-label="Join the Cris waitlist">
  {fields.slice(0,3).map(formField)}
  <div><label htmlFor="industry" className="mb-2 block text-sm font-semibold">Industry <span className="text-azure">*</span></label><select id="industry" className="field" defaultValue="" aria-invalid={!!errors.industry} {...register('industry')}><option value="" disabled>Select industry</option>{['Healthcare','Education & Childcare','Transportation','Other'].map(i=><option key={i} value={i}>{i}</option>)}</select>{errors.industry&&<p role="alert" className="mt-1.5 text-xs text-red-600">Please select an industry.</p>}</div>
  {formField(fields[3])}
  <div><label htmlFor="company_size" className="mb-2 block text-sm font-semibold">Company size <span className="text-azure">*</span></label><select id="company_size" className="field" defaultValue="" aria-invalid={!!errors.company_size} {...register('company_size')}><option value="" disabled>Select company size</option>{['1-50','51-200','201-1000','1000+'].map(i=><option key={i} value={i}>{i} employees</option>)}</select>{errors.company_size&&<p role="alert" className="mt-1.5 text-xs text-red-600">Please select a company size.</p>}</div>
  <div className="sm:col-span-2"><label htmlFor="message" className="mb-2 block text-sm font-semibold">How can Cris help your team? <span className="font-normal text-slate-400">(optional)</span></label><textarea id="message" rows={3} placeholder="Tell us about your hiring or verification needs..." className="field resize-y" aria-invalid={!!errors.message} {...register('message')}/>{errors.message&&<p role="alert" className="mt-1.5 text-xs text-red-600">{errors.message.message}</p>}</div>
  <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true"><label htmlFor="website">Leave this empty</label><input id="website" tabIndex={-1} autoComplete="off" {...register('website')}/></div>
  {status==='success'&&<div role="status" className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><CheckCircle2 className="shrink-0" size={20}/>{serverMessage}</div>}
  {status==='error'&&<div role="alert" className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="shrink-0" size={20}/>{serverMessage}</div>}
  <div className="sm:col-span-2"><button type="submit" disabled={isSubmitting} className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting?<><LoaderCircle size={18} className="animate-spin"/>Submitting...</>:<>Join the Waitlist <ArrowRight size={18}/></>}</button><p className="mt-3 text-center text-xs leading-5 text-slate-500">By submitting, you agree that Cris may contact you about early access. Read our <a href="/privacy" className="font-semibold text-azure hover:underline">Privacy Notice</a>.</p></div>
 </form>
}
